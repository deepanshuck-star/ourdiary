'use client';

import React, { useEffect, useState } from 'react';
import { Loader2, Lock, MailOpen, Send, Sunrise, Trash2 } from 'lucide-react';
import { useDiary } from '@/store/DiaryContext';
import { useMorningMail } from '@/hooks/useMorningMail';
import { MAX_NOTE_LENGTH, deliveryInstant, validateNote } from '@/lib/features/morningMail';
import { formatGap } from '@/lib/features/handoff';
import { formatChatTime } from '@/lib/features/chat';

interface Props {
  partnerName: string;
  partnerZone: string;
  partnerAsleep: boolean;
  /** Epoch ms of their next morning. */
  partnerNextWakeUtc: number;
}

function clockIn(ms: number, timeZone: string) {
  return new Intl.DateTimeFormat(undefined, {
    timeZone,
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(ms));
}

/**
 * Write something into the other person's night and have it waiting when
 * they wake up, instead of buzzing their phone at 3am or being forgotten by
 * the time they're up.
 */
export function MorningMail({ partnerName, partnerZone, partnerAsleep, partnerNextWakeUtc }: Props) {
  const { showToast } = useDiary();
  const { mailbox, now, myId, partnerId, send, cancel, openAll } = useMorningMail();
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');

  // Opening the page is reading them, the same way the chat thread works.
  const unopenedCount = mailbox.unopened.length;
  useEffect(() => {
    if (unopenedCount > 0) openAll();
  }, [unopenedCount, openAll]);

  if (now === null) {
    return (
      <section className="rounded-[1.25rem] bg-surface border border-line p-5 sm:p-6 shadow-card">
        <Loader2 className="w-5 h-5 text-primary animate-spin" aria-label="Loading" />
      </section>
    );
  }

  const landsAt = deliveryInstant(now, partnerAsleep, partnerNextWakeUtc);
  const heldBack = landsAt > now;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const problem = validateNote(draft);
    if (problem) {
      setError(problem);
      return;
    }
    if (!partnerId) {
      setError(`There’s nobody to deliver this to yet — ${partnerName} needs to join the space first.`);
      return;
    }
    send(draft, deliveryInstant(Date.now(), partnerAsleep, partnerNextWakeUtc));
    setDraft('');
    setError('');
    showToast(
      heldBack ? `Sealed — ${partnerName} gets it when they wake 🌅` : `${partnerName} is up — sent now 💌`,
      'heart'
    );
  };

  return (
    <section
      id="morning-mail"
      aria-labelledby="morning-mail-heading"
      className="rounded-[1.25rem] bg-surface border border-line p-5 sm:p-6 shadow-card space-y-5 scroll-mt-20"
    >
      <div>
        <h2 id="morning-mail-heading" className="text-xl font-semibold text-ink flex items-center gap-2">
          <Sunrise className="w-5 h-5 text-primary" aria-hidden="true" /> Deliver when they wake
        </h2>
        <p className="text-xs text-ink-muted mt-1">
          {heldBack
            ? `${partnerName} is asleep. This stays sealed until ${clockIn(landsAt, partnerZone)} their time — ${formatGap(
                landsAt - now
              )} from now.`
            : `${partnerName} is awake right now, so anything you write here lands straight away.`}
        </p>
      </div>

      {/* Arrived, for me */}
      {mailbox.arrived.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted flex items-center gap-1.5">
            <MailOpen className="w-3.5 h-3.5" aria-hidden="true" /> Waiting for you
          </h3>
          <ul className="space-y-2">
            {mailbox.arrived.slice(0, 10).map((note) => (
              <li key={note.id} className="rounded-2xl bg-hero border border-line p-4">
                <p className="text-sm text-ink whitespace-pre-wrap break-words">{note.content}</p>
                <p className="text-[11px] text-ink-muted mt-2">
                  From {partnerName} · written {formatChatTime(note.createdAt)}, delivered{' '}
                  {formatChatTime(note.deliverAt)}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Sealed, from me */}
      {mailbox.queued.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5" aria-hidden="true" /> Sealed for their morning
          </h3>
          <ul className="space-y-2">
            {mailbox.queued.map((note) => (
              <li
                key={note.id}
                className="rounded-2xl bg-canvas border border-line p-4 flex items-start justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="text-sm text-ink whitespace-pre-wrap break-words">{note.content}</p>
                  <p className="text-[11px] text-ink-muted mt-2">
                    Lands {clockIn(Date.parse(note.deliverAt), partnerZone)} their time ·{' '}
                    {formatGap(Date.parse(note.deliverAt) - now)} from now
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => cancel(note.id)}
                  aria-label="Take this note back"
                  title="Take it back"
                  className="p-2 rounded-full text-ink-muted hover:text-danger flex-shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <form onSubmit={submit} className="space-y-2">
        <label htmlFor="morning-note" className="block text-xs font-semibold text-ink-muted">
          Write it now, they read it over breakfast
        </label>
        <textarea
          id="morning-note"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={3}
          maxLength={MAX_NOTE_LENGTH}
          placeholder={`Morning, ${partnerName}…`}
          className="w-full resize-none px-4 py-3 rounded-2xl border border-line bg-canvas text-ink text-sm focus:outline-none focus:ring-2 focus:ring-focus placeholder:text-ink-muted/60"
        />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            type="submit"
            disabled={!draft.trim() || !myId}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full text-sm font-semibold bg-primary hover:bg-primary-hover text-on-primary shadow-cta disabled:opacity-40"
          >
            <Send className="w-4 h-4" aria-hidden="true" />
            {heldBack ? 'Seal for their morning' : 'Send now'}
          </button>
          <p className="text-[11px] text-ink-muted max-w-sm">
            A sealed note is held back from their screen until it’s due — it isn’t a secret, it’s an
            envelope you both agreed not to open yet.
          </p>
        </div>
        {error && (
          <p role="alert" className="text-sm text-danger font-medium">
            {error}
          </p>
        )}
      </form>

      {mailbox.delivered.length > 0 && (
        <p className="text-[11px] text-ink-muted">
          {mailbox.delivered.length} note{mailbox.delivered.length === 1 ? '' : 's'} already delivered to{' '}
          {partnerName}.
        </p>
      )}
    </section>
  );
}
