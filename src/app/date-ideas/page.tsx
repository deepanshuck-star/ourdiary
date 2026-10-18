'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type PanInfo,
} from 'motion/react';
import { CalendarPlus, Check, Heart, ListPlus, Plus, RotateCcw, Sparkles, X } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { useDiary } from '@/store/DiaryContext';
import { useLocalState } from '@/lib/local-store';
import { newId } from '@/hooks/useNow';
import {
  CURATED_IDEAS,
  DATE_IDEA_CATEGORIES,
  clearVote,
  filterByCategory,
  getMatches,
  makeCustomIdea,
  recordVote,
  remainingFor,
  waitingOnPartner,
  type DateIdea,
  type DateIdeaCategory,
  type IdeaVotes,
} from '@/lib/features/dateIdeas';

const SWIPE_THRESHOLD = 110;

type Planned = Record<string, { bucket?: boolean; eventDate?: string }>;

const CATEGORY_LABEL: Record<DateIdeaCategory, string> = Object.fromEntries(
  DATE_IDEA_CATEGORIES.map((c) => [c.id, c.label])
) as Record<DateIdeaCategory, string>;

function SwipeCard({
  idea,
  onVote,
  reduceMotion,
}: {
  idea: DateIdea;
  onVote: (yes: boolean) => void;
  reduceMotion: boolean;
}) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-220, 220], reduceMotion ? [0, 0] : [-12, 12]);
  const yesOpacity = useTransform(x, [20, SWIPE_THRESHOLD], [0, 1]);
  const noOpacity = useTransform(x, [-SWIPE_THRESHOLD, -20], [1, 0]);

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x > SWIPE_THRESHOLD) onVote(true);
    else if (info.offset.x < -SWIPE_THRESHOLD) onVote(false);
  };

  return (
    <motion.article
      className="absolute inset-0 rounded-[1.25rem] bg-surface border border-line shadow-card p-6 sm:p-8 flex flex-col justify-between cursor-grab active:cursor-grabbing select-none touch-pan-y"
      style={{ x, rotate }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.9}
      onDragEnd={handleDragEnd}
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={
        reduceMotion
          ? { opacity: 0, transition: { duration: 0.12 } }
          : { opacity: 0, transition: { duration: 0.22 } }
      }
      transition={{ duration: reduceMotion ? 0.12 : 0.28 }}
      aria-label={`${idea.title}. ${idea.description}`}
    >
      <motion.span
        style={{ opacity: yesOpacity }}
        className="absolute top-5 left-5 px-3 py-1 rounded-full border-2 border-primary text-primary text-xs font-bold uppercase tracking-wider"
        aria-hidden="true"
      >
        Yes please
      </motion.span>
      <motion.span
        style={{ opacity: noOpacity }}
        className="absolute top-5 right-5 px-3 py-1 rounded-full border-2 border-line text-ink-muted text-xs font-bold uppercase tracking-wider"
        aria-hidden="true"
      >
        Not for us
      </motion.span>

      <div className="pt-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
          {CATEGORY_LABEL[idea.category]}
          {idea.custom ? ' · your idea' : ''}
        </p>
        <h2 className="font-display text-3xl sm:text-4xl font-semibold text-ink mt-3 leading-tight">
          {idea.title}
        </h2>
        <p className="text-sm sm:text-base text-ink-muted mt-4 leading-relaxed">{idea.description}</p>
      </div>
      <p className="text-xs text-ink-muted">Drag right for yes, left for no — or use the arrow keys.</p>
    </motion.article>
  );
}

function MatchRow({
  idea,
  planned,
  onAddBucket,
  onPlan,
}: {
  idea: DateIdea;
  planned: { bucket?: boolean; eventDate?: string } | undefined;
  onAddBucket: () => void;
  onPlan: (date: string) => void;
}) {
  const [date, setDate] = useState('');
  const [showPlanner, setShowPlanner] = useState(false);
  const inputId = `plan-${idea.id}`;

  return (
    <li className="rounded-[1.25rem] bg-surface border border-line p-4 sm:p-5 shadow-card">
      <div className="flex items-start gap-3">
        <span className="w-9 h-9 rounded-full bg-primary text-on-primary flex items-center justify-center flex-shrink-0" aria-hidden="true">
          <Heart className="w-4 h-4" fill="currentColor" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-ink">{idea.title}</p>
          <p className="text-xs text-ink-muted mt-0.5">{idea.description}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 mt-4">
        <button
          type="button"
          onClick={onAddBucket}
          disabled={planned?.bucket}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold border border-line text-ink hover:border-primary disabled:opacity-60 disabled:cursor-default"
        >
          {planned?.bucket ? <Check className="w-3.5 h-3.5" /> : <ListPlus className="w-3.5 h-3.5" />}
          {planned?.bucket ? 'On your bucket list' : 'Add to bucket list'}
        </button>
        {planned?.eventDate ? (
          <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold bg-purple-50 text-primary">
            <Check className="w-3.5 h-3.5" /> Planned for {planned.eventDate}
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setShowPlanner((v) => !v)}
            aria-expanded={showPlanner}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold bg-primary hover:bg-primary-hover text-on-primary shadow-cta"
          >
            <CalendarPlus className="w-3.5 h-3.5" /> Plan on calendar
          </button>
        )}
      </div>
      {showPlanner && !planned?.eventDate && (
        <form
          className="flex flex-wrap items-end gap-2 mt-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!date) return;
            onPlan(date);
            setShowPlanner(false);
          }}
        >
          <div>
            <label htmlFor={inputId} className="block text-xs font-semibold text-ink-muted mb-1">
              Date
            </label>
            <input
              id={inputId}
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="px-3 py-2 rounded-2xl border border-line bg-surface text-ink text-sm focus:outline-none focus:ring-2 focus:ring-focus"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded-full text-xs font-semibold bg-primary hover:bg-primary-hover text-on-primary"
          >
            Save to calendar
          </button>
        </form>
      )}
    </li>
  );
}

export default function DateIdeasPage() {
  const { data, activeProfile, partnerProfile, addBucketItem, addEvent, showToast } = useDiary();
  const reduceMotion = useReducedMotion() ?? false;
  const coupleId = data.couple.id;
  const me = data.activeProfileId;

  const [votes, setVotes] = useLocalState<IdeaVotes>(`dateIdeas:votes:${coupleId}`, {});
  const [customIdeas, setCustomIdeas] = useLocalState<DateIdea[]>(`dateIdeas:custom:${coupleId}`, []);
  const [planned, setPlanned] = useLocalState<Planned>(`dateIdeas:planned:${coupleId}`, {});
  const [category, setCategory] = useState<DateIdeaCategory | 'all'>('all');
  const [history, setHistory] = useState<string[]>([]);

  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newCategory, setNewCategory] = useState<DateIdeaCategory>('cozy');

  const allIdeas = useMemo(() => [...customIdeas, ...CURATED_IDEAS], [customIdeas]);
  const deck = useMemo(
    () => remainingFor(filterByCategory(allIdeas, category), votes, me),
    [allIdeas, category, votes, me]
  );
  const current = deck[0];
  const matches = useMemo(() => getMatches(allIdeas, votes), [allIdeas, votes]);
  const waiting = useMemo(() => waitingOnPartner(allIdeas, votes, me), [allIdeas, votes, me]);
  const swipedCount = filterByCategory(allIdeas, category).length - deck.length;

  const vote = useCallback(
    (yes: boolean) => {
      if (!current) return;
      const partnerVote = votes[current.id]?.[me === 'user_1' ? 'user_2' : 'user_1'];
      setVotes((prev) => recordVote(prev, current.id, me, yes));
      setHistory((h) => [...h, current.id]);
      if (yes && partnerVote === true) {
        showToast(`It's a match: ${current.title}`, 'success');
      }
    },
    [current, me, votes, setVotes, showToast]
  );

  const undo = () => {
    const last = history[history.length - 1];
    if (!last) return;
    setVotes((prev) => clearVote(prev, last, me));
    setHistory((h) => h.slice(0, -1));
  };

  // History belongs to whoever is swiping — reset when profiles switch.
  useEffect(() => {
    setHistory([]);
  }, [me]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))) return;
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        vote(true);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        vote(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [vote]);

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const idea = makeCustomIdea(newId('idea'), newTitle, newCategory, newDescription || 'An idea of our own.', me);
    setCustomIdeas((prev) => [idea, ...prev]);
    setNewTitle('');
    setNewDescription('');
    showToast('Idea added to the deck', 'success');
  };

  const handleAddBucket = (idea: DateIdea) => {
    addBucketItem({
      title: idea.title,
      category: idea.bucket,
      completed: false,
      notes: idea.description,
      createdBy: me,
    });
    setPlanned((prev) => ({ ...prev, [idea.id]: { ...prev[idea.id], bucket: true } }));
    showToast('Added to your bucket list', 'success');
  };

  const handlePlan = (idea: DateIdea, date: string) => {
    addEvent({ title: idea.title, date, category: 'Date Night', description: idea.description });
    setPlanned((prev) => ({ ...prev, [idea.id]: { ...prev[idea.id], eventDate: date } }));
    showToast('Date night saved to your calendar', 'success');
  };

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto space-y-8">
        <header>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">Date ideas</p>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold text-ink mt-1">Swipe your way to the next date</h1>
          <p className="text-sm text-ink-muted mt-2 max-w-2xl">
            You're swiping as <span className="font-semibold text-ink">{activeProfile.name}</span>. When {partnerProfile.name} says yes to the same idea, it becomes a match.
          </p>
        </header>

        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by category">
          {[{ id: 'all' as const, label: 'All' }, ...DATE_IDEA_CATEGORIES].map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategory(c.id)}
              aria-pressed={category === c.id}
              className={`px-4 py-2 rounded-full text-xs font-semibold border transition-colors ${
                category === c.id
                  ? 'bg-primary text-on-primary border-primary'
                  : 'bg-surface text-ink border-line hover:border-primary'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-8 items-start">
          <section aria-label="Idea deck" className="space-y-4">
            <div className="relative h-[22rem] sm:h-[24rem]">
              {current && (
                <div
                  className="absolute inset-x-4 -bottom-2 top-4 rounded-[1.25rem] bg-purple-50 border border-line"
                  aria-hidden="true"
                />
              )}
              <AnimatePresence initial={false}>
                {current ? (
                  <SwipeCard key={current.id} idea={current} onVote={vote} reduceMotion={reduceMotion} />
                ) : (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute inset-0 rounded-[1.25rem] bg-hero border border-line p-8 flex flex-col items-center justify-center text-center"
                  >
                    <Sparkles className="w-8 h-8 text-primary" aria-hidden="true" />
                    <h2 className="font-display text-2xl font-semibold text-ink mt-3">That's the whole pile</h2>
                    <p className="text-sm text-ink-muted mt-2 max-w-xs">
                      Hand the phone to {partnerProfile.name} (or switch profiles) so they can swipe too — or add an idea of your own.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="flex items-center justify-center gap-4 pt-2">
              <button
                type="button"
                onClick={() => vote(false)}
                disabled={!current}
                aria-label="Not for us"
                className="w-14 h-14 rounded-full bg-surface border border-line text-ink-muted hover:text-ink hover:border-primary flex items-center justify-center shadow-card disabled:opacity-40"
              >
                <X className="w-6 h-6" />
              </button>
              <button
                type="button"
                onClick={undo}
                disabled={history.length === 0}
                aria-label="Undo last swipe"
                className="w-11 h-11 rounded-full bg-surface border border-line text-ink-muted hover:text-ink flex items-center justify-center disabled:opacity-40"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => vote(true)}
                disabled={!current}
                aria-label="Yes please"
                className="w-14 h-14 rounded-full bg-primary hover:bg-primary-hover text-on-primary flex items-center justify-center shadow-cta disabled:opacity-40"
              >
                <Heart className="w-6 h-6" fill="currentColor" />
              </button>
            </div>
            <p className="text-center text-xs text-ink-muted" aria-live="polite">
              {swipedCount} swiped · {deck.length} to go
              {waiting.length > 0 && ` · ${waiting.length} waiting on ${partnerProfile.name}`}
            </p>
          </section>

          <section aria-labelledby="matches-heading" className="space-y-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">You both said yes</p>
              <h2 id="matches-heading" className="text-2xl font-semibold text-ink">
                Matches ({matches.length})
              </h2>
            </div>
            {matches.length === 0 ? (
              <p className="text-sm text-ink-muted rounded-[1.25rem] border border-dashed border-line p-5">
                No matches yet. Ideas you both swipe right on will land here, ready to plan.
              </p>
            ) : (
              <ul className="space-y-3">
                {matches.map((idea) => (
                  <MatchRow
                    key={idea.id}
                    idea={idea}
                    planned={planned[idea.id]}
                    onAddBucket={() => handleAddBucket(idea)}
                    onPlan={(date) => handlePlan(idea, date)}
                  />
                ))}
              </ul>
            )}
          </section>
        </div>

        <section aria-labelledby="custom-heading" className="rounded-[1.25rem] bg-surface border border-line p-5 sm:p-6 shadow-card">
          <h2 id="custom-heading" className="text-xl font-semibold text-ink">Add an idea of your own</h2>
          <p className="text-xs text-ink-muted mt-1">It joins the top of the deck for both of you.</p>
          <form onSubmit={handleAddCustom} className="grid sm:grid-cols-[1fr_12rem] gap-4 mt-4">
            <div>
              <label htmlFor="idea-title" className="block text-xs font-semibold text-ink-muted mb-1">
                Idea
              </label>
              <input
                id="idea-title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                maxLength={80}
                required
                placeholder="Midnight bakery run"
                className="w-full px-4 py-2.5 rounded-2xl border border-line bg-surface text-ink text-sm focus:outline-none focus:ring-2 focus:ring-focus"
              />
            </div>
            <div>
              <label htmlFor="idea-category" className="block text-xs font-semibold text-ink-muted mb-1">
                Category
              </label>
              <select
                id="idea-category"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as DateIdeaCategory)}
                className="w-full px-4 py-2.5 rounded-2xl border border-line bg-surface text-ink text-sm focus:outline-none focus:ring-2 focus:ring-focus"
              >
                {DATE_IDEA_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="idea-description" className="block text-xs font-semibold text-ink-muted mb-1">
                A line about it (optional)
              </label>
              <input
                id="idea-description"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                maxLength={160}
                placeholder="Warm croissants straight from the oven at 2am"
                className="w-full px-4 py-2.5 rounded-2xl border border-line bg-surface text-ink text-sm focus:outline-none focus:ring-2 focus:ring-focus"
              />
            </div>
            <div className="sm:col-span-2">
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold bg-primary hover:bg-primary-hover text-on-primary shadow-cta"
              >
                <Plus className="w-4 h-4" /> Add to deck
              </button>
            </div>
          </form>
        </section>
      </div>
    </AppShell>
  );
}
