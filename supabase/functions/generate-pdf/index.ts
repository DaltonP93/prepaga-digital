
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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    let requestBody;
    try {
      const text = await req.text();
      console.log('Raw request body:', text);
      
      if (!text || text.trim() === '') {
        throw new Error('Empty request body');
      }
      
      requestBody = JSON.parse(text);
    } catch (parseError) {
      console.error('JSON parsing error:', parseError);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid JSON in request body',
          details: parseError.message 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const { templateId, saleId, responseData = {} } = requestBody;

    console.log('Generating PDF with data:', { templateId, saleId, responseData });

    // Validate required fields
    if (!templateId) {
      return new Response(
        JSON.stringify({ error: 'Template ID is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Fetch template data
    const { data: template, error: templateError } = await supabaseClient
      .from('templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (templateError || !template) {
      console.error('Template fetch error:', templateError);
      return new Response(
        JSON.stringify({ 
          error: 'Template not found',
          details: templateError?.message 
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Fetch sale data if saleId provided
    let saleData = null;
    if (saleId) {
      const { data: sale, error: saleError } = await supabaseClient
        .from('sales')
        .select(`
          *,
          clients(*),
          plans(*),
          salesperson:profiles!sales_salesperson_id_fkey(*)
        `)
        .eq('id', saleId)
        .single();

      if (saleError) {
        console.error('Sale fetch error:', saleError);
        return new Response(
          JSON.stringify({ 
            error: 'Sale not found',
            details: saleError.message 
          }),
          { 
            status: 404, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      saleData = sale;
    }

    // Process template content and replace variables
    let processedContent = template.content || '';
    
    // Replace template variables with actual data
    if (saleData) {
      const replacements = {
        '{{client_name}}': `${saleData.clients?.first_name || ''} ${saleData.clients?.last_name || ''}`.trim(),
        '{{client_email}}': saleData.clients?.email || '',
        '{{client_phone}}': saleData.clients?.phone || '',
        '{{plan_name}}': saleData.plans?.name || '',
        '{{plan_price}}': saleData.plans?.price?.toString() || '0',
        '{{total_amount}}': saleData.total_amount?.toString() || '0',
        '{{contract_number}}': saleData.contract_number || '',
        '{{request_number}}': saleData.request_number || '',
        '{{salesperson_name}}': `${saleData.salesperson?.first_name || ''} ${saleData.salesperson?.last_name || ''}`.trim(),
        '{{sale_date}}': new Date(saleData.sale_date || saleData.created_at).toLocaleDateString('es-ES'),
      };

      for (const [placeholder, value] of Object.entries(replacements)) {
        processedContent = processedContent.replace(new RegExp(placeholder, 'g'), value);
      }
    }

    // Replace response data variables
    for (const [key, value] of Object.entries(responseData)) {
      const placeholder = `{{${key}}}`;
      processedContent = processedContent.replace(new RegExp(placeholder, 'g'), String(value));
    }

    console.log('Processed content length:', processedContent.length);

    // For now, return the processed HTML content
    // In a real implementation, you would convert this to PDF using a library like Puppeteer
    const result = {
      success: true,
      templateId,
      saleId,
      processedContent,
      contentPreview: processedContent.substring(0, 500) + (processedContent.length > 500 ? '...' : ''),
      message: 'PDF generation processed successfully (HTML content returned for now)'
    };

    return new Response(
      JSON.stringify(result),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Unexpected error in generate-pdf function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
})
