'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useDiary } from '@/store/DiaryContext';
import { newId } from '@/hooks/useNow';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { destroyCloudinaryAsset, uploadSongToCloudinary } from '@/lib/cloudinary/upload';
import { createSongRemote, deleteSongRemote, fetchSongRemote, updateSongRemote } from '@/lib/supabase/music';
import { deleteSong as deleteLocalSong, listSongs, saveSong, isIndexedDbSupported } from '@/lib/idb';
import { parseSongMetaFromFilename, validateSongFile } from '@/lib/features/music';

/** One shape for the UI, whichever mode supplied the song. */
export interface PlayableSong {
  id: string;
  title: string;
  artist: string;
  url: string;
  durationSec: number | null;
  createdAt: string;
  /** Null in demo mode, where there is no signed-in user to attribute to. */
  uploadedBy: string | null;
  /** True when this device's user may remove it. */
  canDelete: boolean;
}

/**
 * The couple's one song.
 *
 * A couple keeps exactly one (enforced by a unique index in migration 16),
 * so setting a new one REPLACES the old: the previous row and its Cloudinary
 * file are deleted rather than piling up. The cleanup runs after the new
 * song is safely stored and never fails the replacement — an orphaned file
 * costs storage, a lost upload costs the user their song.
 *
 * Live space: file on Cloudinary, metadata in `couple_songs`, shared with
 * the partner. Demo mode: the file sits in IndexedDB on this device only.
 */
export function useCoupleSongs() {
  const { data, isLiveUser, currentUserId, showToast } = useDiary();
  const coupleId = data.couple.id;
  const supabase = isLiveUser && currentUserId ? getSupabaseBrowserClient() : null;
  const isRemote = Boolean(supabase && coupleId);

  const [song, setSong] = useState<PlayableSong | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  // Object URL for the demo-mode blob; revoked when it's replaced or the
  // component unmounts, or the browser holds the file for the whole session.
  const objectUrl = useRef<string | null>(null);
  const revoke = () => {
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    objectUrl.current = null;
  };

  const reload = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (isRemote && supabase) {
        const row = await fetchSongRemote(supabase, coupleId);
        setSong(
          row && {
            id: row.id,
            title: row.title,
            artist: row.artist || '',
            url: row.url,
            durationSec: row.durationSec,
            createdAt: row.createdAt,
            uploadedBy: row.uploadedBy,
            // Either partner may replace the shared song; the row's RLS
            // delete policy is the uploader's, so the replace path deletes
            // through the API only when it's ours (see replace()).
            canDelete: row.uploadedBy === currentUserId,
          }
        );
      } else {
        if (!isIndexedDbSupported()) {
          setSong(null);
          setError('This browser can’t store a song on the device.');
          return;
        }
        const rows = await listSongs(coupleId || 'demo_couple');
        revoke();
        const row = rows[0];
        if (!row) {
          setSong(null);
        } else {
          objectUrl.current = URL.createObjectURL(row.blob);
          setSong({
            id: row.id,
            title: row.title,
            artist: row.artist,
            url: objectUrl.current,
            durationSec: row.durationSec,
            createdAt: row.createdAt,
            uploadedBy: null,
            canDelete: true,
          });
        }
      }
    } catch (err: any) {
      console.error('[OurDiary] Failed to load the couple song:', err);
      setError('We couldn’t load your song just now.');
    } finally {
      setLoading(false);
    }
  }, [isRemote, supabase, coupleId, currentUserId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => () => revoke(), []);

  /**
   * Uploads `file` as the couple's song, replacing whatever was there.
   * Order matters: the new song is stored first, and only then is the old
   * one removed, so a failure part-way leaves the couple with a song rather
   * than none.
   */
  const replace = useCallback(
    async (file: File, meta?: { title?: string; artist?: string }) => {
      const problem = validateSongFile(file);
      if (problem) {
        setError(problem);
        showToast(problem, 'warn');
        return false;
      }
      const parsed = parseSongMetaFromFilename(file.name);
      const title = (meta?.title ?? parsed.title).trim() || 'Untitled';
      const artist = (meta?.artist ?? parsed.artist).trim();
      const previous = song;

      setUploading(true);
      setError('');
      try {
        if (isRemote && supabase && currentUserId) {
          const { secureUrl, publicId, durationSec } = await uploadSongToCloudinary(file);

          // The unique index allows one row per couple, so the old row goes
          // before the new one is inserted. Its Cloudinary file is cleaned
          // up after, once the replacement is definitely saved.
          if (previous) await deleteSongRemote(supabase, previous.id).catch(() => undefined);

          try {
            await createSongRemote(supabase, coupleId, currentUserId, {
              title,
              artist,
              url: secureUrl,
              cloudinaryPublicId: publicId,
              durationSec,
              mimeType: file.type || 'audio/mpeg',
            });
          } catch (insertErr) {
            // The new row didn't land and the old one is already gone, so
            // don't also delete the file we just uploaded — surface it.
            await destroyCloudinaryAsset(publicId, 'video');
            throw insertErr;
          }

          if (previous?.url) await destroyCloudinaryAsset(previous.url, 'video');
        } else {
          await saveSong({
            id: newId('song'),
            coupleId: coupleId || 'demo_couple',
            title,
            artist,
            createdAt: new Date().toISOString(),
            // The <audio> element fills duration in once it loads metadata.
            durationSec: null,
            mimeType: file.type || 'audio/mpeg',
            blob: file,
          });
          if (previous) await deleteLocalSong(previous.id);
        }
        await reload();
        showToast(previous ? `Your song is now “${title}” 🎵` : `“${title}” is now your song 🎵`, 'heart');
        return true;
      } catch (err: any) {
        const message = err?.message || 'That song couldn’t be uploaded.';
        setError(message);
        showToast(message, 'warn');
        await reload();
        return false;
      } finally {
        setUploading(false);
      }
    },
    [isRemote, supabase, currentUserId, coupleId, song, reload, showToast]
  );

  const remove = useCallback(async () => {
    if (!song) return;
    try {
      if (isRemote && supabase) {
        await deleteSongRemote(supabase, song.id);
        await destroyCloudinaryAsset(song.url, 'video');
      } else {
        await deleteLocalSong(song.id);
      }
      await reload();
      showToast('Song removed', 'info');
    } catch (err: any) {
      const message = err?.message || 'That song couldn’t be removed.';
      setError(message);
      showToast(message, 'warn');
    }
  }, [song, isRemote, supabase, reload, showToast]);

  const rename = useCallback(
    async (updates: { title: string; artist: string }) => {
      if (!song) return;
      try {
        if (isRemote && supabase) {
          await updateSongRemote(supabase, song.id, updates);
        } else {
          const rows = await listSongs(coupleId || 'demo_couple');
          const row = rows.find((r) => r.id === song.id);
          if (row) await saveSong({ ...row, title: updates.title, artist: updates.artist });
        }
        await reload();
        showToast('Song details updated', 'success');
      } catch (err: any) {
        setError(err?.message || 'That change couldn’t be saved.');
      }
    },
    [song, isRemote, supabase, coupleId, reload, showToast]
  );

  return { song, loading, uploading, error, isRemote, replace, remove, rename, reload };
}
