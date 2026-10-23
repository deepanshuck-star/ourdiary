'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BookHeart,
  Check,
  Key,
  Loader2,
  Plus,
  Users,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { useDiary } from '@/store/DiaryContext';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { joinCoupleByCodeRemote } from '@/lib/supabase/couple';
import { friendlyAuthError } from '@/lib/friendlyError';

function today(): string {
  return new Date().toISOString().split('T')[0];
}

export default function SpacesPage() {
  const router = useRouter();
  const { data, spaces, spacesLoading, refreshSpaces, switchSpace, createSpace, isLiveUser, showToast } = useDiary();
  const supabase = getSupabaseBrowserClient();

  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [personalName, setPersonalName] = useState('');
  const [coupleName, setCoupleName] = useState('');
  const [coupleStart, setCoupleStart] = useState('');
  const [inviteCode, setInviteCode] = useState('');

  useEffect(() => {
    refreshSpaces();
    // refreshSpaces comes from DiaryContext unmemoized, so listing it here
    // would re-fetch on every provider render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasPersonal = spaces.some((s) => s.kind === 'personal');

  const handleOpen = async (id: string) => {
    setError(null);
    setBusy(id);
    try {
      await switchSpace(id);
      router.push('/dashboard');
    } catch (err: any) {
      setError(friendlyAuthError(err, 'couple'));
      setBusy(null);
    }
  };

  const handleCreatePersonal = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy('new-personal');
    const existing = spaces.find((s) => s.kind === 'personal');
    try {
      const id = await createSpace(personalName.trim() || 'My diary', today(), 'personal');
      // The server returns the diary you already keep rather than making a
      // second one — that is a refusal, not a new space.
      if (existing && id === existing.id) {
        setError('You already keep a personal diary — this is it. One diary of one is the whole idea.');
        setBusy(null);
        return;
      }
      setPersonalName('');
      router.push('/dashboard');
    } catch (err: any) {
      setError(friendlyAuthError(err, 'couple'));
      setBusy(null);
    }
  };

  const handleCreateCouple = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy('new-couple');
    try {
      await createSpace(coupleName.trim() || 'Our diary', coupleStart || today(), 'couple');
      setCoupleName('');
      setCoupleStart('');
      router.push('/dashboard');
    } catch (err: any) {
      setError(friendlyAuthError(err, 'couple'));
      setBusy(null);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const code = inviteCode.trim().toUpperCase();
    if (!code) return;
    if (!supabase) {
      setError('Joining a diary needs a signed-in account.');
      return;
    }
    setBusy('join');
    try {
      const joined = await joinCoupleByCodeRemote(supabase, code);
      await refreshSpaces();
      await switchSpace(joined.id);
      setInviteCode('');
      showToast(`Joined ${joined.name}`, 'heart');
      router.push('/dashboard');
    } catch (err: any) {
      setError(friendlyAuthError(err, 'couple'));
      setBusy(null);
    }
  };

  const inputClass =
    'w-full px-4 py-2.5 rounded-2xl border border-line bg-surface text-ink text-sm focus:outline-none focus:ring-2 focus:ring-focus';
  const labelClass = 'block text-xs font-semibold text-ink-muted mb-1';

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-8">
        <header>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">Your diaries</p>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold text-ink mt-1">Which one are we in today?</h1>
          <p className="text-sm text-ink-muted mt-2 max-w-2xl">
            A diary of your own and a diary for two can live side by side on one account. Open any of them here.
          </p>
        </header>

        {error && (
          <p
            role="alert"
            className="rounded-[1.25rem] border border-line bg-surface shadow-card px-5 py-4 text-sm text-ink"
          >
            {error}
          </p>
        )}

        <section aria-labelledby="my-diaries" className="space-y-4">
          <h2 id="my-diaries" className="text-2xl font-semibold text-ink">
            Diaries you belong to
          </h2>

          {spacesLoading && spaces.length === 0 ? (
            <p className="text-sm text-ink-muted">Looking up your diaries…</p>
          ) : spaces.length === 0 ? (
            <p className="text-sm text-ink-muted">
              {isLiveUser
                ? 'No diaries on this account yet — start one below.'
                : 'Sign in to keep diaries on an account; the demo space lives on this device only.'}
            </p>
          ) : (
            <ul className="grid sm:grid-cols-2 gap-4">
              {spaces.map((space) => {
                const isCurrent = space.id === data.couple.id;
                const Icon = space.kind === 'personal' ? BookHeart : Users;
                return (
                  <li
                    key={space.id}
                    className="rounded-[1.25rem] bg-surface border border-line shadow-card p-5 flex flex-col gap-3"
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className="w-10 h-10 rounded-full bg-purple-50 text-primary flex items-center justify-center flex-shrink-0"
                        aria-hidden="true"
                      >
                        <Icon className="w-4 h-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-ink truncate">{space.name}</p>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full border border-line text-[11px] font-semibold text-ink-muted">
                            {space.kind === 'personal' ? 'Personal' : 'Couple'}
                          </span>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full border border-line text-[11px] font-semibold text-ink-muted">
                            {space.role === 'creator' ? 'You started this' : 'You joined this'}
                          </span>
                          {isCurrent && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-hero border border-line text-[11px] font-semibold text-ink">
                              <Check className="w-3 h-3" aria-hidden="true" />
                              Open now
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleOpen(space.id)}
                      disabled={busy !== null}
                      className="self-start inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold bg-primary hover:bg-primary-hover text-on-primary shadow-cta disabled:opacity-50"
                    >
                      {busy === space.id ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                      {isCurrent ? 'Back to this diary' : 'Open'}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="grid md:grid-cols-2 gap-4">
          <form
            onSubmit={handleCreatePersonal}
            aria-labelledby="start-personal"
            className="rounded-[1.25rem] bg-surface border border-line shadow-card p-5 sm:p-6 space-y-4"
          >
            <div>
              <h2 id="start-personal" className="text-xl font-semibold text-ink">
                Start a diary for yourself
              </h2>
              <p className="text-xs text-ink-muted mt-1">
                Only a name. A partner can be invited into it later, entries and all.
              </p>
            </div>
            <div>
              <label htmlFor="personal-name" className={labelClass}>
                Diary name
              </label>
              <input
                id="personal-name"
                value={personalName}
                onChange={(e) => setPersonalName(e.target.value)}
                maxLength={60}
                placeholder="My diary"
                className={inputClass}
              />
            </div>
            <button
              type="submit"
              disabled={busy !== null || hasPersonal}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold bg-primary hover:bg-primary-hover text-on-primary shadow-cta disabled:opacity-50"
            >
              {busy === 'new-personal' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Start my diary
            </button>
            {hasPersonal && (
              <p className="text-xs text-ink-muted">You already keep one — it is in the list above.</p>
            )}
          </form>

          <form
            onSubmit={handleCreateCouple}
            aria-labelledby="start-couple"
            className="rounded-[1.25rem] bg-surface border border-line shadow-card p-5 sm:p-6 space-y-4"
          >
            <div>
              <h2 id="start-couple" className="text-xl font-semibold text-ink">
                Start a diary for two
              </h2>
              <p className="text-xs text-ink-muted mt-1">
                You get an invite code to share. A space holds exactly two people.
              </p>
            </div>
            <div>
              <label htmlFor="couple-name" className={labelClass}>
                Space name
              </label>
              <input
                id="couple-name"
                value={coupleName}
                onChange={(e) => setCoupleName(e.target.value)}
                maxLength={60}
                placeholder="Our diary"
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="couple-start" className={labelClass}>
                Start date (optional)
              </label>
              <input
                id="couple-start"
                type="date"
                value={coupleStart}
                onChange={(e) => setCoupleStart(e.target.value)}
                className={inputClass}
              />
            </div>
            <button
              type="submit"
              disabled={busy !== null}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold bg-primary hover:bg-primary-hover text-on-primary shadow-cta disabled:opacity-50"
            >
              {busy === 'new-couple' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Start our diary
            </button>
          </form>
        </section>

        <section
          aria-labelledby="join-heading"
          className="rounded-[1.25rem] bg-hero border border-line shadow-card p-5 sm:p-6"
        >
          <h2 id="join-heading" className="text-xl font-semibold text-ink">
            Join with a code
          </h2>
          <p className="text-xs text-ink-muted mt-1 max-w-xl">
            Someone shared their six-character code with you. If it is their personal diary, joining turns it into a
            diary for two with everything already written in it.
          </p>
          <form onSubmit={handleJoin} className="flex flex-wrap items-end gap-3 mt-4">
            <div className="flex-1 min-w-[12rem]">
              <label htmlFor="join-code" className={labelClass}>
                Invite code
              </label>
              <div className="relative">
                <Key className="w-4 h-4 text-ink-muted absolute left-3.5 top-3" aria-hidden="true" />
                <input
                  id="join-code"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  maxLength={10}
                  placeholder="7X8K2M"
                  className={`${inputClass} pl-10 font-mono tracking-widest`}
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={busy !== null}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold bg-primary hover:bg-primary-hover text-on-primary shadow-cta disabled:opacity-50"
            >
              {busy === 'join' ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Join diary
            </button>
          </form>
        </section>
      </div>
    </AppShell>
  );
}
