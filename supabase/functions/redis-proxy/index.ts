import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const UPSTASH_URL = Deno.env.get('UPSTASH_REDIS_REST_URL')
const UPSTASH_TOKEN = Deno.env.get('UPSTASH_REDIS_REST_TOKEN')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')

// Lock CORS to your production domain — set APP_ORIGIN in Supabase Edge Function secrets
// e.g., APP_ORIGIN=https://yourdomain.com
const APP_ORIGIN = Deno.env.get('APP_ORIGIN') || ''
const ALLOWED_ORIGINS = APP_ORIGIN
  ? [APP_ORIGIN, `https://www.${APP_ORIGIN.replace(/^https?:\/\//, '')}`]
  : ['http://localhost:3000', 'http://localhost:5173']

function getCorsHeaders(origin: string) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allowed,
    'Vary': 'Origin',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
}

serve(async (req) => {
  const origin = req.headers.get('Origin') || ''
  const corsHeaders = getCorsHeaders(origin)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (!UPSTASH_URL || !UPSTASH_TOKEN) {
      return new Response(JSON.stringify({ error: 'Upstash credentials not configured on edge worker' }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Require valid authentication
    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized: missing authorization bearer token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Cryptographically verify token with Supabase Auth
    const supabase = createClient(SUPABASE_URL || '', SUPABASE_ANON_KEY || '', {
      global: { headers: { Authorization: authHeader } }
    })
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized: invalid or expired session token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed. Use POST with JSON payload.' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { action, key, value, ttl = 60 } = await req.json()

    if (!key || typeof key !== 'string') {
      return new Response(JSON.stringify({ error: 'Invalid or missing cache key' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Multi-tenant isolation: namespace by authenticated user ID
    const sanitizedKey = key.replace(/[^a-zA-Z0-9_:.-]/g, '_').slice(0, 100)
    const safeKey = `tl:u:${user.id}:${sanitizedKey}`

    let upstreamUrl = ''
    let reqMethod = 'GET'

    if (action === 'get') {
      upstreamUrl = `${UPSTASH_URL}/get/${encodeURIComponent(safeKey)}`
    } else if (action === 'set') {
      const serialized = typeof value === 'string' ? value : JSON.stringify(value)
      const safeTtl = Math.min(Math.max(1, Number(ttl) || 60), 86400) // max 24h
      upstreamUrl = `${UPSTASH_URL}/set/${encodeURIComponent(safeKey)}/${encodeURIComponent(serialized)}/EX/${safeTtl}`
    } else if (action === 'del') {
      upstreamUrl = `${UPSTASH_URL}/del/${encodeURIComponent(safeKey)}`
    } else {
      return new Response(JSON.stringify({ error: 'Invalid action. Allowed: get, set, del.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const upstreamRes = await fetch(upstreamUrl, {
      method: reqMethod,
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
