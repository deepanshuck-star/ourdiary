#!/usr/bin/env node
/**
 * Decrypt one stored photo, using the deployment's master key.
 *
 * This exists for two honest reasons: to verify that encryption is actually
 * working, and as the recovery path if a couple's media ever has to be
 * recovered by hand. It is also, plainly, proof that whoever holds
 * OURDIARY_MASTER_KEY can read any photo — which is why the Privacy page
 * says so rather than claiming otherwise.
 *
 * Standalone on purpose: it imports nothing from the app, so it keeps
 * working even if the app's crypto module changes shape.
 *
 * Usage:
 *   OURDIARY_MASTER_KEY=... node scripts/decrypt-photo.mjs \
 *     --wrapped <couple_keys.wrapped_key> \
 *     --wrap-iv <couple_keys.wrap_iv> \
 *     --url "<the stored photo URL, including its #iv=... fragment>" \
 *     [--out photo.webp]
 *
 * The three values come from:
 *   wrapped / wrap-iv  → Supabase, table `couple_keys`, the couple's row
 *   url                → wherever that photo's URL is stored (a memory's
 *                        photo row, couples.photo_url, a feature_state blob)
 */

import { writeFileSync } from 'node:fs';
import { webcrypto as crypto } from 'node:crypto';

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? null : process.argv[i + 1];
}

function die(message) {
  console.error(`\n  ${message}\n`);
  process.exit(1);
}

const masterB64 = process.env.OURDIARY_MASTER_KEY;
const wrapped = arg('wrapped');
const wrapIv = arg('wrap-iv');
const rawUrl = arg('url');
const outPath = arg('out') || 'decrypted-photo.webp';

if (!masterB64) die('Set OURDIARY_MASTER_KEY first.');
if (!wrapped || !wrapIv || !rawUrl) {
  die('Need --wrapped, --wrap-iv and --url. See the comment at the top of this file.');
}

const b64 = (s) => new Uint8Array(Buffer.from(s, 'base64'));

const masterRaw = b64(masterB64);
if (masterRaw.length !== 32) {
  die(`OURDIARY_MASTER_KEY must decode to 32 bytes, got ${masterRaw.length}. Wrong key, or it got mangled in copying.`);
}

// The iv travels in the URL fragment, which is why no schema column was
// needed for it. No fragment means the photo predates encryption.
const hashAt = rawUrl.indexOf('#iv=');
if (hashAt === -1) {
  die('That URL has no #iv= fragment, so the file is NOT encrypted — it is a plaintext upload from before encryption was switched on. Open it in a browser.');
}
const url = rawUrl.slice(0, hashAt);
const photoIv = b64(decodeURIComponent(rawUrl.slice(hashAt + 4)));

const importKey = (raw) =>
  crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['decrypt']);

const open = (key, iv, data) =>
  crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);

try {
  // 1. Unwrap the couple's data key with the master key.
  const masterKey = await importKey(masterRaw);
  let dataKeyRaw;
  try {
    dataKeyRaw = new Uint8Array(await open(masterKey, b64(wrapIv), b64(wrapped)));
  } catch {
    die('Could not unwrap the data key. Either OURDIARY_MASTER_KEY is not the key this couple was encrypted under, or wrapped/wrap-iv were copied from different rows.');
  }
  if (dataKeyRaw.length !== 32) die('Unwrapped a key of the wrong length — mismatched master key.');

  // 2. Fetch the stored ciphertext.
  console.log(`  fetching  ${url}`);
  const res = await fetch(url);
  if (!res.ok) die(`Download failed: HTTP ${res.status}`);
  const cipher = new Uint8Array(await res.arrayBuffer());

  // 3. Decrypt it. AES-GCM authenticates, so a wrong key or a tampered file
  //    fails here rather than producing plausible rubbish.
  const dataKey = await importKey(dataKeyRaw);
  let plain;
  try {
    plain = Buffer.from(await open(dataKey, photoIv, cipher));
  } catch {
    die('Decryption failed. The file, the iv and the key do not belong together — check the URL came from the same couple as the key.');
  }

  writeFileSync(outPath, plain);
  const kind = plain[0] === 0xff && plain[1] === 0xd8 ? 'JPEG'
    : plain.subarray(8, 12).toString() === 'WEBP' ? 'WebP'
    : plain[0] === 0x89 && plain.subarray(1, 4).toString() === 'PNG' ? 'PNG'
    : 'unknown';

  console.log(`  ciphertext ${cipher.length.toLocaleString()} bytes`);
  console.log(`  decrypted  ${plain.length.toLocaleString()} bytes (${kind})`);
  console.log(`\n  Written to ${outPath} — open it.\n`);
} catch (err) {
  die(err?.message || String(err));
}
