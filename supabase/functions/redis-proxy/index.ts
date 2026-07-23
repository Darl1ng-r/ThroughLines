// Supabase Edge Function: Secure Redis Proxy
// Proxies Upstash Redis requests using server-side secrets (UPSTASH_REDIS_REST_TOKEN)

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

const UPSTASH_URL = Deno.env.get('UPSTASH_REDIS_REST_URL')
const UPSTASH_TOKEN = Deno.env.get('UPSTASH_REDIS_REST_TOKEN')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const actionPath = url.pathname.replace(/^\/redis-proxy/, '') // e.g. /get/my_key or /set/my_key/val/EX/60

    if (!UPSTASH_URL || !UPSTASH_TOKEN) {
      return new Response(JSON.stringify({ error: 'Upstash credentials not configured on edge worker' }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const upstreamRes = await fetch(`${UPSTASH_URL}${actionPath}`, {
      method: req.method,
      headers: {
        Authorization: `Bearer ${UPSTASH_TOKEN}`
      }
    })

    const data = await upstreamRes.json()
    return new Response(JSON.stringify(data), {
      status: upstreamRes.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
