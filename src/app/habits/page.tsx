'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, Loader2, Plus, Trash2, Undo2, Zap } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { useDiary } from '@/store/DiaryContext';
import { useCoupleMembers } from '@/hooks/useCoupleMembers';
import { newId } from '@/hooks/useNow';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useLocalState } from '@/lib/local-store';
import {
  createHabitRemote,
  deleteHabitRemote,
  fetchHabitsRemote,
  updateHabitRemote,
  type BadHabitRow,
} from '@/lib/supabase/habits';
import {
  SEVERITIES,
  clampSeverity,
  severityLabel,
  splitByPerson,
  tallyHabits,
  validateHabit,
  type Severity,
} from '@/lib/features/habits';

const inputClass =
  'w-full px-4 py-2.5 rounded-2xl border border-line bg-surface text-ink text-sm focus:outline-none focus:ring-2 focus:ring-focus';

/** Demo-mode habit. Ids are profile slots rather than auth uids. */
interface LocalHabit {
  id: string;
  aboutUserId: string;
  createdBy: string;
  title: string;
  note: string | null;
  severity: number;
  forgiven: boolean;
  createdAt: string;
}

const severityStyles: Record<number, string> = {
  1: 'bg-secondary text-ink',
  2: 'bg-amber-100 text-amber-800',
  3: 'bg-rose-100 text-rose-800',
};

export default function HabitsPage() {
  const { data, activeProfile, partnerProfile, isLiveUser, currentUserId, showToast } = useDiary();
  const { myId, partnerId, isRemote } = useCoupleMembers();
  const coupleId = data.couple.id;
  const supabase = isLiveUser && currentUserId ? getSupabaseBrowserClient() : null;
  const live = Boolean(supabase && coupleId && isRemote);

  const [remote, setRemote] = useState<BadHabitRow[]>([]);
  const [local, setLocal] = useLocalState<LocalHabit[]>(`habits:${coupleId || 'demo'}`, []);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // The form defaults to logging your partner's habit — the common case.
  const [about, setAbout] = useState<'partner' | 'me'>('partner');
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [severity, setSeverity] = useState<Severity>(1);

  const habits = useMemo(
    () =>
      live
        ? remote.map((h) => ({
            id: h.id,
            aboutUserId: h.aboutUserId,
            createdBy: h.createdBy,
            title: h.title,
            note: h.note,
            severity: h.severity,
            forgiven: h.forgiven,
            createdAt: h.createdAt,
          }))
        : local,
    [live, remote, local]
  );

  const { mine, theirs } = useMemo(() => splitByPerson(habits, myId), [habits, myId]);
  const tally = useMemo(() => tallyHabits(habits), [habits]);

  const reload = useCallback(async () => {
    if (!live || !supabase) {
      setLoading(false);
      return;
    }
    try {
      setRemote(await fetchHabitsRemote(supabase, coupleId));
      setError('');
    } catch (err) {
      console.error('[OurDiary] Failed to load habits:', err);
      setError('We couldn’t load your list just now.');
    } finally {
      setLoading(false);
    }
  }, [live, supabase, coupleId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const targetId = about === 'me' ? myId : partnerId;

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const problem = validateHabit(title, note);
    if (problem) {
      setError(problem);
      return;
    }
    if (!targetId) {
      setError(
        about === 'partner'
          ? 'Your partner hasn’t joined this space yet, so there’s nobody to pin this on.'
          : 'We couldn’t work out who you are — try refreshing.'
      );
      return;
    }
    setError('');
    setSaving(true);
    try {
      if (live && supabase && currentUserId) {
        await createHabitRemote(supabase, coupleId, currentUserId, {
          aboutUserId: targetId,
          title: title.trim(),
          note: note.trim(),
          severity,
        });
        await reload();
      } else {
        setLocal((prev) => [
          {
            id: newId('habit'),
            aboutUserId: targetId,
            createdBy: myId || 'user_1',
            title: title.trim(),
            note: note.trim() || null,
            severity,
            forgiven: false,
            createdAt: new Date().toISOString(),
          },
          ...prev,
        ]);
      }
      setTitle('');
      setNote('');
      setSeverity(1);
      showToast('Noted. Lovingly.', 'heart');
    } catch (err: any) {
      setError(err?.message || 'That couldn’t be saved.');
    } finally {
      setSaving(false);
    }
  };

  const toggleForgiven = async (id: string, forgiven: boolean) => {
    try {
      if (live && supabase) {
        await updateHabitRemote(supabase, id, { forgiven: !forgiven });
        setRemote((prev) => prev.map((h) => (h.id === id ? { ...h, forgiven: !forgiven } : h)));
      } else {
        setLocal((prev) => prev.map((h) => (h.id === id ? { ...h, forgiven: !forgiven } : h)));
      }
      showToast(forgiven ? 'Back on the list 👀' : 'Forgiven 💛', 'heart');
    } catch {
      showToast('That change couldn’t be saved.', 'warn');
    }
  };

  const remove = async (id: string) => {
    try {
      if (live && supabase) {
        await deleteHabitRemote(supabase, id);
        setRemote((prev) => prev.filter((h) => h.id !== id));
      } else {
        setLocal((prev) => prev.filter((h) => h.id !== id));
      }
    } catch {
      // The delete policy is the author's own, so this is what a partner
      // trying to erase what you wrote about them gets.
      showToast('Only whoever added it can remove it.', 'warn');
    }
  };

  const renderList = (list: typeof mine, emptyText: string) =>
    list.length === 0 ? (
      <p className="text-sm text-ink-muted rounded-[1.25rem] border border-dashed border-line p-5">{emptyText}</p>
    ) : (
      <ul className="space-y-3">
        {list.map((habit) => (
          <li
            key={habit.id}
            className={`rounded-2xl border border-line bg-surface p-4 shadow-sm ${habit.forgiven ? 'opacity-60' : ''}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className={`font-semibold text-sm text-ink ${habit.forgiven ? 'line-through' : ''}`}>
                  {habit.title}
                </p>
                {habit.note && <p className="text-xs text-ink-muted mt-1 whitespace-pre-wrap">{habit.note}</p>}
                <span
                  className={`inline-block mt-2 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    severityStyles[habit.severity] ?? severityStyles[1]
                  }`}
                >
                  {severityLabel(habit.severity)}
                </span>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => toggleForgiven(habit.id, habit.forgiven)}
                  aria-label={habit.forgiven ? `Put “${habit.title}” back on the list` : `Forgive “${habit.title}”`}
                  className="p-2 rounded-full text-ink-muted hover:text-primary"
                >
                  {habit.forgiven ? <Undo2 className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                </button>
                {habit.createdBy === myId && (
                  <button
                    type="button"
                    onClick={() => remove(habit.id)}
                    aria-label={`Delete “${habit.title}”`}
                    className="p-2 rounded-full text-ink-muted hover:text-danger"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    );

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto space-y-8">
        <header>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">Bad habits</p>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold text-ink mt-1">
            The things we put up with
          </h1>
          <p className="text-sm text-ink-muted mt-2 max-w-2xl">
            Keep score, gently. Forgiven ones stay on the record — that's rather the point.{' '}
            {live ? 'Both of you see the same list.' : 'In demo mode this stays on this device.'}
          </p>
          {tally.total > 0 && (
            <p className="text-xs text-ink-muted mt-2">
              {tally.outstanding} outstanding · {tally.forgiven} forgiven
            </p>
          )}
        </header>

        {/* ------------------------------------------------------------ Add */}
        <section aria-labelledby="add-heading" className="space-y-3">
          <h2 id="add-heading" className="text-2xl font-semibold text-ink flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary" aria-hidden="true" /> Add one
          </h2>
          <form onSubmit={add} className="rounded-[1.25rem] border border-line bg-surface p-5 space-y-4 shadow-sm">
            <fieldset>
              <legend className="block text-xs font-semibold text-ink mb-1.5">Whose habit?</legend>
              <div className="flex gap-2">
                {(['partner', 'me'] as const).map((who) => (
                  <button
                    key={who}
                    type="button"
                    onClick={() => setAbout(who)}
                    aria-pressed={about === who}
                    className={`px-4 py-2 rounded-full text-xs font-semibold ${
                      about === who ? 'bg-primary text-on-primary shadow-cta' : 'bg-canvas border border-line text-ink'
                    }`}
                  >
                    {who === 'partner' ? partnerProfile.name : `${activeProfile.name} (me)`}
                  </button>
                ))}
              </div>
            </fieldset>

            <div>
              <label htmlFor="habit-title" className="block text-xs font-semibold text-ink mb-1">
                The habit
              </label>
              <input
                id="habit-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Leaves mugs on every surface"
                className={inputClass}
                required
              />
            </div>

            <div>
              <label htmlFor="habit-note" className="block text-xs font-semibold text-ink mb-1">
                Note <span className="font-normal text-ink-muted">(optional)</span>
              </label>
              <textarea
                id="habit-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder="Counted four this morning."
                className={`${inputClass} resize-none`}
              />
            </div>

            <fieldset>
              <legend className="block text-xs font-semibold text-ink mb-1.5">How bad is it?</legend>
              <div className="flex flex-wrap gap-2">
                {SEVERITIES.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setSeverity(clampSeverity(option.value))}
                    aria-pressed={severity === option.value}
                    className={`px-3 py-2 rounded-2xl text-xs font-semibold text-left ${
                      severity === option.value
                        ? 'bg-primary text-on-primary shadow-cta'
                        : 'bg-canvas border border-line text-ink'
                    }`}
                  >
                    <span className="block">{option.label}</span>
                    <span
                      className={`block text-[10px] font-normal ${
                        severity === option.value ? 'text-on-primary/80' : 'text-ink-muted'
                      }`}
                    >
                      {option.blurb}
                    </span>
                  </button>
                ))}
              </div>
            </fieldset>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold bg-primary hover:bg-primary-hover text-on-primary shadow-cta disabled:opacity-60"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 motion-safe:animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
              {saving ? 'Saving…' : 'Add to the list'}
            </button>

            {error && (
              <p role="alert" className="text-sm text-danger">
                {error}
              </p>
            )}
          </form>
        </section>

        {/* --------------------------------------------------------- Lists */}
        {loading ? (
          <p className="text-sm text-ink-muted">Loading…</p>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            <section aria-labelledby="theirs-heading" className="space-y-3">
              <h2 id="theirs-heading" className="text-2xl font-semibold text-ink">
                {partnerProfile.name}
              </h2>
              {renderList(theirs, `Nothing on ${partnerProfile.name} yet. Suspiciously well behaved.`)}
            </section>

            <section aria-labelledby="mine-heading" className="space-y-3">
              <h2 id="mine-heading" className="text-2xl font-semibold text-ink">
                {activeProfile.name}
              </h2>
              {renderList(mine, 'Nothing on you yet. Enjoy it while it lasts.')}
            </section>
          </div>
        )}
      </div>
    </AppShell>
  );
}
