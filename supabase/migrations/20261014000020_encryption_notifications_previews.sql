-- ==============================================================================
-- OurDiary Migration 20: encrypted media, a notification feed, and previews
-- Version: 20261014000020
--
-- Three things that turned out to belong together.
--
-- 1. ENCRYPTION KEYS. Each couple gets one random data key. Photos and videos
--    are encrypted with it in the browser before they are uploaded, so object
--    storage only ever holds scrambled bytes and a stolen bucket or database
--    dump is useless on its own.
--
--    The key is stored WRAPPED — itself encrypted with a master key that
--    lives only in the server environment, never in the database. So reading
--    this table gets an attacker nothing; they would need the running
--    server's environment too. This is envelope encryption, and the reason
--    for it is blast radius: one compromised backup is not one compromised
--    key.
--
--    Members may SELECT their own wrapped key. That is deliberate and safe —
--    without the master key the row is noise — and it means the unwrap route
--    can run on the caller's own session instead of needing a service-role
--    key in the app.
--
-- 2. NOTIFICATIONS. The app could already push to a device, but it kept no
--    record, so there was nowhere to see what you missed while you were
--    asleep — which for a long-distance couple is most of the day.
--
-- 3. MESSAGE PREVIEWS. A notification cannot say "Avi: miss you" if the
--    server cannot read the message. Rather than weaken the encryption, the
--    SENDER'S device writes a short plaintext preview at send time, and only
--    when that couple has asked for it. The preview is a separate column, so
--    the decision is recorded per message rather than looked up per send:
--    flipping the setting never rewrites old messages, and a message always
--    keeps the promise it was sent under. A missing preview falls back to a
--    generic notification, so every failure mode leaks less, never more.
-- ==============================================================================


-- 1. Per-couple data keys ------------------------------------------------
CREATE TABLE IF NOT EXISTS public.couple_keys (
  couple_id UUID PRIMARY KEY REFERENCES public.couples(id) ON DELETE CASCADE,
  -- The couple's data key, encrypted with the server master key. Base64.
  wrapped_key TEXT NOT NULL,
  -- The nonce used to wrap it. Base64. Unique per wrap.
  wrap_iv TEXT NOT NULL,
  -- Lets the master key be rotated later without guessing which rows are old.
  key_version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.couple_keys ENABLE ROW LEVEL SECURITY;

-- Readable by the couple: the row is meaningless without the master key, and
-- letting members read it keeps the unwrap route on the caller's own session.
CREATE POLICY "Couple keys select policy"
  ON public.couple_keys
  FOR SELECT
  TO authenticated
  USING (public.is_couple_member(couple_id));

-- Created once, by a member, and never updated or deleted from the client:
-- re-wrapping a key is a server-side migration concern, and a client that
-- could overwrite it could lock the couple out of their own photos.
CREATE POLICY "Couple keys insert policy"
  ON public.couple_keys
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_couple_member(couple_id));


-- 2. Notification feed ----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  -- Who should see it. Always one person, never both: "your partner added a
  -- memory" is not a thing you send to the person who added it.
  recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  -- Who caused it. Null for anything the app itself raised, like an
  -- anniversary arriving.
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  -- 'memory', 'note', 'photo', 'event', 'mood', 'ping', 'hug', 'message',
  -- 'anniversary', 'gift', 'habit', 'letter'. Kept as free text on purpose:
  -- a CHECK constraint here would mean a migration every time a feature
  -- learns to notify, and an unknown kind degrades to a default icon rather
  -- than failing an insert.
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  -- The detail line. For a chat message this is the sender's own preview, so
  -- it is only ever as revealing as that couple asked for.
  body TEXT,
  -- Where tapping it should go.
  href TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- The feed is always "mine, newest first", and the bell needs a fast count
-- of the unread ones.
CREATE INDEX IF NOT EXISTS idx_notifications_recipient
  ON public.notifications(recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread
  ON public.notifications(recipient_id) WHERE read_at IS NULL;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- You see only your own, even though both of you are in the couple.
CREATE POLICY "Notifications select policy"
  ON public.notifications
  FOR SELECT
  TO authenticated
  USING (recipient_id = auth.uid());

-- A member may raise a notification inside their own space, addressed to the
-- other person, and may not forge the actor.
CREATE POLICY "Notifications insert policy"
  ON public.notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_couple_member(couple_id)
    AND (actor_id IS NULL OR actor_id = auth.uid())
  );

-- Marking read is the only update, and only on your own.
CREATE POLICY "Notifications update policy"
  ON public.notifications
  FOR UPDATE
  TO authenticated
  USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());

CREATE POLICY "Notifications delete policy"
  ON public.notifications
  FOR DELETE
  TO authenticated
  USING (recipient_id = auth.uid());

-- Deliver to the open tab the same way chat messages travel.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'notifications'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
    END IF;
  END IF;
END
$$;


-- 3. Message previews -----------------------------------------------------
-- Written by the sender's device, only when the couple has previews on.
-- NULL means "no preview was permitted", which the notification sender reads
-- as "send the generic line".
ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS preview TEXT;

COMMENT ON COLUMN public.chat_messages.preview IS
  'Short plaintext snippet written by the sender when the couple has notification previews enabled. NULL means no preview; the notification falls back to a generic line. Never derived server-side — content may be encrypted.';

-- Whether this couple wants previews. Off by default: the private option has
-- to be the one you get without choosing.
ALTER TABLE public.couples
  ADD COLUMN IF NOT EXISTS notification_previews BOOLEAN NOT NULL DEFAULT false;
