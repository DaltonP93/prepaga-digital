
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import puppeteer from "https://deno.land/x/puppeteer@16.2.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { htmlContent, filename, saleId, documentType = 'contract' } = await req.json();

    // Initialize Supabase client for audit logging
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Log PDF generation attempt
    await supabase.rpc('log_audit', {
      p_table_name: 'documents',
      p_action: 'pdf_generation_started',
      p_record_id: saleId,
      p_new_values: { filename, documentType },
      p_request_path: '/functions/v1/generate-pdf',
      p_request_method: 'POST'
    });

    // Enhanced HTML template with professional styling
    const enhancedHtml = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${filename}</title>
        <style>
          @page {
            size: A4;
            margin: 20mm 15mm 25mm 15mm;
            @bottom-center {
              content: "Página " counter(page) " de " counter(pages);
              font-size: 10px;
              color: #666;
            }
          }
          
          body {
            font-family: 'Arial', 'Helvetica', sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 0;
          }
          
          .header {
            border-bottom: 3px solid #2563eb;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          
          .company-logo {
            max-height: 60px;
            margin-bottom: 10px;
          }
          
          .document-title {
            font-size: 24px;
            font-weight: bold;
            color: #1f2937;
            margin: 20px 0;
            text-align: center;
          }
          
          .client-info {
            background: #f8fafc;
            padding: 20px;
            border-left: 4px solid #2563eb;
            margin: 20px 0;
          }
          
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin: 20px 0;
          }
          
          .info-item {
            padding: 10px 0;
            border-bottom: 1px solid #e5e7eb;
          }
          
          .info-label {
            font-weight: bold;
            color: #374151;
            display: inline-block;
            min-width: 120px;
          }
          
          .info-value {
            color: #1f2937;
          }
          
          .section {
            margin: 30px 0;
            page-break-inside: avoid;
          }
          
          .section-title {
            font-size: 18px;
            font-weight: bold;
            color: #1f2937;
            border-bottom: 2px solid #e5e7eb;
            padding-bottom: 10px;
            margin-bottom: 15px;
          }
          
          .signature-area {
            margin-top: 50px;
            padding: 30px;
            border: 2px solid #e5e7eb;
            background: #fafafa;
            text-align: center;
          }
          
          .signature-line {
            border-top: 1px solid #333;
            margin: 40px auto 10px;
            width: 200px;
          }
          
          .signature-label {
            font-size: 12px;
            color: #666;
          }
          
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            font-size: 12px;
            color: #666;
            text-align: center;
          }
          
          .watermark {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-45deg);
            font-size: 60px;
            color: rgba(0, 0, 0, 0.1);
            z-index: -1;
            pointer-events: none;
          }
          
          .page-break {
            page-break-before: always;
          }
          
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
          }
          
          th, td {
            border: 1px solid #e5e7eb;
            padding: 12px;
            text-align: left;
          }
          
          th {
            background-color: #f8fafc;
            font-weight: bold;
          }
          
          .highlight {
            background-color: #fef3c7;
            padding: 15px;
            border-left: 4px solid #f59e0b;
            margin: 15px 0;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="document-title">${documentType === 'contract' ? 'CONTRATO DE SEGURO' : 'DOCUMENTO LEGAL'}</div>
          <div style="text-align: right; font-size: 12px; color: #666;">
            Generado el: ${new Date().toLocaleDateString('es-ES', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </div>
        </div>
        
        ${htmlContent}
        
        <div class="signature-area">
          <h3>FIRMAS</h3>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 50px; margin-top: 40px;">
            <div>
              <div class="signature-line"></div>
              <div class="signature-label">Firma del Cliente</div>
              <div style="margin-top: 10px; font-size: 11px;">
                Fecha: ________________
              </div>
            </div>
            <div>
              <div class="signature-line"></div>
              <div class="signature-label">Representante de la Empresa</div>
              <div style="margin-top: 10px; font-size: 11px;">
                Fecha: ________________
              </div>
            </div>
          </div>
        </div>
        
        <div class="footer">
          <p>Este documento ha sido generado digitalmente y es válido sin firma física cuando se complete el proceso de firma digital.</p>
          <p>Documento ID: ${saleId || 'N/A'} | Generado: ${new Date().toISOString()}</p>
        </div>
      </body>
      </html>
    `;

    // Launch browser and create PDF
    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    
    const page = await browser.newPage();
    await page.setContent(enhancedHtml, { waitUntil: 'networkidle0' });
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '25mm',
        left: '15mm'
      },
      displayHeaderFooter: true,
      headerTemplate: '<div></div>',
      footerTemplate: `
        <div style="font-size: 10px; color: #666; text-align: center; width: 100%;">
          <span class="pageNumber"></span> / <span class="totalPages"></span>
        </div>
      `
    });

    await browser.close();

    // Log successful PDF generation
    await supabase.rpc('log_audit', {
      p_table_name: 'documents',
      p_action: 'pdf_generated',
      p_record_id: saleId,
      p_new_values: { 
        filename, 
        documentType,
        pdfSize: pdfBuffer.length,
        status: 'success'
      },
      p_request_path: '/functions/v1/generate-pdf',
      p_request_method: 'POST'
    });

    return new Response(pdfBuffer, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('Error generating PDF:', error);
    
    // Log PDF generation failure
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      await supabase.rpc('log_audit', {
        p_table_name: 'documents',
        p_action: 'pdf_generation_failed',
        p_new_values: { 
          error: error.message,
          status: 'failed'
        },
        p_request_path: '/functions/v1/generate-pdf',
        p_request_method: 'POST'
      });
    } catch (auditError) {
      console.error('Error logging PDF failure:', auditError);
    }
    
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
