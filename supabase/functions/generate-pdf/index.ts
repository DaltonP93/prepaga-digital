import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface GeneratePDFRequest {
  templateId?: string;
  saleId?: string;
  htmlContent?: string;
  filename: string;
  documentType?: 'contract' | 'declaration' | 'questionnaire' | 'other';
  includeSignatureFields?: boolean;
  includeBeneficiariesTable?: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { 
      templateId, 
      saleId, 
      htmlContent,
      filename,
      documentType = 'contract',
      includeSignatureFields = false,
      includeBeneficiariesTable = true,
    }: GeneratePDFRequest = await req.json()

    let processedContent = htmlContent || ''
    let templateData: any = null

    // If templateId provided, fetch template
    if (templateId) {
      const { data: template, error: templateError } = await supabase
        .from('templates')
        .select('*')
        .eq('id', templateId)
        .single()

      if (templateError) {
        throw new Error(`Template not found: ${templateError.message}`)
      }
      
      templateData = template
      processedContent = template.content || template.static_content || ''
    }

    // If saleId provided, fetch sale data and interpolate
    if (saleId) {
      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .select(`
          *,
          clients:client_id (*),
          plans:plan_id (*),
          companies:company_id (*),
          beneficiaries (*)
        `)
        .eq('id', saleId)
        .single()

      if (saleError) {
        console.error('Error fetching sale:', saleError)
      } else if (sale) {
        // Replace template variables with sale data
        processedContent = interpolateTemplateVariables(processedContent, {
          cliente: {
            nombre: sale.clients?.first_name || '',
            apellido: sale.clients?.last_name || '',
            nombreCompleto: `${sale.clients?.first_name || ''} ${sale.clients?.last_name || ''}`.trim(),
            email: sale.clients?.email || '',
            telefono: sale.clients?.phone || '',
            dni: sale.clients?.dni || '',
            direccion: sale.clients?.address || '',
          },
          plan: {
            nombre: sale.plans?.name || '',
            precio: sale.plans?.price || 0,
            precioFormateado: `$${(sale.plans?.price || 0).toLocaleString()}`,
            descripcion: sale.plans?.description || '',
          },
          empresa: {
            nombre: sale.companies?.name || '',
            email: sale.companies?.email || '',
            telefono: sale.companies?.phone || '',
            direccion: sale.companies?.address || '',
          },
          venta: {
            fecha: sale.sale_date ? new Date(sale.sale_date).toLocaleDateString('es-ES') : '',
            total: sale.total_amount || 0,
            totalFormateado: `$${(sale.total_amount || 0).toLocaleString()}`,
            numeroContrato: sale.contract_number || '',
            estado: sale.status || '',
          },
          fecha: {
            actual: new Date().toLocaleDateString('es-ES'),
            actualFormateada: new Date().toLocaleDateString('es-ES', { 
              day: 'numeric', 
              month: 'long', 
              year: 'numeric' 
            }),
          },
        })

        // Add beneficiaries table if requested
        if (includeBeneficiariesTable && sale.beneficiaries?.length > 0) {
          const beneficiariesTable = generateBeneficiariesTableHTML(sale.beneficiaries)
          processedContent = processedContent.replace(
            /\{\{tabla_beneficiarios\}\}/gi, 
            beneficiariesTable
          )
        }
      }
    }

    // Generate full HTML document for PDF
    const fullHtmlDocument = generatePDFHtml(processedContent, {
      title: filename,
      documentType,
      includeSignatureFields,
    })

    // Return HTML that can be converted to PDF on client side using html2pdf or similar
    return new Response(JSON.stringify({
      success: true,
      html: fullHtmlDocument,
      filename: filename.endsWith('.pdf') ? filename : `${filename}.pdf`,
      templateName: templateData?.name || 'Documento',
      metadata: {
        generatedAt: new Date().toISOString(),
        documentType,
        saleId,
        templateId,
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Error generating PDF:', error)
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})

// Interpolate template variables
function interpolateTemplateVariables(template: string, data: any): string {
  let result = template

  const replaceNested = (obj: any, prefix: string) => {
    if (!obj || typeof obj !== 'object') return
    Object.keys(obj).forEach(key => {
      const value = obj[key]
      const placeholder = `{{${prefix}.${key}}}`
      const regex = new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
      if (value !== null && value !== undefined && typeof value !== 'object') {
        result = result.replace(regex, String(value))
      }
    })
  }

  replaceNested(data.cliente, 'cliente')
  replaceNested(data.plan, 'plan')
  replaceNested(data.empresa, 'empresa')
  replaceNested(data.venta, 'venta')
  replaceNested(data.fecha, 'fecha')

  return result
}

// Generate beneficiaries table HTML
function generateBeneficiariesTableHTML(beneficiaries: any[]): string {
  if (!beneficiaries || beneficiaries.length === 0) return ''

  return `
    <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 12px;">
      <thead>
        <tr style="background-color: #f3f4f6;">
          <th style="border: 1px solid #d1d5db; padding: 10px; text-align: left;">#</th>
          <th style="border: 1px solid #d1d5db; padding: 10px; text-align: left;">Nombre Completo</th>
          <th style="border: 1px solid #d1d5db; padding: 10px; text-align: left;">Documento</th>
          <th style="border: 1px solid #d1d5db; padding: 10px; text-align: left;">Parentesco</th>
          <th style="border: 1px solid #d1d5db; padding: 10px; text-align: left;">Fecha Nac.</th>
          <th style="border: 1px solid #d1d5db; padding: 10px; text-align: right;">Cobertura</th>
        </tr>
      </thead>
      <tbody>
        ${beneficiaries.map((b, i) => `
          <tr>
            <td style="border: 1px solid #d1d5db; padding: 8px;">${i + 1}</td>
            <td style="border: 1px solid #d1d5db; padding: 8px;">${b.first_name || ''} ${b.last_name || ''}</td>
            <td style="border: 1px solid #d1d5db; padding: 8px;">${b.document_number || b.dni || ''}</td>
            <td style="border: 1px solid #d1d5db; padding: 8px;">${b.relationship || 'Titular'}</td>
            <td style="border: 1px solid #d1d5db; padding: 8px;">${b.birth_date ? new Date(b.birth_date).toLocaleDateString('es-ES') : ''}</td>
            <td style="border: 1px solid #d1d5db; padding: 8px; text-align: right;">$${(b.amount || 0).toLocaleString()}</td>
          </tr>
        `).join('')}
      </tbody>
      <tfoot>
        <tr style="background-color: #f9fafb; font-weight: bold;">
          <td colspan="5" style="border: 1px solid #d1d5db; padding: 10px; text-align: right;">Total:</td>
          <td style="border: 1px solid #d1d5db; padding: 10px; text-align: right;">
            $${beneficiaries.reduce((sum, b) => sum + (b.amount || 0), 0).toLocaleString()}
          </td>
        </tr>
      </tfoot>
    </table>
  `
}

// Generate full HTML document for PDF
function generatePDFHtml(content: string, options: {
  title: string;
  documentType: string;
  includeSignatureFields: boolean;
}): string {
  const signatureSection = options.includeSignatureFields ? `
    <div style="margin-top: 60px; page-break-inside: avoid;">
      <div style="display: flex; justify-content: space-between; margin-top: 40px;">
        <div style="width: 45%; text-align: center;">
          <div style="border-top: 1px solid #000; padding-top: 10px; margin-top: 80px;">
            <p style="margin: 0; font-size: 12px;">Firma del Cliente</p>
            <p style="margin: 5px 0 0 0; font-size: 10px; color: #666;">Fecha: ___/___/______</p>
          </div>
        </div>
        <div style="width: 45%; text-align: center;">
          <div style="border-top: 1px solid #000; padding-top: 10px; margin-top: 80px;">
            <p style="margin: 0; font-size: 12px;">Firma del Representante</p>
            <p style="margin: 5px 0 0 0; font-size: 10px; color: #666;">Fecha: ___/___/______</p>
          </div>
        </div>
      </div>
    </div>
  ` : ''

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${options.title}</title>
      <style>
        @page {
          size: A4;
          margin: 20mm;
        }
        
        * {
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Helvetica Neue', Arial, sans-serif;
          font-size: 12px;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 0;
        }
        
        .document-container {
          max-width: 210mm;
          margin: 0 auto;
          padding: 20px;
        }
        
        h1 { font-size: 24px; margin-bottom: 20px; color: #1a1a1a; }
        h2 { font-size: 18px; margin-top: 24px; margin-bottom: 12px; color: #333; }
        h3 { font-size: 14px; margin-top: 16px; margin-bottom: 8px; color: #444; }
        
        p { margin-bottom: 12px; text-align: justify; }
        
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 16px 0;
        }
        
        th, td {
          border: 1px solid #ddd;
          padding: 10px;
          text-align: left;
        }
        
        th {
          background-color: #f5f5f5;
          font-weight: 600;
        }
        
        .header {
          border-bottom: 2px solid #333;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #ddd;
          font-size: 10px;
          color: #666;
          text-align: center;
        }
        
        .page-break {
          page-break-before: always;
        }
        
        @media print {
          body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
        }
      </style>
    </head>
    <body>
      <div class="document-container">
        ${content}
        ${signatureSection}
        <div class="footer">
          <p>Documento generado automáticamente el ${new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
        </div>
      </div>
    </body>
    </html>
  `
}
