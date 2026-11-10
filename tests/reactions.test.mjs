import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_ON_SCREEN,
  REACTION_EMOJIS,
  REACTION_TTL_MS,
  canSendReaction,
  isReactionEmoji,
  parseReactionPayload,
  pruneReactions,
} from '../src/lib/features/reactions.ts';

test('only the reaction set is accepted as an emoji', () => {
  for (const e of REACTION_EMOJIS) assert.ok(isReactionEmoji(e));
  assert.equal(isReactionEmoji('<script>'), false);
  assert.equal(isReactionEmoji('🍕'), false);
  assert.equal(isReactionEmoji(undefined), false);
});

test('a well-formed payload parses and its position is clamped', () => {
  const r = parseReactionPayload({ id: 'r1', emoji: '😘', from: 'maya', x: 4 }, 1000);
  assert.deepEqual(r, { id: 'r1', emoji: '😘', from: 'maya', at: 1000, x: 1 });
  assert.equal(parseReactionPayload({ id: 'r2', emoji: '😘', from: 'maya' }, 5).x, 0.5);
});

test('anything malformed on the wire is dropped, not rendered', () => {
  assert.equal(parseReactionPayload(null, 0), null);
  assert.equal(parseReactionPayload('😘', 0), null);
  assert.equal(parseReactionPayload({ id: 'r', emoji: '🍕', from: 'maya' }, 0), null);
  assert.equal(parseReactionPayload({ id: 'r', emoji: '😘', from: '' }, 0), null);
  assert.equal(parseReactionPayload({ id: 'r', emoji: '😘', from: 'x'.repeat(65) }, 0), null);
  assert.equal(parseReactionPayload({ emoji: '😘', from: 'maya' }, 0), null);
});

test('reactions expire after their float and the screen never holds more than the cap', () => {
  const at = (t, i) => ({ id: `r${i}`, emoji: '❤️', from: 'a', at: t, x: 0.5 });
  const list = [at(0, 0), at(REACTION_TTL_MS - 1, 1)];
  assert.deepEqual(pruneReactions(list, REACTION_TTL_MS).map((r) => r.id), ['r1']);

  const many = Array.from({ length: MAX_ON_SCREEN + 10 }, (_, i) => at(100, i));
  const kept = pruneReactions(many, 200);
  assert.equal(kept.length, MAX_ON_SCREEN);
  assert.equal(kept.at(-1).id, `r${MAX_ON_SCREEN + 9}`, 'the newest are the ones kept');
});

test('the send cooldown stops a held-down button from spamming', () => {
  assert.ok(canSendReaction(null, 0));
  assert.equal(canSendReaction(1000, 1100), false);
  assert.ok(canSendReaction(1000, 1300));
});
