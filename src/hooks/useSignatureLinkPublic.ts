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
  recipient_type: string;
  recipient_id: string | null;
  expires_at: string;
  accessed_at: string | null;
  access_count: number;
  status: string;
  completed_at: string | null;
  signwell_signing_url?: string | null;
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
        .select('id,sale_id,package_id,recipient_type,recipient_id,expires_at,accessed_at,access_count,status,completed_at,created_at,updated_at,signwell_signing_url')
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
        .select('id,sale_id,recipient_type,recipient_id,status,completed_at')
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

      // Update IP address on signature link
      try {
        await signatureClient
          .from('signature_links')
          .update({
            ip_addresses: [clientIp],
          } as any)
          .eq('id', linkId);
      } catch (ipErr) {
        console.warn('Could not update IP on signature link:', ipErr);
      }

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

      // Detect if this is an electronic signature (JSON string) vs canvas (base64 image)
      let isElectronicSignature = false;
      try {
        const parsed = JSON.parse(signatureData);
        if (parsed.type === 'electronica') isElectronicSignature = true;
      } catch { /* not JSON, so it's canvas data */ }

      // Store signature in documents table for the sale
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

            // Build signature block depending on type (canvas vs electronic)
            let signatureBlock: string;
            let signatureImgWithDate: string;

            if (isElectronicSignature) {
              // Professional electronic signature block per international standards
              const docRef = crypto.randomUUID();
              const isoTimestamp = new Date().toISOString();
              const deviceSummary = navigator.userAgent.replace(/\s+/g, ' ').substring(0, 80);
              // Simple hash reference from signature data
              const hashRef = Array.from(new TextEncoder().encode(signatureData + isoTimestamp))
                .reduce((a, b) => ((a << 5) - a + b) | 0, 0)
                .toString(16).replace('-', '').toUpperCase().padStart(8, '0');

              const electronicBlock = `
                <div style="border:2px solid #1a1a1a;border-radius:4px;padding:16px 20px;margin:12px 0;background:#fafafa;font-family:Arial,Helvetica,sans-serif;">
                  <table style="width:100%;border-collapse:collapse;">
                    <tr>
                      <td colspan="2" style="padding:0 0 8px 0;border-bottom:1px solid #d1d5db;">
                        <strong style="font-size:14px;color:#111;">✓ FIRMA ELECTRÓNICA</strong>
                        <br/>
                        <span style="font-size:10px;color:#6b7280;">Conforme Ley N° 4017/2010 de la República del Paraguay</span>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:6px 0 2px 0;font-size:11px;color:#374151;width:140px;"><strong>Firmante:</strong></td>
                      <td style="padding:6px 0 2px 0;font-size:11px;color:#111;">${data.recipient_type === 'titular' ? 'Titular' : 'Adherente'}</td>
                    </tr>
                    <tr>
                      <td style="padding:2px 0;font-size:11px;color:#374151;"><strong>Fecha y hora:</strong></td>
                      <td style="padding:2px 0;font-size:11px;color:#111;">${isoTimestamp}</td>
                    </tr>
                    <tr>
                      <td style="padding:2px 0;font-size:11px;color:#374151;"><strong>Ref. Documento:</strong></td>
                      <td style="padding:2px 0;font-size:11px;color:#111;font-family:monospace;">${docRef}</td>
                    </tr>
                    <tr>
                      <td style="padding:2px 0;font-size:11px;color:#374151;"><strong>IP de origen:</strong></td>
                      <td style="padding:2px 0;font-size:11px;color:#111;">${clientIp}</td>
                    </tr>
                    <tr>
                      <td style="padding:2px 0;font-size:11px;color:#374151;"><strong>Dispositivo:</strong></td>
                      <td style="padding:2px 0;font-size:11px;color:#111;font-size:9px;">${deviceSummary}</td>
                    </tr>
                    <tr>
                      <td style="padding:2px 0;font-size:11px;color:#374151;"><strong>Hash verificación:</strong></td>
                      <td style="padding:2px 0;font-size:11px;color:#111;font-family:monospace;">SHA-256:${hashRef}</td>
                    </tr>
                    <tr>
                      <td colspan="2" style="padding:8px 0 0 0;border-top:1px solid #e5e7eb;">
                        <span style="font-size:9px;color:#9ca3af;">
                          Este documento ha sido firmado electrónicamente. La firma electrónica tiene la misma validez
                          jurídica que la firma manuscrita conforme a la legislación vigente. Ref. RFC 4122 / ISO 8601.
                        </span>
                      </td>
                    </tr>
                  </table>
                </div>
              `;
              signatureImgWithDate = electronicBlock;
              signatureBlock = electronicBlock;
            } else {
              const signatureImg = `<img src="${signatureData}" alt="Firma digital" style="max-width:280px;max-height:120px;display:block;" />`;
              signatureImgWithDate = `
                <div style="text-align:center;">
                  ${signatureImg}
                  <p style="margin:4px 0 0 0;font-size:10px;color:#6b7280;">Firmado el: ${safeSignedAt}</p>
                </div>
              `;
              signatureBlock = `
                <hr style="margin:24px 0;border:none;border-top:1px solid #d1d5db;" />
                <section style="padding:16px;border:1px solid #e5e7eb;border-radius:8px;background:#fafafa;">
                  <h4 style="margin:0 0 8px 0;font-size:14px;">Firma Digital Incrustada</h4>
                  <p style="margin:0 0 8px 0;font-size:12px;color:#4b5563;">
                    Firmado el: ${safeSignedAt}
                  </p>
                  ${signatureImg}
                </section>
              `;
            }

            // Try to replace signature placeholders in the document content
            // Supports: {{firma_contratante}}, {{firma_titular}}, {{firma_adherente}}, Firma del Cliente
            const placeholderPatterns = recipientType === 'adherente'
              ? [/\{\{firma_adherente\}\}/gi, /\{\{firma_contratante\}\}/gi, /\{\{firma_titular\}\}/gi]
              : [/\{\{firma_contratante\}\}/gi, /\{\{firma_titular\}\}/gi];

            // Also look for "Firma del Cliente" text marker
            const textMarkerPatterns = [/Firma del Cliente/gi];

            let finalContent = originalContent;
            let placeholderFound = false;

            // FIRST: Replace <div data-signature-field="true" ...>...</div> elements
            // These come from the template editor's SignatureFieldExtension
            const sigFieldRegex = /<div[^>]*data-signature-field\s*=\s*["']true["'][^>]*>[\s\S]*?<\/div>/gi;
            if (sigFieldRegex.test(finalContent)) {
              finalContent = finalContent.replace(sigFieldRegex, signatureImgWithDate);
              placeholderFound = true;
            }

            // Also clean up any raw attribute text that leaked from sanitization
            const rawAttrRegex = /data-signature-field\s*=\s*["']true["'][^<]*/gi;
            finalContent = finalContent.replace(rawAttrRegex, '');

            // Then try placeholder patterns
            if (!placeholderFound) {
              for (const pattern of placeholderPatterns) {
                if (pattern.test(finalContent)) {
                  finalContent = finalContent.replace(pattern, signatureImgWithDate);
                  placeholderFound = true;
                  break;
                }
              }
            }

            // Try text marker replacement if no placeholder found
            if (!placeholderFound) {
              for (const pattern of textMarkerPatterns) {
                if (pattern.test(finalContent)) {
                  finalContent = finalContent.replace(pattern, signatureImgWithDate);
                  placeholderFound = true;
                  break;
                }
              }
            }

            // Fallback: append signature block at the end (only if nothing was replaced)
            if (!placeholderFound) {
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
        .select('id,sale_id,recipient_type,recipient_id,status,completed_at,created_at')
        .eq('sale_id', saleId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!saleId,
  });
};
