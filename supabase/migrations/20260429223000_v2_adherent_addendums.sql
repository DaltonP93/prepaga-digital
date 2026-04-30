-- V2: Adherent addendums for enterprise/unipersonal sales.
-- Safe to apply first on US test. Do not apply to BR production until validated.

create extension if not exists pgcrypto;

alter table public.sales
  add column if not exists contract_completed_at timestamptz,
  add column if not exists contract_end_date date;

alter table public.beneficiaries
  add column if not exists coverage_start_date date,
  add column if not exists coverage_end_date date,
  add column if not exists source_addendum_id uuid,
  add column if not exists activated_at timestamptz,
  add column if not exists status text not null default 'active';

alter table public.beneficiaries
  alter column status set default 'active';

update public.beneficiaries
set status = 'active'
where status is null
   or status not in ('active', 'pending_addendum_signature', 'inactive');

alter table public.beneficiaries
  alter column status set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'beneficiaries_status_check'
      and conrelid = 'public.beneficiaries'::regclass
  ) then
    alter table public.beneficiaries
      add constraint beneficiaries_status_check
      check (status in ('active', 'pending_addendum_signature', 'inactive'));
  end if;
end $$;

create table if not exists public.sale_addendums (
  id uuid primary key default gen_random_uuid(),
  parent_sale_id uuid not null references public.sales(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  type text not null default 'adherent_addition',
  status text not null default 'borrador',
  requested_by uuid references public.profiles(id) on delete set null,
  audited_by uuid references public.profiles(id) on delete set null,
  audit_notes text,
  submitted_at timestamptz,
  audited_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sale_addendums_type_check check (type in ('adherent_addition')),
  constraint sale_addendums_status_check check (
    status in ('borrador', 'en_auditoria', 'rechazado', 'aprobado', 'enviado_firma', 'completado', 'cancelado')
  )
);

create table if not exists public.sale_addendum_beneficiaries (
  id uuid primary key default gen_random_uuid(),
  addendum_id uuid not null references public.sale_addendums(id) on delete cascade,
  beneficiary_id uuid references public.beneficiaries(id) on delete set null,
  first_name text not null,
  last_name text not null,
  dni text,
  document_type text,
  document_number text,
  relationship text,
  birth_date date,
  phone text,
  email text,
  address text,
  barrio text,
  city text,
  province text,
  amount numeric default 0,
  signature_required boolean not null default true,
  has_preexisting_conditions boolean not null default false,
  preexisting_conditions_detail text,
  status text not null default 'pending',
  activated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sale_addendum_beneficiaries_status_check check (
    status in ('pending', 'ready_for_signature', 'signed', 'active', 'cancelled')
  )
);

alter table public.beneficiaries
  drop constraint if exists beneficiaries_source_addendum_id_fkey;

alter table public.beneficiaries
  add constraint beneficiaries_source_addendum_id_fkey
  foreign key (source_addendum_id)
  references public.sale_addendums(id)
  on delete set null;

alter table public.signature_links
  add column if not exists sale_addendum_id uuid,
  add column if not exists sale_addendum_beneficiary_id uuid;

alter table public.signature_links
  drop constraint if exists signature_links_sale_addendum_id_fkey;

alter table public.signature_links
  add constraint signature_links_sale_addendum_id_fkey
  foreign key (sale_addendum_id)
  references public.sale_addendums(id)
  on delete set null;

alter table public.signature_links
  drop constraint if exists signature_links_sale_addendum_beneficiary_id_fkey;

alter table public.signature_links
  add constraint signature_links_sale_addendum_beneficiary_id_fkey
  foreign key (sale_addendum_beneficiary_id)
  references public.sale_addendum_beneficiaries(id)
  on delete set null;

create index if not exists idx_sale_addendums_parent_sale_id on public.sale_addendums(parent_sale_id);
create index if not exists idx_sale_addendums_company_id on public.sale_addendums(company_id);
create index if not exists idx_sale_addendums_status on public.sale_addendums(status);
create index if not exists idx_sale_addendum_beneficiaries_addendum_id on public.sale_addendum_beneficiaries(addendum_id);
create index if not exists idx_beneficiaries_source_addendum_id on public.beneficiaries(source_addendum_id);
create index if not exists idx_beneficiaries_coverage_end_date on public.beneficiaries(coverage_end_date);
create index if not exists idx_signature_links_sale_addendum_id on public.signature_links(sale_addendum_id);

update public.sales
set
  contract_completed_at = coalesce(contract_completed_at, signature_completed_at, signed_at, updated_at, now()),
  contract_end_date = coalesce(contract_end_date, (coalesce(signature_completed_at, signed_at, updated_at, now()) + interval '1 year')::date)
where status = 'completado'
  and (contract_completed_at is null or contract_end_date is null);

create or replace function public.set_sale_contract_dates()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'completado' and coalesce(old.status, '') <> 'completado' then
    new.contract_completed_at := coalesce(new.contract_completed_at, new.signature_completed_at, new.signed_at, now());
    new.contract_end_date := coalesce(new.contract_end_date, (new.contract_completed_at + interval '1 year')::date);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_set_sale_contract_dates on public.sales;
create trigger trg_set_sale_contract_dates
before update on public.sales
for each row
execute function public.set_sale_contract_dates();

create or replace function public.touch_sale_addendums_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_sale_addendums_updated_at on public.sale_addendums;
create trigger trg_sale_addendums_updated_at
before update on public.sale_addendums
for each row
execute function public.touch_sale_addendums_updated_at();

create or replace function public.ensure_sale_addendum_company_match()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sale_company uuid;
begin
  select company_id into v_sale_company
  from public.sales
  where id = new.parent_sale_id;

  if v_sale_company is null then
    raise exception 'Venta padre no encontrada';
  end if;

  if new.company_id is null then
    new.company_id := v_sale_company;
  end if;

  if new.company_id <> v_sale_company then
    raise exception 'El anexo debe pertenecer a la misma compañía de la venta';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_sale_addendums_company_match on public.sale_addendums;
create trigger trg_sale_addendums_company_match
before insert or update of parent_sale_id, company_id on public.sale_addendums
for each row
execute function public.ensure_sale_addendum_company_match();

create or replace function public.submit_sale_addendum_for_audit(p_addendum_id uuid)
returns public.sale_addendums
language plpgsql
security definer
set search_path = public
as $$
declare
  v_addendum public.sale_addendums%rowtype;
  v_sale public.sales%rowtype;
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'Usuario no autenticado';
  end if;

  select * into v_addendum
  from public.sale_addendums
  where id = p_addendum_id
  for update;

  if not found then
    raise exception 'Anexo no encontrado';
  end if;

  if v_addendum.status not in ('borrador', 'rechazado') then
    raise exception 'Solo anexos en borrador o rechazados pueden enviarse a auditoría';
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.id = v_user
      and p.company_id = v_addendum.company_id
  ) then
    raise exception 'No tiene permisos para enviar este anexo';
  end if;

  select * into v_sale
  from public.sales
  where id = v_addendum.parent_sale_id
  for update;

  if not found or v_sale.company_id <> v_addendum.company_id then
    raise exception 'Venta padre inválida';
  end if;

  if v_sale.status <> 'completado' then
    raise exception 'La venta padre debe estar completada';
  end if;

  if coalesce(v_sale.sale_type, '') not in ('empresarial', 'unipersonal') then
    raise exception 'Solo ventas empresariales o unipersonales admiten anexos';
  end if;

  if v_sale.contract_end_date is null then
    update public.sales
    set
      contract_completed_at = coalesce(contract_completed_at, signature_completed_at, signed_at, now()),
      contract_end_date = (coalesce(contract_completed_at, signature_completed_at, signed_at, now()) + interval '1 year')::date
    where id = v_sale.id
    returning * into v_sale;
  end if;

  if v_sale.contract_end_date < current_date then
    raise exception 'La venta padre se encuentra vencida';
  end if;

  if not exists (
    select 1
    from public.sale_addendum_beneficiaries
    where addendum_id = p_addendum_id
      and status = 'pending'
      and btrim(coalesce(first_name, '')) <> ''
      and btrim(coalesce(last_name, '')) <> ''
  ) then
    raise exception 'Debe cargar al menos un adherente válido antes de enviar a auditoría';
  end if;

  update public.sale_addendums
  set
    status = 'en_auditoria',
    requested_by = coalesce(requested_by, v_user),
    submitted_at = now(),
    audit_notes = null,
    audited_by = null,
    audited_at = null
  where id = p_addendum_id
  returning * into v_addendum;

  return v_addendum;
end;
$$;

drop trigger if exists trg_sale_addendum_beneficiaries_updated_at on public.sale_addendum_beneficiaries;
create trigger trg_sale_addendum_beneficiaries_updated_at
before update on public.sale_addendum_beneficiaries
for each row
execute function public.touch_sale_addendums_updated_at();

create or replace function public.recalculate_sale_total_amount(p_sale_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_titular numeric := 0;
  v_total numeric := 0;
begin
  select coalesce(titular_amount, total_amount, 0)
    into v_titular
  from public.sales
  where id = p_sale_id;

  select v_titular + coalesce(sum(coalesce(amount, 0)), 0)
    into v_total
  from public.beneficiaries
  where sale_id = p_sale_id
    and coalesce(is_primary, false) = false
    and status = 'active';

  update public.sales
  set total_amount = v_total
  where id = p_sale_id;
end;
$$;

create or replace function public.approve_sale_addendum(p_addendum_id uuid, p_note text default null)
returns public.sale_addendums
language plpgsql
security definer
set search_path = public
as $$
declare
  v_addendum public.sale_addendums%rowtype;
  v_sale public.sales%rowtype;
  v_user uuid := auth.uid();
  v_row public.sale_addendum_beneficiaries%rowtype;
  v_beneficiary_id uuid;
  v_token text;
  v_document_content text;
begin
  if v_user is null then
    raise exception 'Usuario no autenticado';
  end if;

  select * into v_addendum
  from public.sale_addendums
  where id = p_addendum_id
  for update;

  if not found then
    raise exception 'Anexo no encontrado';
  end if;

  if v_addendum.status <> 'en_auditoria' then
    raise exception 'Solo anexos en auditoría pueden aprobarse';
  end if;

  if not exists (
    select 1
    from public.profiles p
    join public.user_roles ur on ur.user_id = p.id
    where p.id = v_user
      and p.company_id = v_addendum.company_id
      and ur.role in ('auditor', 'admin', 'supervisor', 'super_admin')
  ) then
    raise exception 'No tiene permisos para aprobar anexos';
  end if;

  select * into v_sale
  from public.sales
  where id = v_addendum.parent_sale_id
  for update;

  if not found or v_sale.company_id <> v_addendum.company_id then
    raise exception 'Venta padre inválida';
  end if;

  if v_sale.status <> 'completado' then
    raise exception 'La venta padre debe estar completada';
  end if;

  if coalesce(v_sale.sale_type, '') not in ('empresarial', 'unipersonal') then
    raise exception 'Solo ventas empresariales o unipersonales admiten anexos';
  end if;

  if v_sale.contract_end_date is null then
    update public.sales
    set
      contract_completed_at = coalesce(contract_completed_at, signature_completed_at, signed_at, now()),
      contract_end_date = (coalesce(contract_completed_at, signature_completed_at, signed_at, now()) + interval '1 year')::date
    where id = v_sale.id
    returning * into v_sale;
  end if;

  if v_sale.contract_end_date < current_date then
    raise exception 'La venta padre se encuentra vencida';
  end if;

  if not exists (
    select 1
    from public.sale_addendum_beneficiaries
    where addendum_id = p_addendum_id
      and status in ('pending', 'ready_for_signature')
      and btrim(coalesce(first_name, '')) <> ''
      and btrim(coalesce(last_name, '')) <> ''
  ) then
    raise exception 'Debe cargar al menos un adherente válido antes de aprobar';
  end if;

  update public.sale_addendums
  set
    status = 'aprobado',
    audited_by = v_user,
    audited_at = now(),
    audit_notes = p_note
  where id = p_addendum_id
  returning * into v_addendum;

  for v_row in
    select *
    from public.sale_addendum_beneficiaries
    where addendum_id = p_addendum_id
      and status in ('pending', 'ready_for_signature')
    order by created_at
  loop
    if v_row.beneficiary_id is null then
      insert into public.beneficiaries (
        sale_id,
        first_name,
        last_name,
        dni,
        document_type,
        document_number,
        relationship,
        birth_date,
        phone,
        email,
        address,
        barrio,
        city,
        province,
        amount,
        signature_required,
        has_preexisting_conditions,
        preexisting_conditions_detail,
        coverage_start_date,
        coverage_end_date,
        source_addendum_id,
        status
      )
      values (
        v_sale.id,
        v_row.first_name,
        v_row.last_name,
        v_row.dni,
        v_row.document_type,
        v_row.document_number,
        v_row.relationship,
        v_row.birth_date,
        v_row.phone,
        v_row.email,
        v_row.address,
        v_row.barrio,
        v_row.city,
        v_row.province,
        coalesce(v_row.amount, 0),
        v_row.signature_required,
        v_row.has_preexisting_conditions,
        v_row.preexisting_conditions_detail,
        current_date,
        v_sale.contract_end_date,
        p_addendum_id,
        case when v_row.signature_required then 'pending_addendum_signature' else 'active' end
      )
      returning id into v_beneficiary_id;

      update public.sale_addendum_beneficiaries
      set beneficiary_id = v_beneficiary_id
      where id = v_row.id;
    else
      v_beneficiary_id := v_row.beneficiary_id;
    end if;

    v_document_content :=
      '<h1>Anexo de Alta de Adherente</h1>' ||
      '<p>Contrato: ' || coalesce(v_sale.contract_number, v_sale.id::text) || '</p>' ||
      '<p>Adherente: ' || v_row.first_name || ' ' || v_row.last_name || '</p>' ||
      '<p>C.I.: ' || coalesce(v_row.dni, '-') || '</p>' ||
      '<p>Vigencia desde ' || current_date::text || ' hasta ' || v_sale.contract_end_date::text || '</p>' ||
      '<p>Declaro que los datos de salud y personales son correctos.</p>' ||
      '<p>{{firma_adherente}}</p>';

    insert into public.documents (
      sale_id,
      beneficiary_id,
      name,
      document_type,
      content,
      status,
      requires_signature,
      is_final
    )
    select
      v_sale.id,
      v_beneficiary_id,
      'Anexo de Alta - ' || v_row.first_name || ' ' || v_row.last_name,
      'anexo_alta_adherente',
      v_document_content,
      'pendiente',
      true,
      false
    where not exists (
      select 1
      from public.documents d
      where d.sale_id = v_sale.id
        and d.beneficiary_id = v_beneficiary_id
        and d.document_type = 'anexo_alta_adherente'
        and d.is_final = false
        and d.name like 'Anexo de Alta - %'
    );

    if v_row.signature_required then
      if not exists (
        select 1
        from public.signature_links
        where sale_addendum_beneficiary_id = v_row.id
          and status <> 'revocado'
      ) then
        v_token := gen_random_uuid()::text;

        insert into public.signature_links (
          sale_id,
          token,
          recipient_type,
          recipient_id,
          recipient_name,
          recipient_email,
          recipient_phone,
          expires_at,
          status,
          step_order,
          is_active,
          sale_addendum_id,
          sale_addendum_beneficiary_id
        )
        values (
          v_sale.id,
          v_token,
          'adherente',
          v_beneficiary_id,
          v_row.first_name || ' ' || v_row.last_name,
          nullif(v_row.email, ''),
          nullif(v_row.phone, ''),
          least(now() + interval '7 days', v_sale.contract_end_date::timestamptz + interval '23 hours 59 minutes'),
          'pendiente',
          1,
          true,
          p_addendum_id,
          v_row.id
        );
      end if;

      update public.sale_addendum_beneficiaries
      set status = 'ready_for_signature'
      where id = v_row.id;
    else
      update public.sale_addendum_beneficiaries
      set status = 'active', activated_at = now()
      where id = v_row.id;

      update public.beneficiaries
      set status = 'active', activated_at = now()
      where id = v_beneficiary_id;
    end if;
  end loop;

  update public.sale_addendums
  set status = case
      when exists (
        select 1
        from public.sale_addendum_beneficiaries
        where addendum_id = p_addendum_id
          and signature_required = true
      ) then 'enviado_firma'
      else 'completado'
    end,
    completed_at = case
      when exists (
        select 1
        from public.sale_addendum_beneficiaries
        where addendum_id = p_addendum_id
          and signature_required = true
      ) then completed_at
      else now()
    end
  where id = p_addendum_id
  returning * into v_addendum;

  perform public.recalculate_sale_total_amount(v_sale.id);
  return v_addendum;
end;
$$;

create or replace function public.reject_sale_addendum(p_addendum_id uuid, p_note text)
returns public.sale_addendums
language plpgsql
security definer
set search_path = public
as $$
declare
  v_addendum public.sale_addendums%rowtype;
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'Usuario no autenticado';
  end if;

  select * into v_addendum
  from public.sale_addendums
  where id = p_addendum_id
  for update;

  if not found then
    raise exception 'Anexo no encontrado';
  end if;

  if v_addendum.status <> 'en_auditoria' then
    raise exception 'Solo anexos en auditoría pueden rechazarse';
  end if;

  if not exists (
    select 1
    from public.profiles p
    join public.user_roles ur on ur.user_id = p.id
    where p.id = v_user
      and p.company_id = v_addendum.company_id
      and ur.role in ('auditor', 'admin', 'supervisor', 'super_admin')
  ) then
    raise exception 'No tiene permisos para rechazar anexos';
  end if;

  update public.sale_addendums
  set
    status = 'rechazado',
    audited_by = v_user,
    audited_at = now(),
    audit_notes = p_note
  where id = p_addendum_id
  returning * into v_addendum;

  return v_addendum;
end;
$$;

create or replace function public.try_complete_sale_addendum_for_link(p_signature_link_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_link public.signature_links%rowtype;
  v_sale_id uuid;
  v_pending_count integer;
begin
  select * into v_link
  from public.signature_links
  where id = p_signature_link_id
  for update;

  if not found or v_link.sale_addendum_id is null or v_link.sale_addendum_beneficiary_id is null then
    return false;
  end if;

  if v_link.status <> 'completado'
    or coalesce(v_link.is_active, false) is false
    or v_link.status = 'revocado'
    or (v_link.expires_at is not null and v_link.expires_at <= now())
  then
    return false;
  end if;

  if not exists (
    select 1
    from public.sale_addendums sa
    join public.sale_addendum_beneficiaries ab on ab.addendum_id = sa.id
    where sa.id = v_link.sale_addendum_id
      and sa.status = 'enviado_firma'
      and ab.id = v_link.sale_addendum_beneficiary_id
      and ab.beneficiary_id = v_link.recipient_id
      and ab.signature_required = true
      and ab.status in ('ready_for_signature', 'signed')
  ) then
    return false;
  end if;

  update public.sale_addendum_beneficiaries
  set status = 'signed', activated_at = coalesce(activated_at, now())
  where id = v_link.sale_addendum_beneficiary_id;

  update public.beneficiaries b
  set status = 'active', activated_at = coalesce(b.activated_at, now())
  from public.sale_addendum_beneficiaries ab
  where ab.id = v_link.sale_addendum_beneficiary_id
    and b.id = ab.beneficiary_id;

  select count(*) into v_pending_count
  from public.sale_addendum_beneficiaries ab
  where ab.addendum_id = v_link.sale_addendum_id
    and ab.signature_required = true
    and not exists (
      select 1
      from public.signature_links sl
      where sl.sale_addendum_beneficiary_id = ab.id
        and sl.status = 'completado'
        and sl.status <> 'revocado'
        and coalesce(sl.is_active, false) = true
        and (sl.expires_at is null or sl.expires_at > now())
    );

  if v_pending_count = 0 then
    update public.sale_addendum_beneficiaries
    set status = 'active', activated_at = coalesce(activated_at, now())
    where addendum_id = v_link.sale_addendum_id;

    update public.sale_addendums
    set status = 'completado', completed_at = coalesce(completed_at, now())
    where id = v_link.sale_addendum_id
      and status = 'enviado_firma';

    select parent_sale_id into v_sale_id
    from public.sale_addendums
    where id = v_link.sale_addendum_id;

    perform public.recalculate_sale_total_amount(v_sale_id);
    return true;
  end if;

  return false;
end;
$$;

alter table public.sale_addendums enable row level security;
alter table public.sale_addendum_beneficiaries enable row level security;

drop policy if exists "Users can view company sale addendums" on public.sale_addendums;
create policy "Users can view company sale addendums"
on public.sale_addendums
for select
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.company_id = sale_addendums.company_id
      and exists (
        select 1
        from public.sales s
        where s.id = sale_addendums.parent_sale_id
          and s.company_id = sale_addendums.company_id
      )
  )
);

drop policy if exists "Company users can manage sale addendums" on public.sale_addendums;
drop policy if exists "Company users can create sale addendums" on public.sale_addendums;
create policy "Company users can create sale addendums"
on public.sale_addendums
for insert
with check (
  exists (
    select 1
    from public.profiles p
    join public.sales s on s.id = sale_addendums.parent_sale_id
    where p.id = auth.uid()
      and p.company_id = sale_addendums.company_id
      and s.company_id = sale_addendums.company_id
      and s.status = 'completado'
      and coalesce(s.sale_type, '') in ('empresarial', 'unipersonal')
      and (s.contract_end_date is null or s.contract_end_date >= current_date)
      and sale_addendums.status = 'borrador'
  )
);

drop policy if exists "Company users can update draft sale addendums" on public.sale_addendums;
create policy "Company users can update draft sale addendums"
on public.sale_addendums
for update
using (
  status in ('borrador', 'rechazado')
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.company_id = sale_addendums.company_id
  )
)
with check (
  status in ('borrador', 'rechazado')
  and exists (
    select 1
    from public.profiles p
    join public.sales s on s.id = sale_addendums.parent_sale_id
    where p.id = auth.uid()
      and p.company_id = sale_addendums.company_id
      and s.company_id = sale_addendums.company_id
  )
);

drop policy if exists "Company users can delete draft sale addendums" on public.sale_addendums;
create policy "Company users can delete draft sale addendums"
on public.sale_addendums
for delete
using (
  status in ('borrador', 'rechazado')
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.company_id = sale_addendums.company_id
  )
);

drop policy if exists "Service role can manage sale addendums" on public.sale_addendums;
create policy "Service role can manage sale addendums"
on public.sale_addendums
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

drop policy if exists "Users can view company sale addendum beneficiaries" on public.sale_addendum_beneficiaries;
create policy "Users can view company sale addendum beneficiaries"
on public.sale_addendum_beneficiaries
for select
using (
  exists (
    select 1
    from public.sale_addendums sa
    join public.profiles p on p.company_id = sa.company_id
    where sa.id = sale_addendum_beneficiaries.addendum_id
      and p.id = auth.uid()
  )
);

drop policy if exists "Company users can manage sale addendum beneficiaries" on public.sale_addendum_beneficiaries;
drop policy if exists "Company users can create draft sale addendum beneficiaries" on public.sale_addendum_beneficiaries;
create policy "Company users can create draft sale addendum beneficiaries"
on public.sale_addendum_beneficiaries
for insert
with check (
  exists (
    select 1
    from public.sale_addendums sa
    join public.profiles p on p.company_id = sa.company_id
    where sa.id = sale_addendum_beneficiaries.addendum_id
      and p.id = auth.uid()
      and sa.status in ('borrador', 'rechazado')
      and sale_addendum_beneficiaries.beneficiary_id is null
      and sale_addendum_beneficiaries.status = 'pending'
  )
);

drop policy if exists "Company users can update draft sale addendum beneficiaries" on public.sale_addendum_beneficiaries;
create policy "Company users can update draft sale addendum beneficiaries"
on public.sale_addendum_beneficiaries
for update
using (
  exists (
    select 1
    from public.sale_addendums sa
    join public.profiles p on p.company_id = sa.company_id
    where sa.id = sale_addendum_beneficiaries.addendum_id
      and p.id = auth.uid()
      and sa.status in ('borrador', 'rechazado')
      and sale_addendum_beneficiaries.beneficiary_id is null
  )
)
with check (
  exists (
    select 1
    from public.sale_addendums sa
    join public.profiles p on p.company_id = sa.company_id
    where sa.id = sale_addendum_beneficiaries.addendum_id
      and p.id = auth.uid()
      and sa.status in ('borrador', 'rechazado')
      and sale_addendum_beneficiaries.beneficiary_id is null
      and sale_addendum_beneficiaries.status = 'pending'
  )
);

drop policy if exists "Company users can delete draft sale addendum beneficiaries" on public.sale_addendum_beneficiaries;
create policy "Company users can delete draft sale addendum beneficiaries"
on public.sale_addendum_beneficiaries
for delete
using (
  exists (
    select 1
    from public.sale_addendums sa
    join public.profiles p on p.company_id = sa.company_id
    where sa.id = sale_addendum_beneficiaries.addendum_id
      and p.id = auth.uid()
      and sa.status in ('borrador', 'rechazado')
      and sale_addendum_beneficiaries.beneficiary_id is null
  )
);

drop policy if exists "Service role can manage sale addendum beneficiaries" on public.sale_addendum_beneficiaries;
create policy "Service role can manage sale addendum beneficiaries"
on public.sale_addendum_beneficiaries
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

grant execute on function public.submit_sale_addendum_for_audit(uuid) to authenticated;
grant execute on function public.approve_sale_addendum(uuid, text) to authenticated;
grant execute on function public.reject_sale_addendum(uuid, text) to authenticated;
grant execute on function public.try_complete_sale_addendum_for_link(uuid) to anon, authenticated;
