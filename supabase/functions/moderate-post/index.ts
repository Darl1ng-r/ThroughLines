// Supabase Edge Function: Content Moderation Webhook Endpoint
// Primary synchronous database-level content moderation is enforced directly
// inside PostgreSQL via `trigger_moderate_public_post`.
// This Edge Function serves as an external webhook receiver for asynchronous
// deep-learning moderation pipelines and external auditing.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const CATEGORIES = {
  HATE_SPEECH: /\b(n+i+g+g+[e3a]+r+|n+i+g+g+a+|k+i+k+e+|ch+i+n+k+|g+o+o+k+|w+e+t+b+a+c+k+|s+p+i+c+|r+a+g+h+e+a+d+|f+a+g+g+o+t+|f+a+g+s?|d+y+k+e+s?|t+r+a+n+n+y|r+e+t+a+r+d+[es]?)\b/i,
  VIOLENCE_AND_THREATS: /\b(kill\s+(your|ur)self|commit\s+suicide|go\s+die|die\s+in\s+a\s+fire|i\s+will\s+(kill|murder|shoot|stab)\s+(you|u)|slit\s+(your|ur)?\s*throat)\b/i,
  HARASSMENT_AND_ABUSE: /\b(piece\s+of\s+shit|worthless\s+trash|shut\s+the\s+fuck\s+up|mother\s*fucker|eat\s+shit|go\s+fuck\s+yourself)\b/i,
  OBSCENITY_AND_SEXUAL: /\b(c+u+n+t+s?|p+u+s+s+y|d+i+c+k+h+e+a+d+|b+i+t+c+h+e?s?|f+[*u@va]+c+k+[a-z]*|a+s+s+h+o+l+e+s?|b+u+l+l+s+h+i+t+|porn|pornography)\b/i,
  SCAMS_AND_SPAM: /\b(casino|crypto-?airdrop|free-?followers|phishing|whatsapp\s+investment|telegram\s+signals)\b/i
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

    const trimmed = String(content).trim()
    const httpCount = (trimmed.match(/https?:\/\//gi) || []).length
    const isExcessiveLength = trimmed.length > 5000
    const isExcessiveLinks = httpCount > 3

    const flaggedCategories: string[] = []
    if (isExcessiveLength) flaggedCategories.push('Length Limit Exceeded')
    if (isExcessiveLinks) flaggedCategories.push('Excessive Links')

    for (const [name, regex] of Object.entries(CATEGORIES)) {
      if (regex.test(trimmed)) {
        flaggedCategories.push(name)
      }
    }

    const isFlagged = flaggedCategories.length > 0
    const moderationStatus = isFlagged ? 'flagged' : 'approved'

    return new Response(
      JSON.stringify({
        postId,
        moderationStatus,
        flaggedCategories,
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
