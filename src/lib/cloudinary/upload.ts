'use client';

import { MAX_SONG_BYTES, validateSongFile } from '@/lib/features/music';

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
