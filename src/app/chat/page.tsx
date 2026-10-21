'use client';

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Loader2, MessagesSquare, Send, Trash2 } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { useDiary } from '@/store/DiaryContext';
import { newId } from '@/hooks/useNow';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useLocalState } from '@/lib/local-store';
import {
  deleteMessageRemote,
  fetchMessagesRemote,
  markMessagesReadRemote,
  sendMessageRemote,
  subscribeToChat,
  type ChatMessageRow,
} from '@/lib/supabase/chat';
import {
  MAX_MESSAGE_LENGTH,
  formatChatTime,
  groupMessagesByDay,
  mergeMessages,
  unreadIdsToMark,
  validateMessage,
} from '@/lib/features/chat';
import type { ProfileId } from '@/types';

/**
 * Demo-mode message. `senderId` holds a profile slot ('user_1'/'user_2')
 * rather than a real auth uid, so the same rendering code covers both modes.
 */
interface LocalChatMessage {
  id: string;
  senderId: ProfileId;
  content: string;
  createdAt: string;
  readAt: string | null;
}

interface ViewMessage {
  id: string;
  senderId: string;
  content: string;
  createdAt: string;
  readAt: string | null;
  mine: boolean;
  /** Optimistic rows haven't been confirmed by the server yet. */
  pending?: boolean;
}

export default function ChatPage() {
  const { data, activeProfile, partnerProfile, isLiveUser, currentUserId, showToast } = useDiary();
  const coupleId = data.couple.id;
  const supabase = isLiveUser && currentUserId ? getSupabaseBrowserClient() : null;
  const isRemote = Boolean(supabase && coupleId);

  const [remote, setRemote] = useState<ChatMessageRow[]>([]);
  // Demo mode keeps the thread on this device. Not in the synced-prefix
  // allowlist in local-store.ts on purpose: demo mode has no second device.
  const [local, setLocal] = useLocalState<LocalChatMessage[]>(`chat:${coupleId || 'demo'}`, []);
  const [pending, setPending] = useState<ViewMessage[]>([]);

  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  const messages: ViewMessage[] = useMemo(() => {
    const base: ViewMessage[] = isRemote
      ? remote.map((m) => ({
          id: m.id,
          senderId: m.senderId,
          content: m.content,
          createdAt: m.createdAt,
          readAt: m.readAt,
          mine: m.senderId === currentUserId,
        }))
      : local.map((m) => ({
          id: m.id,
          senderId: m.senderId,
          content: m.content,
          createdAt: m.createdAt,
          readAt: m.readAt,
          mine: m.senderId === data.activeProfileId,
        }));
    // Drop any optimistic row the server has since echoed back to us.
    const confirmed = new Set(base.map((m) => m.id));
    const stillPending = pending.filter((p) => !confirmed.has(p.id));
    return mergeMessages(base, stillPending);
  }, [isRemote, remote, local, pending, currentUserId, data.activeProfileId]);

  const groups = useMemo(() => groupMessagesByDay(messages), [messages]);

  // ------------------------------------------------------------- loading ---
  const reload = useCallback(async () => {
    if (!isRemote || !supabase) {
      setLoading(false);
      return;
    }
    try {
      setRemote(await fetchMessagesRemote(supabase, coupleId));
      setError('');
    } catch (err) {
      console.error('[OurDiary] Failed to load chat:', err);
      setError('We couldn’t load your messages just now.');
    } finally {
      setLoading(false);
    }
  }, [isRemote, supabase, coupleId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  // ------------------------------------------------------------ realtime ---
  useEffect(() => {
    if (!isRemote || !supabase) return;
    const channel = subscribeToChat(supabase, coupleId, {
      onInsert: (message) => setRemote((prev) => mergeMessages(prev, [message])),
      onUpdate: (message) => setRemote((prev) => prev.map((m) => (m.id === message.id ? message : m))),
      onDelete: (id) => setRemote((prev) => prev.filter((m) => m.id !== id)),
    });
    return () => {
      // Without this the subscription survives navigation and each remount
      // adds another, so one message arrives several times over.
      void supabase.removeChannel(channel);
    };
  }, [isRemote, supabase, coupleId]);

  // --------------------------------------------------------- mark as read ---
  useEffect(() => {
    if (!isRemote || !supabase || !currentUserId) return;
    const ids = unreadIdsToMark(
      remote.map((m) => ({ id: m.id, senderId: m.senderId, content: m.content, createdAt: m.createdAt, readAt: m.readAt })),
      currentUserId
    );
    if (ids.length === 0) return;
    markMessagesReadRemote(supabase, ids).catch((err) => {
      // A failed read receipt is cosmetic — never surface it as an error.
      console.warn('[OurDiary] Could not mark messages read:', err);
    });
  }, [isRemote, supabase, currentUserId, remote]);

  // Demo mode: opening the thread marks the other slot's messages read.
  useEffect(() => {
    if (isRemote) return;
    const hasUnread = local.some((m) => m.senderId !== data.activeProfileId && !m.readAt);
    if (!hasUnread) return;
    const now = new Date().toISOString();
    setLocal((prev) =>
      prev.map((m) => (m.senderId !== data.activeProfileId && !m.readAt ? { ...m, readAt: now } : m))
    );
  }, [isRemote, local, data.activeProfileId, setLocal]);

  // ------------------------------------------------------------ scrolling ---
  // Jump to the newest message whenever the count grows, but only when the
  // reader is already near the bottom — otherwise scrolling back through
  // history yanks them forward every time a message lands.
  const countRef = useRef(0);
  useLayoutEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const grew = messages.length > countRef.current;
    const firstPaint = countRef.current === 0 && messages.length > 0;
    countRef.current = messages.length;
    if (!grew) return;
    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    if (firstPaint || distanceFromBottom < 160) {
      endRef.current?.scrollIntoView({ block: 'end', behavior: firstPaint ? 'auto' : 'smooth' });
    }
  }, [messages.length]);

  // --------------------------------------------------------------- send ---
  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const problem = validateMessage(draft);
    if (problem) {
      setError(problem);
      return;
    }
    const content = draft.trim();
    setError('');
    setDraft('');
    setSending(true);

    if (!isRemote) {
      setLocal((prev) => [
        ...prev,
        {
          id: newId('msg'),
          senderId: data.activeProfileId,
          content,
          createdAt: new Date().toISOString(),
          readAt: null,
        },
      ]);
      setSending(false);
      return;
    }

    // Show it immediately, then reconcile with the row the server returns.
    const tempId = newId('msg');
    const optimistic: ViewMessage = {
      id: tempId,
      senderId: currentUserId || '',
      content,
      createdAt: new Date().toISOString(),
      readAt: null,
      mine: true,
      pending: true,
    };
    setPending((prev) => [...prev, optimistic]);

    try {
      const saved = await sendMessageRemote(supabase!, coupleId, currentUserId!, content);
      setRemote((prev) => mergeMessages(prev, [saved]));
      setPending((prev) => prev.filter((m) => m.id !== tempId));
    } catch (err: any) {
      setPending((prev) => prev.filter((m) => m.id !== tempId));
      // Hand the text back rather than losing what they typed.
      setDraft(content);
      setError(err?.message || 'That message didn’t send. Try again.');
    } finally {
      setSending(false);
    }
  };

  const removeMessage = async (id: string) => {
    if (!isRemote) {
      setLocal((prev) => prev.filter((m) => m.id !== id));
      return;
    }
    try {
      await deleteMessageRemote(supabase!, id);
      setRemote((prev) => prev.filter((m) => m.id !== id));
    } catch {
      showToast('That message couldn’t be unsent.', 'warn');
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter sends, Shift+Enter makes a new line — what every chat does.
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void send(e as unknown as React.FormEvent);
    }
  };

  const lastMine = [...messages].reverse().find((m) => m.mine);

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto space-y-6">
        <header>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">Just us</p>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold text-ink mt-1">
            Chat with {partnerProfile.name}
          </h1>
          <p className="text-sm text-ink-muted mt-2 max-w-2xl">
            {isRemote
              ? 'Private to the two of you. Messages appear on your partner’s device as you send them.'
              : 'Demo mode: this thread stays on this device. Switch profiles in the navbar to see both sides.'}
          </p>
        </header>

        <section
          aria-labelledby="thread-heading"
          className="rounded-[1.25rem] border border-line bg-surface shadow-card overflow-hidden flex flex-col"
          style={{ height: 'min(68vh, 36rem)' }}
        >
          <h2 id="thread-heading" className="sr-only">
            Message thread
          </h2>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5" role="log" aria-live="polite">
            {loading ? (
              <p className="text-sm text-ink-muted">Loading your messages…</p>
            ) : messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center gap-2 px-6">
                <MessagesSquare className="w-8 h-8 text-primary" aria-hidden="true" />
                <p className="text-sm text-ink-muted">
                  No messages yet. Say something only {partnerProfile.name} gets to read.
                </p>
              </div>
            ) : (
              groups.map((group) => (
                <div key={group.date} className="space-y-3">
                  <p className="text-center">
                    <span className="inline-block px-3 py-1 rounded-full bg-canvas border border-line text-[11px] font-semibold text-ink-muted">
                      {group.label}
                    </span>
                  </p>
                  {group.messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex items-end gap-2 ${message.mine ? 'justify-end' : 'justify-start'}`}
                    >
                      {message.mine && (
                        <button
                          type="button"
                          onClick={() => removeMessage(message.id)}
                          aria-label="Unsend this message"
                          className="p-1.5 rounded-full text-ink-muted hover:text-danger opacity-0 focus:opacity-100 group-hover:opacity-100 sm:opacity-60"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <div
                        className={`max-w-[78%] rounded-2xl px-4 py-2.5 ${
                          message.mine
                            ? 'bg-primary text-on-primary rounded-br-md'
                            : 'bg-canvas border border-line text-ink rounded-bl-md'
                        } ${message.pending ? 'opacity-70' : ''}`}
                      >
                        {!message.mine && (
                          <p className="text-[11px] font-semibold text-primary mb-0.5">{partnerProfile.name}</p>
                        )}
                        <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                        <p
                          className={`text-[10px] mt-1 ${message.mine ? 'text-on-primary/70' : 'text-ink-muted'}`}
                        >
                          {message.pending ? 'Sending…' : formatChatTime(message.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ))
            )}
            <div ref={endRef} />
          </div>

          {lastMine && !lastMine.pending && (
            <p className="px-5 pb-1 text-right text-[11px] text-ink-muted">
              {lastMine.readAt ? `Seen by ${partnerProfile.name}` : 'Delivered'}
            </p>
          )}

          <form onSubmit={send} className="border-t border-line p-3 sm:p-4 flex items-end gap-2 bg-surface">
            <label htmlFor="chat-draft" className="sr-only">
              Message {partnerProfile.name}
            </label>
            <textarea
              id="chat-draft"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onKeyDown}
              rows={1}
              maxLength={MAX_MESSAGE_LENGTH}
              placeholder={`Message ${partnerProfile.name}…`}
              className="flex-1 resize-none max-h-32 px-4 py-2.5 rounded-2xl border border-line bg-canvas text-ink text-sm focus:outline-none focus:ring-2 focus:ring-focus"
            />
            <button
              type="submit"
              disabled={sending || !draft.trim()}
              aria-label="Send message"
              className="p-3 rounded-full bg-primary hover:bg-primary-hover text-on-primary shadow-cta disabled:opacity-50 flex-shrink-0"
            >
              {sending ? <Loader2 className="w-4 h-4 motion-safe:animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </form>
        </section>

        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}

        <p className="text-xs text-ink-muted">
          Signed in as <span className="font-semibold text-ink">{activeProfile.name}</span>.
        </p>
      </div>
    </AppShell>
  );
}
