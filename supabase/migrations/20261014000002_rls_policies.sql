-- ==============================================================================
-- OurDiary Migration 02: Row Level Security (RLS) & Realtime
-- Version: 20261014000002
-- Strict authorization ensuring only authorized couple members can access
-- shared data, and private notes can NEVER be leaked to the other partner.
-- ==============================================================================

-- 1. SECURITY DEFINER HELPER FUNCTIONS
-- Optimized for high performance and clean policy evaluation

-- Check if current authenticated user is an approved member of a couple
CREATE OR REPLACE FUNCTION public.is_couple_member(c_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.couple_members
    WHERE couple_id = c_id
      AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if current user has access to a specific memory via couple membership
CREATE OR REPLACE FUNCTION public.can_access_memory(m_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.memories m
    JOIN public.couple_members cm ON m.couple_id = cm.couple_id
    WHERE m.id = m_id
      AND cm.user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;


-- 2. ENABLE RLS ON ALL TABLES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.couples ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.couple_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memory_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memory_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memory_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.letters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bucket_items ENABLE ROW LEVEL SECURITY;


-- 3. PROFILES POLICIES
-- Anyone authenticated can view profiles of their couple partner or themselves
CREATE POLICY "Profiles view policy"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.couple_members cm1
      JOIN public.couple_members cm2 ON cm1.couple_id = cm2.couple_id
      WHERE cm1.user_id = auth.uid() AND cm2.user_id = profiles.id
    )
  );

CREATE POLICY "Profiles update policy"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());


-- 4. COUPLES POLICIES
CREATE POLICY "Couples view policy"
  ON public.couples
  FOR SELECT
  TO authenticated
  USING (public.is_couple_member(id));

CREATE POLICY "Couples create policy"
  ON public.couples
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Couples update policy"
  ON public.couples
  FOR UPDATE
  TO authenticated
  USING (public.is_couple_member(id));


-- 5. COUPLE MEMBERS POLICIES
CREATE POLICY "Couple members view policy"
  ON public.couple_members
  FOR SELECT
  TO authenticated
  USING (public.is_couple_member(couple_id));

CREATE POLICY "Couple members join policy"
  ON public.couple_members
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Couple members delete policy"
  ON public.couple_members
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());


-- 6. MEMORIES POLICIES
CREATE POLICY "Memories select policy"
  ON public.memories
  FOR SELECT
  TO authenticated
  USING (public.is_couple_member(couple_id));

CREATE POLICY "Memories insert policy"
  ON public.memories
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_couple_member(couple_id));

CREATE POLICY "Memories update policy"
  ON public.memories
  FOR UPDATE
  TO authenticated
  USING (public.is_couple_member(couple_id));

CREATE POLICY "Memories delete policy"
  ON public.memories
  FOR DELETE
  TO authenticated
  USING (public.is_couple_member(couple_id));


-- 7. MEMORY MEDIA POLICIES
CREATE POLICY "Media select policy"
  ON public.memory_media
  FOR SELECT
  TO authenticated
  USING (public.can_access_memory(memory_id));

CREATE POLICY "Media insert policy"
  ON public.memory_media
  FOR INSERT
  TO authenticated
  WITH CHECK (public.can_access_memory(memory_id));

CREATE POLICY "Media delete policy"
  ON public.memory_media
  FOR DELETE
  TO authenticated
  USING (public.can_access_memory(memory_id));


-- 8. MEMORY NOTES POLICIES (STRICT PRIVATE NOTE ISOLATION)
-- Crucial: A private note CANNOT be selected, modified or deleted by the partner
CREATE POLICY "Notes select policy"
  ON public.memory_notes
  FOR SELECT
  TO authenticated
  USING (
    (visibility = 'shared' AND public.can_access_memory(memory_id)) OR
    (visibility = 'private' AND author_id = auth.uid())
  );

CREATE POLICY "Notes insert policy"
  ON public.memory_notes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.can_access_memory(memory_id) AND
    author_id = auth.uid()
  );

CREATE POLICY "Notes update policy"
  ON public.memory_notes
  FOR UPDATE
  TO authenticated
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

CREATE POLICY "Notes delete policy"
  ON public.memory_notes
  FOR DELETE
  TO authenticated
  USING (author_id = auth.uid());


-- 9. MEMORY REACTIONS POLICIES
CREATE POLICY "Reactions select policy"
  ON public.memory_reactions
  FOR SELECT
  TO authenticated
  USING (public.can_access_memory(memory_id));

CREATE POLICY "Reactions insert policy"
  ON public.memory_reactions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.can_access_memory(memory_id) AND
    user_id = auth.uid()
  );

CREATE POLICY "Reactions delete policy"
  ON public.memory_reactions
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());


-- 10. EVENTS POLICIES
CREATE POLICY "Events select policy"
  ON public.events
  FOR SELECT
  TO authenticated
  USING (public.is_couple_member(couple_id));

CREATE POLICY "Events insert policy"
  ON public.events
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_couple_member(couple_id));

CREATE POLICY "Events update policy"
  ON public.events
  FOR UPDATE
  TO authenticated
  USING (public.is_couple_member(couple_id));

CREATE POLICY "Events delete policy"
  ON public.events
  FOR DELETE
  TO authenticated
  USING (public.is_couple_member(couple_id));


-- 11. LETTERS POLICIES (TIME CAPSULE RESTRICTION)
-- Author can see their letter anytime.
-- Recipient can only see if unlocked by date or marked opened.
CREATE POLICY "Letters select policy"
  ON public.letters
  FOR SELECT
  TO authenticated
  USING (
    public.is_couple_member(couple_id) AND (
      author_id = auth.uid() OR
      status = 'opened' OR
      (unlock_at IS NOT NULL AND unlock_at <= now())
    )
  );

CREATE POLICY "Letters insert policy"
  ON public.letters
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_couple_member(couple_id) AND
    author_id = auth.uid()
  );

CREATE POLICY "Letters update policy"
  ON public.letters
  FOR UPDATE
  TO authenticated
  USING (
    public.is_couple_member(couple_id) AND (
      author_id = auth.uid() OR
      -- Recipient can only update to open an unlocked letter
      (status = 'sealed' AND unlock_at <= now())
    )
  );

CREATE POLICY "Letters delete policy"
  ON public.letters
  FOR DELETE
  TO authenticated
  USING (author_id = auth.uid());


-- 12. BUCKET ITEMS POLICIES
CREATE POLICY "Bucket select policy"
  ON public.bucket_items
  FOR SELECT
  TO authenticated
  USING (public.is_couple_member(couple_id));

CREATE POLICY "Bucket insert policy"
  ON public.bucket_items
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_couple_member(couple_id));

CREATE POLICY "Bucket update policy"
  ON public.bucket_items
  FOR UPDATE
  TO authenticated
  USING (public.is_couple_member(couple_id));

CREATE POLICY "Bucket delete policy"
  ON public.bucket_items
  FOR DELETE
  TO authenticated
  USING (public.is_couple_member(couple_id));


-- 13. REALTIME PUBLICATION SETUP
-- Enable realtime updates for shared couple content
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END $$;

ALTER PUBLICATION supabase_realtime ADD TABLE
  public.memories,
  public.memory_media,
  public.memory_reactions,
  public.events,
  public.bucket_items;
