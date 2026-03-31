import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getSignatureLinkUrl } from "../_shared/public-app-url.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceKey)

    const { token, clientIp, userAgent } = await req.json()

    if (!token) {
      return new Response(JSON.stringify({ ok: false, error: 'Invalid or expired token' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 1. Validate token and get signature link
    const { data: link, error: linkError } = await supabase
      .from('signature_links')
      .select('id, sale_id, recipient_type, recipient_id, status, step_order')
      .eq('token', token)
      .gt('expires_at', new Date().toISOString())
      .neq('status', 'revocado')
      .single()

    if (linkError || !link) {
      return new Response(JSON.stringify({ ok: false, error: 'Invalid or expired token' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const result: Record<string, any> = {
      ok: true,
      signed_documents: 0,
      activated_contratada: false,
    }

    // 2. Trigger PAdES signing for appropriate documents
    const signedDocIds: string[] = []
    try {
      const { count, docIds } = await triggerPadesSigning(supabase, link, supabaseUrl, serviceKey)
      result.signed_documents = count
      signedDocIds.push(...docIds)
    } catch (padesErr) {
      console.error('PAdES signing error (non-blocking):', padesErr)
      result.pades_error = String(padesErr)
    }

    // 2b. Generate evidence certificates for successfully signed docs
    for (const docId of signedDocIds) {
      try {
        await fetch(`${supabaseUrl}/functions/v1/generate-evidence-certificate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${serviceKey}` },
          body: JSON.stringify({ document_id: docId, signature_link_id: link.id }),
        })
      } catch (certErr) {
        console.error('Evidence certificate error (non-blocking):', certErr)
      }
    }

    // 3. Sequential activation: if titular/adherentes completed, activate contratada
    try {
      const activated = await activateNextStep(supabase, link, supabaseUrl, serviceKey)
      result.activated_contratada = activated
    } catch (activateErr) {
      console.error('Activation error (non-blocking):', activateErr)
    }

    // 4. Log process trace
    try {
      await supabase.from('process_traces').insert({
        sale_id: link.sale_id,
        action: 'finalize_signature_link',
        details: {
          signature_link_id: link.id,
          recipient_type: link.recipient_type,
          client_ip: clientIp,
          user_agent: userAgent?.substring(0, 200),
          signed_documents: result.signed_documents,
          activated_contratada: result.activated_contratada,
        },
      })
    } catch { /* non-blocking */ }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('finalize-signature-link error:', error)
    return new Response(JSON.stringify({ ok: false, error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

/**
 * Trigger PAdES PDF signing based on document taxonomy:
 * - contrato: only signed when contratada completes (last signer)
 * - ddjj_salud: signed immediately when the assigned individual finishes
 * - anexo: excluded from automatic PAdES signing
 */
async function triggerPadesSigning(
  supabase: any,
  link: any,
  supabaseUrl: string,
  serviceKey: string
): Promise<{ count: number; docIds: string[] }> {
  let signedCount = 0
  const signedDocIds: string[] = []

  // Get documents for this sale
  const { data: docs } = await supabase
    .from('documents')
    .select('id, document_type, beneficiary_id, base_pdf_url, signed_pdf_url, is_final, content, name, sale_id')
    .eq('sale_id', link.sale_id)
    .eq('is_final', true)
    .neq('document_type', 'firma')

  if (!docs || docs.length === 0) return { count: 0, docIds: [] }

  for (const doc of docs) {
    // Skip if already has signed PDF
    if (doc.signed_pdf_url) continue
    // Skip anexos
    if (doc.document_type === 'anexo') continue

    const isContract = doc.document_type === 'contrato'
    const isDDJJ = doc.document_type === 'ddjj_salud'

    // Contract: only sign when contratada finishes
    if (isContract && link.recipient_type !== 'contratada') {
      // Check if there's a pending contratada link
      const { data: contratadaLinks } = await supabase
        .from('signature_links')
        .select('id, status')
        .eq('sale_id', link.sale_id)
        .eq('recipient_type', 'contratada')
        .neq('status', 'revocado')

      if (contratadaLinks && contratadaLinks.some((cl: any) => cl.status !== 'completado')) {
        continue // Skip — contratada hasn't signed yet
      }
    }

    // DDJJ: adherente only signs their own
    if (isDDJJ && link.recipient_type === 'adherente' && link.recipient_id) {
      if (doc.beneficiary_id !== link.recipient_id) continue
    }

    // Step 1: Generate base PDF if not exists
    if (!doc.base_pdf_url) {
      try {
        const genResponse = await fetch(`${supabaseUrl}/functions/v1/generate-base-pdf`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({ document_id: doc.id }),
        })
        const genResult = await genResponse.json()
        if (!genResult.success) {
          console.error(`generate-base-pdf failed for doc ${doc.id}:`, genResult)
          continue
        }
        doc.base_pdf_url = genResult.base_pdf_url
      } catch (err) {
        console.error(`generate-base-pdf error for doc ${doc.id}:`, err)
        continue
      }
    }

    // Step 2: PAdES sign the document
    try {
      const signResponse = await fetch(`${supabaseUrl}/functions/v1/pades-sign-document`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({ document_id: doc.id }),
      })
      const signResult = await signResponse.json()
      if (signResult.success) {
        signedCount++
        signedDocIds.push(doc.id)
      } else {
        console.error(`pades-sign-document failed for doc ${doc.id}:`, signResult)
      }
    } catch (err) {
      console.error(`pades-sign-document error for doc ${doc.id}:`, err)
    }
  }

  return { count: signedCount, docIds: signedDocIds }
}

/**
 * Activate next step in sequential signing flow.
 * When all step_order=1 links are completed, activate step_order=2 (contratada).
 */
async function activateNextStep(
  supabase: any,
  link: any,
  supabaseUrl: string,
  serviceKey: string
): Promise<boolean> {
  // Only check if the completing link is step 1
  if (link.step_order !== 1) return false

  // Check if ALL step 1 links are completed
  const { data: step1Links } = await supabase
    .from('signature_links')
    .select('id, status')
    .eq('sale_id', link.sale_id)
    .eq('step_order', 1)
    .neq('status', 'revocado')

  if (!step1Links) return false

  const allStep1Done = step1Links.every((l: any) => l.status === 'completado')
  if (!allStep1Done) return false

  // Activate step 2 links (contratada)
  let { data: step2Links } = await supabase
    .from('signature_links')
    .select('id, recipient_email, recipient_phone, token')
    .eq('sale_id', link.sale_id)
    .eq('step_order', 2)
    .eq('is_active', false)
    .neq('status', 'revocado')

  // If no step 2 link exists, create it from company_settings (mode=link)
  if (!step2Links || step2Links.length === 0) {
    const { data: sale } = await supabase
      .from('sales')
      .select('company_id')
      .eq('id', link.sale_id)
      .single()

    if (sale) {
      const { data: cs } = await supabase
        .from('company_settings')
        .select('contratada_signature_mode, contratada_signer_email, contratada_signer_phone, contratada_signer_name')
        .eq('company_id', sale.company_id)
        .single()

      if (cs?.contratada_signature_mode === 'link' && cs?.contratada_signer_email) {
        const contratadaToken = crypto.randomUUID()
        const expiresAt = new Date()
        expiresAt.setDate(expiresAt.getDate() + 3)

        const { data: newLink } = await supabase
          .from('signature_links')
          .insert({
            sale_id: link.sale_id,
            token: contratadaToken,
            recipient_type: 'contratada',
            recipient_email: cs.contratada_signer_email,
            recipient_phone: cs.contratada_signer_phone || null,
            recipient_id: null,
            expires_at: expiresAt.toISOString(),
            status: 'pendiente',
            step_order: 2,
            is_active: true,
          })
          .select('id, recipient_email, recipient_phone, token')
          .single()

        if (newLink) {
          step2Links = [newLink]
        }
      }
    }
  }

  if (!step2Links || step2Links.length === 0) return false

  // Activate them
  await supabase
    .from('signature_links')
    .update({ is_active: true })
    .eq('sale_id', link.sale_id)
    .eq('step_order', 2)
    .eq('is_active', false)

  // Send WhatsApp notification to contratada
  for (const s2Link of step2Links) {
    if (s2Link.recipient_phone) {
      try {
        // Get company info for the notification
        const { data: sale } = await supabase
          .from('sales')
          .select('company_id, companies:company_id(name)')
          .eq('id', link.sale_id)
          .single()

        const companyName = (sale?.companies as any)?.name || 'La empresa'
        const signerName = s2Link.recipient_name || companySettings?.contratada_signer_name || 'Representante Legal'

        await fetch(`${supabaseUrl}/functions/v1/send-whatsapp`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({
            to: `595${s2Link.recipient_phone}`,
            templateName: 'signature_link',
            templateData: {
              clientName: 'Representante Legal',
              companyName,
              signatureUrl: getSignatureLinkUrl(s2Link.token),
              expirationDate: 'en 3 días',
            },
            companyId: sale?.company_id,
            messageType: 'signature_link',
          }),
        })
      } catch (waErr) {
        console.error('WhatsApp notification to contratada failed:', waErr)
      }
    }
  }

  return true
}
