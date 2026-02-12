import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const now = new Date().toISOString();

    console.log(`[${now}] Starting cleanup of expired signature links...`);

    // 1. Marcar enlaces expirados
    const { data: expiredLinks, error: updateError } = await supabase
      .from('signature_links')
      .update({ status: 'expirado' })
      .lt('expires_at', now)
      .in('status', ['pendiente', 'visualizado'])
      .select('id, sale_id, recipient_type, recipient_email, expires_at');

    if (updateError) {
      console.error('Error updating expired links:', updateError);
      throw updateError;
    }

    const expiredCount = expiredLinks?.length || 0;
    console.log(`Marked ${expiredCount} links as expired`);

    // 2. Marcar documentos como vencidos si su enlace expiró
    let documentsUpdated = 0;
    if (expiredLinks && expiredLinks.length > 0) {
      const linkIds = expiredLinks.map(l => l.id);

      const { data: updatedDocs, error: docsError } = await supabase
        .from('documents')
        .update({ status: 'vencido' })
        .in('signature_link_id', linkIds)
        .eq('status', 'pendiente')
        .select('id');

      if (docsError) {
        console.error('Error updating documents:', docsError);
      } else {
        documentsUpdated = updatedDocs?.length || 0;
        console.log(`Marked ${documentsUpdated} documents as vencido`);
      }
    }

    // 3. Opcional: Actualizar ventas con todos los enlaces expirados
    if (expiredLinks && expiredLinks.length > 0) {
      const saleIds = [...new Set(expiredLinks.map(l => l.sale_id))];

      for (const saleId of saleIds) {
        // Verificar si TODOS los enlaces de la venta están expirados
        const { data: allLinks } = await supabase
          .from('signature_links')
          .select('status')
          .eq('sale_id', saleId);

        const allExpired = allLinks?.every(l => l.status === 'expirado' || l.status === 'completado');

        if (allExpired && allLinks?.some(l => l.status === 'expirado')) {
          // Marcar venta como expirada solo si NO está completada
          await supabase
            .from('sales')
            .update({ status: 'expirado' })
            .eq('id', saleId)
            .not('status', 'in', '(completado,firmado,cancelado)');
        }
      }
    }

    // 4. Log de auditoría
    const { error: logError } = await supabase.from('process_traces').insert({
      action: 'cleanup_expired_signature_links',
      details: {
        expired_links: expiredCount,
        documents_updated: documentsUpdated,
        timestamp: now,
        execution_time_ms: Date.now() - new Date(now).getTime(),
      },
    });

    if (logError) {
      console.error('Error logging audit trace:', logError);
    }

    const response = {
      success: true,
      expired_links: expiredCount,
      documents_updated: documentsUpdated,
      timestamp: now,
      details: expiredLinks?.map(l => ({
        sale_id: l.sale_id,
        recipient_type: l.recipient_type,
        email: l.recipient_email,
        expired_at: l.expires_at,
      })),
    };

    console.log('Cleanup completed successfully:', response);

    return new Response(
      JSON.stringify(response),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Cleanup error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
