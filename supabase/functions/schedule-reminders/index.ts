import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Authenticate - this is typically called by a cron job or admin
    const authHeader = req.headers.get('Authorization')
    const isInternalCall = authHeader === `Bearer ${supabaseServiceKey}`

    if (!isInternalCall) {
      if (!authHeader?.startsWith('Bearer ')) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } }
      })
      const token = authHeader.replace('Bearer ', '')
      const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token)
      if (claimsError || !claimsData?.claims?.sub) {
        return new Response(JSON.stringify({ error: 'Invalid token' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('Checking for pending signature reminders...')

    const { data: pendingLinks, error: linksError } = await supabase
      .from('signature_links')
      .select(`
        *,
        sales:sale_id (
          id,
          company_id,
          clients:client_id (
            first_name,
            last_name,
            phone,
            email
          ),
          companies:company_id (
            name
          )
        )
      `)
      .eq('status', 'pendiente')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: true })

    if (linksError) {
      console.error('Error fetching pending links:', linksError)
      throw linksError
    }

    console.log(`Found ${pendingLinks?.length || 0} pending signature links`)

    const remindersSent: string[] = []
    const errors: string[] = []

    for (const link of pendingLinks || []) {
      const { data: recentReminders } = await supabase
        .from('whatsapp_messages')
        .select('id')
        .eq('sale_id', link.sale_id)
        .eq('message_type', 'reminder')
        .gte('sent_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .limit(1)

      if (recentReminders && recentReminders.length > 0) {
        continue
      }

      const clientPhone = link.recipient_phone || link.sales?.clients?.phone
      const clientName = link.recipient_name || 
        `${link.sales?.clients?.first_name || ''} ${link.sales?.clients?.last_name || ''}`.trim()
      const companyName = link.sales?.companies?.name || 'La empresa'

      if (!clientPhone) continue

      const expiresAt = new Date(link.expires_at)
      const daysUntilExpiration = Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))

      if (daysUntilExpiration > 3) continue

      const signatureUrl = `${supabaseUrl.replace('.supabase.co', '.lovable.app')}/firmar/${link.token}`

      try {
        const response = await fetch(`${supabaseUrl}/functions/v1/send-whatsapp`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: clientPhone,
            templateName: 'reminder',
            templateData: {
              clientName,
              signatureUrl,
              expirationDate: expiresAt.toLocaleDateString('es-ES'),
              companyName,
            },
            saleId: link.sale_id,
            companyId: link.sales?.company_id,
            messageType: 'reminder',
          }),
        })

        const result = await response.json()
        
        if (result.success) {
          remindersSent.push(link.id)
        } else {
          errors.push(`Link ${link.id}: ${result.error}`)
        }
      } catch (err: any) {
        errors.push(`Link ${link.id}: ${err?.message || "Unknown error"}`)
      }
    }

    return new Response(JSON.stringify({
      success: true,
      remindersSent: remindersSent.length,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Error in schedule-reminders:', error)
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
