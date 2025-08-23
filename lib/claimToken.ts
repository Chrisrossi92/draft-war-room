// lib/claimToken.ts
const KEY_PREFIX = 'dwr-claim-token:';

export function getOrCreateClaimToken(sessionId: string) {
  const key = `${KEY_PREFIX}${sessionId}`;
  try {
    const existing = localStorage.getItem(key);
    if (existing) return existing;
  } catch {
    /* ignore */
  }

  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  for (let i = 0; i < 24; i++) out += chars[Math.floor(Math.random() * chars.length)];

  try { localStorage.setItem(`${KEY_PREFIX}${sessionId}`, out); } catch { /* ignore */ }
  return out;
}

