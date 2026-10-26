// Envelope encryption for photos, videos and anything else stored as bytes.
//
// Only Web Crypto — no dependency, and the same code runs in the browser, in
// a Next route and under `node --test` (see tests/envelope.test.mjs), so the
// security-critical part is actually covered by tests rather than living
// inside a component.
//
// TWO LAYERS, and the reason matters:
//
//   data key   — random, one per couple, encrypts the actual files.
//   master key — one per deployment, lives only in the server environment,
//                and encrypts ("wraps") the data keys.
//
// The database stores wrapped keys. A stolen backup is therefore useless on
// its own: an attacker would need the running server's environment too. It
// also means changing a password never re-encrypts a single photo — only the
// small wrapped key would be rewritten.
//
// AES-GCM throughout. It authenticates as well as encrypts, so a modified
// ciphertext fails to decrypt instead of returning quiet rubbish.

/** AES-GCM nonce length in bytes. 96 bits is the size the spec is built for. */
export const IV_BYTES = 12;
/** 256-bit keys. */
export const KEY_BYTES = 32;

export type Base64 = string;

// ---------------------------------------------------------------- base64 ---
// Hand-rolled rather than Buffer/atob so the same functions work in the
// browser, on the server and in the test runner without a polyfill.

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export function bytesToBase64(bytes: Uint8Array): Base64 {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i];
    const b = bytes[i + 1];
    const c = bytes[i + 2];
    out += B64[a >> 2];
    out += B64[((a & 3) << 4) | ((b ?? 0) >> 4)];
    out += b === undefined ? '=' : B64[((b & 15) << 2) | ((c ?? 0) >> 6)];
    out += c === undefined ? '=' : B64[c & 63];
  }
  return out;
}

export function base64ToBytes(value: Base64): Uint8Array {
  const clean = value.replace(/[^A-Za-z0-9+/]/g, '');
  const out = new Uint8Array(Math.floor((clean.length * 3) / 4));
  let p = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const n =
      (B64.indexOf(clean[i]) << 18) |
      (B64.indexOf(clean[i + 1]) << 12) |
      ((clean[i + 2] ? B64.indexOf(clean[i + 2]) : 0) << 6) |
      (clean[i + 3] ? B64.indexOf(clean[i + 3]) : 0);
    if (p < out.length) out[p++] = (n >> 16) & 255;
    if (p < out.length) out[p++] = (n >> 8) & 255;
    if (p < out.length) out[p++] = n & 255;
  }
  return out;
}

// ------------------------------------------------------------------ keys ---

function subtle(): SubtleCrypto {
  const c = (globalThis as { crypto?: Crypto }).crypto;
  if (!c?.subtle) {
    throw new Error('Web Crypto is unavailable here, so encryption cannot run.');
  }
  return c.subtle;
}

export function randomBytes(length: number): Uint8Array {
  const out = new Uint8Array(length);
  (globalThis as { crypto: Crypto }).crypto.getRandomValues(out);
  return out;
}

/** A fresh 256-bit key, as raw bytes. */
export function generateKeyBytes(): Uint8Array {
  return randomBytes(KEY_BYTES);
}

export async function importKey(raw: Uint8Array): Promise<CryptoKey> {
  if (raw.length !== KEY_BYTES) {
    throw new Error(`A key must be ${KEY_BYTES} bytes, got ${raw.length}.`);
  }
  return subtle().importKey('raw', raw as unknown as BufferSource, 'AES-GCM', false, [
    'encrypt',
    'decrypt',
  ]);
}

export interface Sealed {
  /** Base64 ciphertext, including the GCM tag. */
  data: Base64;
  /** Base64 nonce. Fresh for every single seal — never reused. */
  iv: Base64;
}

/**
 * Encrypts bytes under a key.
 *
 * A new random nonce every time. Reusing one with the same key is the single
 * way to break AES-GCM badly, so it is generated here rather than accepted
 * as an argument where a caller could hold one still.
 */
export async function sealBytes(key: CryptoKey, bytes: Uint8Array): Promise<Sealed> {
  const iv = randomBytes(IV_BYTES);
  const cipher = await subtle().encrypt(
    { name: 'AES-GCM', iv: iv as unknown as BufferSource },
    key,
    bytes as unknown as BufferSource
  );
  return { data: bytesToBase64(new Uint8Array(cipher)), iv: bytesToBase64(iv) };
}

/** Throws if the ciphertext or nonce has been altered — GCM authenticates. */
export async function openBytes(key: CryptoKey, sealed: Sealed): Promise<Uint8Array> {
  const plain = await subtle().decrypt(
    { name: 'AES-GCM', iv: base64ToBytes(sealed.iv) as unknown as BufferSource },
    key,
    base64ToBytes(sealed.data) as unknown as BufferSource
  );
  return new Uint8Array(plain);
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export async function sealText(key: CryptoKey, text: string): Promise<Sealed> {
  return sealBytes(key, encoder.encode(text));
}

export async function openText(key: CryptoKey, sealed: Sealed): Promise<string> {
  return decoder.decode(await openBytes(key, sealed));
}

// --------------------------------------------------------------- wrapping ---

/** Encrypts a couple's data key with the deployment's master key. */
export async function wrapKey(masterKey: CryptoKey, dataKey: Uint8Array): Promise<Sealed> {
  return sealBytes(masterKey, dataKey);
}

export async function unwrapKey(masterKey: CryptoKey, wrapped: Sealed): Promise<Uint8Array> {
  const raw = await openBytes(masterKey, wrapped);
  if (raw.length !== KEY_BYTES) {
    throw new Error('The unwrapped key is the wrong length — wrong master key?');
  }
  return raw;
}

/**
 * Reads the master key from its base64 environment value.
 *
 * Returns null when it is absent, rather than throwing: a deployment without
 * a master key runs with encryption switched off and everything else
 * working, which is what makes this safe to roll out gradually. Callers must
 * handle null instead of assuming it is configured.
 */
export async function masterKeyFrom(value: string | undefined | null): Promise<CryptoKey | null> {
  if (!value || !value.trim()) return null;
  let raw: Uint8Array;
  try {
    raw = base64ToBytes(value.trim());
  } catch {
    return null;
  }
  if (raw.length !== KEY_BYTES) return null;
  return importKey(raw);
}

// ---------------------------------------------------------------- preview ---

/** Longest notification preview we will ever store. */
export const PREVIEW_MAX = 80;

/**
 * The short plaintext line a notification may show, or null when previews
 * are off for this couple.
 *
 * Deliberately a pure function taking the flag as an argument: the decision
 * is made once, by the sender, at the moment of sending, and recorded on the
 * message. Nothing later re-derives it, so flipping the setting cannot
 * retroactively expose a message that was sent while it was off.
 *
 * Collapses whitespace so a message of newlines cannot push the readable
 * part out of the visible line, and trims on a word boundary where it can.
 */
export function previewFor(
  content: string,
  previewsEnabled: boolean,
  maxLength = PREVIEW_MAX
): string | null {
  if (!previewsEnabled) return null;
  const flat = content.replace(/\s+/g, ' ').trim();
  if (!flat) return null;
  if (flat.length <= maxLength) return flat;
  const cut = flat.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > maxLength * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}
