import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const payload = await req.json()
    
    console.log('Langflow webhook received:', {
      timestamp: new Date().toISOString(),
      method: req.method,
      headers: Object.fromEntries(req.headers.entries()),
      payload
    })

    // Echo the request back
    // TODO: When Langflow is integrated, this will:
    // 1. Validate the webhook signature
    // 2. Process the AI response
    // 3. Update relevant database records
    // 4. Trigger any necessary follow-up actions
    
    const response = {
      received: true,
      timestamp: new Date().toISOString(),
      echo: payload,
      message: 'Webhook received successfully. This endpoint will process Langflow AI responses.'
    }

    return new Response(
      JSON.stringify(response),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 200
      }
    )
  } catch (error) {
    console.error('Webhook error:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Invalid webhook payload',
        details: error.message 
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 400
      }
    )
  }
})