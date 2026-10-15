-- ==============================================================================
-- OurDiary Migration 03: Passcode Protected Private Notes & Code Regeneration
-- Version: 20261014000003
-- ==============================================================================

-- 1. Add passcode column to memory_notes for secret shareable private notes
ALTER TABLE public.memory_notes
ADD COLUMN IF NOT EXISTS passcode TEXT;

-- 2. Add is_locked column to couples to lock invite code once 2 members join
ALTER TABLE public.couples
ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT false NOT NULL;

-- 3. Function to regenerate a couple's invite code securely
CREATE OR REPLACE FUNCTION public.regenerate_couple_invite_code(target_couple_id UUID)
RETURNS TEXT AS $$
DECLARE
  new_code TEXT;
BEGIN
  -- Verify caller is a member of this couple
  IF NOT EXISTS (
    SELECT 1 FROM public.couple_members
    WHERE couple_id = target_couple_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Unauthorized: You are not a member of this couple space.';
  END IF;

  -- Verify couple is not already locked with 2 members
  IF (SELECT COUNT(*) FROM public.couple_members WHERE couple_id = target_couple_id) >= 2 THEN
    RAISE EXCEPTION 'This couple space already has both partners connected. Invite code cannot be regenerated.';
  END IF;

  -- Generate new unique 6-character code
  new_code := upper(encode(gen_random_bytes(3), 'hex'));

  -- Atomic update: Replaces the old code and deletes previous code
  UPDATE public.couples
  SET invite_code = new_code
  WHERE id = target_couple_id;

  RETURN new_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
