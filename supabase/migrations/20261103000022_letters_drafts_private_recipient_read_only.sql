-- ==============================================================================
-- OurDiary Migration 22: a draft is the author's alone, and a received letter
-- cannot be rewritten by the person it was sent to
-- Version: 20261103000022
--
-- Two holes in the letters rules from migration 2.
--
-- 1. DRAFTS REACHED THE PARTNER'S DEVICE. The select rule let a recipient
--    read any letter whose unlock date had passed, without asking whether it
--    had been sent. A draft carries an unlock date too, and the app fetches
--    every letter for the couple, so an unfinished draft dated today or
--    earlier was downloaded to the partner's device. The screen hid it, but
--    it sat in their browser's storage and network tab. Now a recipient sees
--    only letters that were actually sent.
--
-- 2. A RECIPIENT COULD EDIT THE LETTER THEY RECEIVED. The update rule lets
--    the recipient touch an unlocked letter, so that opening it can record
--    when it was read. But row rules cannot limit WHICH columns change, so
--    the same rule allowed rewriting its title and words. A trigger now
--    allows the recipient to mark it read and nothing else.
--
-- Safe for a running deployment: the app only ever sends drafts to their
-- author and only ever writes read_at as the recipient, so nothing it does
-- today is refused. Runs from the SQL editor or a service role (no signed-in
-- user) are left alone by the trigger.
-- ==============================================================================

DROP POLICY IF EXISTS "Letters select policy" ON public.letters;

CREATE POLICY "Letters select policy"
  ON public.letters
  FOR SELECT
  TO authenticated
  USING (
    public.is_couple_member(couple_id) AND (
      author_id = auth.uid() OR
      (
        status <> 'draft' AND (
          status = 'opened' OR
          (unlock_at IS NOT NULL AND unlock_at <= now())
        )
      )
    )
  );

CREATE OR REPLACE FUNCTION public.letters_recipient_may_only_open()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Only a signed-in user who is not the author is limited.
  IF auth.uid() IS NOT NULL AND auth.uid() IS DISTINCT FROM OLD.author_id THEN
    IF NEW.title          IS DISTINCT FROM OLD.title
    OR NEW.content        IS DISTINCT FROM OLD.content
    OR NEW.unlock_at      IS DISTINCT FROM OLD.unlock_at
    OR NEW.author_id      IS DISTINCT FROM OLD.author_id
    OR NEW.recipient_id   IS DISTINCT FROM OLD.recipient_id
    OR NEW.couple_id      IS DISTINCT FROM OLD.couple_id
    OR NEW.envelope_color IS DISTINCT FROM OLD.envelope_color
    OR NEW.created_at     IS DISTINCT FROM OLD.created_at
    OR (NEW.status IS DISTINCT FROM OLD.status AND NEW.status <> 'opened')
    THEN
      RAISE EXCEPTION 'Only the author can change a letter; its recipient can only open it.'
        USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS letters_recipient_may_only_open ON public.letters;
CREATE TRIGGER letters_recipient_may_only_open
  BEFORE UPDATE ON public.letters
  FOR EACH ROW
  EXECUTE FUNCTION public.letters_recipient_may_only_open();
