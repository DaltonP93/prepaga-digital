
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { templateId, dynamicFields = [], data = {} } = await req.json();
    
    if (!templateId) {
      return new Response(
        JSON.stringify({ error: 'Template ID is required' }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Generating PDF for template:', templateId);
    console.log('Dynamic fields:', dynamicFields);
    console.log('Data:', data);

    // Fetch template from database
    const { data: template, error: templateError } = await supabase
      .from('templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (templateError || !template) {
      console.error('Template not found:', templateError);
      return new Response(
        JSON.stringify({ error: 'Template not found' }), 
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Process template content with dynamic fields
    let processedContent = template.static_content || '';
    
    // Replace placeholders with actual data
    dynamicFields.forEach((field: any) => {
      const placeholder = `{${field.name}}`;
      const value = data[field.name] || field.defaultValue || '';
      processedContent = processedContent.replace(new RegExp(placeholder, 'g'), value);
    });

    // Basic HTML template for PDF generation
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${template.name}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 40px; 
              line-height: 1.6; 
            }
            .header { 
              text-align: center; 
              margin-bottom: 30px; 
              border-bottom: 2px solid #333; 
              padding-bottom: 20px; 
            }
            .content { 
              margin: 20px 0; 
            }
            .footer { 
              margin-top: 40px; 
              text-align: center; 
              font-size: 12px; 
              color: #666; 
            }
            .field-value {
              background-color: #f0f0f0;
              padding: 2px 4px;
              border-radius: 3px;
              font-weight: bold;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${template.name}</h1>
            <p>Tipo: ${template.template_type || 'Documento'}</p>
          </div>
          <div class="content">
            ${processedContent}
          </div>
          <div class="footer">
            <p>Generado el: ${new Date().toLocaleDateString()}</p>
            <p>Campos procesados: ${dynamicFields.length}</p>
          </div>
        </body>
      </html>
    `;

    console.log('Generated HTML content length:', htmlContent.length);

    // For now, return the HTML content as a response
    // In a real implementation, you would use a library like Puppeteer to generate PDF
    return new Response(
      JSON.stringify({ 
        success: true, 
        html: htmlContent,
        fieldsProcessed: dynamicFields.length,
        templateName: template.name 
      }), 
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error generating PDF:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
