import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TYPING_TTL_MS,
  isTypingNow,
  isUserOnline,
  onlineUserIds,
  presenceLabel,
} from '../src/lib/features/presence.ts';

test('onlineUserIds collapses a person’s several tabs into one id', () => {
  const state = {
    'user-a': [
      { userId: 'user-a', at: 1, presence_ref: 'r1' },
      { userId: 'user-a', at: 2, presence_ref: 'r2' },
    ],
    'user-b': [{ userId: 'user-b', at: 3, presence_ref: 'r3' }],
  };
  assert.deepEqual(onlineUserIds(state).sort(), ['user-a', 'user-b']);
  assert.equal(isUserOnline(state, 'user-b'), true);
  assert.equal(isUserOnline(state, 'user-c'), false);
  assert.equal(isUserOnline(state, null), false);
});

test('onlineUserIds survives an empty or malformed presence state', () => {
  assert.deepEqual(onlineUserIds(null), []);
  assert.deepEqual(onlineUserIds({}), []);
  assert.deepEqual(onlineUserIds({ k: [{ no: 'userId' }] }), []);
  assert.deepEqual(onlineUserIds({ k: 'not-an-array' }), []);
});

test('a typing ping expires rather than hanging on forever', () => {
  const sentAt = 1_000_000;
  assert.equal(isTypingNow(sentAt, sentAt), true);
  assert.equal(isTypingNow(sentAt, sentAt + TYPING_TTL_MS - 1), true);
  assert.equal(isTypingNow(sentAt, sentAt + TYPING_TTL_MS), false);
  assert.equal(isTypingNow(null, sentAt), false);
});

test('a ping from a clock running ahead is not trusted indefinitely', () => {
  const now = 1_000_000;
  // Slightly ahead is tolerated — clocks drift by a second all the time.
  assert.equal(isTypingNow(now + 100, now), true);
  // An hour ahead is a broken clock, not someone typing.
  assert.equal(isTypingNow(now + 3_600_000, now), false);
});

test('presenceLabel never claims offline when it simply has not seen them', () => {
  const now = Date.UTC(2026, 0, 1, 12, 0);
  assert.deepEqual(presenceLabel(true, null, now), { tone: 'online', text: 'Online now' });
  assert.equal(presenceLabel(false, null, now).tone, 'unknown');
  assert.equal(presenceLabel(false, now - 30_000, now).text, 'Just left');
  assert.equal(presenceLabel(false, now - 9 * 60_000, now).text, 'Last here 9 min ago');
  assert.equal(presenceLabel(false, now - 3 * 3_600_000, now).text, 'Last here 3h ago');
  assert.equal(presenceLabel(false, now - 50 * 3_600_000, now).text, 'Last here 2d ago');
});
