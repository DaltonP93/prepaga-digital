import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { PDFDocument, StandardFonts, rgb } from 'https://esm.sh/pdf-lib@1.17.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-signature-token',
}

async function sha256(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const {
      sale_id,
      signature_link_id,
      verification_id,
      document_hash,
      signature_method,
      signer_name,
      signer_dni,
      signer_email,
      signer_phone,
      consent_text,
    } = await req.json();

    const ip = req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';
    const timestamp = new Date().toISOString();

    // Fetch verification record
    let verificationData: any = null;
    if (verification_id) {
      const { data } = await supabase
        .from('signature_identity_verification')
        .select('*')
        .eq('id', verification_id)
        .single();
      verificationData = data;
    }

    // Build OTP hash (from stored verification)
    const otpHash = verificationData?.otp_code_hash || 'N/A';
    const channel = verificationData?.channel || 'N/A';
    const verifiedAt = verificationData?.verified_at || 'N/A';

    // Generate chained event hash: SHA256(document_hash + otp_hash + timestamp + ip)
    const chainInput = `${document_hash || 'none'}${otpHash}${timestamp}${ip}`;
    const eventHash = await sha256(chainInput);

    // Fetch company info
    let companyName = 'N/A';
    if (sale_id) {
      const { data: sale } = await supabase
        .from('sales')
        .select('company_id, companies(name)')
        .eq('id', sale_id)
        .single();
      if (sale?.companies) {
        companyName = (sale.companies as any).name || 'N/A';
      }
    }

    // Build evidence JSON with all forensic data
    const evidenceJson = {
      schema_version: '2.0',
      timestamp,
      signer: {
        name: signer_name || null,
        dni: signer_dni || null,
        email: signer_email || null,
        phone: signer_phone || null,
      },
      identity_verification: {
        verification_id: verification_id || null,
        channel,
        result: verificationData?.result || null,
        verified_at: verifiedAt,
        attempts: verificationData?.attempts || 0,
        otp_hash: otpHash,
      },
      signature: {
        method: signature_method || 'canvas_draw',
        ip_address: ip,
        user_agent: userAgent,
      },
      hashes: {
        document_hash: document_hash || null,
        otp_hash: otpHash,
        event_hash: eventHash,
        chain_formula: 'SHA256(document_hash + otp_hash + timestamp + ip)',
      },
      consent: consent_text || null,
      legal_framework: {
        law: 'Ley N° 4017/2010 — República del Paraguay',
        standards: ['ISO 29115', 'ISO 14533', 'ISO 27001', 'UNCITRAL'],
      },
    };

    // Store evidence bundle in DB
    const { data: bundle, error: bundleError } = await supabase
      .from('signature_evidence_bundles')
      .insert({
        sale_id,
        signature_link_id: signature_link_id || null,
        document_hash: document_hash || 'pending',
        bundle_hash: eventHash,
        evidence_json: evidenceJson,
      })
      .select()
      .single();

    if (bundleError) {
      console.error('Error storing evidence bundle:', bundleError);
    }

    // Store hash anchor
    if (bundle?.id) {
      await supabase
        .from('hash_anchors')
        .insert({
          evidence_bundle_id: bundle.id,
          hash_value: eventHash,
          anchor_type: 'internal',
          anchor_reference: `evidence_bundle:${bundle.id}`,
        });
    }

    // Generate PDF
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const page = pdfDoc.addPage([595, 842]); // A4
    const { height } = page.getSize();
    let y = height - 50;
    const leftMargin = 50;
    const maxWidth = 495;

    const drawTitle = (text: string) => {
      y -= 30;
      page.drawText(text, { x: leftMargin, y, size: 16, font: boldFont, color: rgb(0.1, 0.1, 0.3) });
      y -= 5;
    };

    const drawSection = (title: string) => {
      y -= 22;
      page.drawText(title, { x: leftMargin, y, size: 11, font: boldFont, color: rgb(0.2, 0.2, 0.5) });
      y -= 3;
    };

    const drawLine = (label: string, value: string) => {
      y -= 16;
      page.drawText(`${label}: `, { x: leftMargin + 10, y, size: 9, font: boldFont });
      // Truncate long values
      const displayValue = value.length > 80 ? value.slice(0, 77) + '...' : value;
      page.drawText(displayValue, { x: leftMargin + 10 + label.length * 5.5 + 5, y, size: 9, font });
    };

    const drawHash = (label: string, hash: string) => {
      y -= 16;
      page.drawText(`${label}:`, { x: leftMargin + 10, y, size: 9, font: boldFont });
      y -= 14;
      page.drawText(hash, { x: leftMargin + 15, y, size: 7, font, color: rgb(0.3, 0.3, 0.3) });
    };

    // Header
    drawTitle('CERTIFICADO DE FIRMA ELECTRÓNICA');
    y -= 5;
    page.drawText('Evidencia probatoria — Ley N° 4017/2010 (Paraguay)', {
      x: leftMargin, y, size: 9, font, color: rgb(0.4, 0.4, 0.4),
    });

    // Company & Sale
    drawSection('DATOS DE LA OPERACIÓN');
    drawLine('Empresa', companyName);
    drawLine('ID Venta', sale_id || 'N/A');
    drawLine('ID Link Firma', signature_link_id || 'N/A');
    drawLine('Fecha/Hora (ISO 8601)', timestamp);

    // Signer
    drawSection('DATOS DEL FIRMANTE');
    drawLine('Nombre', signer_name || 'N/A');
    drawLine('C.I. / DNI', signer_dni || 'N/A');
    drawLine('Email', signer_email || 'N/A');
    drawLine('Teléfono', signer_phone || 'N/A');

    // Identity Verification
    drawSection('VERIFICACIÓN DE IDENTIDAD');
    drawLine('ID Verificación', verification_id || 'N/A');
    drawLine('Canal', channel);
    drawLine('Resultado', verificationData?.result || 'N/A');
    drawLine('Verificado en', verifiedAt);
    drawLine('Intentos', String(verificationData?.attempts || 0));

    // Signature
    drawSection('FIRMA');
    drawLine('Método', signature_method || 'canvas_draw');
    drawLine('IP Pública', ip);
    drawLine('User Agent', userAgent.slice(0, 80));

    // Cryptographic Evidence
    drawSection('EVIDENCIA CRIPTOGRÁFICA');
    drawHash('Hash del Documento (SHA-256)', document_hash || 'N/A');
    drawHash('Hash del OTP (SHA-256)', otpHash);
    drawHash('Hash Encadenado del Evento (SHA-256)', eventHash);

    y -= 10;
    page.drawText('Fórmula: SHA256(document_hash + otp_hash + timestamp + ip)', {
      x: leftMargin + 15, y, size: 7, font, color: rgb(0.5, 0.5, 0.5),
    });

    // Legal framework
    drawSection('MARCO LEGAL');
    y -= 16;
    const legalLines = [
      '• Ley N° 4017/2010 — Validez jurídica de la firma electrónica (Paraguay)',
      '• ISO 29115 — Niveles de aseguramiento de identidad',
      '• ISO 14533 — Perfiles de firma electrónica',
      '• ISO 27001 — Gestión de seguridad de la información',
      '• Principios UNCITRAL sobre firma electrónica',
    ];
    for (const line of legalLines) {
      page.drawText(line, { x: leftMargin + 10, y, size: 8, font, color: rgb(0.3, 0.3, 0.3) });
      y -= 13;
    }

    // Consent
    if (consent_text) {
      drawSection('CONSENTIMIENTO REGISTRADO');
      y -= 16;
      const consentDisplay = consent_text.length > 200 ? consent_text.slice(0, 197) + '...' : consent_text;
      page.drawText(consentDisplay, { x: leftMargin + 10, y, size: 8, font });
    }

    // Footer
    y = 40;
    page.drawText(`Generado automáticamente el ${timestamp}`, {
      x: leftMargin, y, size: 7, font, color: rgb(0.5, 0.5, 0.5),
    });
    page.drawText(`ID Evidence Bundle: ${bundle?.id || 'N/A'}`, {
      x: leftMargin, y: y - 10, size: 7, font, color: rgb(0.5, 0.5, 0.5),
    });

    const pdfBytes = await pdfDoc.save();

    // Upload to storage
    let pdfUrl: string | null = null;
    if (bundle?.id && sale_id) {
      const fileName = `evidence/${sale_id}/${bundle.id}.pdf`;
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, pdfBytes, {
          contentType: 'application/pdf',
          upsert: true,
        });

      if (uploadError) {
        console.error('Error uploading evidence PDF:', uploadError);
      } else {
        pdfUrl = fileName;
        // Update bundle with storage URL
        await supabase
          .from('signature_evidence_bundles')
          .update({ storage_url: pdfUrl })
          .eq('id', bundle.id);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      evidence_bundle_id: bundle?.id,
      event_hash: eventHash,
      pdf_url: pdfUrl,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Generate evidence PDF error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
