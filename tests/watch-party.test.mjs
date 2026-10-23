import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LIVE_GRACE_MS,
  READY_LEAD_MS,
  countdownSeconds,
  createWatchParty,
  isReady,
  toggleReady,
  waitingOn,
  watchPhase,
} from '../src/lib/features/watchParty.ts';

const NOW = Date.UTC(2026, 2, 10, 20, 0);
const BOTH = ['a', 'b'];

test('setting one up counts as being ready yourself', () => {
  const state = createWatchParty('  The Before Trilogy ', 'a', NOW);
  assert.equal(state.title, 'The Before Trilogy');
  assert.deepEqual(state.ready, ['a']);
  assert.equal(state.startAt, null);
  assert.equal(watchPhase(state, NOW), 'waiting');
  assert.deepEqual(waitingOn(state, BOTH), ['b']);
  assert.equal(isReady(state, 'a'), true);
  assert.equal(isReady(state, 'b'), false);
});

test('an untitled party still gets a name', () => {
  assert.equal(createWatchParty('   ', 'a', NOW).title, 'Movie night');
});

test('the second ready starts the clock for both at the same instant', () => {
  const state = toggleReady(createWatchParty('x', 'a', NOW), 'b', BOTH, NOW);
  assert.equal(state.startAt, NOW + READY_LEAD_MS);
  assert.equal(watchPhase(state, NOW), 'counting');
  assert.deepEqual(waitingOn(state, BOTH), []);
});

test('the countdown reaches zero exactly at the start', () => {
  const state = toggleReady(createWatchParty('x', 'a', NOW), 'b', BOTH, NOW);
  assert.equal(countdownSeconds(state, NOW), READY_LEAD_MS / 1000);
  assert.equal(countdownSeconds(state, NOW + 2_400), 3);
  assert.equal(countdownSeconds(state, NOW + READY_LEAD_MS - 1), 1);
  assert.equal(countdownSeconds(state, NOW + READY_LEAD_MS), 0);
  assert.equal(countdownSeconds(state, NOW + 60_000), 0);
  assert.equal(countdownSeconds(null, NOW), 0);
});

test('backing out before zero cancels the count', () => {
  const counting = toggleReady(createWatchParty('x', 'a', NOW), 'b', BOTH, NOW);
  const cancelled = toggleReady(counting, 'b', BOTH, NOW + 1_000);
  assert.equal(cancelled.startAt, null);
  assert.deepEqual(cancelled.ready, ['a']);
  assert.equal(watchPhase(cancelled, NOW + 1_000), 'waiting');
});

test('re-readying after the start does not slide the time out from under them', () => {
  const counting = toggleReady(createWatchParty('x', 'a', NOW), 'b', BOTH, NOW);
  const started = NOW + READY_LEAD_MS + 30_000;
  const off = toggleReady(counting, 'b', BOTH, started);
  // Past zero, un-readying no longer rewinds anything.
  assert.equal(off.startAt, counting.startAt);
  const on = toggleReady(off, 'b', BOTH, started + 1_000);
  assert.equal(on.startAt, counting.startAt);
});

test('phases run idle to waiting to counting to playing to over', () => {
  assert.equal(watchPhase(null, NOW), 'idle');
  const counting = toggleReady(createWatchParty('x', 'a', NOW), 'b', BOTH, NOW);
  assert.equal(watchPhase(counting, NOW + 1_000), 'counting');
  assert.equal(watchPhase(counting, NOW + READY_LEAD_MS), 'playing');
  assert.equal(watchPhase(counting, NOW + READY_LEAD_MS + LIVE_GRACE_MS - 1), 'playing');
  assert.equal(watchPhase(counting, NOW + READY_LEAD_MS + LIVE_GRACE_MS), 'over');
});

test('with a partner who has not joined yet, one ready is not two', () => {
  const alone = createWatchParty('x', 'a', NOW);
  const state = toggleReady(alone, 'a', ['a', null], NOW);
  // They un-readied themselves; nobody is ready, so nothing starts.
  assert.deepEqual(state.ready, []);
  assert.equal(state.startAt, null);
  // And being the only known participant does start it — there is nobody else.
  const solo = toggleReady(state, 'a', ['a', null], NOW);
  assert.equal(solo.startAt, NOW + READY_LEAD_MS);
});
