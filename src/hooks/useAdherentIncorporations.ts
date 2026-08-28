import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getClientDisplayName, getClientDocument } from '@/lib/clientUtils';

/**
 * Incorporación de Adherente ("Anexo de Incorporación de Adherente").
 *
 * MODELO — por qué una VENTA-OPERACIÓN y no sumar el adherente a la venta madre:
 *
 * 1. Firma: todo el circuito filtra por `sale_id`. En particular
 *    `useSignatureLinkPublic` borra los documentos finales del destinatario
 *    antes de sellar; si el anexo colgara de la venta madre, el titular al
 *    firmarlo BORRARÍA el contrato original ya firmado.
 * 2. Comisiones: hay un índice único que permite liquidar cada venta UNA sola
 *    vez en la historia. Si solo subiéramos el total de la venta madre, el
 *    vendedor nunca podría cobrar la incorporación, y fallaría en silencio.
 *
 * Con `sale_id` propio, el flujo de firma existente funciona tal cual y la
 * comisión se liquida sola. La venta madre no se toca hasta que el anexo se
 * completa, momento en el que se le agregan los adherentes de verdad.
 *
 * Un anexo puede incorporar VARIAS personas:
 *   1 anexo = 1 venta-operación = N filas en `adherent_incorporations`
 */

import { SALE_TYPE_INCORPORACION } from '@/lib/saleFilters';

export { SALE_TYPE_INCORPORACION };

export interface IncorporationAdherentInput {
  first_name: string;
  last_name: string;
  dni?: string;
  relationship?: string;
  birth_date?: string | null;
  gender?: string;
  phone?: string;
  email?: string;
  address?: string;
  barrio?: string;
  city?: string;
  amount: number;
  entry_date?: string | null;
  /** null = hereda la vigencia inmediata de la venta. */
  immediate_coverage?: boolean | null;
}

/**
 * Devuelve la venta enriquecida con `group_monthly_total`: la cuota mensual
 * del GRUPO COMPLETO una vez incorporadas las personas del anexo.
 *
 * El documento pide "la cuota mensual ... por todo el grupo de personas que
 * conforman el contrato", pero el anexo se genera en el contexto de la
 * venta-operación, cuyo total es solo el de las personas que entran.
 *
 * No se resuelve inflando el total de la operación porque ESE total es la base
 * de cálculo de la comisión: si se lo llevara al total del grupo, el vendedor
 * cobraría comisión sobre el contrato entero y no sobre la incorporación.
 *
 * Para cualquier venta que no sea una incorporación devuelve la venta tal cual.
 */
export const attachGroupMonthlyTotal = async (sale: any): Promise<any> => {
  if (!sale || sale.sale_type !== SALE_TYPE_INCORPORACION) return sale;

  const { data: inc } = await supabase
    .from('adherent_incorporations')
    .select('parent_sale_id')
    .eq('operation_sale_id', sale.id)
    .not('parent_sale_id', 'is', null)
    .limit(1)
    .maybeSingle();

  if (!inc?.parent_sale_id) return sale;

  const { data: parent } = await supabase
    .from('sales')
    .select('total_amount')
    .eq('id', inc.parent_sale_id)
    .maybeSingle();

  return {
    ...sale,
    group_monthly_total: Number(parent?.total_amount || 0) + Number(sale.total_amount || 0),
  };
};

/** Incorporaciones de un contrato madre, con su venta-operación. */
export const useAdherentIncorporations = (parentSaleId?: string) => {
  return useQuery({
    queryKey: ['adherent-incorporations', parentSaleId],
    queryFn: async () => {
      if (!parentSaleId) return [];
      const { data, error } = await supabase
        .from('adherent_incorporations')
        .select('*, operation_sale:operation_sale_id (id, contract_number, status, total_amount, sale_date)')
        .eq('parent_sale_id', parentSaleId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!parentSaleId,
  });
};

export const useCreateAdherentIncorporation = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      parentSaleId,
      adherents,
    }: {
      parentSaleId: string;
      adherents: IncorporationAdherentInput[];
    }) => {
      if (!adherents.length) throw new Error('Agregá al menos un adherente.');

      // 1. Contrato madre + titular (snapshot para el documento)
      const { data: parent, error: parentError } = await supabase
        .from('sales')
        .select(`
          id, company_id, client_id, plan_id, salesperson_id, immediate_coverage,
          clients:client_id ( first_name, last_name, dni, client_type, razon_social, ruc, email, phone )
        `)
        .eq('id', parentSaleId)
        .maybeSingle();

      if (parentError) throw parentError;
      if (!parent) throw new Error('No se encontró el contrato de origen.');

      const cliente: any = (parent as any).clients || {};
      // Mayúsculas del titular tal cual están: no transformar (bug conocido
      // de nombres en minúscula en el bloque de firma).
      const titularName = getClientDisplayName(cliente);

      const totalAdherentes = adherents.reduce((sum, a) => sum + (Number(a.amount) || 0), 0);

      // 2. Venta-operación. El trigger le asigna un número de la serie
      //    ANX-YYYY-NNNNNN, separada de la de contratos.
      const { data: operationSale, error: saleError } = await supabase
        .from('sales')
        .insert({
          company_id: (parent as any).company_id,
          client_id: (parent as any).client_id,
          plan_id: (parent as any).plan_id,
          salesperson_id: (parent as any).salesperson_id,
          sale_type: SALE_TYPE_INCORPORACION,
          status: 'borrador',
          total_amount: totalAdherentes,
          sale_date: new Date().toISOString().slice(0, 10),
          immediate_coverage: (parent as any).immediate_coverage ?? false,
          // La venta-operación no es una venta comercial: es el vehículo para
          // firmar un anexo sobre un contrato que YA pasó auditoría. Con el
          // default 'pendiente', SaleTemplatesTab bloquea el alta de plantillas
          // y la incorporación queda creada pero sin poder emitir el anexo.
          // Solo afecta a ventas-operación; ninguna venta real cambia.
          audit_status: 'aprobado_para_templates',
        } as any)
        .select()
        .single();

      if (saleError) throw saleError;

      // A partir de acá, si algo falla hay que deshacer la venta-operación
      // para no dejar basura colgada.
      try {
        // 3. Los adherentes se crean en la VENTA-OPERACIÓN: así el motor de
        //    plantillas arma la tabla del anexo solo con ellos, y el circuito
        //    de firma les genera su DDJJ sin tocar la venta madre.
        const { data: createdBeneficiaries, error: benError } = await supabase
          .from('beneficiaries')
          .insert(
            adherents.map((a) => ({
              sale_id: operationSale.id,
              first_name: a.first_name,
              last_name: a.last_name,
              dni: a.dni || null,
              document_number: a.dni || null,
              relationship: a.relationship || null,
              birth_date: a.birth_date || null,
              gender: a.gender || null,
              phone: a.phone || null,
              email: a.email || null,
              address: a.address || null,
              barrio: a.barrio || null,
              city: a.city || null,
              amount: Number(a.amount) || 0,
              entry_date: a.entry_date || null,
              immediate_coverage: a.immediate_coverage ?? null,
              is_primary: false,
            })) as any
          )
          .select();

        if (benError) throw benError;

        // 4. Una fila de incorporación por adherente.
        const { error: incError } = await supabase.from('adherent_incorporations').insert(
          adherents.map((a, i) => ({
            company_id: (parent as any).company_id,
            client_id: (parent as any).client_id,
            operation_sale_id: operationSale.id,
            parent_sale_id: parentSaleId,
            plan_id: (parent as any).plan_id,
            titular_name: titularName,
            titular_document: getClientDocument(cliente) || null,
            titular_email: cliente.email || null,
            titular_phone: cliente.phone || null,
            adherent_first_name: a.first_name,
            adherent_last_name: a.last_name,
            adherent_document_number: a.dni || null,
            adherent_birth_date: a.birth_date || null,
            adherent_relationship: a.relationship || null,
            adherent_email: a.email || null,
            adherent_phone: a.phone || null,
            adherent_amount: Number(a.amount) || 0,
            coverage_start_date: a.entry_date || null,
            // Vocabulario de adherent_incorporations: la tabla usa estados en
            // INGLÉS ('draft','sent','signed','completed','cancelled') y
            // source en ('existing_sale','external_sale'). No confundir con
            // sales.status, que sí es en español. Escribir 'borrador'/'manual'
            // acá revienta con 23514 (adherent_incorporations_status_check).
            status: 'draft',
            source: 'existing_sale',
            // Adherente que vive en la venta-operación mientras se firma.
            operation_beneficiary_id: createdBeneficiaries?.[i]?.id || null,
            // Se llena recién al activar (por trigger), con el adherente
            // definitivo creado en la venta madre.
            activated_beneficiary_id: null,
          }))
        );

        if (incError) throw incError;

        return { operationSale, beneficiaries: createdBeneficiaries };
      } catch (err) {
        // Rollback manual: no hay transacción entre llamadas REST.
        await supabase.from('sales').delete().eq('id', operationSale.id);
        throw err;
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['adherent-incorporations', variables.parentSaleId] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      toast({
        title: 'Incorporación creada',
        description: 'Ya podés generar y enviar a firmar el Anexo de Incorporación.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo crear la incorporación.',
        variant: 'destructive',
      });
    },
  });
};

/** Estados desde los que todavía se puede tocar una incorporación. */
/**
 * Estados de la VENTA-OPERACIÓN en los que el anexo todavía se puede tocar.
 *
 * `adherent_incorporations.status` NO alcanza como guarda: nadie escribe nunca
 * 'sent' ni 'signed' —el único salto real es draft → completed, y lo hace el
 * trigger recién cuando la venta-operación llega a 'completado'—. O sea que
 * mientras el titular ya firmó y falta la contratada, la venta-operación está
 * en 'firmado' pero la incorporación sigue en 'draft'.
 *
 * Sin esta guarda, en esa ventana la edición pasa el guard de lifecycle (que
 * sólo mira OLD.status <> 'draft') y después revienta con 42501 al tocar el
 * beneficiario del contrato firmado, dejando el snapshot editado y el
 * beneficiario sin tocar: justo la divergencia que se quería evitar. Y el PDF
 * ya firmado no se regenera.
 */
const OPERATION_EDITABLE_STATUSES = ['borrador'];

/** Cancelar se admite hasta que alguien haya firmado. */
const OPERATION_CANCELABLE_STATUSES = ['borrador', 'enviado', 'pendiente'];

const EDITABLE_STATUS = 'draft';
const CANCELABLE_STATUSES = ['draft', 'sent'];

/**
 * Corrige los datos del adherente de una incorporación que todavía está en
 * borrador (típicamente un error de tipeo detectado antes de enviar a firmar).
 *
 * Escribe en los DOS lados: la fila de `adherent_incorporations` (que es el
 * snapshot con el que se arma el anexo) y el beneficiario de la venta-operación
 * (que es el que firma y el que después se copia al contrato madre). Si sólo se
 * tocara uno, el documento y la persona incorporada dirían cosas distintas.
 *
 * Después de `draft` no se puede editar: el anexo ya se generó y puede estar
 * firmado. Ahí el camino es cancelar y crear una nueva.
 */
export const useUpdateAdherentIncorporation = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      adherent,
    }: {
      id: string;
      adherent: IncorporationAdherentInput;
    }) => {
      const { data: actual, error: readError } = await supabase
        .from('adherent_incorporations')
        .select(
          'id, status, operation_beneficiary_id, parent_sale_id, operation_sale:operation_sale_id (status)',
        )
        .eq('id', id)
        .maybeSingle();

      if (readError) throw readError;
      if (!actual) throw new Error('No se encontró la incorporación.');
      if (actual.status !== EDITABLE_STATUS) {
        throw new Error(
          'La incorporación ya fue enviada a firmar y no se puede editar. Cancelala y creá una nueva.',
        );
      }
      const estadoOperacion = (actual.operation_sale as { status?: string } | null)?.status;
      if (estadoOperacion && !OPERATION_EDITABLE_STATUSES.includes(estadoOperacion)) {
        throw new Error(
          'El anexo ya se emitió o se está firmando: editarlo dejaría el PDF firmado diciendo una cosa y la base otra. Cancelalo y creá uno nuevo.',
        );
      }

      const { error: incError } = await supabase
        .from('adherent_incorporations')
        .update({
          adherent_first_name: adherent.first_name,
          adherent_last_name: adherent.last_name,
          adherent_document_number: adherent.dni || null,
          adherent_birth_date: adherent.birth_date || null,
          adherent_relationship: adherent.relationship || null,
          adherent_email: adherent.email || null,
          adherent_phone: adherent.phone || null,
          adherent_amount: Number(adherent.amount) || 0,
          coverage_start_date: adherent.entry_date || null,
        })
        .eq('id', id);

      if (incError) throw incError;

      if (actual.operation_beneficiary_id) {
        // El trigger de `beneficiaries` recalcula solo el total de la
        // venta-operación, que es la base de cálculo de la comisión.
        const { error: benError } = await supabase
          .from('beneficiaries')
          .update({
            first_name: adherent.first_name,
            last_name: adherent.last_name,
            dni: adherent.dni || null,
            document_number: adherent.dni || null,
            relationship: adherent.relationship || null,
            birth_date: adherent.birth_date || null,
            gender: adherent.gender || null,
            phone: adherent.phone || null,
            email: adherent.email || null,
            address: adherent.address || null,
            barrio: adherent.barrio || null,
            city: adherent.city || null,
            amount: Number(adherent.amount) || 0,
            entry_date: adherent.entry_date || null,
            immediate_coverage: adherent.immediate_coverage ?? null,
          } as any)
          .eq('id', actual.operation_beneficiary_id);

        if (benError) throw benError;
      }

      return actual;
    },
    onSuccess: (actual: any) => {
      queryClient.invalidateQueries({ queryKey: ['adherent-incorporations', actual?.parent_sale_id] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      toast({ title: 'Incorporación actualizada' });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo actualizar la incorporación.',
        variant: 'destructive',
      });
    },
  });
};

/**
 * Cancela una incorporación que todavía no se activó.
 *
 * NO borra nada: deja la fila en `cancelled` y la venta-operación en
 * `cancelado`. Una incorporación ya activada no se cancela desde acá — sus
 * adherentes ya están en el contrato madre y revertir eso es un problema
 * contable, no de pantalla.
 */
export const useCancelAdherentIncorporation = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const { data: actual, error: readError } = await supabase
        .from('adherent_incorporations')
        .select(
          'id, status, operation_sale_id, parent_sale_id, activated_beneficiary_id, operation_sale:operation_sale_id (status)',
        )
        .eq('id', id)
        .maybeSingle();

      if (readError) throw readError;
      if (!actual) throw new Error('No se encontró la incorporación.');
      if (actual.activated_beneficiary_id || actual.status === 'completed') {
        throw new Error(
          'La incorporación ya fue activada: el adherente está en el contrato. No se puede cancelar.',
        );
      }
      const estadoOperacion = (actual.operation_sale as { status?: string } | null)?.status;
      if (estadoOperacion && !OPERATION_CANCELABLE_STATUSES.includes(estadoOperacion)) {
        throw new Error(
          `No se puede cancelar: el anexo ya está en estado "${estadoOperacion}". Si alguien firmó, hay que anularlo por el circuito de la venta.`,
        );
      }
      if (!CANCELABLE_STATUSES.includes(actual.status)) {
        throw new Error(`No se puede cancelar una incorporación en estado "${actual.status}".`);
      }

      const { error: incError } = await supabase
        .from('adherent_incorporations')
        .update({ status: 'cancelled' })
        .eq('id', id);

      if (incError) throw incError;

      if (actual.operation_sale_id) {
        const { error: saleError } = await supabase
          .from('sales')
          .update({ status: 'cancelado' } as any)
          .eq('id', actual.operation_sale_id);

        if (saleError) throw saleError;
      }

      return actual;
    },
    onSuccess: (actual: any) => {
      queryClient.invalidateQueries({ queryKey: ['adherent-incorporations', actual?.parent_sale_id] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      toast({
        title: 'Incorporación cancelada',
        description: 'Queda registrada como cancelada; no se borró nada.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo cancelar la incorporación.',
        variant: 'destructive',
      });
    },
  });
};
