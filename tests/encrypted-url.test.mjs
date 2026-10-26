import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { registerHooks } from 'node:module';
import { pathToFileURL } from 'node:url';

// upload.ts reaches its siblings through the `@/` alias, which tsconfig knows
// about and the bare node resolver does not. Teaching the loader the same
// mapping is what lets these pure helpers be tested where they actually live,
// instead of being split into a file nothing else imports.
const SRC = pathToFileURL(path.join(process.cwd(), 'src') + path.sep).href;
registerHooks({
  resolve(specifier, context, next) {
    if (specifier.startsWith('@/')) {
      return next(new URL(`${specifier.slice(2)}.ts`, SRC).href, context);
    }
    return next(specifier, context);
  },
});

const { packEncryptedUrl, readEncryptedUrl } = await import('../src/lib/cloudinary/upload.ts');
const { publicIdFromCloudinaryUrl } = await import('../src/lib/cloudinary/publicId.ts');

const COUPLE = '2f1c9a4e-0000-4000-8000-abcdefabcdef';
const URL_ = `https://res.cloudinary.com/demo/raw/upload/v1730000000/ourdiary/${COUPLE}/photo-display.enc`;

test('packEncryptedUrl / readEncryptedUrl round-trip an iv', () => {
  const iv = 'q83vK0Lm9Zx1Ab2c';
  const packed = packEncryptedUrl(URL_, iv);
  assert.equal(packed, `${URL_}#iv=${iv}`);
  assert.deepEqual(readEncryptedUrl(packed), { url: URL_, iv });
});

test('a URL with no fragment reads as plaintext — this is what keeps old photos working', () => {
  assert.deepEqual(readEncryptedUrl(URL_), { url: URL_, iv: null });
  assert.deepEqual(readEncryptedUrl('https://images.unsplash.com/photo-123?w=400'), {
    url: 'https://images.unsplash.com/photo-123?w=400',
    iv: null,
  });
  // Demo mode inlines gift photos as data URLs; they must pass through whole.
  assert.deepEqual(readEncryptedUrl('data:image/png;base64,iVBORw0KGgo='), {
    url: 'data:image/png;base64,iVBORw0KGgo=',
    iv: null,
  });
});

test('packEncryptedUrl without an iv stores exactly what the plaintext path stores', () => {
  assert.equal(packEncryptedUrl(URL_, null), URL_);
  assert.equal(packEncryptedUrl(URL_, undefined), URL_);
  assert.equal(packEncryptedUrl(URL_, ''), URL_);
  assert.equal(packEncryptedUrl('', 'abc'), '');
});

test('base64 ivs survive the trip — +, / and = are escaped and restored', () => {
  // A real 12-byte nonce is base64, so it can contain every one of these.
  for (const iv of ['a+b/c==', '++//==', 'p0/Qh+Lm9w==', 'AAAAAAAAAAAAAAAA']) {
    const packed = packEncryptedUrl(URL_, iv);
    assert.ok(!packed.slice(packed.indexOf('#')).includes('+'), `raw + left in ${packed}`);
    assert.equal(readEncryptedUrl(packed).iv, iv);
  }
});

test('a fragment that is not ours, or is malformed, reads as plaintext', () => {
  assert.deepEqual(readEncryptedUrl(`${URL_}#section`), { url: `${URL_}#section`, iv: null });
  assert.deepEqual(readEncryptedUrl(`${URL_}#t=30`), { url: `${URL_}#t=30`, iv: null });
  // An empty or undecodable iv must not be mistaken for a real one.
  assert.deepEqual(readEncryptedUrl(`${URL_}#iv=`), { url: `${URL_}#iv=`, iv: null });
  assert.equal(readEncryptedUrl(`${URL_}#iv=%E0%A4%A`).iv, null);
});

test('readEncryptedUrl copes with nothing at all', () => {
  assert.deepEqual(readEncryptedUrl(null), { url: '', iv: null });
  assert.deepEqual(readEncryptedUrl(undefined), { url: '', iv: null });
  assert.deepEqual(readEncryptedUrl(''), { url: '', iv: null });
});

test('the public id still parses out of a packed URL, so deletes keep working', () => {
  const packed = packEncryptedUrl(URL_, 'a+b/c==');
  // Both ways round: the fragment is not part of the pathname, so the id can
  // be read straight off the packed value as well as off the unpacked one.
  assert.equal(publicIdFromCloudinaryUrl(packed), `ourdiary/${COUPLE}/photo-display`);
  assert.equal(
    publicIdFromCloudinaryUrl(readEncryptedUrl(packed).url),
    `ourdiary/${COUPLE}/photo-display`
  );
});
