-- Bug Conocido #11 (candado adicional): una venta no puede tener el MISMO contrato
-- final duplicado.
--
-- El bucle de links fantasma de la contratada llegaba a generar varios contratos
-- "finales" por venta (caso testigo: venta 2026-000207 con 5). Los triggers de
-- 20260819210000 cortan la causa; este indice es el candado que hace imposible el
-- sintoma aunque el front vuelva a una version vieja.
--
-- OJO — por que la clave incluye `name` y no es solo (sale_id):
-- desde 4a5479b ("clasificar documentos por contenido, no por nombre") un template
-- con campos de firma NUNCA es anexo, asi que **Plan Materno** se clasifica como
-- `document_type = 'contrato'`. Una venta con Plan Materno tiene entonces DOS
-- contratos finales legitimos (Contrato de prestacion + Plan Materno), ambos con
-- `beneficiary_id IS NULL`. Un indice unico sobre (sale_id) solo romperia la firma
-- de esas ventas con violacion de unicidad. `name` es el discriminador natural: sale
-- del nombre del template, asi que dos contratos distintos conviven y una copia
-- duplicada del mismo contrato queda bloqueada.
--
-- Se restringe a beneficiary_id IS NULL: los contratos del titular. Las DDJJ de
-- adherentes no entran.
--
-- Si falla al crearse, la base tiene el mismo contrato final duplicado: listarlos
-- primero y ARCHIVARLOS (is_final = false + sufijo "(ANULADO - duplicado)"), nunca
-- borrarlos. Ojo: el trigger trg_protect_closed_sale_documents bloquea des-finalizar
-- en ventas cerradas, asi que la limpieza va ANTES de crear los triggers, o hay que
-- deshabilitarlo y reactivarlo dentro de la misma transaccion.

DROP INDEX IF EXISTS public.uq_documents_contrato_final_por_venta;

CREATE UNIQUE INDEX IF NOT EXISTS uq_documents_contrato_final_por_venta
  ON public.documents (sale_id, name)
  WHERE document_type = 'contrato' AND is_final = true AND beneficiary_id IS NULL;
