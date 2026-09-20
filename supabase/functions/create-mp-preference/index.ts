import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

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
    const { plan_type, tenant_id, tenant_name, amount, months } = await req.json()

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

    // Create the preference using native fetch
    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        items: [
          {
            id: `plan_${plan_type}`,
            title: `Plan ${plan_type} - ${tenant_name || tenant_id} (${months || 1} Mes/es)`,
            quantity: 1,
            unit_price: Number(amount),
            currency_id: 'ARS',
          }
        ],
        metadata: {
          tenant_id,
          plan_type,
          months: months || 1
        },
        back_urls: {
          success: 'https://tu-dominio.com/settings?tab=mi-plan&status=success',
          failure: 'https://tu-dominio.com/settings?tab=mi-plan&status=failure',
          pending: 'https://tu-dominio.com/settings?tab=mi-plan&status=pending',
        },
        auto_return: 'approved',
      })
    })

    if (!response.ok) {
      const err = await response.json()
      console.error('MP API Error:', err)
      throw new Error(err.message || 'Error from MercadoPago API')
    }

    const data = await response.json()

    return new Response(
      JSON.stringify({ 
        preference_id: data.id,
        init_point: data.init_point
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
