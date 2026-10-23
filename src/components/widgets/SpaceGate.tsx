'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, Copy, Lock, UserPlus } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { useDiary } from '@/store/DiaryContext';
import { useSpaceMode } from '@/hooks/useSpaceMode';

interface Props {
  /** The route this page lives at, matched against the couple-only list. */
  href: string;
  /** The page's own title, for the panel. */
  title: string;
  children: React.ReactNode;
}

/**
 * Wraps a page that needs two people.
 *
 * The nav already hides or greys these, but a URL typed or bookmarked gets
 * here anyway, and the page's own empty state would imply the user had done
 * something wrong. The two cases get different answers on purpose:
 *
 *   personal diary — the feature is absent. Nobody is coming, so offering to
 *     "invite your partner" would be a prompt that never resolves. The way
 *     out is a couple space, so that is what is offered.
 *
 *   couple space, one seat empty — the feature is waiting. Here the invite
 *     code IS the answer, so it is right there.
 */
export function SpaceGate({ href, title, children }: Props) {
  const { data } = useDiary();
  const { access, reason } = useSpaceMode();
  const state = access(href);

  if (state !== 'hidden' && state !== 'waiting') return <>{children}</>;

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto space-y-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-muted hover:text-ink"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Back to your diary
        </Link>

        <section className="rounded-[1.5rem] bg-surface border border-line shadow-card p-6 sm:p-8">
          <span
            className="w-12 h-12 rounded-full bg-purple-50 text-primary flex items-center justify-center"
            aria-hidden="true"
          >
            {state === 'hidden' ? <UserPlus className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
          </span>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-ink mt-4">{title}</h1>
          <p className="text-sm text-ink-muted mt-2">{reason(href)}</p>

          {state === 'hidden' ? (
            <>
              <p className="text-sm text-ink-muted mt-2">
                This is your personal diary, so there’s nobody for it to work with. You can start a
                shared space whenever you want one — or invite someone into this diary, and everything
                already in it comes with you.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href="/spaces"
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full text-sm font-semibold bg-primary hover:bg-primary-hover text-on-primary shadow-cta"
                >
                  Your diaries
                </Link>
                <Link
                  href="/settings"
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full text-sm font-semibold bg-surface border border-line text-ink hover:bg-canvas"
                >
                  Invite someone into this one
                </Link>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-ink-muted mt-2">
                It’ll be here, exactly as it is, the day they join — nothing to set up again.
              </p>
              <InviteCode code={data.couple.inviteCode} />
            </>
          )}
        </section>
      </div>
    </AppShell>
  );
}

function InviteCode({ code }: { code?: string }) {
  const { showToast } = useDiary();
  const [copied, setCopied] = useState(false);
  if (!code) return null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
      showToast('Invite code copied', 'success');
    } catch {
      showToast('Couldn’t copy — select the code and copy it by hand.', 'warn');
    }
  };

  return (
    <div className="mt-4 flex items-center bg-hero pl-4 pr-1.5 py-1.5 rounded-full border border-line w-fit">
      <span className="sr-only">Your invite code</span>
      <span className="font-mono font-semibold text-primary text-sm tracking-widest mr-3">{code}</span>
      <button
        type="button"
        onClick={copy}
        title="Copy invite code"
        aria-label="Copy invite code"
        className="p-1.5 hover:bg-purple-100 rounded-full text-ink-muted hover:text-ink transition-colors"
      >
        {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
      </button>
    </div>
  );
}
