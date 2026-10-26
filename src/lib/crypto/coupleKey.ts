'use client';

// The browser's handle on the couple's data key.
//
// The key itself is never stored on the device — not in localStorage, not in
// IndexedDB, nowhere a stolen laptop or an XSS bug could read it later. It is
// fetched from /api/crypto/key over the session cookie, imported as a
// non-extractable CryptoKey, and kept in a module variable that dies with the
// tab.
//
// Nothing here ever throws. Encryption is optional by design: a deployment
// with no master key set must behave exactly as it did before, so every
// failure path returns null and the caller uploads plaintext.

import { base64ToBytes, importKey } from '@/lib/crypto/envelope';

/**
 * Promises, not keys: two photos picked at once would otherwise each fire
 * their own request and mint two keys for the same couple.
 */
const cache = new Map<string, Promise<CryptoKey | null>>();

/**
 * Set once the server has told us there is no master key. That is a property
 * of the deployment, not of this request, so there is no point asking again
 * for every file in a 40-photo upload.
 */
let encryptionUnavailable = false;

async function requestKey(coupleId: string): Promise<CryptoKey | null> {
  const res = await fetch('/api/crypto/key', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ coupleId }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.configured === false || typeof data?.key !== 'string') {
    if (data?.configured === false) encryptionUnavailable = true;
    return null;
  }

  // Non-extractable (importKey asks for false), so even code running on the
  // page cannot read the bytes back out of it.
  return importKey(base64ToBytes(data.key));
}

/**
 * The couple's data key, or null when encryption is off or unreachable.
 *
 * Callers must treat null as "upload in the clear" rather than as an error:
 * refusing to upload because encryption is unconfigured would break every
 * deployment that has not set a master key.
 */
export async function getCoupleKey(coupleId: string | null | undefined): Promise<CryptoKey | null> {
  if (!coupleId || encryptionUnavailable) return null;

  const cached = cache.get(coupleId);
  if (cached) return cached;

  const pending = requestKey(coupleId).catch((err) => {
    // Never the key or the response body — only that it did not work.
    console.warn('[OurDiary] Encryption key unavailable; uploading without it.', err);
    return null;
  });
  cache.set(coupleId, pending);

  const key = await pending;
  // A transient failure (offline, a 500) should not poison the session; a
  // flat "not configured" already short-circuits above, so dropping the
  // entry here only ever costs one retry.
  if (!key) cache.delete(coupleId);
  return key;
}

/** Forgets everything cached. Call on sign-out, and from tests. */
export function clearCoupleKeyCache(): void {
  cache.clear();
  encryptionUnavailable = false;
}

/** Whether encryption is known to be unavailable for this deployment. */
export function isEncryptionUnavailable(): boolean {
  return encryptionUnavailable;
}
