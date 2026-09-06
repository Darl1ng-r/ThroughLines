/**
 * Zero-cost, Privacy-Preserving Leaked Password Protection via HaveIBeenPwned k-Anonymity API.
 * 
 * Complies with NIST SP 800-63B password guidelines.
 * Uses SHA-1 prefixing so the plaintext password and full hash never leave the client device.
 */

export async function checkPasswordBreached(password) {
  if (!password || typeof password !== 'string') {
    return { isBreached: false, count: 0 };
  }

  try {
    // 1. Hash password with SHA-1 using native Web Crypto API
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-1', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();

    const prefix = hashHex.slice(0, 5);
    const suffix = hashHex.slice(5);

    // 2. Query HIBP Range API with 5-character prefix only (k-Anonymity model)
    const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      method: 'GET',
      headers: {
        'Add-Padding': 'true' // Padding prevents side-channel response size analysis
      }
    });

    if (!response.ok) {
      // Graceful fallback if network or HIBP is unavailable
      return { isBreached: false, count: 0 };
    }

    const text = await response.text();
    const lines = text.split('\n');

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;
      const [hashSuffix, countStr] = line.split(':');
      if (hashSuffix.toUpperCase() === suffix) {
        return {
          isBreached: true,
          count: parseInt(countStr, 10) || 1
        };
      }
    }

    return { isBreached: false, count: 0 };
  } catch (err) {
    console.warn('Password breach verification skipped due to network/crypto error:', err);
    return { isBreached: false, count: 0 };
  }
}
