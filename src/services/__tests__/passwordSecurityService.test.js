import { describe, it, expect, vi, beforeEach } from 'vitest'
import { checkPasswordBreached } from '../passwordSecurityService'

describe('passwordSecurityService', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('returns not breached for empty or invalid inputs', async () => {
    expect(await checkPasswordBreached('')).toEqual({ isBreached: false, count: 0 })
    expect(await checkPasswordBreached(null)).toEqual({ isBreached: false, count: 0 })
  })

  it('detects a breached password when suffix matches HIBP range response', async () => {
    // SHA-1 of 'password' is 5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8
    // Prefix: 5BAA6, Suffix: 1E4C9B93F3F0682250B6CF8331B7EE68FD8
    const mockHibpResponse = `0018A45C4D1DEF81644B54AB7F969B88D65:1\r\n1E4C9B93F3F0682250B6CF8331B7EE68FD8:3861493\r\n00D4F6E8FA6ECC340E7F55CADAC079F6730:2`

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => mockHibpResponse
    })

    const result = await checkPasswordBreached('password')
    expect(result.isBreached).toBe(true)
    expect(result.count).toBe(3861493)
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://api.pwnedpasswords.com/range/5BAA6',
      expect.objectContaining({ headers: { 'Add-Padding': 'true' } })
    )
  })

  it('returns isBreached false when password hash suffix is not in response', async () => {
    const mockHibpResponse = `0018A45C4D1DEF81644B54AB7F969B88D65:1\r\n00D4F6E8FA6ECC340E7F55CADAC079F6730:2`

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => mockHibpResponse
    })

    const result = await checkPasswordBreached('SuperUniqueSecurePassword#2026!')
    expect(result.isBreached).toBe(false)
    expect(result.count).toBe(0)
  })

  it('fails open gracefully if HIBP API returns an error', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503
    })

    const result = await checkPasswordBreached('testpassword')
    expect(result.isBreached).toBe(false)
    expect(result.count).toBe(0)
  })
})
