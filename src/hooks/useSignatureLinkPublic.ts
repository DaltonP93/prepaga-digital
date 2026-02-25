import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@supabase/supabase-js';
import { useToast } from '@/hooks/use-toast';

const SUPABASE_URL = "https://ykducvvcjzdpoojxlsig.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlrZHVjdnZjanpkcG9vanhsc2lnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwNzgwNzQsImV4cCI6MjA4NTY1NDA3NH0.SpX3e1GgENTB3kpQPPedPds0E13vxDeOmnmFYSJhfPM";

const createSignatureClient = (token: string) => {
  return createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    global: {
      headers: {
        'x-signature-token': token,
      },
    },
  });
};

interface SignatureLinkData {
  id: string;
  sale_id: string;
  package_id: string | null;
  token: string;
  recipient_type: string;
  recipient_id: string | null;
  recipient_email: string | null;
  recipient_phone: string | null;
  expires_at: string;
  accessed_at: string | null;
  access_count: number;
  ip_addresses: any;
  status: string;
  completed_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string | null;
  sale?: {
    id: string;
    contract_number: string | null;
    status: string;
    sale_date: string;
    total_amount: number;
    clients: {
      first_name: string;
      last_name: string;
      email: string | null;
      phone: string | null;
      dni: string | null;
    } | null;
    plans: {
      name: string;
      price: number;
      description: string | null;
    } | null;
    companies: {
      name: string;
      logo_url: string | null;
      primary_color: string | null;
    } | null;
    beneficiaries: Array<{
      id: string;
      first_name: string;
      last_name: string;
      dni: string | null;
    }>;
  };
}

export const useSignatureLinkByToken = (token: string) => {
  return useQuery({
    queryKey: ['signature-link-public', token],
    queryFn: async () => {
      if (!token) throw new Error('Token is required');

      const signatureClient = createSignatureClient(token);

      const { data: linkData, error: linkError } = await signatureClient
        .from('signature_links')
        .select('*')
        .eq('token', token)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (linkError) {
        console.error('Error fetching signature link:', linkError);
        throw new Error('Enlace no válido o expirado');
      }

      // Increment access count
      await signatureClient
        .from('signature_links')
        .update({ 
          access_count: (linkData.access_count || 0) + 1,
          accessed_at: new Date().toISOString()
        })
        .eq('id', linkData.id);

      // Get sale data with beneficiaries
      const { data: saleData, error: saleError } = await signatureClient
        .from('sales')
        .select(`
          id,
          contract_number,
          status,
          sale_date,
          total_amount,
          clients:client_id (
            first_name,
            last_name,
            email,
            phone,
            dni
          ),
          plans:plan_id (
            name,
            price,
            description
          ),
          companies:company_id (
            name,
            logo_url,
            primary_color
          ),
          beneficiaries (
            id,
            first_name,
            last_name,
            dni
          )
        `)
        .eq('id', linkData.sale_id)
        .single();

      if (saleError) {
        console.error('Error fetching sale data:', saleError);
        throw new Error('No se pudo cargar la información de la venta');
      }

      return {
        ...linkData,
        sale: saleData as any,
      } as SignatureLinkData;
    },
    enabled: !!token,
    retry: 2,
    staleTime: 1000 * 60,
  });
};

export const useSubmitSignatureLink = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      linkId,
      token,
      signatureData,
    }: {
      linkId: string;
      token: string;
      signatureData: string;
    }) => {
      const signatureClient = createSignatureClient(token);

      let clientIp = 'unknown';
      try {
        const ipResponse = await fetch('https://api.ipify.org?format=json');
        const ipData = await ipResponse.json();
        clientIp = ipData.ip;
      } catch {
        console.log('Could not fetch client IP');
      }

      const { data, error } = await signatureClient
        .from('signature_links')
        .update({
          status: 'completado',
          completed_at: new Date().toISOString(),
        })
        .eq('id', linkId)
        .select()
        .single();

      if (error) {
        console.error('Error updating signature link:', error);
        throw error;
      }

      // Log workflow step
      const { data: existingSteps } = await signatureClient
        .from('signature_workflow_steps')
        .select('step_order')
        .eq('signature_link_id', linkId)
        .order('step_order', { ascending: false })
        .limit(1);

      const nextStepOrder = (existingSteps?.[0]?.step_order || 0) + 1;

      const isSignWellCompletion = signatureData === 'signwell_completed';

      await signatureClient
        .from('signature_workflow_steps')
        .insert({
          signature_link_id: linkId,
          step_order: nextStepOrder,
          step_type: 'signature_completed',
          status: 'completado',
          completed_at: new Date().toISOString(),
          data: {
            signed_ip: clientIp,
            user_agent: navigator.userAgent,
            signature_data_length: signatureData.length,
            signwell: isSignWellCompletion,
          },
        });

      // For SignWell completions, skip canvas-specific document embedding
      // SignWell handles the signed PDF on their platform
      if (isSignWellCompletion) {
        // Log in process_traces for audit trail
        try {
          await signatureClient
            .from('process_traces')
            .insert({
              sale_id: data.sale_id,
              action: 'firma_completada',
              details: {
                recipient_type: data.recipient_type,
                recipient_id: data.recipient_id,
                signed_ip: clientIp,
                signature_link_id: linkId,
                completed_at: new Date().toISOString(),
                provider: 'signwell',
              },
            });
        } catch (traceErr) {
          console.warn('Could not log process trace:', traceErr);
        }
        return data;
      }

      // Store signature in documents table for the sale (canvas flow)
      try {
        await signatureClient
          .from('documents')
          .insert({
            sale_id: data.sale_id,
            name: `Firma - ${data.recipient_type === 'titular' ? 'Titular' : 'Adherente'}`,
            document_type: 'firma',
            content: signatureData,
            status: 'firmado' as any,
            signed_at: new Date().toISOString(),
            beneficiary_id: data.recipient_id || null,
            requires_signature: false,
            is_final: true,
          });
      } catch (docErr) {
        console.warn('Could not save signature document:', docErr);
      }

      // Build final signed documents with embedded signature (canvas flow)
      try {
        const recipientType = data.recipient_type;
        const recipientId = data.recipient_id;

        // First, delete any existing final copies for this recipient to avoid duplicates
        let deleteQuery = signatureClient
          .from('documents')
          .delete()
          .eq('sale_id', data.sale_id)
          .eq('is_final', true)
          .neq('document_type', 'firma');

        if (recipientType === 'adherente' && recipientId) {
          deleteQuery = deleteQuery.eq('beneficiary_id', recipientId);
        } else if (recipientType === 'titular') {
          deleteQuery = deleteQuery.is('beneficiary_id', null);
        }
        await deleteQuery;

        let docsQuery = signatureClient
          .from('documents')
          .select('*')
          .eq('sale_id', data.sale_id)
          .neq('document_type', 'firma')
          .eq('is_final', false);

        if (recipientType === 'adherente' && recipientId) {
          docsQuery = docsQuery.eq('beneficiary_id', recipientId);
        } else if (recipientType === 'titular') {
          docsQuery = docsQuery.is('beneficiary_id', null);
        }

        const { data: docsToSign, error: docsError } = await docsQuery;
        if (docsError) throw docsError;

        if (docsToSign && docsToSign.length > 0) {
          const nowIso = new Date().toISOString();
          const safeSignedAt = new Date().toLocaleString('es-PY');

          const finalDocs = docsToSign.map((doc) => {
            const originalContent = doc.content?.trim()
              ? doc.content
              : `
                  <div>
                    <h3>${doc.name}</h3>
                    <p>Documento firmado digitalmente.</p>
                    ${doc.file_url ? `<p><strong>Archivo original:</strong> ${doc.file_url}</p>` : ''}
                  </div>
                `;

            // Inline signature image to replace placeholder in template
            const signatureImg = `<img src="${signatureData}" alt="Firma digital" style="max-width:280px;max-height:120px;display:block;" />`;
            const signatureImgWithDate = `
              <div style="text-align:center;">
                ${signatureImg}
                <p style="margin:4px 0 0 0;font-size:10px;color:#6b7280;">Firmado el: ${safeSignedAt}</p>
              </div>
            `;

            // Try to replace signature placeholders in the document content
            // Supports: {{firma_contratante}}, {{firma_titular}}, {{firma_adherente}}
            const placeholderPatterns = recipientType === 'adherente'
              ? [/\{\{firma_adherente\}\}/gi, /\{\{firma_contratante\}\}/gi, /\{\{firma_titular\}\}/gi]
              : [/\{\{firma_contratante\}\}/gi, /\{\{firma_titular\}\}/gi];

            let finalContent = originalContent;
            let placeholderFound = false;

            for (const pattern of placeholderPatterns) {
              if (pattern.test(finalContent)) {
                finalContent = finalContent.replace(pattern, signatureImgWithDate);
                placeholderFound = true;
                break;
              }
            }

            // Fallback: if no placeholder found, append signature block at the end
            if (!placeholderFound) {
              const signatureBlock = `
                <hr style="margin:24px 0;border:none;border-top:1px solid #d1d5db;" />
                <section style="padding:16px;border:1px solid #e5e7eb;border-radius:8px;background:#fafafa;">
                  <h4 style="margin:0 0 8px 0;font-size:14px;">Firma Digital Incrustada</h4>
                  <p style="margin:0 0 8px 0;font-size:12px;color:#4b5563;">
                    Firmado el: ${safeSignedAt}
                  </p>
                  ${signatureImg}
                </section>
              `;
              finalContent = `${finalContent}${signatureBlock}`;
            }

            return {
              sale_id: doc.sale_id,
              beneficiary_id: doc.beneficiary_id,
              name: `${doc.name} (Firmado)`,
              document_type: doc.document_type ? `${doc.document_type}_firmado` : 'documento_firmado',
              document_type_id: doc.document_type_id,
              generated_from_template: doc.generated_from_template,
              requires_signature: false,
              is_final: true,
              status: 'firmado' as const,
              signed_at: nowIso,
              signed_by: null,
              signature_data: signatureData,
              file_url: null,
              content: finalContent,
              version: (doc.version || 1) + 1,
            };
          });

          await signatureClient.from('documents').insert(finalDocs as any);

          await signatureClient
            .from('documents')
            .update({
              status: 'firmado',
              signed_at: nowIso,
              signature_data: signatureData,
            } as any)
            .in('id', docsToSign.map((d) => d.id));
        }
      } catch (signedDocsErr) {
        console.warn('Could not build signed final documents:', signedDocsErr);
      }

      // Log in process_traces for audit trail
      try {
        await signatureClient
          .from('process_traces')
          .insert({
            sale_id: data.sale_id,
            action: 'firma_completada',
            details: {
              recipient_type: data.recipient_type,
              recipient_id: data.recipient_id,
              signed_ip: clientIp,
              signature_link_id: linkId,
              completed_at: new Date().toISOString(),
            },
          });
      } catch (traceErr) {
        console.warn('Could not log process trace:', traceErr);
      }

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['signature-link-public', variables.token] });
      toast({
        title: "¡Firma completada!",
        description: "Su firma ha sido registrada exitosamente.",
      });
    },
    onError: (error: any) => {
      console.error('Error submitting signature:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo registrar la firma. Inténtelo nuevamente.",
        variant: "destructive",
      });
    },
  });
};

/**
 * Fetch documents filtered by recipient type:
 * - titular: sees ALL documents
 * - adherente: sees only their own DDJJ (filtered by beneficiary_id)
 */
export const useSignatureLinkDocuments = (
  saleId: string | undefined, 
  recipientType?: string,
  recipientId?: string | null,
  token?: string
) => {
  return useQuery({
    queryKey: ['signature-link-documents', saleId, recipientType, recipientId],
    queryFn: async () => {
      if (!saleId) return [];

      // Use token-authenticated client so RLS policies work
      const client = token 
        ? createSignatureClient(token)
        : createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

      let query = client
        .from('documents')
        .select('*')
        .eq('sale_id', saleId)
        .neq('document_type', 'firma') // Exclude signature images
        .order('created_at', { ascending: true });

      if (recipientType === 'adherente' && recipientId) {
        // Adherente only sees their own documents
        query = query.eq('beneficiary_id', recipientId);
      } else if (recipientType === 'titular') {
        // Titular sees only documents without a beneficiary_id (their own docs)
        // Adherent-specific DDJJ docs have beneficiary_id set and should NOT appear here
        query = query.is('beneficiary_id', null);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching documents:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!saleId,
  });
};

/**
 * Fetch all signature links for a sale to show completion status to titular
 */
export const useAllSignatureLinksPublic = (saleId: string | undefined, token?: string) => {
  return useQuery({
    queryKey: ['all-signature-links-public', saleId],
    queryFn: async () => {
      if (!saleId) return [];
      const client = token
        ? createSignatureClient(token)
        : createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
      const { data, error } = await client
        .from('signature_links')
        .select('*')
        .eq('sale_id', saleId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!saleId,
  });
};
