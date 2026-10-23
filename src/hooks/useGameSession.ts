'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useDiary } from '@/store/DiaryContext';
import { useCoupleMembers } from '@/hooks/useCoupleMembers';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useLocalState } from '@/lib/local-store';
import {
  GameConflictError,
  NotYourTurnError,
  applyGameMoveRemote,
  endGameSessionRemote,
  fetchGameSessionRemote,
  startGameSessionRemote,
  subscribeToGameSession,
  type GameSessionRow,
} from '@/lib/supabase/gameSessions';

export interface GameSession<S> {
  /** Null until a game has been started. */
  state: S | null;
  status: 'active' | 'finished';
  /** Whose move it is. Null means either partner may move. */
  turnUserId: string | null;
  isMyTurn: boolean;
  loading: boolean;
  /** Set when the last move was refused; cleared on the next successful one. */
  notice: string;
  /** This device's player id — a real user id live, a profile slot in demo. */
  myId: string | null;
  partnerId: string | null;
  isRemote: boolean;
  start: (initial: S, turnUserId?: string | null) => Promise<void>;
  move: (next: S, nextTurnUserId?: string | null, status?: 'active' | 'finished') => Promise<boolean>;
  end: () => Promise<void>;
}

/**
 * One shared, turn-safe game board.
 *
 * Live space: rows in `game_sessions`, with the server checking the version
 * and the turn on every move, and Realtime pushing the other device's moves
 * in. A move made against a board that has since changed is refused and the
 * fresh board is loaded — the old `feature_state` blob silently overwrote it
 * instead, which is how moves went missing mid-game.
 *
 * Demo mode: one device, so there is nobody to race with; the board lives in
 * localStorage and every move succeeds.
 */
export function useGameSession<S extends Record<string, unknown>>(gameKey: string): GameSession<S> {
  const { data, isLiveUser, currentUserId } = useDiary();
  const { myId, partnerId } = useCoupleMembers();
  const coupleId = data.couple.id;
  const supabase = isLiveUser && currentUserId ? getSupabaseBrowserClient() : null;
  const isRemote = Boolean(supabase && coupleId && currentUserId);

  const [row, setRow] = useState<GameSessionRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');

  // Demo mode board. Not in the synced-prefix allowlist: it is device-local
  // by definition, and syncing a blob is the problem this hook exists to fix.
  const [localBoard, setLocalBoard] = useLocalState<{
    state: S | null;
    status: 'active' | 'finished';
    turnUserId: string | null;
  }>(`games:board:${gameKey}:${coupleId || 'demo'}`, { state: null, status: 'active', turnUserId: null });

  // Kept in a ref so `move` always sends the version it is actually acting
  // on, even when a realtime update lands between render and click.
  const versionRef = useRef(0);
  useEffect(() => {
    versionRef.current = row?.version ?? 0;
  }, [row?.version]);

  const reload = useCallback(async () => {
    if (!isRemote || !supabase) {
      setLoading(false);
      return;
    }
    try {
      setRow(await fetchGameSessionRemote(supabase, coupleId, gameKey));
    } catch (err) {
      console.error(`[OurDiary] Failed to load game "${gameKey}":`, err);
    } finally {
      setLoading(false);
    }
  }, [isRemote, supabase, coupleId, gameKey]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (!isRemote || !supabase) return;
    const channel = subscribeToGameSession(supabase, coupleId, gameKey, {
      onChange: (session) => {
        setRow(session);
        setNotice('');
      },
      onDelete: () => setRow(null),
    });
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [isRemote, supabase, coupleId, gameKey]);

  const start = useCallback(
    async (initial: S, turnUserId: string | null = null) => {
      setNotice('');
      if (!isRemote || !supabase) {
        setLocalBoard({ state: initial, status: 'active', turnUserId });
        return;
      }
      try {
        setRow(await startGameSessionRemote(supabase, coupleId, gameKey, initial, turnUserId));
      } catch (err: any) {
        setNotice(err?.message || 'Could not start that game.');
      }
    },
    [isRemote, supabase, coupleId, gameKey, setLocalBoard]
  );

  const move = useCallback(
    async (
      next: S,
      nextTurnUserId: string | null = null,
      status: 'active' | 'finished' = 'active'
    ): Promise<boolean> => {
      if (!isRemote || !supabase) {
        setLocalBoard({ state: next, status, turnUserId: nextTurnUserId });
        return true;
      }
      try {
        const saved = await applyGameMoveRemote(
          supabase,
          coupleId,
          gameKey,
          next,
          versionRef.current,
          nextTurnUserId,
          status
        );
        setRow(saved);
        setNotice('');
        return true;
      } catch (err: any) {
        if (err instanceof GameConflictError) {
          // Their move landed first. Show theirs rather than stamping ours
          // over it — the board on screen was already out of date.
          setNotice('Your partner moved first — here’s the current board.');
          await reload();
          return false;
        }
        if (err instanceof NotYourTurnError) {
          setNotice('Hold on — it’s not your turn yet.');
          await reload();
          return false;
        }
        setNotice(err?.message || 'That move didn’t save.');
        return false;
      }
    },
    [isRemote, supabase, coupleId, gameKey, reload, setLocalBoard]
  );

  const end = useCallback(async () => {
    setNotice('');
    if (!isRemote || !supabase) {
      setLocalBoard({ state: null, status: 'active', turnUserId: null });
      return;
    }
    try {
      await endGameSessionRemote(supabase, coupleId, gameKey);
      setRow(null);
    } catch (err: any) {
      setNotice(err?.message || 'Could not clear that game.');
    }
  }, [isRemote, supabase, coupleId, gameKey, setLocalBoard]);

  const state = (isRemote ? ((row?.state as S) ?? null) : localBoard.state) as S | null;
  const status = isRemote ? (row?.status ?? 'active') : localBoard.status;
  const turnUserId = isRemote ? (row?.turnUserId ?? null) : localBoard.turnUserId;

  return {
    state,
    status,
    turnUserId,
    // A null turn holder means anyone may move — solo and simultaneous games.
    isMyTurn: turnUserId === null || turnUserId === myId,
    loading: isRemote ? loading : false,
    notice,
    myId,
    partnerId,
    isRemote,
    start,
    move,
    end,
  };
}
