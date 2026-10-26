import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const read = (...p) => fs.readFileSync(path.join(process.cwd(), ...p), 'utf8').replace(/\r\n/g, '\n');

const SOURCE = read('src', 'components', 'ui', 'PhotoInput.tsx');

/**
 * PhotoInput.tsx is JSX, which Node cannot import. The pure helpers are
 * self-contained, so they are sliced out by brace matching and written to a
 * .ts file Node *can* type-strip and import — the real source, not a copy.
 */
function extractFunction(name) {
  const start = SOURCE.indexOf(`export function ${name}`);
  assert.notEqual(start, -1, `${name} should be exported from PhotoInput.tsx`);
  const open = SOURCE.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < SOURCE.length; i++) {
    if (SOURCE[i] === '{') depth++;
    else if (SOURCE[i] === '}' && --depth === 0) return SOURCE.slice(start, i + 1);
  }
  throw new Error(`Unbalanced braces in ${name}`);
}

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'photo-input-'));
const file = path.join(dir, 'helpers.ts');
fs.writeFileSync(file, extractFunction('isProbablyImageUrl'));
const { isProbablyImageUrl } = await import(pathToFileURL(file).href);
process.on('exit', () => fs.rmSync(dir, { recursive: true, force: true }));

test('isProbablyImageUrl accepts the CDN links the app already uses', () => {
  assert.equal(
    isProbablyImageUrl('https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=800&auto=format'),
    true
  );
  assert.equal(
    isProbablyImageUrl('https://res.cloudinary.com/demo/image/upload/v1730000000/ourdiary/abc/a.jpg'),
    true
  );
  // Extensionless paths are the norm on image CDNs, so they must pass.
  assert.equal(isProbablyImageUrl('https://example.com/some/photo'), true);
  assert.equal(isProbablyImageUrl('http://example.com/photo.png'), true);
});

test('isProbablyImageUrl tolerates surrounding whitespace from a paste', () => {
  assert.equal(isProbablyImageUrl('  https://example.com/a.jpg  '), true);
  assert.equal(isProbablyImageUrl('\n https://example.com/a.jpg \t'), true);
});

test('isProbablyImageUrl rejects blank and non-URL text', () => {
  assert.equal(isProbablyImageUrl(''), false);
  assert.equal(isProbablyImageUrl('   '), false);
  assert.equal(isProbablyImageUrl('not a url'), false);
  // Relative and protocol-relative paths have no origin to fetch from.
  assert.equal(isProbablyImageUrl('/uploads/photo.jpg'), false);
  assert.equal(isProbablyImageUrl('//example.com/a.jpg'), false);
  assert.equal(isProbablyImageUrl('example.com/a.jpg'), false);
});

test('isProbablyImageUrl rejects a pasted data URL', () => {
  // The whole point of the uploader: no more base64 blobs in a database row.
  assert.equal(isProbablyImageUrl('data:image/png;base64,iVBORw0KGgoAAAANSUhEUg=='), false);
});

test('isProbablyImageUrl rejects schemes that are not http(s)', () => {
  assert.equal(isProbablyImageUrl('javascript:alert(1)'), false);
  assert.equal(isProbablyImageUrl('blob:https://example.com/9f8e'), false);
  assert.equal(isProbablyImageUrl('ftp://example.com/a.jpg'), false);
  assert.equal(isProbablyImageUrl('file:///etc/passwd'), false);
});

test('isProbablyImageUrl wants a real host, but allows localhost for dev', () => {
  assert.equal(isProbablyImageUrl('https://nodots/a.jpg'), false);
  assert.equal(isProbablyImageUrl('http://localhost:3000/a.jpg'), true);
});

test('PhotoInput uploads to Cloudinary instead of reading a data URL', () => {
  // Either upload helper satisfies this — the encrypting branch swaps in
  // uploadEncryptedImage, which itself falls back to the plain upload when
  // no master key is configured. What the test is really guarding is that a
  // chosen file is uploaded somewhere rather than inlined into a row.
  assert.ok(
    SOURCE.includes('uploadEncryptedImage') || SOURCE.includes('uploadImageToCloudinary')
  );
  assert.ok(!SOURCE.includes('readAsDataURL'));
  // The error from an unavailable upload has to reach the user.
  assert.ok(SOURCE.includes('role="alert"'));
  // Re-picking the same file after a failure depends on this reset.
  assert.ok(SOURCE.includes("e.target.value = ''"));
});

test('no photo site still turns a chosen file into a base64 data URL', () => {
  for (const page of [
    ['src', 'app', 'memories', 'new', 'page.tsx'],
    ['src', 'app', 'gallery', 'page.tsx'],
    ['src', 'app', 'memories', '[id]', 'page.tsx'],
    ['src', 'app', 'gifts', 'page.tsx'],
  ]) {
    const src = read(...page);
    assert.ok(!src.includes('readAsDataURL'), `${page.join('/')} should not inline images as data URLs`);
    assert.ok(src.includes('PhotoInput'), `${page.join('/')} should use the shared PhotoInput`);
  }
});
