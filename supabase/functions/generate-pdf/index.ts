import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import puppeteer from "https://deno.land/x/puppeteer@16.2.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper functions for TipTap content processing
function processTipTapContent(htmlContent: string, dynamicFields: any[], clientData: any): string {
  let processedContent = htmlContent;

  // Default sample data for placeholders (when clientData is not provided)
  const defaultData: Record<string, string> = {
    NOMBRE_CLIENTE: clientData.nombre || 'Juan Carlos',
    APELLIDO_CLIENTE: clientData.apellido || 'González',
    DNI_CI_CLIENTE: clientData.dni || '2.123.456',
    EMAIL_CLIENTE: clientData.email || 'juan.gonzalez@email.com',
    TELEFONO_CLIENTE: clientData.telefono || '0981-123456',
    DOMICILIO_CLIENTE: clientData.domicilio || 'Av. España 1234, Asunción',
    BARRIO_CLIENTE: clientData.barrio || 'Centro',
    ESTADO_CIVIL_CLIENTE: clientData.estado_civil || 'Casado',
    FECHA_NACIMIENTO_CLIENTE: clientData.fecha_nacimiento || '15/05/1985',
    FECHA_ACTUAL: new Date().toLocaleDateString('es-PY'),
    EMPRESA_NOMBRE: 'Aseguradora Ejemplo S.A.',
    PLAN_NOMBRE: clientData.plan_nombre || 'Plan Salud Premium',
    PLAN_PRECIO: clientData.plan_precio || '850.000',
  };

  // Process dynamic placeholders from TipTap
  dynamicFields.forEach(field => {
    // Replace TipTap placeholder elements with actual values
    const placeholderRegex = new RegExp(
      `<span[^>]*data-placeholder="${field.name}"[^>]*>\\{${field.name}\\}</span>`, 
      'g'
    );
    
    const value = clientData[field.name] || defaultData[field.name] || `[${field.label}]`;
    const styledValue = `<span class="dynamic-field">${value}</span>`;
    
    processedContent = processedContent.replace(placeholderRegex, styledValue);
  });

  // Process signature fields from TipTap
  processedContent = processedContent.replace(
    /<div[^>]*data-signature="true"[^>]*>.*?<\/div>/g,
    `<div class="signature-field">
      <div class="signature-label">Campo de Firma</div>
      <div class="signature-content">
        <p>Firma pendiente</p>
        <p style="font-size: 12px; color: #6b7280;">
          Este documento será firmado digitalmente
        </p>
      </div>
    </div>`
  );

  // Clean up TipTap editor artifacts
  processedContent = processedContent.replace(
    /class="prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none[^"]*"/g,
    'class="prose"'
  );

  return processedContent;
}

function getDocumentTitle(documentType: string, templateData: any): string {
  const titles: Record<string, string> = {
    contract: 'CONTRATO DE SEGURO',
    declaration: 'DECLARACIÓN JURADA',
    questionnaire: 'CUESTIONARIO',
    other: 'DOCUMENTO LEGAL'
  };

  return templateData.name || titles[documentType] || 'DOCUMENTO LEGAL';
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      htmlContent, 
      filename, 
      saleId, 
      documentType = 'contract',
      dynamicFields = [],
      clientData = {},
      templateData = {} 
    } = await req.json();

    // Initialize Supabase client for audit logging
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Log PDF generation attempt
    await supabase.rpc('log_audit', {
      p_table_name: 'documents',
      p_action: 'pdf_generation_started',
      p_record_id: saleId,
      p_new_values: { 
        filename, 
        documentType,
        fields_count: dynamicFields.length,
        has_client_data: Object.keys(clientData).length > 0
      },
      p_request_path: '/functions/v1/generate-pdf',
      p_request_method: 'POST'
    });

    // Process TipTap content and replace placeholders
    const processedContent = processTipTapContent(htmlContent, dynamicFields, clientData);

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

          /* TipTap prose styles */
          .prose {
            max-width: 100%;
            line-height: 1.75;
          }

          .prose h1, .prose h2, .prose h3 {
            color: #1f2937;
            font-weight: bold;
            margin-top: 2em;
            margin-bottom: 1em;
            line-height: 1.25;
            page-break-after: avoid;
          }

          .prose h1 { font-size: 2em; }
          .prose h2 { font-size: 1.5em; }
          .prose h3 { font-size: 1.25em; }

          .prose p {
            margin-top: 1.25em;
            margin-bottom: 1.25em;
            orphans: 3;
            widows: 3;
          }

          .prose strong { font-weight: 600; color: #1f2937; }
          .prose em { font-style: italic; }
          .prose u { text-decoration: underline; }

          .prose ul, .prose ol {
            margin-top: 1.25em;
            margin-bottom: 1.25em;
            padding-left: 1.625em;
          }

          .prose li {
            margin-top: 0.5em;
            margin-bottom: 0.5em;
          }

          .prose blockquote {
            font-weight: 500;
            font-style: italic;
            color: #1f2937;
            border-left: 0.25rem solid #d1d5db;
            quotes: "\\201C""\\201D""\\2018""\\2019";
            margin-top: 1.6em;
            margin-bottom: 1.6em;
            padding-left: 1em;
          }

          .prose img {
            max-width: 100%;
            height: auto;
            border-radius: 0.375rem;
            margin: 1.5em 0;
            page-break-inside: avoid;
          }

          /* Dynamic field styles */
          .dynamic-field {
            background-color: #fef3c7;
            color: #92400e;
            padding: 2px 6px;
            border-radius: 4px;
            font-weight: 500;
            white-space: nowrap;
          }

          /* Signature field styles */
          .signature-field {
            border: 2px solid #374151;
            background: #f9fafb;
            padding: 40px 20px;
            text-align: center;
            border-radius: 8px;
            margin: 30px 0;
            min-height: 120px;
            position: relative;
            page-break-inside: avoid;
          }

          .signature-field.signed {
            background: #f0f9ff;
            border-color: #0ea5e9;
          }

          .signature-field .signature-label {
            position: absolute;
            top: -12px;
            left: 20px;
            background: white;
            padding: 0 8px;
            font-size: 12px;
            color: #6b7280;
            font-weight: 500;
          }

          .signature-content {
            font-weight: 600;
            color: #1f2937;
          }
          
          .header {
            border-bottom: 3px solid #2563eb;
            padding-bottom: 20px;
            margin-bottom: 30px;
            page-break-after: avoid;
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
            page-break-inside: avoid;
          }
          
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            font-size: 12px;
            color: #666;
            text-align: center;
            page-break-inside: avoid;
          }

          .page-break {
            page-break-before: always;
          }
          
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
            page-break-inside: avoid;
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

          /* Print optimizations */
          @media print {
            .prose { font-size: 11pt; }
            .dynamic-field { 
              background-color: #fef3c7 !important; 
              -webkit-print-color-adjust: exact; 
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="document-title">${getDocumentTitle(documentType, templateData)}</div>
          <div style="text-align: right; font-size: 12px; color: #666;">
            Generado el: ${new Date().toLocaleDateString('es-ES', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </div>
        </div>
        
        <div class="prose">
          ${processedContent}
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
        status: 'success',
        fields_processed: dynamicFields.length,
        processing_time: Date.now()
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