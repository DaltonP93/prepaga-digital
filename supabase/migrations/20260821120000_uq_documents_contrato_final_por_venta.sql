-- Bug Conocido #10 (candado adicional): una venta no puede tener mas de un
-- CONTRATO final del titular.
--
-- El bucle de links fantasma de la contratada llegaba a generar varios contratos
-- "finales" por venta (caso testigo en produccion: venta 2026-000207 con 5).
-- Los triggers de 20260819210000 cortan la causa; este indice es el candado que
-- hace imposible el sintoma aunque el front vuelva a una version vieja.
--
-- Se restringe a beneficiary_id IS NULL: el contrato del titular. Las DDJJ de
-- adherentes (que si son varias por venta) no entran.
--
-- Ya aplicado a mano en produccion (BR, ejiycfqxgtrzaysgpzmx) y en test
-- (US, ykducvvcjzdpoojxlsig). Se versiona aca para que no se pierda en un
-- `db reset` ni al levantar un entorno nuevo.
--
-- Si falla al crearse, la base tiene ventas con mas de un contrato final:
-- listarlas primero y ARCHIVAR los duplicados (is_final = false + sufijo
-- "(ANULADO - duplicado)"), nunca borrarlos. Ojo: el trigger
-- trg_protect_closed_sale_documents bloquea des-finalizar en ventas cerradas,
-- asi que la limpieza va ANTES de crear los triggers, o hay que deshabilitarlo
-- y reactivarlo dentro de la misma transaccion.

CREATE UNIQUE INDEX IF NOT EXISTS uq_documents_contrato_final_por_venta
  ON public.documents (sale_id)
  WHERE document_type = 'contrato' AND is_final = true AND beneficiary_id IS NULL;
