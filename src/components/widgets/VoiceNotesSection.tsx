'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Mic, Square, Trash2 } from 'lucide-react';
import { useDiary } from '@/store/DiaryContext';
import { newId } from '@/hooks/useNow';
import {
  deleteVoiceNote,
  isIndexedDbSupported,
  listVoiceNotes,
  saveVoiceNote,
  type VoiceNoteRecord,
} from '@/lib/idb';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { uploadAudioToCloudinary } from '@/lib/cloudinary/upload';
import { createVoiceNoteRemote, deleteVoiceNoteRemote, fetchVoiceNotesRemote, type VoiceNoteRow } from '@/lib/supabase/xsync';

const MAX_SECONDS = 60;
const MIME_CANDIDATES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus', 'audio/ogg'];

function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') return undefined;
  return MIME_CANDIDATES.find((t) => MediaRecorder.isTypeSupported(t));
}

function micErrorMessage(err: unknown): string {
  const name = err instanceof DOMException ? err.name : '';
  if (name === 'NotAllowedError' || name === 'SecurityError')
    return 'Microphone access was blocked. Allow it in your browser settings to record a voice note.';
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'No microphone was found on this device.';
  if (name === 'NotReadableError') return 'Your microphone is busy in another app. Close it and try again.';
  return 'We couldn’t start recording just now.';
}

function formatSeconds(s: number) {
  const whole = Math.max(0, Math.round(s));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

// A single display shape both the local (IndexedDB) and remote (Supabase)
// records map onto, so the list/playback UI doesn't need to know which mode
// it's in.
interface DisplayNote {
  id: string;
  authorName: string;
  createdAt: string;
  durationSec: number;
  playUrl: string;
  /** Present only for local-mode records, so they can be revoked on unmount. */
  objectUrl?: string;
}

/**
 * Voice notes for a memory: record up to 60s with MediaRecorder.
 * In a live cloud couple space, clips upload to Cloudinary and the list is
 * shared with your partner's device. In demo mode (no Supabase), clips stay
 * on this device only, in IndexedDB.
 */
export function VoiceNotesSection({ memoryId }: { memoryId: string }) {
  const { data, activeProfile, partnerProfile, isLiveUser, currentUserId, showToast } = useDiary();
  const coupleId = data.couple.id;
  const supabase = isLiveUser ? getSupabaseBrowserClient() : null;
  const isRemote = Boolean(supabase);

  const [supported, setSupported] = useState<boolean | null>(null);
  const [localRecords, setLocalRecords] = useState<VoiceNoteRecord[]>([]);
  const [remoteRecords, setRemoteRecords] = useState<VoiceNoteRow[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [phase, setPhase] = useState<'idle' | 'starting' | 'recording' | 'saving'>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState('');

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const stopTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    setSupported(
      typeof window !== 'undefined' &&
        typeof MediaRecorder !== 'undefined' &&
        Boolean(navigator.mediaDevices?.getUserMedia) &&
        (isRemote || isIndexedDbSupported())
    );
  }, [isRemote]);

  const reload = useCallback(async () => {
    if (isRemote && supabase) {
      try {
        setRemoteRecords(await fetchVoiceNotesRemote(supabase, memoryId));
      } catch (err) {
        console.error('[OurDiary] Failed to load voice notes from database:', err);
        setError('Voice notes couldn’t be loaded from the server.');
      }
      return;
    }
    if (!isIndexedDbSupported()) return;
    try {
      setLocalRecords(await listVoiceNotes(memoryId, coupleId));
    } catch {
      setError('Voice notes couldn’t be loaded on this device.');
    }
  }, [memoryId, coupleId, isRemote, supabase]);

  useEffect(() => {
    void reload();
  }, [reload]);

  // Build the unified display list + object URLs for local-mode playback
  // (remote clips play straight from their Cloudinary URL, no object URL needed).
  const notes: DisplayNote[] = isRemote
    ? remoteRecords.map((r) => ({
        id: r.id,
        authorName: r.authorId === currentUserId ? activeProfile.name : partnerProfile.name,
        createdAt: r.createdAt,
        durationSec: r.durationSec,
        playUrl: r.url,
      }))
    : localRecords.map((r) => ({
        id: r.id,
        authorName: r.authorName,
        createdAt: r.createdAt,
        durationSec: r.durationSec,
        playUrl: urls[r.id] || '',
        objectUrl: urls[r.id],
      }));

  useEffect(() => {
    if (isRemote) return;
    const map: Record<string, string> = {};
    localRecords.forEach((r) => {
      map[r.id] = URL.createObjectURL(r.blob);
    });
    setUrls(map);
    return () => Object.values(map).forEach((u) => URL.revokeObjectURL(u));
  }, [localRecords, isRemote]);

  const clearTimers = () => {
    if (timerRef.current !== null) window.clearInterval(timerRef.current);
    if (stopTimeoutRef.current !== null) window.clearTimeout(stopTimeoutRef.current);
    timerRef.current = null;
    stopTimeoutRef.current = null;
  };

  const releaseStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  // Stop everything if the user navigates away mid-recording.
  useEffect(
    () => () => {
      clearTimers();
      const rec = recorderRef.current;
      if (rec && rec.state !== 'inactive') {
        rec.onstop = null;
        rec.stop();
      }
      releaseStream();
    },
    []
  );

  const stop = () => {
    const rec = recorderRef.current;
    if (rec && rec.state !== 'inactive') rec.stop();
  };

  const start = async () => {
    setError('');
    setPhase('starting');
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      setError(micErrorMessage(err));
      setPhase('idle');
      return;
    }
    streamRef.current = stream;

    const mimeType = pickMimeType();
    let rec: MediaRecorder;
    try {
      rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    } catch {
      releaseStream();
      setError('Recording isn’t supported in this browser.');
      setPhase('idle');
      return;
    }
    recorderRef.current = rec;
    const chunks: Blob[] = [];
    const startedAt = Date.now();

    rec.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };
    rec.onstop = async () => {
      clearTimers();
      releaseStream();
      recorderRef.current = null;
      const durationSec = Math.min(MAX_SECONDS, (Date.now() - startedAt) / 1000);
      const type = rec.mimeType || mimeType || 'audio/webm';
      const blob = new Blob(chunks, { type });
      if (blob.size === 0 || durationSec < 0.5) {
        setPhase('idle');
        setError('That recording was too short to keep.');
        return;
      }
      setPhase('saving');
      try {
        if (isRemote && supabase) {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (!user) throw new Error('Not signed in');
          const { secureUrl, publicId } = await uploadAudioToCloudinary(blob, { filename: `voice-${Date.now()}.webm` });
          await createVoiceNoteRemote(supabase, memoryId, user.id, {
            url: secureUrl,
            cloudinaryPublicId: publicId,
            durationSec,
            mimeType: type,
          });
        } else {
          await saveVoiceNote({
            id: newId('voice'),
            memoryId,
            coupleId,
            authorId: data.activeProfileId,
            authorName: activeProfile.name,
            createdAt: new Date().toISOString(),
            durationSec,
            mimeType: type,
            blob,
          });
        }
        await reload();
        showToast('Voice note saved', 'success');
      } catch (err: any) {
        setError(err?.message || 'We couldn’t save that voice note. Please try again.');
      } finally {
        setPhase('idle');
        setElapsed(0);
      }
    };

    rec.start(1000);
    setElapsed(0);
    setPhase('recording');
    timerRef.current = window.setInterval(() => setElapsed((Date.now() - startedAt) / 1000), 250);
    stopTimeoutRef.current = window.setTimeout(() => {
      if (rec.state !== 'inactive') rec.stop();
    }, MAX_SECONDS * 1000);
  };

  const remove = async (id: string) => {
    try {
      if (isRemote && supabase) {
        await deleteVoiceNoteRemote(supabase, id);
        setRemoteRecords((prev) => prev.filter((r) => r.id !== id));
      } else {
        await deleteVoiceNote(id);
        setLocalRecords((prev) => prev.filter((r) => r.id !== id));
      }
    } catch {
      setError('That voice note couldn’t be deleted.');
    }
  };

  return (
    <section
      aria-labelledby="voice-notes-heading"
      className="rounded-3xl bg-surface border border-line p-6 sm:p-8 shadow-sm space-y-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-line">
        <div>
          <h3 id="voice-notes-heading" className="font-bold text-lg text-ink flex items-center gap-2">
            <Mic className="w-5 h-5 text-primary" aria-hidden="true" />
            Voice notes
          </h3>
          <p className="text-xs text-ink-muted mt-0.5">
            Say it out loud — up to a minute.{' '}
            {isRemote ? 'Shared with your partner.' : 'Saved on this device only.'}
          </p>
        </div>
        {supported && (
          <div className="flex items-center gap-3">
            {phase === 'recording' && (
              <span className="text-sm font-semibold text-ink tabular-nums" aria-live="polite">
                <span className="inline-block w-2 h-2 rounded-full bg-danger mr-2 motion-safe:animate-pulse" aria-hidden="true" />
                {formatSeconds(elapsed)} / {formatSeconds(MAX_SECONDS)}
              </span>
            )}
            {phase === 'recording' ? (
              <button
                type="button"
                onClick={stop}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold bg-ink text-canvas"
              >
                <Square className="w-3.5 h-3.5" fill="currentColor" /> Stop and save
              </button>
            ) : (
              <button
                type="button"
                onClick={start}
                disabled={phase !== 'idle'}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold bg-primary hover:bg-primary-hover text-on-primary shadow-cta disabled:opacity-60"
              >
                {phase === 'idle' ? <Mic className="w-3.5 h-3.5" /> : <Loader2 className="w-3.5 h-3.5 motion-safe:animate-spin" />}
                {phase === 'saving' ? 'Saving…' : phase === 'starting' ? 'Waiting for microphone…' : 'Record'}
              </button>
            )}
          </div>
        )}
      </div>

      {supported === false && (
        <p className="text-sm text-ink-muted">
          Voice recording isn't available in this browser. Try a recent version of Chrome, Edge, Firefox or Safari.
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}

      {notes.length === 0 ? (
        supported !== false && <p className="text-sm text-ink-muted">No voice notes yet. Tell this story in your own voice.</p>
      ) : (
        <ul className="space-y-3">
          {notes.map((r) => (
            <li key={r.id} className="rounded-2xl border border-line bg-canvas p-3 sm:p-4 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-ink-muted">
                  <span className="font-semibold text-ink">{r.authorName}</span> ·{' '}
                  {new Date(r.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })} ·{' '}
                  {formatSeconds(r.durationSec)}
                </p>
                <button
                  type="button"
                  onClick={() => remove(r.id)}
                  aria-label={`Delete voice note by ${r.authorName}`}
                  className="p-1.5 rounded-full text-ink-muted hover:text-ink"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              {r.playUrl && (
                <audio controls preload="metadata" src={r.playUrl} className="w-full">
                  Your browser can't play this recording.
                </audio>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default VoiceNotesSection;
