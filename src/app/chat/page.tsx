'use client';

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { CheckCheck, Clock, Loader2, MessagesSquare, Send, Trash2 } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { SpaceGate } from '@/components/widgets/SpaceGate';
import { useDiary } from '@/store/DiaryContext';
import { usePresence } from '@/components/providers/PresenceProvider';
import { PresenceDot } from '@/components/widgets/PartnerPresence';
import { newId, useNow } from '@/hooks/useNow';
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
  stripLegacyProfileTag,
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

function ChatPageInner() {
  const { data, activeProfile, partnerProfile, isLiveUser, currentUserId, showToast } = useDiary();
  const presence = usePresence();
  const coupleId = data.couple.id;
  const supabase = isLiveUser && currentUserId ? getSupabaseBrowserClient() : null;
  const isRemote = Boolean(supabase && coupleId);

  const [remote, setRemote] = useState<ChatMessageRow[]>([]);
  // Demo mode keeps the thread on this device.
  const [local, setLocal] = useLocalState<LocalChatMessage[]>(`chat:${coupleId || 'demo'}`, []);
  const [pending, setPending] = useState<ViewMessage[]>([]);

  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  // Leaving the page mid-sentence would otherwise leave "typing…" on their
  // screen until the TTL ran out.
  const { setTyping } = presence;
  useEffect(() => () => setTyping(false), [setTyping]);

  const messages: ViewMessage[] = useMemo(() => {
    const myProfile = data.activeProfileId;
    const base: ViewMessage[] = isRemote
      ? remote.map((m) => ({
          id: m.id,
          senderId: m.senderId,
          // In a live space the account that wrote the row is the sender,
          // full stop. Deriving it from the profile switcher instead meant a
          // message you sent "as" your partner appeared on THEIR side of
          // THEIR screen — a message they never wrote, attributed to them.
          content: stripLegacyProfileTag(m.content),
          createdAt: m.createdAt,
          readAt: m.readAt,
          mine: m.senderId === currentUserId,
        }))
      : local.map((m) => ({
          id: m.id,
          senderId: m.senderId,
          // Demo mode has no accounts, so the stored senderId is already the
          // profile slot — switching profiles is the whole point there.
          content: stripLegacyProfileTag(m.content),
          createdAt: m.createdAt,
          readAt: m.readAt,
          mine: m.senderId === myProfile,
        }));

    // Drop any optimistic row the server has since echoed back to us.
    const confirmed = new Set(base.map((m) => m.id));
    const stillPending = pending.filter((p) => !confirmed.has(p.id));
    return mergeMessages(base, stillPending);
  }, [isRemote, remote, local, pending, currentUserId, data.activeProfileId]);

  // "Today"/"Yesterday" headings depend on the current time, which must not be
  // read while Next prerenders this component — useNow() returns null until mounted.
  const nowMs = useNow(60_000);
  const groups = useMemo(
    () => (nowMs === null ? [] : groupMessagesByDay(messages, new Date(nowMs))),
    [messages, nowMs]
  );
  const booting = loading || nowMs === null;

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

  // The typing bubble adds height below the last message; follow it down only
  // if they were already reading at the bottom.
  useEffect(() => {
    if (!presence.partnerTyping) return;
    const container = scrollRef.current;
    if (!container) return;
    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    if (distanceFromBottom < 200) endRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' });
  }, [presence.partnerTyping]);

  // --------------------------------------------------------------- send ---
  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const problem = validateMessage(draft);
    if (problem) {
      setError(problem);
      return;
    }
    const content = draft.trim();
    const myProfile = data.activeProfileId;
    setError('');
    setDraft('');
    setTyping(false);
    setSending(true);

    if (!isRemote) {
      setLocal((prev) => [
        ...prev,
        {
          id: newId('msg'),
          senderId: myProfile,
          content,
          createdAt: new Date().toISOString(),
          readAt: null,
        },
      ]);
      setSending(false);
      return;
    }

    // Show it immediately on the right side, then reconcile with the server row.
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
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void send(e as unknown as React.FormEvent);
    }
  };

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto space-y-4 sm:space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">Just us</p>
            <h1 className="font-display text-2xl sm:text-4xl font-semibold text-ink mt-0.5">
              Chat with {partnerProfile.name}
            </h1>
            <p className="text-xs sm:text-sm text-ink-muted mt-1 max-w-xl">
              {isRemote
                ? 'Private two-person chat with WhatsApp-style segregation: incoming on left, yours on right.'
                : 'Demo mode: this thread stays on this device. Switch viewpoints to reply from either side.'}
            </p>
          </div>

          <div className="inline-flex items-center gap-2 self-start sm:self-auto px-3 py-1.5 rounded-full bg-surface border border-line text-xs shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-ink-muted">Active side:</span>
            <span className="font-bold text-ink">{activeProfile.name}</span>
          </div>
        </header>

        <section
          aria-labelledby="thread-heading"
          className="rounded-[1.25rem] border border-line bg-surface shadow-card overflow-hidden flex flex-col"
          style={{ height: 'min(72vh, 38rem)' }}
        >
          <h2 id="thread-heading" className="sr-only">
            Message thread
          </h2>

          {/* WhatsApp / Instagram style chat top bar */}
          <div className="px-4 py-2.5 sm:py-3 border-b border-line bg-surface/90 backdrop-blur-xs flex items-center justify-between gap-3 z-10">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className="relative flex-shrink-0">
                <img
                  src={partnerProfile.avatar}
                  alt={partnerProfile.name}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover ring-2 ring-primary/20 shadow-xs"
                />
                <PresenceDot className="absolute bottom-0 right-0 w-2.5 h-2.5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="font-semibold text-sm sm:text-base text-ink truncate leading-tight">
                    {partnerProfile.name}
                  </h3>
                </div>
                <p
                  className={`text-[11px] truncate ${
                    presence.partnerTyping ? 'text-primary font-semibold' : 'text-ink-muted'
                  }`}
                >
                  {presence.partnerTyping
                    ? 'typing…'
                    : presence.available
                      ? presence.label.text
                      : 'Incoming on left • Yours on right'}
                </p>
              </div>
            </div>

          </div>

          {/* Messages scroll area */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-4 bg-canvas/30"
            role="log"
            aria-live="polite"
          >
            {booting ? (
              <div className="h-full flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
              </div>
            ) : messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center gap-2 px-6">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-1">
                  <MessagesSquare className="w-6 h-6" aria-hidden="true" />
                </div>
                <p className="font-medium text-sm text-ink">No messages yet</p>
                <p className="text-xs text-ink-muted max-w-sm">
                  Say something sweet to {partnerProfile.name}. Outgoing messages will stay on your right, and their replies will land on the left.
                </p>
              </div>
            ) : (
              groups.map((group) => (
                <div key={group.date} className="space-y-3">
                  <div className="flex justify-center my-1">
                    <span className="inline-block px-3 py-0.5 rounded-full bg-surface/90 border border-line/70 text-[11px] font-semibold text-ink-muted shadow-2xs">
                      {group.label}
                    </span>
                  </div>

                  {group.messages.map((message) => (
                    <div
                      key={message.id}
                      className={`group flex items-end gap-2 ${message.mine ? 'justify-end' : 'justify-start'}`}
                    >
                      {/* Partner's message: avatar on the left */}
                      {!message.mine && (
                        <div className="flex-shrink-0 mb-0.5" title={partnerProfile.name}>
                          <img
                            src={partnerProfile.avatar}
                            alt={partnerProfile.name}
                            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover ring-2 ring-line shadow-2xs"
                          />
                        </div>
                      )}

                      {/* My Profile: Unsend button on hover (left of bubble) */}
                      {message.mine && (
                        <button
                          type="button"
                          onClick={() => removeMessage(message.id)}
                          aria-label="Unsend this message"
                          className="p-1 rounded-full text-ink-muted hover:text-danger opacity-0 focus:opacity-100 group-hover:opacity-100 transition-opacity mb-0.5 sm:opacity-50"
                          title="Unsend"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* WhatsApp / Instagram Style Bubble */}
                      <div
                        className={`max-w-[80%] sm:max-w-[72%] rounded-2xl px-4 py-2.5 ${
                          message.mine
                            ? 'bg-primary text-on-primary rounded-br-md'
                            : 'bg-surface text-ink border border-line rounded-bl-md'
                        } ${message.pending ? 'opacity-70' : ''}`}
                      >
                        {/* Partner's name above their first bubble */}
                        {!message.mine && (
                          <p className="text-[11px] font-bold text-primary mb-0.5 leading-tight tracking-tight">
                            {partnerProfile.name}
                          </p>
                        )}

                        {/* Message Text */}
                        <p className="text-sm whitespace-pre-wrap break-words leading-relaxed select-text">
                          {message.content}
                        </p>

                        {/* Bubble Footer: Time + WhatsApp-style Delivery/Seen Ticks */}
                        <div
                          className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${
                            message.mine ? 'text-on-primary/75' : 'text-ink-muted'
                          }`}
                        >
                          <span>{formatChatTime(message.createdAt)}</span>
                          {message.mine && (
                            <span
                              className="inline-flex items-center"
                              // Lucide icons render an <svg>, which takes no
                              // `title` prop — the tooltip and the accessible
                              // name belong on the wrapper.
                              title={
                                message.pending
                                  ? 'Sending'
                                  : message.readAt
                                    ? `Seen by ${partnerProfile.name}`
                                    : 'Delivered'
                              }
                              aria-label={
                                message.pending
                                  ? 'Sending'
                                  : message.readAt
                                    ? `Seen by ${partnerProfile.name}`
                                    : 'Delivered'
                              }
                              role="img"
                            >
                              {message.pending ? (
                                <Clock className="w-3 h-3 text-on-primary/70 animate-pulse" aria-hidden="true" />
                              ) : message.readAt ? (
                                <CheckCheck className="w-3.5 h-3.5 text-sky-200" aria-hidden="true" />
                              ) : (
                                <CheckCheck className="w-3.5 h-3.5 text-on-primary/70" aria-hidden="true" />
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))
            )}
            {presence.partnerTyping && (
              <div className="flex items-end gap-2 justify-start" aria-live="polite">
                <img
                  src={partnerProfile.avatar}
                  alt=""
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover ring-2 ring-line shadow-2xs flex-shrink-0 mb-0.5"
                />
                <div className="rounded-2xl rounded-bl-md bg-surface border border-line px-4 py-3">
                  <span className="sr-only">{partnerProfile.name} is typing</span>
                  <span className="flex items-center gap-1" aria-hidden="true">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="w-1.5 h-1.5 rounded-full bg-ink-muted/70 motion-safe:animate-bounce"
                        style={{ animationDelay: `${i * 140}ms` }}
                      />
                    ))}
                  </span>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Form input bar */}
          <form onSubmit={send} className="border-t border-line p-2.5 sm:p-3.5 flex items-end gap-2 bg-surface">
            <label htmlFor="chat-draft" className="sr-only">
              Message {partnerProfile.name}
            </label>
            <textarea
              id="chat-draft"
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                // An empty box is not "typing" — clearing the draft should
                // take the indicator down on their side straight away.
                setTyping(e.target.value.trim().length > 0);
              }}
              onBlur={() => setTyping(false)}
              onKeyDown={onKeyDown}
              rows={1}
              maxLength={MAX_MESSAGE_LENGTH}
              placeholder={`Message ${partnerProfile.name} as ${activeProfile.name}…`}
              className="flex-1 resize-none max-h-32 px-4 py-2.5 rounded-2xl border border-line bg-canvas text-ink text-sm focus:outline-none focus:ring-2 focus:ring-focus placeholder:text-ink-muted/60"
            />
            <button
              type="submit"
              disabled={sending || !draft.trim()}
              aria-label="Send message"
              className="p-3 rounded-full bg-primary hover:bg-primary-hover text-on-primary shadow-cta disabled:opacity-40 flex-shrink-0 transition-transform active:scale-95"
            >
              {sending ? <Loader2 className="w-4 h-4 motion-safe:animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </form>
        </section>

        {error && (
          <p role="alert" className="text-sm text-danger font-medium">
            {error}
          </p>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-ink-muted gap-1 px-1">
          <p>
            Logged in view: <span className="font-semibold text-ink">{activeProfile.name}</span>.
          </p>
          <p className="italic">
            Tip: Press Enter to send, Shift + Enter for a new line.
          </p>
        </div>
      </div>
    </AppShell>
  );
}

/**
 * Needs two people, so a personal diary never reaches the body below and a
 * couple space with one member sees it waiting rather than empty.
 */
export default function ChatPage() {
  return (
    <SpaceGate href="/chat" title="Chat">
      <ChatPageInner />
    </SpaceGate>
  );
}
