'use client';

import React, { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { useDiary } from '@/store/DiaryContext';
import { Wand2, Loader2, Plus, Check, AlertCircle } from 'lucide-react';
import type { DatePlannerIdea } from '@/app/api/date-planner/route';

type Budget = 'free' | 'low' | 'medium' | 'splurge';

export default function PlannerPage() {
  const { data, addBucketItem, showToast } = useDiary();
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [city, setCity] = useState('');
  const [budget, setBudget] = useState<Budget>('medium');
  const [vibe, setVibe] = useState('');
  const [when, setWhen] = useState('');
  const [useDiaryContext, setUseDiaryContext] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ideas, setIdeas] = useState<DatePlannerIdea[]>([]);
  const [added, setAdded] = useState<string[]>([]);

  useEffect(() => {
    fetch('/api/date-planner')
      .then((r) => r.json())
      .then((j: { enabled?: boolean }) => setEnabled(Boolean(j.enabled)))
      .catch(() => setEnabled(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/date-planner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city,
          budget,
          vibe,
          when,
          bucketList: useDiaryContext ? data.bucketList.filter((b) => !b.completed).map((b) => b.title) : [],
          recentMemories: useDiaryContext
            ? data.memories.slice(0, 10).map((m) => `${m.title}${m.location ? ` (${m.location})` : ''}`)
            : [],
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.message || 'Something went wrong. Please try again.');
        setIdeas([]);
      } else {
        setIdeas(json.ideas);
      }
    } catch {
      setError('Couldn’t reach the planner. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToBucket = (idea: DatePlannerIdea) => {
    addBucketItem({
      title: idea.title,
      category: 'Activities',
      completed: false,
      notes: idea.summary,
      createdBy: data.activeProfileId,
    });
    setAdded((prev) => [...prev, idea.title]);
    showToast('Added to your bucket list', 'success');
  };

  return (
    <AppShell>
      <div className="max-w-4xl space-y-8">
        <header className="rounded-[1.5rem] bg-hero px-6 py-8 sm:px-10">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-purple-800">AI date planner</p>
          <h1 className="text-3xl sm:text-4xl font-semibold text-ink mt-1">Three ideas, made for you two</h1>
          <p className="text-sm text-slate-700 mt-2 max-w-xl">
            Tell the planner where you are and what you’re in the mood for. It can also use your bucket list and past dates.
          </p>
        </header>

        {enabled === false && (
          <div role="status" className="p-5 rounded-[1.25rem] bg-surface border border-line flex gap-3">
            <AlertCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div className="text-sm text-ink">
              <p className="font-semibold">The planner isn’t switched on yet</p>
              <p className="text-ink-muted mt-1">
                Add <code className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">ANTHROPIC_API_KEY</code> to{' '}
                <code className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">.env.local</code> and restart the server.
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="rounded-[1.25rem] bg-surface border border-line p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="block text-xs font-semibold text-slate-700 mb-1">City or area</span>
            <input value={city} onChange={(e) => setCity(e.target.value)} maxLength={80} placeholder="e.g. Bengaluru" className="w-full px-3.5 py-2.5 rounded-2xl border border-line bg-canvas text-sm focus:ring-2 focus:ring-focus focus:outline-hidden" />
          </label>
          <label className="block">
            <span className="block text-xs font-semibold text-slate-700 mb-1">Budget</span>
            <select value={budget} onChange={(e) => setBudget(e.target.value as Budget)} className="w-full px-3.5 py-2.5 rounded-2xl border border-line bg-canvas text-sm focus:ring-2 focus:ring-focus focus:outline-hidden">
              <option value="free">Free</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="splurge">Splurge</option>
            </select>
          </label>
          <label className="block">
            <span className="block text-xs font-semibold text-slate-700 mb-1">Mood</span>
            <input value={vibe} onChange={(e) => setVibe(e.target.value)} maxLength={120} placeholder="cozy, adventurous, nostalgic…" className="w-full px-3.5 py-2.5 rounded-2xl border border-line bg-canvas text-sm focus:ring-2 focus:ring-focus focus:outline-hidden" />
          </label>
          <label className="block">
            <span className="block text-xs font-semibold text-slate-700 mb-1">When</span>
            <input value={when} onChange={(e) => setWhen(e.target.value)} maxLength={80} placeholder="Saturday evening" className="w-full px-3.5 py-2.5 rounded-2xl border border-line bg-canvas text-sm focus:ring-2 focus:ring-focus focus:outline-hidden" />
          </label>
          <label className="sm:col-span-2 flex items-start gap-2.5 text-xs text-slate-700">
            <input type="checkbox" checked={useDiaryContext} onChange={(e) => setUseDiaryContext(e.target.checked)} className="mt-0.5 w-4 h-4" />
            <span>
              Use our bucket list and recent memory titles for better ideas. They are sent to Anthropic’s API to generate the plan.
            </span>
          </label>
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={loading || enabled === false}
              className="px-6 py-3 rounded-full bg-primary hover:bg-primary-hover text-on-primary font-semibold text-sm shadow-cta transition-colors inline-flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
              <span>{loading ? 'Planning…' : 'Plan our date'}</span>
            </button>
          </div>
        </form>

        {error && (
          <p role="alert" className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-2xl px-4 py-3">
            {error}
          </p>
        )}

        {ideas.length > 0 && (
          <section aria-label="Date ideas" className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {ideas.map((idea, i) => (
              <article key={idea.title} className="rounded-[1.25rem] bg-surface border border-line p-5 flex flex-col gap-3">
                <span className="font-display text-3xl font-semibold text-primary">{String(i + 1).padStart(2, '0')}</span>
                <h2 className="text-xl font-semibold text-ink leading-snug">{idea.title}</h2>
                <p className="text-sm text-slate-700">{idea.summary}</p>
                <ol className="list-decimal list-inside text-xs text-slate-700 space-y-1">
                  {idea.steps.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ol>
                <dl className="text-xs text-ink-muted space-y-0.5">
                  <div><dt className="inline font-semibold text-ink">Cost: </dt><dd className="inline">{idea.estimatedCost}</dd></div>
                  <div><dt className="inline font-semibold text-ink">Best time: </dt><dd className="inline">{idea.bestTime}</dd></div>
                  {idea.fromBucketList && (
                    <div><dt className="inline font-semibold text-ink">From your list: </dt><dd className="inline">{idea.fromBucketList}</dd></div>
                  )}
                </dl>
                <p className="text-xs italic text-purple-900 bg-purple-50 rounded-xl p-3">{idea.whyYoullLoveIt}</p>
                <button
                  type="button"
                  onClick={() => handleAddToBucket(idea)}
                  disabled={added.includes(idea.title)}
                  className="mt-auto self-start px-4 py-2 rounded-full bg-purple-50 hover:bg-purple-100 text-purple-800 text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-60"
                >
                  {added.includes(idea.title) ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                  <span>{added.includes(idea.title) ? 'On your bucket list' : 'Add to bucket list'}</span>
                </button>
              </article>
            ))}
          </section>
        )}
      </div>
    </AppShell>
  );
}
