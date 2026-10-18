import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPlannerPrompt, allowRequest } from '../src/lib/features/planner.ts';

test('planner prompt includes context and caps list sizes', () => {
  const prompt = buildPlannerPrompt({
    city: 'Pune',
    budget: 'low',
    vibe: 'cozy',
    when: 'Sunday',
    bucketList: Array.from({ length: 40 }, (_, i) => `item ${i}`),
    recentMemories: ['Rainy coffee shop (Blue Heron Cafe)'],
  });
  assert.match(prompt, /City or area: Pune/);
  assert.match(prompt, /inexpensive/);
  assert.match(prompt, /item 14/);
  assert.doesNotMatch(prompt, /item 15/);
  assert.match(prompt, /Rainy coffee shop/);
});

test('planner prompt handles empty context', () => {
  const prompt = buildPlannerPrompt({ city: '', budget: 'free', vibe: '', when: '', bucketList: [], recentMemories: [] });
  assert.match(prompt, /location-flexible/);
  assert.match(prompt, /\(none yet\)/);
});

test('rate limiter allows 10 per hour per caller', () => {
  const hits = new Map();
  const now = 1_000_000;
  for (let i = 0; i < 10; i++) assert.equal(allowRequest(hits, 'a', now + i), true);
  assert.equal(allowRequest(hits, 'a', now + 11), false);
  assert.equal(allowRequest(hits, 'b', now + 11), true);
  assert.equal(allowRequest(hits, 'a', now + 60 * 60 * 1000 + 20), true);
});
