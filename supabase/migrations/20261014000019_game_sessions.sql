-- ==============================================================================
-- OurDiary Migration 19: turn-safe game sessions
-- Version: 20261014000019
--
-- Turn-based games were kept in `feature_state`, a single JSON blob per key.
-- Migration 14 flags the limitation in its own header: the later write wins.
-- For a score or a streak that's an acceptable simplification. For a board
-- both partners are playing at once it is not — two devices writing the blob
-- clobber each other, and a move can vanish or a whole board can jump back.
--
-- This table fixes it with the two things a blob can't express:
--
--   * a version. Every move names the version it was made against, and the
--     update only lands if that is still current. A move computed from a
--     stale board is refused rather than silently overwriting the newer one.
--
--   * whose turn it is. turn_user_id is checked server-side, so a client
--     can't move out of turn by posting whatever state it likes.
--
-- There are no INSERT/UPDATE/DELETE policies on purpose: every write goes
-- through the SECURITY DEFINER functions below, which is what makes those
-- two checks unskippable. A direct table write from the client is refused.
--
-- Scores, streaks and prompt progress stay in feature_state — a blob is the
-- right shape for those and they have no turn order to get wrong.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.game_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  -- Stable identifier for the game, e.g. 'connect4'. One live session each.
  game_key TEXT NOT NULL,
  state JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- NULL means either partner may move (solo or simultaneous games).
  turn_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'finished')),
  version INTEGER NOT NULL DEFAULT 1,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS game_sessions_couple_game_uidx
  ON public.game_sessions (couple_id, game_key);

ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Game sessions select policy"
  ON public.game_sessions
  FOR SELECT
  TO authenticated
  USING (public.is_couple_member(couple_id));


/**
 * Starts a game, or restarts one that's already there.
 *
 * Deliberately destructive: "new game" means the old board goes. The version
 * is bumped rather than reset so a device still holding the finished board
 * fails its next move instead of writing into the new one.
 */
CREATE OR REPLACE FUNCTION public.start_game_session(
  p_game_key TEXT,
  p_state JSONB,
  p_turn_user_id UUID DEFAULT NULL
)
RETURNS public.game_sessions AS $$
DECLARE
  uid UUID := auth.uid();
  my_couple UUID;
  result public.game_sessions;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT cm.couple_id INTO my_couple
  FROM public.couple_members cm
  WHERE cm.user_id = uid
  ORDER BY cm.created_at ASC
  LIMIT 1;

  IF my_couple IS NULL THEN
    RAISE EXCEPTION 'You are not in a couple space';
  END IF;

  INSERT INTO public.game_sessions (couple_id, game_key, state, turn_user_id, status, updated_by)
  VALUES (my_couple, p_game_key, COALESCE(p_state, '{}'::jsonb), p_turn_user_id, 'active', uid)
  ON CONFLICT (couple_id, game_key) DO UPDATE
    SET state = COALESCE(p_state, '{}'::jsonb),
        turn_user_id = p_turn_user_id,
        status = 'active',
        version = public.game_sessions.version + 1,
        updated_by = uid,
        updated_at = now()
  RETURNING * INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


/**
 * Applies one move.
 *
 * Refuses the move — rather than overwriting — when the caller computed it
 * from a board that has since changed, or when it isn't their turn. The
 * caller is expected to re-read and decide what to do, which is the whole
 * point: a lost move is better than a silently corrupted board.
 */
CREATE OR REPLACE FUNCTION public.apply_game_move(
  p_game_key TEXT,
  p_state JSONB,
  p_expected_version INTEGER,
  p_next_turn_user_id UUID DEFAULT NULL,
  p_status TEXT DEFAULT 'active'
)
RETURNS public.game_sessions AS $$
DECLARE
  uid UUID := auth.uid();
  my_couple UUID;
  current public.game_sessions;
  result public.game_sessions;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_status NOT IN ('active', 'finished') THEN
    RAISE EXCEPTION 'Unknown game status';
  END IF;

  SELECT cm.couple_id INTO my_couple
  FROM public.couple_members cm
  WHERE cm.user_id = uid
  ORDER BY cm.created_at ASC
  LIMIT 1;

  IF my_couple IS NULL THEN
    RAISE EXCEPTION 'You are not in a couple space';
  END IF;

  SELECT * INTO current
  FROM public.game_sessions
  WHERE couple_id = my_couple AND game_key = p_game_key;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'That game has not been started yet';
  END IF;

  -- A turn holder of NULL means either partner may move.
  IF current.turn_user_id IS NOT NULL AND current.turn_user_id <> uid THEN
    RAISE EXCEPTION 'It is not your turn';
  END IF;

  IF current.version <> p_expected_version THEN
    RAISE EXCEPTION 'This game moved on while you were deciding — reloading the board';
  END IF;

  UPDATE public.game_sessions
  SET state = COALESCE(p_state, '{}'::jsonb),
      turn_user_id = p_next_turn_user_id,
      status = p_status,
      version = version + 1,
      updated_by = uid,
      updated_at = now()
  WHERE id = current.id
  RETURNING * INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


/** Clears a finished game so the tile shows no stale board. */
CREATE OR REPLACE FUNCTION public.end_game_session(p_game_key TEXT)
RETURNS VOID AS $$
DECLARE
  uid UUID := auth.uid();
  my_couple UUID;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT cm.couple_id INTO my_couple
  FROM public.couple_members cm
  WHERE cm.user_id = uid
  ORDER BY cm.created_at ASC
  LIMIT 1;

  IF my_couple IS NULL THEN
    RAISE EXCEPTION 'You are not in a couple space';
  END IF;

  DELETE FROM public.game_sessions WHERE couple_id = my_couple AND game_key = p_game_key;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


REVOKE ALL ON FUNCTION public.start_game_session(TEXT, JSONB, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.apply_game_move(TEXT, JSONB, INTEGER, UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.end_game_session(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.start_game_session(TEXT, JSONB, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_game_move(TEXT, JSONB, INTEGER, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.end_game_session(TEXT) TO authenticated;


-- Push each move to the other device, the same way chat messages travel.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'game_sessions'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.game_sessions;
    END IF;
  END IF;
END
$$;
