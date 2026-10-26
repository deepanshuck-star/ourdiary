import test from 'node:test';
import assert from 'node:assert/strict';
import {
  IV_BYTES,
  KEY_BYTES,
  PREVIEW_MAX,
  base64ToBytes,
  bytesToBase64,
  generateKeyBytes,
  importKey,
  masterKeyFrom,
  openBytes,
  openText,
  previewFor,
  sealBytes,
  sealText,
  unwrapKey,
  wrapKey,
} from '../src/lib/crypto/envelope.ts';

test('base64 round-trips every byte value and all three padding cases', () => {
  const all = new Uint8Array(256);
  for (let i = 0; i < 256; i += 1) all[i] = i;
  assert.deepEqual(base64ToBytes(bytesToBase64(all)), all);

  for (const length of [1, 2, 3, 4, 5]) {
    const bytes = all.slice(0, length);
    assert.deepEqual(base64ToBytes(bytesToBase64(bytes)), bytes, `length ${length}`);
  }
  assert.deepEqual(bytesToBase64(new Uint8Array(0)), '');
});

test('a sealed photo comes back byte-identical', async () => {
  const key = await importKey(generateKeyBytes());
  // Stand-in for image bytes: every value, including nulls.
  const photo = new Uint8Array(5000);
  for (let i = 0; i < photo.length; i += 1) photo[i] = (i * 7) % 256;

  const sealed = await sealBytes(key, photo);
  assert.deepEqual(await openBytes(key, sealed), photo);
});

test('the ciphertext does not contain the plaintext', async () => {
  const key = await importKey(generateKeyBytes());
  const sealed = await sealText(key, 'meet me at the station at six');
  // The whole point: what is stored must not reveal what was written.
  assert.equal(sealed.data.includes('station'), false);
  assert.equal(await openText(key, sealed), 'meet me at the station at six');
});

test('every seal uses a fresh nonce, so the same input looks different', async () => {
  const key = await importKey(generateKeyBytes());
  const a = await sealText(key, 'same message');
  const b = await sealText(key, 'same message');
  // Nonce reuse is the one way to break AES-GCM badly.
  assert.notEqual(a.iv, b.iv);
  assert.notEqual(a.data, b.data);
  assert.equal(base64ToBytes(a.iv).length, IV_BYTES);
});

test('the wrong key cannot open it', async () => {
  const key = await importKey(generateKeyBytes());
  const other = await importKey(generateKeyBytes());
  const sealed = await sealText(key, 'private');
  await assert.rejects(() => openText(other, sealed));
});

test('tampered ciphertext is rejected rather than returning rubbish', async () => {
  const key = await importKey(generateKeyBytes());
  const sealed = await sealText(key, 'the original message');
  const bytes = base64ToBytes(sealed.data);
  bytes[0] ^= 0xff;
  // GCM authenticates, so a flipped bit fails loudly instead of decoding
  // to something plausible.
  await assert.rejects(() => openText(key, { ...sealed, data: bytesToBase64(bytes) }));
});

test('a data key survives wrapping and unwrapping', async () => {
  const master = await importKey(generateKeyBytes());
  const dataKey = generateKeyBytes();
  assert.equal(dataKey.length, KEY_BYTES);

  const wrapped = await wrapKey(master, dataKey);
  assert.deepEqual(await unwrapKey(master, wrapped), dataKey);

  // A photo sealed with the unwrapped key still opens — the full chain.
  const key = await importKey(await unwrapKey(master, wrapped));
  const sealed = await sealText(key, 'a memory');
  assert.equal(await openText(key, sealed), 'a memory');
});

test('the wrong master key cannot unwrap a data key', async () => {
  const master = await importKey(generateKeyBytes());
  const imposter = await importKey(generateKeyBytes());
  const wrapped = await wrapKey(master, generateKeyBytes());
  await assert.rejects(() => unwrapKey(imposter, wrapped));
});

test('a missing or malformed master key disables encryption instead of crashing', async () => {
  // A deployment with no master key must still run, with encryption off.
  assert.equal(await masterKeyFrom(undefined), null);
  assert.equal(await masterKeyFrom(''), null);
  assert.equal(await masterKeyFrom('   '), null);
  // Right shape, wrong length.
  assert.equal(await masterKeyFrom(bytesToBase64(new Uint8Array(16))), null);
  // Correct length is accepted.
  assert.notEqual(await masterKeyFrom(bytesToBase64(generateKeyBytes())), null);
});

test('previews are off unless the couple asked for them', () => {
  assert.equal(previewFor('miss you', false), null);
  assert.equal(previewFor('miss you', true), 'miss you');
});

test('a preview never exceeds the limit and trims on a word where it can', () => {
  const long =
    'I have been thinking about that evening in Kolkata all week and I still cannot stop smiling about it';
  const preview = previewFor(long, true);
  assert.ok(preview.length <= PREVIEW_MAX + 1, 'allow one char for the ellipsis');
  assert.ok(preview.endsWith('…'));
  assert.equal(preview.includes('  '), false);
  // A single unbroken token still gets cut rather than overflowing.
  const wall = previewFor('x'.repeat(300), true);
  assert.ok(wall.length <= PREVIEW_MAX + 1);
});

test('whitespace cannot push the readable part out of view', () => {
  // A message of newlines used to produce a blank-looking preview that still
  // carried the text further down.
  assert.equal(previewFor('\n\n\n   hello   \n\n there \n', true), 'hello there');
  assert.equal(previewFor('   ', true), null);
  assert.equal(previewFor('', true), null);
});
