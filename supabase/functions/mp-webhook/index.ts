import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

serve(async (req) => {
  try {
    const url = new URL(req.url)
    const topic = url.searchParams.get('topic') || url.searchParams.get('type')
    const id = url.searchParams.get('id') || url.searchParams.get('data.id')

    if (!topic || !id) {
      return new Response('Missing topic or id', { status: 400 })
    }

    if (topic === 'payment') {
      // Get the MP Access Token from environment variables (Supabase secrets)
      const accessToken = Deno.env.get('MP_ACCESS_TOKEN')
      if (!accessToken) {
        throw new Error('MP_ACCESS_TOKEN is not configured')
      }

      // Verify the payment with MercadoPago API
      const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      })

      if (!paymentResponse.ok) {
        throw new Error('Failed to verify payment with MP API')
      }

      const paymentData = await paymentResponse.json()

      // If the payment is approved, update the tenant plan
      if (paymentData.status === 'approved') {
        const tenant_id = paymentData.metadata?.tenant_id
        const plan_type = paymentData.metadata?.plan_type

        if (tenant_id && plan_type) {
          // Initialize Supabase client to update the tenant
          const supabaseUrl = Deno.env.get('SUPABASE_URL')
          const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
          
          if (!supabaseUrl || !supabaseServiceKey) {
            throw new Error('Supabase credentials are not configured')
          }

          const supabase = createClient(supabaseUrl, supabaseServiceKey)

          // Update the tenant's plan in Supabase
          const { error } = await supabase
            .from('tenants')
            .update({ 
              plan_type: plan_type,
              active: true
            })
            .eq('id', tenant_id)

          if (error) {
            console.error('Error updating tenant:', error)
            throw error
          }

          console.log(`Successfully updated tenant ${tenant_id} to plan ${plan_type}`)
        }
      }
    }

    return new Response('OK', { status: 200 })

  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
