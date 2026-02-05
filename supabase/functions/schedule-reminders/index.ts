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
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    console.log('Checking for pending signature reminders...')

    // Find signature links that are pending and need reminders
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
      // Check if we've already sent a reminder in the last 24 hours
      const { data: recentReminders } = await supabase
        .from('whatsapp_messages')
        .select('id')
        .eq('sale_id', link.sale_id)
        .eq('message_type', 'reminder')
        .gte('sent_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .limit(1)

      if (recentReminders && recentReminders.length > 0) {
        console.log(`Skipping reminder for sale ${link.sale_id} - already sent recently`)
        continue
      }

      // Get client phone from the link or from the sale's client
      const clientPhone = link.recipient_phone || link.sales?.clients?.phone
      const clientName = link.recipient_name || 
        `${link.sales?.clients?.first_name || ''} ${link.sales?.clients?.last_name || ''}`.trim()
      const companyName = link.sales?.companies?.name || 'La empresa'

      if (!clientPhone) {
        console.log(`Skipping reminder for link ${link.id} - no phone number`)
        continue
      }

      // Calculate days until expiration
      const expiresAt = new Date(link.expires_at)
      const daysUntilExpiration = Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))

      // Only send reminders if expires in 3 days or less
      if (daysUntilExpiration > 3) {
        console.log(`Skipping reminder for link ${link.id} - expires in ${daysUntilExpiration} days`)
        continue
      }

      // Build signature URL
      const signatureUrl = `${supabaseUrl.replace('.supabase.co', '.lovable.app')}/firmar/${link.token}`

      // Send reminder via edge function
      try {
        const response = await fetch(`${supabaseUrl}/functions/v1/send-whatsapp`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
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
          console.log(`Reminder sent for link ${link.id}`)
        } else {
          errors.push(`Link ${link.id}: ${result.error}`)
          console.error(`Failed to send reminder for link ${link.id}:`, result.error)
        }
      } catch (err) {
        errors.push(`Link ${link.id}: ${err.message}`)
        console.error(`Error sending reminder for link ${link.id}:`, err)
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
      error: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
