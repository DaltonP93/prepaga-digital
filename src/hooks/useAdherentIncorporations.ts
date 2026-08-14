import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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

// `adherent_incorporations` todavía no está en types.ts (hay que regenerarlo
// después de aplicar las migraciones), así que se accede sin tipar.
const db = supabase as any;

/** Incorporaciones de un contrato madre, con su venta-operación. */
export const useAdherentIncorporations = (parentSaleId?: string) => {
  return useQuery({
    queryKey: ['adherent-incorporations', parentSaleId],
    queryFn: async () => {
      if (!parentSaleId) return [];
      const { data, error } = await db
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
          clients:client_id ( first_name, last_name, dni, email, phone )
        `)
        .eq('id', parentSaleId)
        .maybeSingle();

      if (parentError) throw parentError;
      if (!parent) throw new Error('No se encontró el contrato de origen.');

      const cliente: any = (parent as any).clients || {};
      // Mayúsculas del titular tal cual están: no transformar (bug conocido
      // de nombres en minúscula en el bloque de firma).
      const titularName = `${cliente.first_name || ''} ${cliente.last_name || ''}`.trim();

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
        const { error: incError } = await db.from('adherent_incorporations').insert(
          adherents.map((a, i) => ({
            company_id: (parent as any).company_id,
            client_id: (parent as any).client_id,
            operation_sale_id: operationSale.id,
            parent_sale_id: parentSaleId,
            plan_id: (parent as any).plan_id,
            titular_name: titularName,
            titular_document: cliente.dni || null,
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
            status: 'borrador',
            source: 'manual',
            // Se llena recién al activar, con el adherente real de la venta madre.
            activated_beneficiary_id: null,
            // Referencia al beneficiario provisorio de la venta-operación.
            notes: createdBeneficiaries?.[i]?.id
              ? `beneficiario_operacion:${createdBeneficiaries[i].id}`
              : null,
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
