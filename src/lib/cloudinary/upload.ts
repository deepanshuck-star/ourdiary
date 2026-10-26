'use client';

import { MAX_SONG_BYTES, validateSongFile } from '@/lib/features/music';
import { publicIdFromCloudinaryUrl } from '@/lib/cloudinary/publicId';
import { getCoupleKey } from '@/lib/crypto/coupleKey';
import { base64ToBytes, bytesToBase64, openBytes, sealBytes } from '@/lib/crypto/envelope';
import {
  canCompressInBrowser,
  compressImage,
  isCompressibleImage,
  type CompressedImage,
} from '@/lib/crypto/image';

/**
 * Deletes a Cloudinary asset the couple is replacing (their song, a profile
 * photo, the couple photo), so one couple occupies one file per slot instead
 * of accumulating every version ever uploaded.
 *
 * Deliberately never throws: this is cleanup that runs *after* the
 * replacement is already saved. Failing loudly here would report an error
 * for an action that actually succeeded, so a failure is logged and the
 * (billable, harmless) orphan is left behind. Returns whether it worked, for
 * callers that want to know.
 */
export async function destroyCloudinaryAsset(
  publicIdOrUrl: string | null | undefined,
  resourceType: 'image' | 'video' = 'image'
): Promise<boolean> {
  if (!publicIdOrUrl) return false;
  // Accept either a stored public_id or the delivery URL, since avatars and
  // the couple photo only ever stored the URL.
  const publicId = publicIdOrUrl.startsWith('http')
    ? publicIdFromCloudinaryUrl(publicIdOrUrl)
    : publicIdOrUrl;
  if (!publicId) return false;

  try {
    const res = await fetch('/api/media/destroy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ publicId, resourceType }),
    });
    if (!res.ok) {
      console.warn('[OurDiary] Could not delete the replaced file:', res.status);
      return false;
    }
    const data = await res.json().catch(() => ({}));
    return Boolean(data?.deleted);
  } catch (err) {
    console.warn('[OurDiary] Could not delete the replaced file:', err);
    return false;
  }
}

/**
 * Uploads an image from the browser straight to Cloudinary using a short-lived
 * signature from /api/media/sign-upload. The server never sees the file;
 * Cloudinary credentials (API secret) never leave the server.
 */
export async function uploadImageToCloudinary(
  file: File,
  opts: { maxBytes?: number } = {}
): Promise<{ secureUrl: string; publicId: string }> {
  const maxBytes = opts.maxBytes ?? 8 * 1024 * 1024; // 8MB
  if (!file.type.startsWith('image/')) {
    throw new Error('Please choose an image file.');
  }
  if (file.size > maxBytes) {
    throw new Error(`Image is too large (max ${Math.round(maxBytes / (1024 * 1024))}MB).`);
  }

  const signRes = await fetch('/api/media/sign-upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resourceType: 'image' }),
  });
  const signData = await signRes.json().catch(() => ({}));
  if (!signRes.ok || !signData.configured) {
    throw new Error(signData.message || signData.error || 'Photo uploads are not available right now.');
  }

  const form = new FormData();
  form.append('file', file);
  form.append('api_key', signData.apiKey);
  form.append('timestamp', String(signData.timestamp));
  form.append('signature', signData.signature);
  form.append('folder', signData.folder);

  const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${signData.cloudName}/image/upload`, {
    method: 'POST',
    body: form,
  });
  const uploadData = await uploadRes.json().catch(() => ({}));
  if (!uploadRes.ok) {
    throw new Error(uploadData?.error?.message || 'Upload failed. Please try again.');
  }

  return { secureUrl: uploadData.secure_url, publicId: uploadData.public_id };
}

/**
 * Uploads an audio clip (voice note) to Cloudinary. Cloudinary treats audio
 * as a 'video' resource type — same signed flow as images, just a different
 * endpoint and resourceType.
 */
export async function uploadAudioToCloudinary(
  blob: Blob,
  opts: { maxBytes?: number; filename?: string } = {}
): Promise<{ secureUrl: string; publicId: string }> {
  const maxBytes = opts.maxBytes ?? 10 * 1024 * 1024; // 10MB — plenty for a 60s clip
  if (blob.size > maxBytes) {
    throw new Error(`That recording is too large (max ${Math.round(maxBytes / (1024 * 1024))}MB).`);
  }

  const signRes = await fetch('/api/media/sign-upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resourceType: 'video' }),
  });
  const signData = await signRes.json().catch(() => ({}));
  if (!signRes.ok || !signData.configured) {
    throw new Error(signData.message || signData.error || 'Voice note uploads are not available right now.');
  }

  const form = new FormData();
  form.append('file', blob, opts.filename || 'voice-note.webm');
  form.append('api_key', signData.apiKey);
  form.append('timestamp', String(signData.timestamp));
  form.append('signature', signData.signature);
  form.append('folder', signData.folder);

  const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${signData.cloudName}/video/upload`, {
    method: 'POST',
    body: form,
  });
  const uploadData = await uploadRes.json().catch(() => ({}));
  if (!uploadRes.ok) {
    throw new Error(uploadData?.error?.message || 'Upload failed. Please try again.');
  }

  return { secureUrl: uploadData.secure_url, publicId: uploadData.public_id };
}

/**
 * Uploads a song file (MP3/M4A/WAV/...) for the couple soundtrack. Like voice
 * notes, audio goes through Cloudinary's 'video' resource type. Validation
 * lives in src/lib/features/music.ts so the rules are testable; the caller is
 * expected to have run validateSongFile() and shown its message already —
 * the guard here is the backstop for a direct call.
 *
 * Cloudinary reports the decoded duration back, which is more reliable than
 * asking the browser to decode the file, so it's returned for the caller to
 * store.
 */
export async function uploadSongToCloudinary(
  file: File,
  opts: { maxBytes?: number } = {}
): Promise<{ secureUrl: string; publicId: string; durationSec: number | null }> {
  const maxBytes = opts.maxBytes ?? MAX_SONG_BYTES;
  const problem = validateSongFile(file, maxBytes);
  if (problem) throw new Error(problem);

  const signRes = await fetch('/api/media/sign-upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resourceType: 'video' }),
  });
  const signData = await signRes.json().catch(() => ({}));
  if (!signRes.ok || !signData.configured) {
    throw new Error(signData.message || signData.error || 'Song uploads are not available right now.');
  }

  const form = new FormData();
  form.append('file', file);
  form.append('api_key', signData.apiKey);
  form.append('timestamp', String(signData.timestamp));
  form.append('signature', signData.signature);
  form.append('folder', signData.folder);

  const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${signData.cloudName}/video/upload`, {
    method: 'POST',
    body: form,
  });
  const uploadData = await uploadRes.json().catch(() => ({}));
  if (!uploadRes.ok) {
    throw new Error(uploadData?.error?.message || 'Upload failed. Please try again.');
  }

  const durationSec = typeof uploadData.duration === 'number' ? uploadData.duration : null;
  return { secureUrl: uploadData.secure_url, publicId: uploadData.public_id, durationSec };
}

// ======================================================================
// Encrypted uploads
//
// Everything above stays exactly as it was: callers that have not migrated
// keep uploading plaintext and keep working. What follows is the opt-in
// path, and it only ever does anything when the deployment has a master key
// set — otherwise getCoupleKey() returns null and we fall straight back to
// the plaintext functions above.
//
// The order is compress → encrypt → upload, and it cannot be any other way:
// encrypted bytes are random noise, so nothing can compress them afterwards.
// See src/lib/crypto/image.ts.
// ======================================================================

/** Default ceiling on the ORIGINAL file, matched to uploadImageToCloudinary
 *  so a photo is never accepted on one path and rejected on the other. */
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

// ------------------------------------------------- the iv, inside the URL ---
//
// Decrypting a file needs its nonce, but every call site stores exactly one
// string — a Supabase TEXT column, or a URL inside a JSON blob — with no
// spare field. Carrying the nonce in the URL fragment avoids a migration
// across four tables for a value that is not secret in the first place.
//
// Three things make this safe rather than merely convenient:
//   * an iv is public by design; AES-GCM assumes the attacker has it,
//   * a fragment is never sent to the server, so it costs nothing on the
//     wire and cannot end up in Cloudinary's logs,
//   * `new URL().pathname` ignores it, so publicIdFromCloudinaryUrl and
//     therefore destroyCloudinaryAsset keep working on a packed URL.
//
// And the part that matters most: a stored URL with NO fragment means
// "plaintext, from before encryption" — which is exactly how every photo
// already in the database keeps rendering.

const IV_FRAGMENT_PREFIX = 'iv=';

/** Attaches an iv to a URL for storage. Returns `url` unchanged when there
 *  is no iv, so the plaintext path stores precisely what it stores today. */
export function packEncryptedUrl(url: string, iv: string | null | undefined): string {
  if (!url || !iv) return url || '';
  return `${url}#${IV_FRAGMENT_PREFIX}${encodeURIComponent(iv)}`;
}

/**
 * Splits a stored value back into the URL and its iv.
 *
 * `iv` is null for anything this function did not pack — an old plaintext
 * URL, a data: URL from demo mode, a fragment that means something else —
 * and callers must read that as "render it as-is", never as an error.
 */
export function readEncryptedUrl(stored: string | null | undefined): { url: string; iv: string | null } {
  const value = stored || '';
  const hash = value.lastIndexOf('#');
  if (hash === -1) return { url: value, iv: null };

  const fragment = value.slice(hash + 1);
  if (!fragment.startsWith(IV_FRAGMENT_PREFIX)) return { url: value, iv: null };

  let iv: string;
  try {
    iv = decodeURIComponent(fragment.slice(IV_FRAGMENT_PREFIX.length));
  } catch {
    // A truncated or mangled fragment is not worth failing an image over;
    // falling back to the plaintext reading is the safe direction.
    return { url: value, iv: null };
  }
  return iv ? { url: value.slice(0, hash), iv } : { url: value, iv: null };
}

export interface UploadedVariant {
  secureUrl: string;
  publicId: string;
  /** Base64 AES-GCM nonce. Persist it: without it the bytes are unreadable. */
  iv: string | null;
  width: number | null;
  height: number | null;
}

export interface EncryptedImageUpload {
  /** False when the deployment has no master key and we uploaded in the clear. */
  encrypted: boolean;
  display: UploadedVariant;
  /** Null for formats we do not re-encode (GIF, SVG) and on old browsers. */
  thumb: UploadedVariant | null;
  /** The display variant's fields again, for callers that store one URL. */
  secureUrl: string;
  publicId: string;
  iv: string | null;
}

/**
 * Posts ciphertext to Cloudinary's `raw` endpoint.
 *
 * Raw, not `image`: Cloudinary would reject encrypted bytes as a corrupt
 * image, and even if it did not, it must not be able to transform or
 * thumbnail them — that would mean it could read them. The signature from
 * /api/media/sign-upload covers only the folder and timestamp, so it is
 * valid at this endpoint too.
 */
async function uploadCiphertext(
  bytes: Uint8Array,
  filename: string
): Promise<{ secureUrl: string; publicId: string }> {
  const signRes = await fetch('/api/media/sign-upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resourceType: 'image' }),
  });
  const signData = await signRes.json().catch(() => ({}));
  if (!signRes.ok || !signData.configured) {
    throw new Error(signData.message || signData.error || 'Uploads are not available right now.');
  }

  const form = new FormData();
  form.append('file', new Blob([bytes as unknown as BlobPart], { type: 'application/octet-stream' }), filename);
  form.append('api_key', signData.apiKey);
  form.append('timestamp', String(signData.timestamp));
  form.append('signature', signData.signature);
  form.append('folder', signData.folder);

  const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${signData.cloudName}/raw/upload`, {
    method: 'POST',
    body: form,
  });
  const uploadData = await uploadRes.json().catch(() => ({}));
  if (!uploadRes.ok) {
    throw new Error(uploadData?.error?.message || 'Upload failed. Please try again.');
  }

  return { secureUrl: uploadData.secure_url, publicId: uploadData.public_id };
}

async function sealAndUpload(
  key: CryptoKey,
  bytes: Uint8Array,
  filename: string,
  size: { width: number; height: number } | null
): Promise<UploadedVariant> {
  const sealed = await sealBytes(key, bytes);
  const { secureUrl, publicId } = await uploadCiphertext(base64ToBytes(sealed.data), filename);
  return {
    secureUrl,
    publicId,
    iv: sealed.iv,
    width: size?.width ?? null,
    height: size?.height ?? null,
  };
}

async function blobBytes(blob: Blob): Promise<Uint8Array> {
  return new Uint8Array(await blob.arrayBuffer());
}

/**
 * Compresses a photo, encrypts each variant with the couple's key, and
 * uploads the ciphertext. Storage only ever holds scrambled bytes.
 *
 * Falls back to the existing plaintext upload — same return shape, with
 * `encrypted: false` — whenever there is no key to use. A deployment that
 * has not set OURDIARY_MASTER_KEY therefore behaves exactly as it does
 * today.
 */
export async function uploadEncryptedImage(
  file: File,
  coupleId: string | null | undefined,
  opts: { maxBytes?: number } = {}
): Promise<EncryptedImageUpload> {
  const maxBytes = opts.maxBytes ?? MAX_IMAGE_BYTES;
  if (!file.type.startsWith('image/')) {
    throw new Error('Please choose an image file.');
  }
  if (file.size > maxBytes) {
    throw new Error(`Image is too large (max ${Math.round(maxBytes / (1024 * 1024))}MB).`);
  }

  const key = await getCoupleKey(coupleId);
  if (!key) {
    const plain = await uploadImageToCloudinary(file, { maxBytes });
    const variant: UploadedVariant = { ...plain, iv: null, width: null, height: null };
    return {
      encrypted: false,
      display: variant,
      thumb: null,
      secureUrl: plain.secureUrl,
      publicId: plain.publicId,
      iv: null,
    };
  }

  let compressed: CompressedImage | null = null;
  if (isCompressibleImage(file.type) && canCompressInBrowser()) {
    try {
      compressed = await compressImage(file);
    } catch (err) {
      // An unreadable or exotic image. Still worth encrypting as it is —
      // losing the compression is much better than losing the privacy.
      console.warn('[OurDiary] Could not compress this photo; encrypting it as-is.', err);
    }
  }

  if (!compressed) {
    const display = await sealAndUpload(key, await blobBytes(file), 'photo.enc', null);
    return { encrypted: true, display, thumb: null, secureUrl: display.secureUrl, publicId: display.publicId, iv: display.iv };
  }

  const display = await sealAndUpload(
    key,
    await blobBytes(compressed.display.blob),
    'photo-display.enc',
    compressed.display
  );
  const thumb = await sealAndUpload(
    key,
    await blobBytes(compressed.thumb.blob),
    'photo-thumb.enc',
    compressed.thumb
  );

  return {
    encrypted: true,
    display,
    thumb,
    secureUrl: display.secureUrl,
    publicId: display.publicId,
    iv: display.iv,
  };
}

/**
 * Encrypts and uploads bytes we cannot usefully compress ourselves — a video
 * the camera already encoded, a voice note.
 *
 * Note the trade-off: an encrypted video cannot be streamed or transcoded by
 * Cloudinary, because nothing there can read it. The whole file has to come
 * down and be decrypted before it plays, which is fine for a short clip and
 * would not be for a feature film.
 */
export async function uploadEncryptedBlob(
  blob: Blob,
  coupleId: string | null | undefined,
  opts: { filename?: string } = {}
): Promise<{ encrypted: boolean; secureUrl: string; publicId: string; iv: string | null } | null> {
  const key = await getCoupleKey(coupleId);
  if (!key) return null; // Caller falls back to its own plaintext upload.

  const variant = await sealAndUpload(key, await blobBytes(blob), opts.filename || 'media.enc', null);
  return { encrypted: true, secureUrl: variant.secureUrl, publicId: variant.publicId, iv: variant.iv };
}

/**
 * Downloads an encrypted asset and turns it into an object URL an <img> or
 * <video> can use.
 *
 * Returns the URL unchanged when there is nothing to decrypt (no iv, or no
 * key configured) so a gallery can mix old plaintext photos with new
 * encrypted ones without caring which is which, and null when the bytes are
 * there but will not open — a caller showing a placeholder is better than a
 * broken image.
 *
 * Object URLs leak memory until revoked; pass the result to
 * releaseDecryptedUrl() when the element goes away.
 */
export async function fetchAndDecrypt(
  url: string,
  coupleId: string | null | undefined,
  iv: string | null | undefined,
  opts: { type?: string } = {}
): Promise<string | null> {
  if (!url || !iv) return url || null;

  const key = await getCoupleKey(coupleId);
  if (!key) return url;

  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const cipher = new Uint8Array(await res.arrayBuffer());
    const plain = await openBytes(key, { data: bytesToBase64(cipher), iv });
    return URL.createObjectURL(
      new Blob([plain as unknown as BlobPart], { type: opts.type || 'image/webp' })
    );
  } catch (err) {
    // A wrong key or tampered bytes land here — AES-GCM authenticates, so a
    // modified file fails to open rather than decoding to rubbish.
    console.warn('[OurDiary] Could not decrypt this file.', err);
    return null;
  }
}

/** Frees an object URL from fetchAndDecrypt. Safe to call with a plain URL. */
export function releaseDecryptedUrl(url: string | null | undefined): void {
  if (url && url.startsWith('blob:')) URL.revokeObjectURL(url);
}
