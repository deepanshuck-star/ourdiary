import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SKIN_TONES,
  HAIR_STYLES,
  HAIR_LABEL,
  DEFAULT_WORLD_AVATARS,
  defaultAvatar,
  parseAvatar,
  parseWorldAvatars,
  updateOwnAvatar,
  setPet,
  cleanNickname,
  NICKNAME_MAX,
} from '../src/lib/world/avatar.ts';

test('the two default figures differ only in their clothes', () => {
  // Neither partner is "the default one" and the other a variation.
  const a = defaultAvatar('user_1');
  const b = defaultAvatar('user_2');
  const differing = Object.keys(a).filter((k) => a[k] !== b[k]);
  assert.deepEqual(differing, ['outfit']);
});

test('skin tones span the range, and the default is not the lightest', () => {
  assert.equal(SKIN_TONES.length, 6);
  const lum = (hex) => {
    const n = parseInt(hex.slice(1), 16);
    return 0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255);
  };
  const values = SKIN_TONES.map(lum);
  assert.ok(Math.max(...values) - Math.min(...values) > 120, 'tones should run light to deep');
  assert.notEqual(defaultAvatar('user_1').skin, SKIN_TONES[0]);
});

test('hair styles are named for their shape, not for a gender', () => {
  for (const style of HAIR_STYLES) {
    assert.equal(/\b(male|female|man|woman|boy|girl|masc|fem)/i.test(`${style} ${HAIR_LABEL[style]}`), false, style);
  }
});

test('a half-written or foreign blob still produces valid figures', () => {
  const parsed = parseWorldAvatars({ user_1: { skin: '#123456', hair: 'mohawk', nickname: 42 }, pet: 'dragon' });
  assert.equal(parsed.user_1.skin, defaultAvatar('user_1').skin);
  assert.equal(parsed.user_1.hair, 'short');
  assert.equal(parsed.user_1.nickname, '');
  assert.equal(parsed.pet, DEFAULT_WORLD_AVATARS.pet);
  assert.deepEqual(parseWorldAvatars(null), DEFAULT_WORLD_AVATARS);
  assert.deepEqual(parseWorldAvatars('nonsense'), DEFAULT_WORLD_AVATARS);
});

test('you can only ever change your own figure', () => {
  const start = parseWorldAvatars({});
  const after = updateOwnAvatar(start, 'user_1', { hair: 'curly', skin: SKIN_TONES[5] });
  assert.equal(after.user_1.hair, 'curly');
  assert.equal(after.user_1.skin, SKIN_TONES[5]);
  // The other partner is untouched — the same object, not a copy with edits.
  assert.deepEqual(after.user_2, start.user_2);
  assert.equal(after.pet, start.pet);
  // An invalid change is refused, not written.
  const bad = updateOwnAvatar(start, 'user_2', { hair: 'mullet' });
  assert.equal(bad.user_2.hair, start.user_2.hair);
});

test('nicknames are short, single-spaced and carry no markup', () => {
  assert.equal(cleanNickname('  Moon   Pie  '), 'Moon Pie');
  assert.equal(cleanNickname('<script>x</script>'), 'scriptx/script');
  assert.equal(cleanNickname('a'.repeat(40)).length, NICKNAME_MAX);
  assert.equal(cleanNickname(undefined), '');
  assert.equal(parseAvatar({ nickname: '  Sunny  ' }, 'user_2').nickname, 'Sunny');
});

test('the pet is shared and only ever a real choice', () => {
  const start = parseWorldAvatars({});
  assert.equal(setPet(start, 'cat').pet, 'cat');
  assert.equal(setPet(start, 'none').pet, 'none');
  assert.equal(setPet(start, 'unicorn').pet, start.pet);
});
