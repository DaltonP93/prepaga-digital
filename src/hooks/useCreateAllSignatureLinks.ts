import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface GeneratedLink {
  type: 'titular' | 'adherente';
  name?: string;
  email: string;
  token: string;
  expires_at: string;
}

export const useCreateAllSignatureLinks = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ saleId }: { saleId: string }): Promise<GeneratedLink[]> => {
      // 1. Obtener datos de la venta con joins
      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .select('*, clients(*), beneficiaries(*)')
        .eq('id', saleId)
        .single();

      if (saleError || !sale) {
        throw new Error('Venta no encontrada');
      }

      if (!sale.clients) {
        throw new Error('La venta debe tener un cliente asignado');
      }

      const results: GeneratedLink[] = [];
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 1); // 24 horas

      // 2. Generar enlace para titular
      const titularToken = crypto.randomUUID();

      const { data: titularLink, error: titularError } = await supabase
        .from('signature_links')
        .insert({
          sale_id: saleId,
          token: titularToken,
          recipient_type: 'titular',
          recipient_email: sale.clients.email || '',
          recipient_phone: sale.clients.phone || null,
          recipient_id: sale.client_id,
          expires_at: expiresAt.toISOString(),
          status: 'pendiente',
        })
        .select()
        .single();

      if (titularError) {
        console.error('Error creating titular link:', titularError);
      } else if (titularLink) {
        results.push({
          type: 'titular',
          name: `${sale.clients.first_name} ${sale.clients.last_name}`,
          email: sale.clients.email || '',
          token: titularLink.token,
          expires_at: titularLink.expires_at,
        });
      }

      // 3. Generar enlaces para adherentes que requieren firma
      if (sale.beneficiaries && Array.isArray(sale.beneficiaries) && sale.beneficiaries.length > 0) {
        for (const beneficiary of sale.beneficiaries) {
          // Solo generar enlace si signature_required no es false
          if (beneficiary.signature_required !== false && beneficiary.email) {
            const adhToken = crypto.randomUUID();
            const adhExpiresAt = new Date();
            adhExpiresAt.setDate(adhExpiresAt.getDate() + 1); // 24 horas

            const { data: adhLink, error: adhError } = await supabase
              .from('signature_links')
              .insert({
                sale_id: saleId,
                token: adhToken,
                recipient_type: 'adherente',
                recipient_email: beneficiary.email,
                recipient_phone: beneficiary.phone || null,
                recipient_id: beneficiary.id,
                expires_at: adhExpiresAt.toISOString(),
                status: 'pendiente',
              })
              .select()
              .single();

            if (adhError) {
              console.error(`Error creating link for beneficiary ${beneficiary.id}:`, adhError);
            } else if (adhLink) {
              results.push({
                type: 'adherente',
                name: `${beneficiary.first_name} ${beneficiary.last_name}`,
                email: beneficiary.email,
                token: adhLink.token,
                expires_at: adhLink.expires_at,
              });
            }
          }
        }
      }

      if (results.length === 0) {
        throw new Error('No se pudieron generar enlaces. Verifica que el cliente y adherentes tengan email.');
      }

      return results;
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ['signature-links'] });

      const titularCount = results.filter(r => r.type === 'titular').length;
      const adherenteCount = results.filter(r => r.type === 'adherente').length;

      toast.success(
        `${results.length} enlace(s) generado(s) exitosamente: ${titularCount} titular, ${adherenteCount} adherente(s)`
      );
    },
    onError: (error: any) => {
      console.error('Error generating signature links:', error);
      toast.error(error.message || 'Error al generar enlaces de firma');
    },
  });
};
