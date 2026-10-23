import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';

// ============================================================================
// Turn-safe game state. Backed by migrations 19 and 20.
//
// Every call names its space. The RPCs used to infer it from the caller's
// oldest membership, which was correct only while an account could hold one
// diary — with a personal diary alongside a couple one it would have put
// moves in whichever was created first.
//
// Every write goes through an RPC that checks the version and the turn, so a
// move computed from a stale board is refused instead of overwriting the
// newer one. Reads come straight off the table (SELECT is the only policy).
// ============================================================================

export interface GameSessionRow {
  id: string;
  coupleId: string;
  gameKey: string;
  state: Record<string, unknown>;
  turnUserId: string | null;
  status: 'active' | 'finished';
  version: number;
  updatedBy: string | null;
  updatedAt: string;
}

function rowToSession(r: any): GameSessionRow {
  return {
    id: r.id,
    coupleId: r.couple_id,
    gameKey: r.game_key,
    state: (r.state ?? {}) as Record<string, unknown>,
    turnUserId: r.turn_user_id,
    status: r.status,
    version: Number(r.version),
    updatedBy: r.updated_by,
    updatedAt: r.updated_at,
  };
}

/** Thrown when the board moved on before our move landed. */
export class GameConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GameConflictError';
  }
}

/** Thrown when it isn't this player's turn. */
export class NotYourTurnError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotYourTurnError';
  }
}

function translate(message: string): Error {
  if (/moved on while you were deciding/i.test(message)) return new GameConflictError(message);
  if (/not your turn/i.test(message)) return new NotYourTurnError(message);
  return new Error(message);
}

export async function fetchGameSessionRemote(
  supabase: SupabaseClient,
  coupleId: string,
  gameKey: string
): Promise<GameSessionRow | null> {
  const { data, error } = await supabase
    .from('game_sessions')
    .select('*')
    .eq('couple_id', coupleId)
    .eq('game_key', gameKey)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? rowToSession(data) : null;
}

export async function startGameSessionRemote(
  supabase: SupabaseClient,
  coupleId: string,
  gameKey: string,
  state: Record<string, unknown>,
  turnUserId: string | null = null
): Promise<GameSessionRow> {
  const { data, error } = await supabase.rpc('start_game_session', {
    p_couple_id: coupleId,
    p_game_key: gameKey,
    p_state: state,
    p_turn_user_id: turnUserId,
  });
  if (error) throw translate(error.message);
  return rowToSession(data);
}

/**
 * Applies a move against a known version. The caller must pass the version it
 * read the board at; if the board has moved since, this throws
 * GameConflictError rather than overwriting.
 */
export async function applyGameMoveRemote(
  supabase: SupabaseClient,
  coupleId: string,
  gameKey: string,
  state: Record<string, unknown>,
  expectedVersion: number,
  nextTurnUserId: string | null = null,
  status: 'active' | 'finished' = 'active'
): Promise<GameSessionRow> {
  const { data, error } = await supabase.rpc('apply_game_move', {
    p_couple_id: coupleId,
    p_game_key: gameKey,
    p_state: state,
    p_expected_version: expectedVersion,
    p_next_turn_user_id: nextTurnUserId,
    p_status: status,
  });
  if (error) throw translate(error.message);
  return rowToSession(data);
}

export async function endGameSessionRemote(
  supabase: SupabaseClient,
  coupleId: string,
  gameKey: string
): Promise<void> {
  const { error } = await supabase.rpc('end_game_session', {
    p_couple_id: coupleId,
    p_game_key: gameKey,
  });
  if (error) throw translate(error.message);
}

/**
 * Live updates for one game. Returns the channel so the caller can remove it
 * on unmount — an abandoned subscription keeps delivering, and each remount
 * would add another.
 */
export function subscribeToGameSession(
  supabase: SupabaseClient,
  coupleId: string,
  gameKey: string,
  handlers: { onChange?: (session: GameSessionRow) => void; onDelete?: () => void }
): RealtimeChannel {
  return supabase
    .channel(`game-${coupleId}-${gameKey}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'game_sessions', filter: `couple_id=eq.${coupleId}` },
      (payload: any) => {
        if (payload.eventType === 'DELETE') {
          handlers.onDelete?.();
          return;
        }
        const row = rowToSession(payload.new);
        // One channel per couple carries every game's rows; ignore the others.
        if (row.gameKey === gameKey) handlers.onChange?.(row);
      }
    )
    .subscribe();
}
