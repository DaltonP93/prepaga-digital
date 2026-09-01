-- Bug Conocido #10: bucle de links fantasma de la contratada.
--
-- Guardas a nivel DB para que el fix NO dependa de un rebuild del frontend
-- ni se pierda si un deploy sobreescribe el codigo de la app.
--
-- Caso testigo: venta 2026-000214 (SHEILA MAGALI TOLEDO BAEZ) — 6 signature_links
-- de contratada, 2 contratos firmados y 2 avisos duplicados al titular.


-- ---------------------------------------------------------------------------
-- A) Un link de contratada SIEMPRE es step 2.
--
-- El front (useResendSignatureLink) no copiaba step_order al regenerar el link y
-- la columna tiene DEFAULT 1, asi que el link renacia como step 1. Al firmarse,
-- finalize-signature-link lo tomaba como "termino el step 1" y creaba OTRO link
-- de contratada pendiente -> bucle.
--
-- Solo en INSERT: no se toca el historico ya guardado.
-- ---------------------------------------------------------------------------
create or replace function public.enforce_contratada_step_order()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if new.recipient_type = 'contratada' and coalesce(new.step_order, 1) <> 2 then
    new.step_order := 2;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_contratada_step_order on public.signature_links;
create trigger trg_enforce_contratada_step_order
before insert on public.signature_links
for each row execute function public.enforce_contratada_step_order();


-- ---------------------------------------------------------------------------
-- B) Cuando la contratada firma, revocar cualquier otro link de contratada vivo
-- de esa venta. Deja un unico candidato y evita que la UI muestre "Pendiente"
-- despues de que la contratada ya firmo.
--
-- No hay recursion: el UPDATE de abajo escribe status='revocado', que no cumple
-- la condicion de entrada del trigger.
-- ---------------------------------------------------------------------------
create or replace function public.revoke_stale_contratada_links()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if new.recipient_type = 'contratada'
     and new.status = 'completado'
     and (old.status is null or old.status <> 'completado') then
    update public.signature_links
       set status = 'revocado',
           is_active = false,
           updated_at = now()
     where sale_id = new.sale_id
       and recipient_type = 'contratada'
       and id <> new.id
       and status not in ('completado', 'revocado');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_revoke_stale_contratada_links on public.signature_links;
create trigger trg_revoke_stale_contratada_links
after update of status on public.signature_links
for each row execute function public.revoke_stale_contratada_links();


-- ---------------------------------------------------------------------------
-- C) Una venta cuya contratada ya firmo esta cerrada: no se puede des-finalizar
-- un documento ni borrar su bloque de firma.
--
-- Esto neutraliza el reset de documentos del TITULAR que el front dispara al
-- regenerar el link de la contratada (ponia is_final=false y borraba los
-- documentos 'firma' del titular, invalidando firmas ya validas).
-- ---------------------------------------------------------------------------
create or replace function public.protect_closed_sale_documents()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_sale_id uuid := coalesce(new.sale_id, old.sale_id);
  v_closed boolean;
begin
  select exists (
    select 1 from public.signature_links sl
     where sl.sale_id = v_sale_id
       and sl.recipient_type = 'contratada'
       and sl.status = 'completado'
  ) into v_closed;

  if not v_closed then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;

  -- IMPORTANTE: estas guardas FALLAN RUIDOSAMENTE, a proposito.
  -- Bloquear en silencio (return null / sobreescribir el valor viejo) haria que la
  -- app crea que guardo cuando no guardo nada, y el proximo que lo investigue va a
  -- perder horas. Preferimos un error explicito con su causa.

  if tg_op = 'DELETE' then
    raise exception
      'No se puede eliminar el documento % : la contratada ya firmo esta venta (venta cerrada).', old.id
      using errcode = 'P0001',
            hint = 'Si realmente hay que borrarlo, revoca antes la firma de la contratada de esa venta.';
  end if;

  -- No permitir revertir is_final en una venta cerrada
  if old.is_final is true and coalesce(new.is_final, false) = false then
    raise exception
      'No se puede marcar como no-final el documento % : la contratada ya firmo esta venta (venta cerrada).', old.id
      using errcode = 'P0001',
            hint = 'Esto suele venir de regenerar un link de firma en una venta ya cerrada. Revisa el flujo que lanzo el update.';
  end if;

  -- Nunca perder el PDF firmado PAdES
  if old.signed_pdf_url is not null and new.signed_pdf_url is null then
    raise exception
      'No se puede borrar el PDF firmado (signed_pdf_url) del documento % : la contratada ya firmo esta venta.', old.id
      using errcode = 'P0001',
            hint = 'El PDF firmado PAdES es evidencia legal y no se sobreescribe.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_protect_closed_sale_documents on public.documents;
create trigger trg_protect_closed_sale_documents
before update or delete on public.documents
for each row execute function public.protect_closed_sale_documents();
