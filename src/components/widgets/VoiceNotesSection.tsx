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

/**
 * Voice notes for a memory: record up to 60s with MediaRecorder, stored on
 * this device only (IndexedDB), keyed by memory id.
 */
export function VoiceNotesSection({ memoryId }: { memoryId: string }) {
  const { data, activeProfile, showToast } = useDiary();
  const coupleId = data.couple.id;

  const [supported, setSupported] = useState<boolean | null>(null);
  const [records, setRecords] = useState<VoiceNoteRecord[]>([]);
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
        isIndexedDbSupported()
    );
  }, []);

  const reload = useCallback(async () => {
    if (!isIndexedDbSupported()) return;
    try {
      setRecords(await listVoiceNotes(memoryId, coupleId));
    } catch {
      setError('Voice notes couldn’t be loaded on this device.');
    }
  }, [memoryId, coupleId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  // Object URLs for playback; revoked whenever the list changes or on unmount.
  useEffect(() => {
    const map: Record<string, string> = {};
    records.forEach((r) => {
      map[r.id] = URL.createObjectURL(r.blob);
    });
    setUrls(map);
    return () => Object.values(map).forEach((u) => URL.revokeObjectURL(u));
  }, [records]);

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
        await reload();
        showToast('Voice note saved', 'success');
      } catch {
        setError('We couldn’t save that voice note on this device (storage may be full or blocked).');
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
      await deleteVoiceNote(id);
      setRecords((prev) => prev.filter((r) => r.id !== id));
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
            Say it out loud — up to a minute. Saved on this device only.
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

      {records.length === 0 ? (
        supported !== false && <p className="text-sm text-ink-muted">No voice notes yet. Tell this story in your own voice.</p>
      ) : (
        <ul className="space-y-3">
          {records.map((r) => (
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
              {urls[r.id] && (
                <audio controls preload="metadata" src={urls[r.id]} className="w-full">
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
