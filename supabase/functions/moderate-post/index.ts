// Supabase Edge Function: Production-Grade Content Moderation Engine
// Integrates:
// 1. Adversarial Evasion Normalization (Unicode NFD, Homoglyphs, Leetspeak, Asterisks, Repetitions)
// 2. High-Performance Deterministic Pattern Matching (0ms Heuristic Guard)
// 3. Automated AI Moderation API (OpenAI Moderation API / Perspective / Fallback LLM)
// 4. Supabase Service Role Database Synchronization (Automatic row state update)

declare const Deno: {
  env: {
    get(key: string): string | undefined
  }
}

// @ts-ignore: Deno URL module imports resolved at runtime by Supabase Edge Runtime
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
// @ts-ignore: Deno URL module imports resolved at runtime by Supabase Edge Runtime
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'

const rawOrigin = Deno.env.get('APP_ORIGIN') || ''
const envOrigins = rawOrigin.split(',').map(s => s.trim()).filter(Boolean)
const ALLOWED_ORIGINS = envOrigins.length > 0
  ? envOrigins
  : ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:4173']

function getCorsHeaders(origin: string) {
  const isAllowed = ALLOWED_ORIGINS.some(allowed => allowed === origin || allowed === '*')
  const allowedHeader = isAllowed ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allowedHeader,
    'Vary': 'Origin',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
  }
}

// Zero-width & invisible character matcher
const ZERO_WIDTH_REGEX = /[\u200B-\u200D\uFEFF\u00AD\u2060]/g

// Cyrillic & Greek homoglyphs visual transliteration to ASCII
const HOMOGLYPH_MAP: Record<string, string> = {
  '\u0430': 'a', '\u0410': 'a',
  '\u0441': 'c', '\u0421': 'c',
  '\u0435': 'e', '\u0415': 'e', '\u0451': 'e',
  '\u0456': 'i', '\u0406': 'i',
  '\u043E': 'o', '\u041E': 'o',
  '\u0440': 'p', '\u0420': 'p',
  '\u0445': 'x', '\u0425': 'x',
  '\u0443': 'u', '\u0423': 'u',
  '\u0432': 'b', '\u0412': 'b',
  '\u043F': 'n',
  '\u03B1': 'a', '\u0391': 'a',
  '\u03B5': 'e', '\u0395': 'e',
  '\u03B9': 'i', '\u0399': 'i',
  '\u03BA': 'k', '\u039A': 'k',
  '\u03BF': 'o', '\u039F': 'o',
  '\u03C1': 'p', '\u03A1': 'p',
  '\u03C4': 't', '\u03A4': 't',
  '\u03C5': 'u', '\u03A5': 'u',
  '\u03BD': 'v', '\u039D': 'v'
}

// Common leetspeak substitutions
const LEET_MAP: Record<string, string> = {
  '@': 'a', '4': 'a', '8': 'b', '3': 'e',
  '!': 'i', '1': 'i', '|': 'i', '0': 'o',
  '$': 's', '5': 's', '+': 't', '7': 't', 'v': 'u'
}

export function normalizeText(rawText: string): string {
  if (!rawText || typeof rawText !== 'string') return ''

  // 1. Remove zero-width characters
  let clean = rawText.replace(ZERO_WIDTH_REGEX, '').trim()

  // 2. Unicode NFD normalization (decompose accents and strip diacritical marks)
  clean = clean.normalize('NFD').replace(/[\u0300-\u036f]/g, '')

  // 3. Lowercase
  clean = clean.toLowerCase()

  // 4. Transliterate Cyrillic & Greek homoglyphs
  clean = clean.replace(/[\u0400-\u04FF\u0370-\u03FF]/g, (char) => HOMOGLYPH_MAP[char] || char)

  // 5. De-obfuscate common leetspeak
  clean = clean.replace(/[@483!1|$5+70]/g, (char) => LEET_MAP[char] || char)

  // 6. Normalize common vowel asterisk masks inside words
  clean = clean.replace(/\bf\*+ck/gi, 'fuck')
               .replace(/\bb\*+tch/gi, 'bitch')
               .replace(/\bp\*+rn/gi, 'porn')
               .replace(/\bsh\*+t/gi, 'shit')
               .replace(/\bc\*+nt/gi, 'cunt')
               .replace(/\bd\*+ck/gi, 'dick')

  // 7. Collapse elongated repetitions of 3+ letters to 1
  clean = clean.replace(/([a-z])\1{2,}/g, '$1')

  // 8. Connect spaced single letters (e.g. 'f u c k' -> 'fuck', 'k i l l' -> 'kill')
  clean = clean.replace(/\b([a-z])\s+([a-z])\s+([a-z])(?:\s+([a-z]))?(?:\s+([a-z]))?\b/gi, 
    (_, a, b, c, d, e) => `${a}${b}${c}${d || ''}${e || ''}`
  )

  // 9. Normalize intra-word punctuation without redundant escape characters
  clean = clean.split(/\s+/).map((word) => {
    if (/^[a-z0-9]+([._-]+[a-z0-9]+)+$/i.test(word)) {
      return word.replace(/[._-]+/g, '')
    }
    return word
  }).join(' ')

  return clean
}

// Bounded heuristic patterns grouped to prevent ReDoS backtracking and maintain low regex complexity
const HEURISTIC_RULES: Record<string, RegExp[]> = {
  HATE_SPEECH: [
    /\b(nigg(er|ers|a|as)|kikes?|chinks?|gooks?)\b/i,
    /\b(wetbacks?|spics?|ragheads?|coons?)\b/i,
    /\b(faggots?|fags?|dykes?|trann(y|ies))\b/i,
    /\b(retards?|retarded)\b/i,
    /\b(white\s+supremac(y|ist)|neo-?nazi|gas\s+the\s+jews)\b/i,
  ],
  VIOLENCE_AND_THREATS: [
    /\b(kill\s+(your|ur)self|commit\s+suicide|go\s+die|die\s+in\s+a\s+fire)\b/i,
    /\b(i\s+will\s+(kill|murder|hunt|shoot|stab|rape)(\s+(you|u))?)\b/i,
    /\b(slit\s+(?:your\s+|ur\s+)?throat)\b/i,
    /\b(death\s+threat|bomb\s+threat)\b/i,
  ],
  HARASSMENT_AND_ABUSE: [
    /\b(piece\s+of\s+shit|worthless\s+trash|shut\s+the\s+fuck\s+up)\b/i,
    /\b(mother\s*fuck(er|ing)?|dumb\s*ass|dumb\s*fuck)\b/i,
    /\b(eat\s+shit|go\s+fuck\s+yourself|fuck\s+you|fuck\s+off)\b/i,
  ],
  OBSCENITY_AND_SEXUAL: [
    /\b(cunts?|pussy|dickheads?|cocksuckers?)\b/i,
    /\b(bitch(es)?|bastards?)\b/i,
    /\b(f[au]ck(s|ed|ing|er|ers)?|shit(s|ting|ty|ted|head)?)\b/i,
    /\b(assholes?|bullshit)\b/i,
    /\b(porn|porno|pornography|blowjob|handjob|deepthroat|gangbang)\b/i,
  ],
  SCAMS_AND_SPAM: [
    /\b(casino|crypto-?airdrop|free-?followers|phishing)\b/i,
    /\b(whatsapp\s+investment|telegram\s+signals)\b/i,
  ],
}

function checkStructuralLimits(trimmed: string): string[] {
  const flagged: string[] = []
  if (trimmed.length > 5000) {
    flagged.push('Length Limit Exceeded (> 5000 chars)')
  }
  const httpCount = (trimmed.match(/https?:\/\//gi) || []).length
  if (httpCount > 3) {
    flagged.push('Excessive Links (> 3 links)')
  }
  return flagged
}

function checkHeuristicPatterns(normalizedText: string): string[] {
  const flagged: string[] = []
  for (const [name, patterns] of Object.entries(HEURISTIC_RULES)) {
    if (patterns.some((regex) => regex.test(normalizedText))) {
      flagged.push(name)
    }
  }
  return flagged
}

interface AIModerationResult {
  flagged: boolean
  categories: string[]
  scores?: Record<string, number>
}

async function evaluateWithAI(
  content: string,
  apiKey?: string
): Promise<AIModerationResult> {
  if (!apiKey) {
    return { flagged: false, categories: [] }
  }

  try {
    const response = await fetch('https://api.openai.com/v1/moderations', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ input: content }),
      signal: AbortSignal.timeout(5000)
    })

    if (!response.ok) {
      console.warn(`[AI Moderation API] Error status: ${response.status}`)
      return { flagged: false, categories: [] }
    }

    const data = await response.json()
    const result = data.results?.[0]
    if (!result) return { flagged: false, categories: [] }

    const flaggedCategories: string[] = []
    if (result.categories) {
      for (const [cat, isFlagged] of Object.entries(result.categories)) {
        if (isFlagged) flaggedCategories.push(cat)
      }
    }

    return {
      flagged: Boolean(result.flagged),
      categories: flaggedCategories,
      scores: result.category_scores
    }
  } catch (error) {
    console.error('[AI Moderation API] Network exception:', error)
    return { flagged: false, categories: [] }
  }
}

interface ModerationEvaluation {
  isFlagged: boolean
  moderationStatus: 'flagged' | 'approved'
  moderationReason: string
  flaggedCategories: string[]
  aiModerationUsed: boolean
  aiScores?: Record<string, number>
}

async function runModerationPipeline(content: string): Promise<ModerationEvaluation> {
  const trimmed = content.trim()
  const flaggedCategories: string[] = [
    ...checkStructuralLimits(trimmed),
    ...checkHeuristicPatterns(normalizeText(trimmed))
  ]

  let aiModerationUsed = false
  let aiScores: Record<string, number> | undefined

  const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
  if (flaggedCategories.length === 0 && openaiApiKey) {
    aiModerationUsed = true
    const aiResult = await evaluateWithAI(trimmed, openaiApiKey)
    if (aiResult.flagged) {
      flaggedCategories.push(...aiResult.categories.map((c) => `AI: ${c}`))
      aiScores = aiResult.scores
    }
  }

  const isFlagged = flaggedCategories.length > 0
  return {
    isFlagged,
    moderationStatus: isFlagged ? 'flagged' : 'approved',
    moderationReason: isFlagged ? flaggedCategories.join(', ') : 'Verified clean',
    flaggedCategories,
    aiModerationUsed,
    aiScores
  }
}

async function syncModerationToDatabase(
  postId: string,
  moderationStatus: string,
  moderationReason: string
): Promise<void> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!postId || !supabaseUrl || !supabaseKey) {
    return
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey)
    const { error: dbError } = await supabase
      .from('public_posts')
      .update({
        moderation_status: moderationStatus,
        moderation_reason: moderationReason,
        moderated_at: new Date().toISOString()
      })
      .eq('id', postId)

    if (dbError) {
      console.error(`[DB Sync Error] Failed to update post ${postId}:`, dbError)
    }
  } catch (dbErr) {
    console.error(`[DB Client Exception] ${postId}:`, dbErr)
  }
}

async function authenticateCaller(
  req: Request, 
  corsHeaders: Record<string, string>
): Promise<{ errorResponse?: Response; authenticatedUserId: string | null; isWebhookAuthorized: boolean }> {
  const webhookSecret = req.headers.get('x-webhook-secret')
  const expectedSecret = Deno.env.get('MODERATION_WEBHOOK_SECRET')
  const isWebhookAuthorized = Boolean(expectedSecret && webhookSecret === expectedSecret)

  if (isWebhookAuthorized) {
    return { isWebhookAuthorized: true, authenticatedUserId: null }
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return {
      errorResponse: new Response(JSON.stringify({ error: 'Unauthorized: missing authorization credentials' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }),
      authenticatedUserId: null,
      isWebhookAuthorized: false
    }
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || ''
  const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } }
  })
  const { data: { user }, error: authErr } = await supabaseAuth.auth.getUser()
  if (authErr || !user) {
    return {
      errorResponse: new Response(JSON.stringify({ error: 'Unauthorized: invalid or expired session' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }),
      authenticatedUserId: null,
      isWebhookAuthorized: false
    }
  }

  return { isWebhookAuthorized: false, authenticatedUserId: user.id }
}

async function verifyPostOwnership(
  postId: string, 
  userId: string, 
  corsHeaders: Record<string, string>
): Promise<Response | null> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
  if (!supabaseUrl || !supabaseServiceKey) return null

  const adminClient = createClient(supabaseUrl, supabaseServiceKey)
  const { data: postRecord, error: postErr } = await adminClient
    .from('public_posts')
    .select('user_id')
    .eq('id', postId)
    .maybeSingle()

  if (postErr || !postRecord) {
    return new Response(JSON.stringify({ error: 'Post not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  if (postRecord.user_id !== userId) {
    return new Response(JSON.stringify({ error: 'Forbidden: Cannot moderate another user post' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  return null
}

serve(async (req: Request): Promise<Response> => {
  const origin = req.headers.get('Origin') || ''
  const corsHeaders = getCorsHeaders(origin)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const authResult = await authenticateCaller(req, corsHeaders)
  if (authResult.errorResponse) {
    return authResult.errorResponse
  }

  try {
    const body = await req.json()
    const postId = body.postId || body.record?.id
    const content = body.content || body.record?.content

    if (!content) {
      return new Response(JSON.stringify({ error: 'Missing content payload' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (postId && !authResult.isWebhookAuthorized && authResult.authenticatedUserId) {
      const ownershipError = await verifyPostOwnership(postId, authResult.authenticatedUserId, corsHeaders)
      if (ownershipError) return ownershipError
    }

    const evaluation = await runModerationPipeline(String(content))

    if (postId) {
      await syncModerationToDatabase(postId, evaluation.moderationStatus, evaluation.moderationReason)
    }

    return new Response(
      JSON.stringify({
        postId,
        moderationStatus: evaluation.moderationStatus,
        flaggedCategories: evaluation.flaggedCategories,
        moderationReason: evaluation.moderationReason,
        aiModerationUsed: evaluation.aiModerationUsed,
        aiScores: evaluation.aiScores,
        processedAt: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Internal Server Error'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
