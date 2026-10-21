'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Disc3, Loader2, Music4, Pause, Pencil, Play, RefreshCw, Trash2, Upload, X } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { useCoupleSongs } from '@/hooks/useCoupleSongs';
import { ACCEPTED_AUDIO_EXTENSIONS, formatDuration, parseSongMetaFromFilename } from '@/lib/features/music';

const inputClass =
  'w-full px-4 py-2.5 rounded-2xl border border-line bg-surface text-ink text-sm focus:outline-none focus:ring-2 focus:ring-focus';

const ACCEPT_ATTR = ['audio/*', ...ACCEPTED_AUDIO_EXTENSIONS.map((e) => `.${e}`)].join(',');

export default function MusicPage() {
  const { song, loading, uploading, error, isRemote, replace, remove, rename } = useCoupleSongs();

  const fileRef = useRef<HTMLInputElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Picked but not yet confirmed, so the title/artist guessed from the
  // filename can be corrected before it replaces the current song.
  const [pending, setPending] = useState<{ file: File; title: string; artist: string } | null>(null);
  const [editing, setEditing] = useState<{ title: string; artist: string } | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState<number | null>(null);

  // A replaced song must not keep playing under the new one's label.
  useEffect(() => {
    audioRef.current?.pause();
    setIsPlaying(false);
    setDuration(null);
  }, [song?.id]);

  const toggle = () => {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) void el.play().catch(() => setIsPlaying(false));
    else el.pause();
  };

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset immediately so picking the same file twice still fires onChange.
    e.target.value = '';
    if (!file) return;
    const meta = parseSongMetaFromFilename(file.name);
    setPending({ file, title: meta.title, artist: meta.artist });
  };

  const confirmUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pending) return;
    const ok = await replace(pending.file, { title: pending.title, artist: pending.artist });
    if (ok) setPending(null);
  };

  const saveRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    await rename({ title: editing.title.trim() || 'Untitled', artist: editing.artist.trim() });
    setEditing(null);
  };

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto space-y-8">
        <header>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">Our song</p>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold text-ink mt-1">The one that's yours</h1>
          <p className="text-sm text-ink-muted mt-2 max-w-2xl">
            One song, the two of you. It plays on your dashboard.{' '}
            {isRemote
              ? 'Your partner hears the same one. Setting a new song replaces it — the old file is deleted, not kept.'
              : 'In demo mode it stays on this device only, in your browser.'}
          </p>
        </header>

        {/* ---------------------------------------------------------- Player */}
        <section
          aria-labelledby="player-heading"
          className="rounded-[1.25rem] border border-line bg-surface p-5 sm:p-6 shadow-card space-y-4"
        >
          <div className="flex items-center gap-2 pb-3 border-b border-line">
            <Disc3
              className={`w-5 h-5 text-primary ${isPlaying ? 'motion-safe:animate-spin' : ''}`}
              aria-hidden="true"
            />
            <h2 id="player-heading" className="text-xs font-bold text-ink-muted uppercase tracking-wider">
              {song ? 'Your song' : 'No song yet'}
            </h2>
          </div>

          {loading ? (
            <p className="text-sm text-ink-muted">Loading…</p>
          ) : song ? (
            editing ? (
              <form onSubmit={saveRename} className="space-y-3">
                <div className="grid sm:grid-cols-2 gap-3">
                  <input
                    value={editing.title}
                    onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                    aria-label="Title"
                    className={inputClass}
                    required
                  />
                  <input
                    value={editing.artist}
                    onChange={(e) => setEditing({ ...editing, artist: e.target.value })}
                    aria-label="Artist"
                    placeholder="Artist"
                    className={inputClass}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-full text-xs font-semibold bg-primary hover:bg-primary-hover text-on-primary"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(null)}
                    className="px-4 py-1.5 rounded-full text-xs font-semibold text-ink-muted hover:text-ink"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <>
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={toggle}
                    aria-label={isPlaying ? `Pause ${song.title}` : `Play ${song.title}`}
                    className="p-3.5 rounded-full bg-primary hover:bg-primary-hover text-on-primary shadow-cta flex-shrink-0"
                  >
                    {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" fill="currentColor" />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-lg text-ink truncate">{song.title}</p>
                    <p className="text-sm text-ink-muted truncate">
                      {song.artist || 'Unknown artist'} · {formatDuration(duration ?? song.durationSec)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditing({ title: song.title, artist: song.artist })}
                    aria-label="Edit song details"
                    className="p-2 rounded-full text-ink-muted hover:text-ink flex-shrink-0"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                </div>

                <audio
                  ref={audioRef}
                  src={song.url}
                  controls
                  preload="metadata"
                  className="w-full"
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onEnded={() => setIsPlaying(false)}
                  onLoadedMetadata={(e) => {
                    const value = e.currentTarget.duration;
                    if (Number.isFinite(value)) setDuration(value);
                  }}
                >
                  Your browser can’t play this audio.
                </audio>
              </>
            )
          ) : (
            <p className="text-sm text-ink-muted">Pick the song that belongs to the two of you.</p>
          )}
        </section>

        {/* --------------------------------------------------- Set / replace */}
        <section aria-labelledby="upload-heading" className="space-y-3">
          <h2 id="upload-heading" className="text-2xl font-semibold text-ink flex items-center gap-2">
            <Music4 className="w-5 h-5 text-primary" aria-hidden="true" />
            {song ? 'Change your song' : 'Set your song'}
          </h2>

          {pending ? (
            <form
              onSubmit={confirmUpload}
              className="rounded-[1.25rem] border border-line bg-surface p-5 space-y-4 shadow-sm"
            >
              <p className="text-xs text-ink-muted truncate">
                From <span className="font-semibold text-ink">{pending.file.name}</span>
              </p>
              {song && (
                <p className="text-xs text-ink-muted rounded-2xl bg-canvas border border-line p-3">
                  This replaces <span className="font-semibold text-ink">{song.title}</span>
                  {isRemote ? ', and deletes its file for good.' : '.'}
                </p>
              )}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="song-title" className="block text-xs font-semibold text-ink mb-1">
                    Title
                  </label>
                  <input
                    id="song-title"
                    value={pending.title}
                    onChange={(e) => setPending({ ...pending, title: e.target.value })}
                    className={inputClass}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="song-artist" className="block text-xs font-semibold text-ink mb-1">
                    Artist <span className="font-normal text-ink-muted">(optional)</span>
                  </label>
                  <input
                    id="song-artist"
                    value={pending.artist}
                    onChange={(e) => setPending({ ...pending, artist: e.target.value })}
                    className={inputClass}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={uploading}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold bg-primary hover:bg-primary-hover text-on-primary shadow-cta disabled:opacity-60"
                >
                  {uploading ? (
                    <Loader2 className="w-3.5 h-3.5 motion-safe:animate-spin" />
                  ) : (
                    <Upload className="w-3.5 h-3.5" />
                  )}
                  {uploading ? 'Uploading…' : song ? 'Replace our song' : 'Set as our song'}
                </button>
                <button
                  type="button"
                  onClick={() => setPending(null)}
                  disabled={uploading}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold text-ink-muted hover:text-ink"
                >
                  <X className="w-3.5 h-3.5" /> Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="rounded-[1.25rem] border border-dashed border-line p-6 text-center space-y-3">
              <p className="text-sm text-ink-muted">MP3, M4A, WAV, OGG or FLAC — up to 20MB.</p>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-semibold bg-primary hover:bg-primary-hover text-on-primary shadow-cta"
              >
                {song ? <RefreshCw className="w-4 h-4" /> : <Upload className="w-4 h-4" />}
                {song ? 'Choose a different song' : 'Choose a song'}
              </button>
            </div>
          )}

          <input ref={fileRef} type="file" accept={ACCEPT_ATTR} onChange={onPick} className="hidden" />

          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
        </section>

        {song && song.canDelete && (
          <section className="pt-2 border-t border-line">
            {confirmingDelete ? (
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-sm text-ink">
                  Remove “{song.title}”? {isRemote && 'The file is deleted permanently.'}
                </p>
                <button
                  type="button"
                  onClick={async () => {
                    await remove();
                    setConfirmingDelete(false);
                  }}
                  className="px-4 py-1.5 rounded-full text-xs font-semibold bg-danger text-canvas"
                >
                  Remove it
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(false)}
                  className="px-4 py-1.5 rounded-full text-xs font-semibold text-ink-muted hover:text-ink"
                >
                  Keep it
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmingDelete(true)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-muted hover:text-danger"
              >
                <Trash2 className="w-3.5 h-3.5" /> Remove our song
              </button>
            )}
          </section>
        )}
      </div>
    </AppShell>
  );
}
