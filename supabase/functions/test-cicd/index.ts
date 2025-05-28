import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get test data from our CI/CD test table
    const { data, error } = await supabase
      .from('test_cicd_verification')
      .select('*')
      .order('test_timestamp', { ascending: false })
      .limit(5)

    if (error) throw error

    return new Response(
      JSON.stringify({
        message: 'CI/CD Pipeline Test Function Working!',
        timestamp: new Date().toISOString(),
        test_data: data,
        environment: {
          deno_version: Deno.version.deno,
          v8_version: Deno.version.v8,
          typescript_version: Deno.version.typescript,
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})