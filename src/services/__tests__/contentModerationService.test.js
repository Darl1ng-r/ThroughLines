import { describe, it, expect } from 'vitest'
import {
  moderateContent,
  isAppropriateForPublic,
  normalizeText,
  stripSeparators
} from '../contentModerationService'

describe('contentModerationService', () => {
  describe('Innocent Intellectual Discourse (Zero False Positives)', () => {
    const safeInputs = [
      'Epistemic humility requires updating priors when confronted with counter-evidence.',
      'Draft AI safety bills disproportionately penalize open-source developers while shielding incumbent closed-source API vendors.',
      'The therapist conducted an in-depth clinical assessment of the classic document in the cockpit.',
      'We must pass an objective analysis without premature assumptions or psychological bias.',
      'LCOE calculations for Lithium-Iron-Phosphate + Sodium-ion show a 68% drop in 4-hour utility storage costs.',
      'Philosophical inquiry into phenomenology and computational functionalism.',
      'Working memory bottlenecks often restrict creative cross-domain synthesis.',
      'Critique of political dogma and historical class analysis.'
    ]

    safeInputs.forEach((text) => {
      it(`approves clean academic thought: "${text.slice(0, 45)}..."`, () => {
        const result = moderateContent(text)
        expect(result.isValid).toBe(true)
        expect(result.isFlagged).toBe(false)
        expect(result.category).toBeNull()
        expect(isAppropriateForPublic(text)).toBe(true)
      })
    })

    it('handles null, undefined, and empty string safely', () => {
      expect(moderateContent('').isValid).toBe(true)
      expect(moderateContent('   ').isValid).toBe(true)
      expect(moderateContent(null).isValid).toBe(true)
      expect(moderateContent(undefined).isValid).toBe(true)
    })
  })

  describe('Explicit Abuse, Toxicity & Disrespect', () => {
    it('flags direct vulgar insults', () => {
      const inputs = [
        'You are a piece of shit and nobody cares',
        'Shut the fuck up you worthless trash',
        'Go fuck yourself right now',
        'What an absolute asshole'
      ]

      inputs.forEach((text) => {
        const result = moderateContent(text)
        expect(result.isValid).toBe(false)
        expect(result.isFlagged).toBe(true)
        expect(result.category).toBeDefined()
        expect(isAppropriateForPublic(text)).toBe(false)
      })
    })
  })

  describe('Hate Speech & Discriminatory Slurs', () => {
    it('flags identity-based slurs and hate speech', () => {
      const slurs = [
        'you are a faggot',
        'you are a retard',
        'white supremacy will prevail'
      ]

      slurs.forEach((text) => {
        const result = moderateContent(text)
        expect(result.isValid).toBe(false)
        expect(result.isFlagged).toBe(true)
        expect(result.category).toContain('Hate Speech')
      })
    })
  })

  describe('Violence & Physical Threats', () => {
    it('flags threats of harm and suicide incitement', () => {
      const threats = [
        'i will murder you if you disagree',
        'go kill yourself you loser',
        'i will slit your throat'
      ]

      threats.forEach((text) => {
        const result = moderateContent(text)
        expect(result.isValid).toBe(false)
        expect(result.isFlagged).toBe(true)
        expect(result.category).toContain('Violence & Physical Threats')
      })
    })
  })

  describe('Obfuscation & Leetspeak Bypass Resilience', () => {
    it('flags punctuated and spaced profanity (e.g. f.u.c.k, s-h-i-t)', () => {
      const obfuscated = [
        'what a f.u.c.k.i.n.g idiot',
        'you little b-i-t-c-h',
        'total b.u.l.l.s.h.i.t'
      ]

      obfuscated.forEach((text) => {
        const result = moderateContent(text)
        expect(result.isValid).toBe(false)
        expect(result.isFlagged).toBe(true)
      })
    })

    it('flags leetspeak substitutions (e.g. b!tch, a$$hole)', () => {
      const leetInputs = [
        'you little b!tch',
        'what an a$$hole',
        'f@ck off'
      ]

      leetInputs.forEach((text) => {
        const result = moderateContent(text)
        expect(result.isValid).toBe(false)
        expect(result.isFlagged).toBe(true)
      })
    })

    it('flags character repetition stretching (e.g. fuuuuuck)', () => {
      const result = moderateContent('fuuuuuuck this whole project')
      expect(result.isValid).toBe(false)
      expect(result.isFlagged).toBe(true)
    })
    it('flags Cyrillic and Greek homoglyph evasions', () => {
      // \u0443 is Cyrillic 'у' visual lookalike for 'u'
      const cyrillicBypass = 'f\u0443ck you'
      const result = moderateContent(cyrillicBypass)
      expect(result.isValid).toBe(false)
      expect(result.isFlagged).toBe(true)
    })

    it('flags accented and diacritic obfuscation (e.g. fück, bîtch, shít)', () => {
      const accented = [
        'fück this',
        'you bîtch',
        'holy shít'
      ]
      accented.forEach((text) => {
        const result = moderateContent(text)
        expect(result.isValid).toBe(false)
        expect(result.isFlagged).toBe(true)
      })
    })

    it('flags wildcard asterisk masking (e.g. f*ck, b*tch, p*rn, sh*t)', () => {
      const asteriskMasked = [
        'what the f*ck',
        'such a b*tch',
        'watch free p*rn here',
        'full of sh*t'
      ]
      asteriskMasked.forEach((text) => {
        const result = moderateContent(text)
        expect(result.isValid).toBe(false)
        expect(result.isFlagged).toBe(true)
      })
    })

    it('flags zero-width space evasion', () => {
      const zeroWidth = 'f\u200Buck you'
      const result = moderateContent(zeroWidth)
      expect(result.isValid).toBe(false)
      expect(result.isFlagged).toBe(true)
    })

    it('flags letter-spaced threat words (e.g. k i l l yourself)', () => {
      const result = moderateContent('k i l l yourself')
      expect(result.isValid).toBe(false)
      expect(result.isFlagged).toBe(true)
    })
  })

  describe('Spam, Scams & Structural Limits', () => {
    it('flags crypto scam and casino spam', () => {
      const scamTexts = [
        'Join our new crypto-airdrop to claim free tokens today!',
        'Play at our online casino for instant cash payouts',
        'Get 10,000 free-followers on social media fast'
      ]

      scamTexts.forEach((text) => {
        const result = moderateContent(text)
        expect(result.isValid).toBe(false)
        expect(result.category).toContain('Spam')
      })
    })

    it('flags link flooding (> 3 links)', () => {
      const textWithManyLinks = 'Check out https://a.com and https://b.com and https://c.com and https://d.com'
      const result = moderateContent(textWithManyLinks)
      expect(result.isValid).toBe(false)
      expect(result.reason).toContain('excessive links')
    })

    it('flags content exceeding 5000 characters', () => {
      const longText = 'a'.repeat(5001)
      const result = moderateContent(longText)
      expect(result.isValid).toBe(false)
      expect(result.reason).toContain('maximum allowed length')
    })
  })

  describe('Helper Utilities', () => {
    it('normalizes leetspeak correctly', () => {
      expect(normalizeText('h3ll0 w0rld')).toBe('hello world')
      expect(normalizeText('b!tch')).toBe('bitch')
      expect(normalizeText('a$$hole')).toBe('asshole')
    })

    it('strips non-alphanumeric separators', () => {
      expect(stripSeparators('f.u.c.k')).toBe('fuck')
      expect(stripSeparators('b-i-t-c-h')).toBe('bitch')
    })

    it('normalizes diacritics and homoglyphs', () => {
      expect(normalizeText('fück')).toBe('fuck')
      expect(normalizeText('f\u0443ck')).toBe('fuck')
      expect(normalizeText('f*ck')).toBe('fuck')
    })
  })
})
