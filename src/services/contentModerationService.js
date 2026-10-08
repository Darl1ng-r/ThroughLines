/**
 * ThroughLines Content Moderation & Community Discourse Engine
 * 
 * Provides deterministic, zero-latency text safety analysis to ensure public
 * throughlines, topics, profiles, and feeds maintain respectful, civil, and
 * constructive discourse.
 */

// Zero-width & invisible character matcher
const ZERO_WIDTH_REGEX = /[\u200B-\u200D\uFEFF\u00AD\u2060]/g

// Cyrillic & Greek homoglyphs visual transliteration to ASCII
const HOMOGLYPH_MAP = {
  // Cyrillic lookalikes
  '\u0430': 'a', '\u0410': 'a', // а, А
  '\u0441': 'c', '\u0421': 'c', // с, С
  '\u0435': 'e', '\u0415': 'e', '\u0451': 'e', // е, Е, ё
  '\u0456': 'i', '\u0406': 'i', // і, І
  '\u043E': 'o', '\u041E': 'o', // о, О
  '\u0440': 'p', '\u0420': 'p', // р, Р
  '\u0441': 's', '\u0455': 's', // ѕ
  '\u0445': 'x', '\u0425': 'x', // х, Х
  '\u0443': 'u', '\u0423': 'u', // у, У (visual u)
  '\u0432': 'b', '\u0412': 'b', // в, В
  '\u043D': 'h', // н (visual h)
  '\u043F': 'n', // п (visual n)
  // Greek lookalikes
  '\u03B1': 'a', '\u0391': 'a', // α, Α
  '\u03B2': 'b', '\u0392': 'b', // β, Β
  '\u03B5': 'e', '\u0395': 'e', // ε, Ε
  '\u03B9': 'i', '\u0399': 'i', // ι, Ι
  '\u03BA': 'k', '\u039A': 'k', // κ, Κ
  '\u03BF': 'o', '\u039F': 'o', // ο, Ο
  '\u03C1': 'p', '\u03A1': 'p', // ρ, Ρ
  '\u03C4': 't', '\u03A4': 't', // τ, Τ
  '\u03C5': 'u', '\u03A5': 'u', // υ, Υ
  '\u03BD': 'v', '\u039D': 'v', // ν, Ν
}

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
 * - Accents & Diacritics ('fück', 'bîtch', 'shít')
 * - Cyrillic and Greek homoglyphs ('f\u0443ck', '\u0440orn')
 * - Deliberate punctuation spacing within words ('f.u.c.k', 'b-i-t-c-h', 'b.u.l.l.s.h.i.t')
 * - Asterisk masking ('f*ck', 'b*tch', 'sh*t', 'p*rn')
 * - Letter-by-letter spacing ('f u c k', 'k i l l')
 * - Leetspeak substitutions ('b!tch', 'a$$hole', 'f@ck')
 * - Repeating letters ('fuuuuuck', 'shiiiiit')
 */
export function normalizeText(rawText) {
  if (!rawText || typeof rawText !== 'string') return ''

  // 1. Remove zero-width & invisible characters
  let clean = rawText.replace(ZERO_WIDTH_REGEX, '').trim()

  // 2. Unicode NFD normalization to strip diacritics/accents (e.g. 'fück' -> 'fuck')
  clean = clean.normalize('NFD').replace(/[\u0300-\u036f]/g, '')

  // 3. Lowercase for case-insensitive matching
  clean = clean.toLowerCase()

  // 4. Transliterate Cyrillic & Greek homoglyphs
  clean = clean.replace(/[\u0400-\u04FF\u0370-\u03FF]/g, (char) => HOMOGLYPH_MAP[char] || char)

  // 5. De-obfuscate common leetspeak
  clean = clean.replace(/[@483!1|$5+70]/g, (char) => LEET_MAP[char] || char)

  // 6. Normalize common vowel asterisk masks inside words (e.g. f*ck -> fuck, b*tch -> bitch, p*rn -> porn, sh*t -> shit)
  clean = clean.replace(/\bf\*+ck/gi, 'fuck')
               .replace(/\bb\*+tch/gi, 'bitch')
               .replace(/\bp\*+rn/gi, 'porn')
               .replace(/\bsh\*+t/gi, 'shit')
               .replace(/\bc\*+nt/gi, 'cunt')
               .replace(/\bd\*+ck/gi, 'dick')

  // 7. Collapse elongated repetitions of 3+ letters to 1 (e.g. 'fuuuck' -> 'fuck')
  clean = clean.replace(/([a-z])\1{2,}/g, '$1')

  // 8. Connect spaced single letters (e.g. 'f u c k' -> 'fuck', 'k i l l' -> 'kill')
  clean = clean.replace(/\b([a-z])\s+([a-z])\s+([a-z])(?:\s+([a-z]))?(?:\s+([a-z]))?\b/gi, 
    (_, a, b, c, d, e) => `${a}${b}${c}${d || ''}${e || ''}`
  )

  // 9. Normalize intra-word punctuation (e.g. 'f.u.c.k.i.n.g' -> 'fucking', 'b-i-t-c-h' -> 'bitch', 'k.i.l.l' -> 'kill')
  // We only strip periods, hyphens, underscores between letters, not asterisk vowel replacements
  clean = clean.split(/\s+/).map(word => {
    if (/^[a-z0-9]+([\.\-_]+[a-z0-9]+)+$/i.test(word)) {
      return word.replace(/[\.\-_]+/g, '')
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
      /\b(s+h+i+t+[a-z]*|a+s+s+h+o+l+e+s?|b+u+l+l+s+h+i+t+)\b/i,
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
