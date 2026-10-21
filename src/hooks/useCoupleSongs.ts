'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDiary } from '@/store/DiaryContext';
import { newId } from '@/hooks/useNow';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { uploadSongToCloudinary } from '@/lib/cloudinary/upload';
import {
  createSongRemote,
  deleteSongRemote,
  fetchCurrentSongIdRemote,
  fetchSongsRemote,
  setCurrentSongRemote,
  updateSongRemote,
} from '@/lib/supabase/music';
import { deleteSong as deleteLocalSong, listSongs, saveSong, isIndexedDbSupported, type LocalSongRecord } from '@/lib/idb';
import { readLocal, writeLocal } from '@/lib/local-store';
import { parseSongMetaFromFilename, resolveCurrentSong, validateSongFile } from '@/lib/features/music';

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
  /** True when this device's user may delete it. */
  canDelete: boolean;
}

const DEMO_PINNED_KEY = 'music:pinned';

/**
 * The couple's uploaded songs, in whichever mode the app is running.
 *
 * Live space: files on Cloudinary, metadata in `couple_songs`, the pinned
 * song in `couples.current_song_id` — both partners see the same playlist.
 * Demo mode: files in IndexedDB on this device, the pinned id in
 * localStorage. Nothing leaves the browser, and it is labeled as such in
 * the UI.
 */
export function useCoupleSongs() {
  const { data, isLiveUser, currentUserId, showToast } = useDiary();
  const coupleId = data.couple.id;
  const supabase = isLiveUser && currentUserId ? getSupabaseBrowserClient() : null;
  const isRemote = Boolean(supabase && coupleId);

  const [songs, setSongs] = useState<PlayableSong[]>([]);
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  // Object URLs for demo-mode blobs; revoked when the list changes or the
  // component unmounts, or the browser leaks them for the whole session.
  const objectUrls = useRef<string[]>([]);
  const revokeAll = () => {
    objectUrls.current.forEach((u) => URL.revokeObjectURL(u));
    objectUrls.current = [];
  };

  const localToPlayable = useCallback((rows: LocalSongRecord[]): PlayableSong[] => {
    revokeAll();
    return rows.map((r) => {
      const url = URL.createObjectURL(r.blob);
      objectUrls.current.push(url);
      return {
        id: r.id,
        title: r.title,
        artist: r.artist,
        url,
        durationSec: r.durationSec,
        createdAt: r.createdAt,
        uploadedBy: null,
        canDelete: true,
      };
    });
  }, []);

  const reload = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (isRemote && supabase) {
        const [rows, current] = await Promise.all([
          fetchSongsRemote(supabase, coupleId),
          fetchCurrentSongIdRemote(supabase, coupleId).catch(() => null),
        ]);
        setSongs(
          rows.map((r) => ({
            id: r.id,
            title: r.title,
            artist: r.artist || '',
            url: r.url,
            durationSec: r.durationSec,
            createdAt: r.createdAt,
            uploadedBy: r.uploadedBy,
            canDelete: r.uploadedBy === currentUserId,
          }))
        );
        setPinnedId(current);
      } else {
        if (!isIndexedDbSupported()) {
          setSongs([]);
          setError('This browser can’t store songs on the device.');
          return;
        }
        setSongs(localToPlayable(await listSongs(coupleId || 'demo_couple')));
        setPinnedId(readLocal<string | null>(DEMO_PINNED_KEY, null));
      }
    } catch (err: any) {
      console.error('[OurDiary] Failed to load songs:', err);
      setError('We couldn’t load your songs just now.');
    } finally {
      setLoading(false);
    }
  }, [isRemote, supabase, coupleId, currentUserId, localToPlayable]);

  useEffect(() => {
    void reload();
  }, [reload]);

  // Revoke any outstanding object URLs on unmount.
  useEffect(() => () => revokeAll(), []);

  const currentSong = useMemo(() => resolveCurrentSong(songs, pinnedId), [songs, pinnedId]);

  const upload = useCallback(
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

      setUploading(true);
      setError('');
      try {
        if (isRemote && supabase && currentUserId) {
          const { secureUrl, publicId, durationSec } = await uploadSongToCloudinary(file);
          await createSongRemote(supabase, coupleId, currentUserId, {
            title,
            artist,
            url: secureUrl,
            cloudinaryPublicId: publicId,
            durationSec,
            mimeType: file.type || 'audio/mpeg',
          });
        } else {
          await saveSong({
            id: newId('song'),
            coupleId: coupleId || 'demo_couple',
            title,
            artist,
            createdAt: new Date().toISOString(),
            // The browser decodes duration lazily; the <audio> element fills
            // it in on the player, so storing null here is fine.
            durationSec: null,
            mimeType: file.type || 'audio/mpeg',
            blob: file,
          });
        }
        await reload();
        showToast(`“${title}” added to your soundtrack 🎵`, 'heart');
        return true;
      } catch (err: any) {
        const message = err?.message || 'That song couldn’t be uploaded.';
        setError(message);
        showToast(message, 'warn');
        return false;
      } finally {
        setUploading(false);
      }
    },
    [isRemote, supabase, currentUserId, coupleId, reload, showToast]
  );

  const remove = useCallback(
    async (id: string) => {
      try {
        if (isRemote && supabase) {
          await deleteSongRemote(supabase, id);
        } else {
          await deleteLocalSong(id);
          if (readLocal<string | null>(DEMO_PINNED_KEY, null) === id) writeLocal(DEMO_PINNED_KEY, null);
        }
        await reload();
        showToast('Song removed', 'info');
      } catch (err: any) {
        const message = err?.message || 'That song couldn’t be removed.';
        setError(message);
        showToast(message, 'warn');
      }
    },
    [isRemote, supabase, reload, showToast]
  );

  const rename = useCallback(
    async (id: string, updates: { title: string; artist: string }) => {
      try {
        if (isRemote && supabase) {
          await updateSongRemote(supabase, id, updates);
          await reload();
        } else {
          const rows = await listSongs(coupleId || 'demo_couple');
          const row = rows.find((r) => r.id === id);
          if (row) await saveSong({ ...row, title: updates.title, artist: updates.artist });
          await reload();
        }
        showToast('Song details updated', 'success');
      } catch (err: any) {
        setError(err?.message || 'That change couldn’t be saved.');
      }
    },
    [isRemote, supabase, coupleId, reload, showToast]
  );

  const pin = useCallback(
    async (id: string | null) => {
      setPinnedId(id);
      try {
        if (isRemote && supabase) {
          await setCurrentSongRemote(supabase, coupleId, id);
        } else {
          writeLocal(DEMO_PINNED_KEY, id);
        }
        if (id) showToast('Set as your song 💞', 'heart');
      } catch (err: any) {
        console.error('[OurDiary] Failed to pin song:', err);
        showToast("Couldn't sync this change to the server — it's only on this device for now.", 'warn');
      }
    },
    [isRemote, supabase, coupleId, showToast]
  );

  return {
    songs,
    currentSong,
    pinnedId,
    loading,
    uploading,
    error,
    isRemote,
    upload,
    remove,
    rename,
    pin,
    reload,
  };
}
