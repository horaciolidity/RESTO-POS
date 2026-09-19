import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"
import { MercadoPagoConfig, Preference } from "https://esm.sh/mercadopago@2.0.10"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { plan_type, tenant_id, tenant_name, amount } = await req.json()

    if (!plan_type || !tenant_id || !amount) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get the MP Access Token from environment variables (Supabase secrets)
    const accessToken = Deno.env.get('MP_ACCESS_TOKEN')
    if (!accessToken) {
      throw new Error('MP_ACCESS_TOKEN is not configured')
    }

    // Initialize MercadoPago
    const client = new MercadoPagoConfig({ accessToken })

    // Create the preference
    const preference = new Preference(client)

    const response = await preference.create({
      body: {
        items: [
          {
            id: `plan_${plan_type}`,
            title: `Plan ${plan_type} - ${tenant_name || tenant_id}`,
            quantity: 1,
            unit_price: Number(amount),
            currency_id: 'ARS',
          }
        ],
        metadata: {
          tenant_id,
          plan_type
        },
        back_urls: {
          success: 'https://tu-dominio.com/settings?tab=mi-plan&status=success', // TODO: Update with real domain if redirecting
          failure: 'https://tu-dominio.com/settings?tab=mi-plan&status=failure',
          pending: 'https://tu-dominio.com/settings?tab=mi-plan&status=pending',
        },
        auto_return: 'approved',
      }
    })

    return new Response(
      JSON.stringify({ 
        preference_id: response.id,
        init_point: response.init_point
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error creating preference:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
