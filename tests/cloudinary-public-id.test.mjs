import test from 'node:test';
import assert from 'node:assert/strict';
import { isOwnedByCouple, publicIdFromCloudinaryUrl } from '../src/lib/cloudinary/publicId.ts';

const COUPLE = '2f1c9a4e-0000-4000-8000-abcdefabcdef';

test('publicIdFromCloudinaryUrl strips the version and the extension', () => {
  assert.equal(
    publicIdFromCloudinaryUrl(`https://res.cloudinary.com/demo/image/upload/v1730000000/ourdiary/${COUPLE}/abc123.jpg`),
    `ourdiary/${COUPLE}/abc123`
  );
  assert.equal(
    publicIdFromCloudinaryUrl(`https://res.cloudinary.com/demo/video/upload/v1730000000/ourdiary/${COUPLE}/song.mp3`),
    `ourdiary/${COUPLE}/song`
  );
});

test('publicIdFromCloudinaryUrl drops transformation segments', () => {
  assert.equal(
    publicIdFromCloudinaryUrl(
      `https://res.cloudinary.com/demo/image/upload/w_400,h_400,c_fill/v1730000000/ourdiary/${COUPLE}/a.png`
    ),
    `ourdiary/${COUPLE}/a`
  );
  // Format/quality auto, as next/image and the avatar flow produce.
  assert.equal(
    publicIdFromCloudinaryUrl(`https://res.cloudinary.com/demo/image/upload/f_auto/q_auto/ourdiary/${COUPLE}/a.webp`),
    `ourdiary/${COUPLE}/a`
  );
});

test('publicIdFromCloudinaryUrl copes with a missing version and no extension', () => {
  assert.equal(
    publicIdFromCloudinaryUrl(`https://res.cloudinary.com/demo/image/upload/ourdiary/${COUPLE}/a.jpg`),
    `ourdiary/${COUPLE}/a`
  );
  assert.equal(
    publicIdFromCloudinaryUrl(`https://res.cloudinary.com/demo/image/upload/v1/ourdiary/${COUPLE}/noext`),
    `ourdiary/${COUPLE}/noext`
  );
});

test('publicIdFromCloudinaryUrl only strips a dot in the last segment', () => {
  // A dot in a folder name must not be mistaken for the format extension.
  assert.equal(
    publicIdFromCloudinaryUrl('https://res.cloudinary.com/demo/image/upload/v1/our.diary/abc/a.jpg'),
    'our.diary/abc/a'
  );
});

test('publicIdFromCloudinaryUrl returns null for anything that is not a Cloudinary delivery URL', () => {
  assert.equal(publicIdFromCloudinaryUrl(null), null);
  assert.equal(publicIdFromCloudinaryUrl(undefined), null);
  assert.equal(publicIdFromCloudinaryUrl(''), null);
  assert.equal(publicIdFromCloudinaryUrl('not a url'), null);
  // Seeded demo avatars are Unsplash URLs — they must never be "deleted".
  assert.equal(publicIdFromCloudinaryUrl('https://images.unsplash.com/photo-123?w=400'), null);
  // A lookalike host must not match.
  assert.equal(publicIdFromCloudinaryUrl('https://evilcloudinary.com/demo/image/upload/v1/a.jpg'), null);
  // No /upload/ segment means it isn't a delivery URL.
  assert.equal(publicIdFromCloudinaryUrl('https://res.cloudinary.com/demo/image/fetch/v1/a.jpg'), null);
});

test('isOwnedByCouple accepts only this couple’s own folder', () => {
  assert.equal(isOwnedByCouple(`ourdiary/${COUPLE}/abc`, COUPLE), true);
  assert.equal(isOwnedByCouple(`ourdiary/${COUPLE}/nested/abc`, COUPLE), true);

  // Another couple's folder — this is the check that stops one couple
  // deleting another's media by passing a guessed id.
  assert.equal(isOwnedByCouple('ourdiary/someone-else/abc', COUPLE), false);
  // A prefix that merely starts with the id must not pass.
  assert.equal(isOwnedByCouple(`ourdiary/${COUPLE}-evil/abc`, COUPLE), false);
  // The folder itself, with nothing under it.
  assert.equal(isOwnedByCouple(`ourdiary/${COUPLE}`, COUPLE), false);
  assert.equal(isOwnedByCouple('', COUPLE), false);
  assert.equal(isOwnedByCouple(`ourdiary/${COUPLE}/abc`, ''), false);
});

test('isOwnedByCouple rejects path traversal out of the couple folder', () => {
  assert.equal(isOwnedByCouple(`ourdiary/${COUPLE}/../other/abc`, COUPLE), false);
});
