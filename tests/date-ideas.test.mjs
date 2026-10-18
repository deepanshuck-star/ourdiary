import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CURATED_IDEAS,
  recordVote,
  clearVote,
  getMatches,
  remainingFor,
  waitingOnPartner,
  makeCustomIdea,
  filterByCategory,
} from '../src/lib/features/dateIdeas.ts';

test('deck has ~30 curated ideas across all five categories with unique ids', () => {
  assert.ok(CURATED_IDEAS.length >= 30);
  assert.equal(new Set(CURATED_IDEAS.map((i) => i.id)).size, CURATED_IDEAS.length);
  for (const c of ['cozy', 'adventurous', 'cheap', 'fancy', 'at-home']) {
    assert.ok(filterByCategory(CURATED_IDEAS, c).length > 0, c);
  }
});

test('only ideas both partners said yes to become matches', () => {
  const ideas = CURATED_IDEAS.slice(0, 4);
  let v = {};
  v = recordVote(v, ideas[0].id, 'user_1', true);
  v = recordVote(v, ideas[0].id, 'user_2', true);
  v = recordVote(v, ideas[1].id, 'user_1', true);
  v = recordVote(v, ideas[1].id, 'user_2', false);
  v = recordVote(v, ideas[2].id, 'user_1', true);
  assert.deepEqual(getMatches(ideas, v).map((i) => i.id), [ideas[0].id]);
  assert.deepEqual(waitingOnPartner(ideas, v, 'user_1').map((i) => i.id), [ideas[2].id]);
  assert.deepEqual(remainingFor(ideas, v, 'user_2').map((i) => i.id), [ideas[2].id, ideas[3].id]);
});

test('recordVote is immutable and clearVote undoes a swipe', () => {
  const v0 = {};
  const v1 = recordVote(v0, 'x', 'user_1', true);
  assert.deepEqual(v0, {});
  const v2 = clearVote(v1, 'x', 'user_1');
  assert.equal(v2.x.user_1, undefined);
  assert.equal(v1.x.user_1, true);
});

test('custom ideas are trimmed and flagged', () => {
  const idea = makeCustomIdea('id1', '  Karaoke  ', 'fancy', ' sing ', 'user_2');
  assert.equal(idea.title, 'Karaoke');
  assert.equal(idea.custom, true);
  assert.equal(idea.bucket, 'Food');
  assert.equal(idea.createdBy, 'user_2');
});
