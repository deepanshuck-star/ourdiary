-- ==============================================================================
-- OurDiary Migration 16: exactly one song per couple
-- Version: 20261014000016
--
-- Migration 15 modelled the soundtrack as a playlist with one track pinned
-- as "our song". A couple only ever wants one song, and keeping every
-- upload meant Cloudinary storage grew with each change and never shrank.
-- Replacing the song now deletes the previous row AND its Cloudinary asset
-- (src/hooks/useCoupleSongs.ts -> /api/media/destroy), so a couple occupies
-- one audio file, permanently.
--
-- `couples.current_song_id` existed only to pick one row out of many, so it
-- goes with the playlist.
--
-- NOTE: this drops surplus *rows*. Any Cloudinary asset uploaded before this
-- migration and orphaned by it is not deleted here — SQL can't reach
-- Cloudinary. Those are only billable storage, not a correctness problem;
-- delete them from the Cloudinary console if you want the space back.
-- ==============================================================================

-- The pinned-song pointer is meaningless once there is only one row. Dropped
-- before the de-duplication below so its FK can't block the deletes.
ALTER TABLE public.couples
  DROP COLUMN IF EXISTS current_song_id;

-- Keep each couple's newest song, drop the rest.
DELETE FROM public.couple_songs s
WHERE EXISTS (
  SELECT 1
  FROM public.couple_songs newer
  WHERE newer.couple_id = s.couple_id
    AND (newer.created_at, newer.id) > (s.created_at, s.id)
);

-- Enforce it from here on: a second insert for the same couple fails, so the
-- client must delete the old row first (which is what replacing does).
CREATE UNIQUE INDEX IF NOT EXISTS couple_songs_one_per_couple_uidx
  ON public.couple_songs (couple_id);
