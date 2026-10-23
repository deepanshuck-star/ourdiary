'use client';

import { useCallback, useMemo } from 'react';
import { useDiary } from '@/store/DiaryContext';
import { useCoupleMembers } from '@/hooks/useCoupleMembers';
import { useLocalState } from '@/lib/local-store';
import { newId, useNow } from '@/hooks/useNow';
import {
  mailboxFor,
  markOpened,
  pruneNotes,
  type MailboxView,
  type MorningNote,
} from '@/lib/features/morningMail';

export interface MorningMailApi {
  mailbox: MailboxView;
  now: number | null;
  myId: string | null;
  partnerId: string | null;
  /** Writes a note due at `deliverAtMs`; returns it so the caller can confirm. */
  send: (content: string, deliverAtMs: number) => MorningNote | null;
  cancel: (id: string) => void;
  openAll: () => void;
}

const EMPTY_BOX: MailboxView = { arrived: [], unopened: [], queued: [], delivered: [] };

/**
 * The shared "deliver when they wake" pile.
 *
 * One JSON blob per couple, like the budget and the surprise notes. A note
 * addressed to someone is simply not rendered on their device until it is
 * due — see the header of src/lib/features/morningMail.ts for what that does
 * and does not guarantee.
 */
export function useMorningMail(): MorningMailApi {
  const { data } = useDiary();
  const { myId, partnerId } = useCoupleMembers();
  const coupleId = data.couple.id;
  const now = useNow(30_000);

  const [notes, setNotes] = useLocalState<MorningNote[]>(`morningMail:${coupleId || 'demo'}`, []);

  const mailbox = useMemo(
    // Before mount there is no clock, and treating that as "the epoch" keeps
    // every sealed note sealed, which is the safe way round.
    () => (now === null || !myId ? EMPTY_BOX : mailboxFor(notes, myId, now)),
    [notes, myId, now]
  );

  const send = useCallback(
    (content: string, deliverAtMs: number): MorningNote | null => {
      if (!myId || !partnerId) return null;
      const note: MorningNote = {
        id: newId('mail'),
        fromId: myId,
        toId: partnerId,
        content: content.trim(),
        createdAt: new Date().toISOString(),
        deliverAt: new Date(deliverAtMs).toISOString(),
      };
      setNotes((prev) => pruneNotes([...prev, note], Date.now()));
      return note;
    },
    [myId, partnerId, setNotes]
  );

  const cancel = useCallback(
    (id: string) => {
      // Only ever your own, and only while it is still sealed — the UI only
      // offers it on the queue, and this is the matching guard.
      setNotes((prev) =>
        prev.filter((n) => !(n.id === id && n.fromId === myId && Date.parse(n.deliverAt) > Date.now()))
      );
    },
    [myId, setNotes]
  );

  const openAll = useCallback(() => {
    const ids = mailbox.unopened.map((n) => n.id);
    if (ids.length === 0) return;
    setNotes((prev) => markOpened(prev, ids, new Date().toISOString()));
  }, [mailbox.unopened, setNotes]);

  return { mailbox, now, myId, partnerId, send, cancel, openAll };
}
