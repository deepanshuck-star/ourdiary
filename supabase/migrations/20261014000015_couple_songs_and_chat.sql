-- ==============================================================================
-- OurDiary Migration 15: Couple songs (uploaded MP3s) + in-app chat
-- Version: 20261014000015
--
-- 1. couple_songs — the soundtrack feature was scaffolding until now: a
--    hardcoded song title in DiaryContext with a play button that toggled a
--    boolean and played nothing. This backs it with real uploaded audio,
--    stored on Cloudinary via the same signed flow memory photos and voice
--    notes already use, with the metadata here.
--
--    `couples.current_song_id` is the one song pinned as "our song" (shown
--    in the dashboard cassette player). ON DELETE SET NULL so deleting the
--    pinned song just unpins it rather than cascading into the couple row.
--
-- 2. chat_messages — a private thread between exactly the two partners.
--    Scoped to the couple, so RLS is the same is_couple_member() check every
--    other shared table uses. Added to the realtime publication so each
--    partner's device sees new messages without polling.
-- ==============================================================================

-- ------------------------------------------------------------- Couple songs ---
CREATE TABLE IF NOT EXISTS public.couple_songs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  artist TEXT,
  url TEXT NOT NULL,
  cloudinary_public_id TEXT,
  duration_sec NUMERIC,
  mime_type TEXT NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_couple_songs_couple ON public.couple_songs(couple_id, created_at DESC);

ALTER TABLE public.couple_songs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Couple songs select policy"
  ON public.couple_songs
  FOR SELECT
  TO authenticated
  USING (public.is_couple_member(couple_id));

-- Either partner may add a song, but only ever under their own name.
CREATE POLICY "Couple songs insert policy"
  ON public.couple_songs
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_couple_member(couple_id) AND uploaded_by = auth.uid());

-- Renaming a song (title/artist) is open to both partners — it's shared
-- content, and getting the artist name wrong shouldn't need the uploader.
CREATE POLICY "Couple songs update policy"
  ON public.couple_songs
  FOR UPDATE
  TO authenticated
  USING (public.is_couple_member(couple_id))
  WITH CHECK (public.is_couple_member(couple_id));

-- Deleting is the uploader's call only: it destroys the Cloudinary asset too.
CREATE POLICY "Couple songs delete policy"
  ON public.couple_songs
  FOR DELETE
  TO authenticated
  USING (uploaded_by = auth.uid());

-- The one song pinned as "our song".
ALTER TABLE public.couples
  ADD COLUMN IF NOT EXISTS current_song_id UUID REFERENCES public.couple_songs(id) ON DELETE SET NULL;


-- -------------------------------------------------------------------- Chat ---
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 4000),
  -- Set by the OTHER partner when they open the thread (see the update
  -- policy below), so each side can show "seen" without trusting the client.
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_couple_created
  ON public.chat_messages(couple_id, created_at DESC);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Chat messages select policy"
  ON public.chat_messages
  FOR SELECT
  TO authenticated
  USING (public.is_couple_member(couple_id));

CREATE POLICY "Chat messages insert policy"
  ON public.chat_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_couple_member(couple_id) AND sender_id = auth.uid());

-- Only the recipient marks a message read. Without the sender_id check, a
-- client could stamp read_at on its own messages and fake a "seen" receipt.
CREATE POLICY "Chat messages mark-read policy"
  ON public.chat_messages
  FOR UPDATE
  TO authenticated
  USING (public.is_couple_member(couple_id) AND sender_id <> auth.uid())
  WITH CHECK (public.is_couple_member(couple_id) AND sender_id <> auth.uid());

-- You can unsend your own message; you can't delete what your partner wrote.
CREATE POLICY "Chat messages delete policy"
  ON public.chat_messages
  FOR DELETE
  TO authenticated
  USING (sender_id = auth.uid());

-- Push new messages to the other partner's open tab. Wrapped because the
-- publication already contains the table on a re-run, which would error.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'chat_messages'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
    END IF;
  END IF;
END
$$;
