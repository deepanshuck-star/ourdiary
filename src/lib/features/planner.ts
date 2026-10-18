// Pure helpers for the AI date planner (no imports — unit-tested with node --test).

export type PlannerInput = {
  city: string;
  budget: 'free' | 'low' | 'medium' | 'splurge';
  vibe: string;
  when: string;
  bucketList: string[];
  recentMemories: string[];
};

const BUDGET_LABEL: Record<PlannerInput['budget'], string> = {
  free: 'free or almost free',
  low: 'inexpensive',
  medium: 'moderate spend',
  splurge: 'a special-occasion splurge',
};

const clip = (s: string, max: number) => s.trim().replace(/\s+/g, ' ').slice(0, max);

export function buildPlannerPrompt(input: PlannerInput): string {
  const bucket = input.bucketList.slice(0, 15).map((b) => `- ${clip(b, 120)}`).join('\n') || '- (none yet)';
  const memories = input.recentMemories.slice(0, 10).map((m) => `- ${clip(m, 160)}`).join('\n') || '- (none yet)';
  return [
    'Suggest exactly three date ideas for a couple.',
    `City or area: ${clip(input.city, 80) || 'not specified — keep ideas location-flexible'}`,
    `Budget: ${BUDGET_LABEL[input.budget]}`,
    `Mood they want: ${clip(input.vibe, 120) || 'open to anything'}`,
    `When: ${clip(input.when, 80) || 'flexible'}`,
    'Their shared bucket list:',
    bucket,
    'Dates they have already had (avoid repeating these, but you may build on what they enjoyed):',
    memories,
    'Make the three ideas clearly different from each other. Keep each realistic for the budget and city.',
    'Tie at least one idea to an item on their bucket list when there is a sensible match.',
  ].join('\n');
}

// Fixed-window limiter keyed by caller (e.g. IP or user id). Returns true when allowed.
export function allowRequest(
  hits: Map<string, number[]>,
  key: string,
  now: number,
  limit = 10,
  windowMs = 60 * 60 * 1000
): boolean {
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  return true;
}
