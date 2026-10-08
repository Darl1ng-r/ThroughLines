/**
 * ThroughLines Content Moderation & Community Discourse Engine
 * 
 * Provides deterministic, zero-latency text safety analysis to ensure public
 * throughlines, topics, profiles, and feeds maintain respectful, civil, and
 * constructive discourse.
 */

// Zero-width & invisible character matcher
const ZERO_WIDTH_REGEX = /[\u200B-\u200D\uFEFF\u00AD\u2060]/g

// Common leetspeak substitutions
const LEET_MAP = {
  '@': 'a',
  '4': 'a',
  '8': 'b',
  '3': 'e',
  '!': 'i',
  '1': 'i',
  '|': 'i',
  '0': 'o',
  '$': 's',
  '5': 's',
  '+': 't',
  '7': 't',
  'v': 'u',
}

/**
 * Normalizes text to uncover obfuscated or punctuated abusive terms.
 * Handles:
 * - Zero-width spaces ('f\u200Buck')
 * - Deliberate punctuation spacing within words ('f.u.c.k', 'b-i-t-c-h', 'b.u.l.l.s.h.i.t')
 * - Letter-by-letter spacing ('f u c k')
 * - Leetspeak substitutions ('b!tch', 'a$$hole', 'f@ck')
 * - Repeating letters ('fuuuuuck', 'shiiiiit')
 */
export function normalizeText(rawText) {
  if (!rawText || typeof rawText !== 'string') return ''

  // 1. Remove zero-width & invisible characters
  let clean = rawText.replace(ZERO_WIDTH_REGEX, '').trim()

  // 2. Lowercase for case-insensitive matching
  clean = clean.toLowerCase()

  // 3. De-obfuscate common leetspeak
  clean = clean.replace(/[@483!1|$5+70]/g, (char) => LEET_MAP[char] || char)

  // 4. Collapse elongated repetitions of 3+ letters to 1 (e.g. 'fuuuck' -> 'fuck')
  clean = clean.replace(/([a-z])\1{2,}/g, '$1')

  // 5. Connect spaced single letters (e.g. 'f u c k' -> 'fuck')
  clean = clean.replace(/\b([a-z])\s+([a-z])\s+([a-z])(?:\s+([a-z]))?(?:\s+([a-z]))?\b/gi, 
    (_, a, b, c, d, e) => `${a}${b}${c}${d || ''}${e || ''}`
  )

  // 6. Normalize intra-word punctuation (e.g. 'f.u.c.k.i.n.g' -> 'fucking', 'b-i-t-c-h' -> 'bitch')
  clean = clean.split(/\s+/).map(word => {
    // If word contains internal dots, dashes, or asterisks between letters, strip them
    if (/^[a-z0-9]+([\.\-_*]+[a-z0-9]+)+$/i.test(word)) {
      return word.replace(/[\.\-_*]+/g, '')
    }
    return word
  }).join(' ')

  return clean
}

/**
 * Strips non-alphanumeric separators
 */
export function stripSeparators(text) {
  if (!text) return ''
  return text.replace(/[\s\.\-_*#~`^+=|\\/]+/g, '')
}

/**
 * Moderation Categories and Pattern Definitions
 */
const CATEGORIES = {
  HATE_SPEECH: {
    name: 'Hate Speech & Discriminatory Slurs',
    patterns: [
      // Racial, ethnic, religious, and identity slurs
      /\b(n+i+g+g+[e3a]+r+|n+i+g+g+a+|k+i+k+e+|ch+i+n+k+|g+o+o+k+|w+e+t+b+a+c+k+|s+p+i+c+|r+a+g+h+e+a+d+|c+o+o+n+s?)\b/i,
      /\b(f+a+g+g+o+t+|f+a+g+s?|d+y+k+e+s?|t+r+a+n+n+y|t+r+a+n+n+i+e+s?)\b/i,
      /\b(r+e+t+a+r+d+[es]?|r+e+t+a+r+d+e+d+)\b/i,
      /\b(white\s+supremac(y|ist)|neo-?nazi|hitler\s+was\s+right|gas\s+the\s+jews|subhuman\s+(race|people))\b/i
    ]
  },
  VIOLENCE_AND_THREATS: {
    name: 'Violence & Physical Threats',
    patterns: [
      /\b(kill\s+(your|ur)self|commit\s+suicide|go\s+die|die\s+in\s+a\s+fire)\b/i,
      /\b(i\s+will\s+(kill|murder|hunt|shoot|stab|rape)(\s+(you|u))?)\b/i,
      /\b(slit\s+(your|ur)?\s*throat)\b/i,
      /\b(death\s+threat|bomb\s+threat|mass\s+shooting\s+threat|gonna\s+end\s+your\s+life)\b/i
    ]
  },
  HARASSMENT_AND_ABUSE: {
    name: 'Harassment & Severe Disrespect',
    patterns: [
      /\b(piece\s+of\s+shit|worthless\s+trash|waste\s+of\s+breath|shut\s+the\s+fuck\s+up)\b/i,
      /\b(mother\s*fucker|mother\s*fucking|dumb\s*ass|dumb\s*fuck)\b/i,
      /\b(eat\s+shit|go\s+fuck\s+yourself|fuck\s+you|fuck\s+off)\b/i
    ]
  },
  OBSCENITY_AND_SEXUAL: {
    name: 'Explicit Vulgarity & Inappropriate Content',
    patterns: [
      /\b(c+u+n+t+s?|p+u+s+s+y|d+i+c+k+h+e+a+d+|c+o+c+k+s+u+c+k+[e3]r+)\b/i,
      /\b(b+i+t+c+h+e?s?|b+a+s+t+a+r+d+s?)\b/i,
      /\b(f+[*u@va]+c+k+[a-z]*)\b/i,
      /\b(a+s+s+h+o+l+e+s?|b+u+l+l+s+h+i+t+)\b/i,
      /\b(porn|porno|pornography|blowjob|handjob|deepthroat|gangbang)\b/i
    ]
  },
  SCAMS_AND_SPAM: {
    name: 'Spam & Malicious Scams',
    patterns: [
      /\b(casino|crypto-?airdrop|free-?followers|phishing|whatsapp\s+investment|telegram\s+signals)\b/i,
      /\b(make\s+\$[0-9,]+\s+(daily|fast|from\s+home)|guaranteed\s+crypto\s+returns)\b/i
    ]
  }
}

const MAX_ALLOWED_LINKS = 3
const MAX_ALLOWED_LENGTH = 5000

/**
 * Evaluates whether text meets community discourse standards.
 * 
 * @param {string} text The raw text content to evaluate
 * @param {Object} [options] Evaluation options
 * @returns {{
 *   isValid: boolean,
 *   isFlagged: boolean,
 *   category: string | null,
 *   reason: string | null,
 *   flaggedTerms: string[],
 *   details: { categoryKey: string, categoryName: string }[]
 * }}
 */
export function moderateContent(text, options = {}) {
  if (!text || typeof text !== 'string' || !text.trim()) {
    return {
      isValid: true,
      isFlagged: false,
      category: null,
      reason: null,
      flaggedTerms: [],
      details: []
    }
  }

  const rawTrimmed = text.trim()

  // 1. Structural Spam Checks
  if (rawTrimmed.length > MAX_ALLOWED_LENGTH) {
    return {
      isValid: false,
      isFlagged: true,
      category: 'Spam & Malicious Scams',
      reason: `Content exceeds maximum allowed length of ${MAX_ALLOWED_LENGTH} characters.`,
      flaggedTerms: ['length_limit_exceeded'],
      details: [{ categoryKey: 'SCAMS_AND_SPAM', categoryName: 'Length Limit' }]
    }
  }

  const linkMatches = rawTrimmed.match(/https?:\/\//gi) || []
  if (linkMatches.length > MAX_ALLOWED_LINKS) {
    return {
      isValid: false,
      isFlagged: true,
      category: 'Spam & Malicious Scams',
      reason: `Content contains excessive links (${linkMatches.length} links; max allowed is ${MAX_ALLOWED_LINKS}).`,
      flaggedTerms: ['excessive_links'],
      details: [{ categoryKey: 'SCAMS_AND_SPAM', categoryName: 'Link Flooding' }]
    }
  }

  // 2. Multi-Pass Pattern Matching (Normal text + Leetspeak normalized)
  const normalized = normalizeText(rawTrimmed)

  const detectedDetails = []
  const flaggedTerms = []

  for (const [categoryKey, categoryData] of Object.entries(CATEGORIES)) {
    for (const pattern of categoryData.patterns) {
      const match = normalized.match(pattern)
      if (match) {
        detectedDetails.push({ categoryKey, categoryName: categoryData.name })
        flaggedTerms.push(match[0])
        break
      }
    }
  }

  const isFlagged = detectedDetails.length > 0

  if (isFlagged) {
    const primaryDetail = detectedDetails[0]
    return {
      isValid: false,
      isFlagged: true,
      category: primaryDetail.categoryName,
      reason: `Content contains language flagged under community guidelines: ${primaryDetail.categoryName}.`,
      flaggedTerms: Array.from(new Set(flaggedTerms)),
      details: detectedDetails
    }
  }

  return {
    isValid: true,
    isFlagged: false,
    category: null,
    reason: null,
    flaggedTerms: [],
    details: []
  }
}

/**
 * Quick helper to check if text is safe for public publishing.
 */
export function isAppropriateForPublic(text) {
  const result = moderateContent(text)
  return result.isValid
}
