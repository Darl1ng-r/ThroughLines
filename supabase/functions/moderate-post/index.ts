// Supabase Edge Function: Server-Side Content Moderation & AI Synthesis Worker
// Deployed to Supabase Edge Network (Deno / Serverless)

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { postId, content } = await req.json()
    if (!content) {
      return new Response(JSON.stringify({ error: 'Missing content' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 1. Algorithmic Content Moderation Rules
    const httpCount = (content.match(/https?:\/\//gi) || []).length
    const isSpam = content.length > 4500 || httpCount > 3 || /\b(casino|crypto-airdrop|free-followers|phishing)\b/i.test(content)
    const moderationStatus = isSpam ? 'flagged' : 'approved'

    return new Response(
      JSON.stringify({
        postId,
        moderationStatus,
        processedAt: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
