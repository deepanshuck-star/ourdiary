'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  Disc3,
  Heart,
  Loader2,
  Music4,
  Pause,
  Pencil,
  Play,
  SkipBack,
  SkipForward,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { useCoupleSongs, type PlayableSong } from '@/hooks/useCoupleSongs';
import {
  ACCEPTED_AUDIO_EXTENSIONS,
  formatDuration,
  nextSongIndex,
  parseSongMetaFromFilename,
  previousSongIndex,
} from '@/lib/features/music';

const inputClass =
  'w-full px-4 py-2.5 rounded-2xl border border-line bg-surface text-ink text-sm focus:outline-none focus:ring-2 focus:ring-focus';

const ACCEPT_ATTR = ['audio/*', ...ACCEPTED_AUDIO_EXTENSIONS.map((e) => `.${e}`)].join(',');

export default function MusicPage() {
  const { songs, currentSong, pinnedId, loading, uploading, error, isRemote, upload, remove, rename, pin } =
    useCoupleSongs();

  const fileRef = useRef<HTMLInputElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Pending upload: picked but not yet confirmed, so the title/artist guessed
  // from the filename can be corrected before it's saved.
  const [pending, setPending] = useState<{ file: File; title: string; artist: string } | null>(null);
  const [editing, setEditing] = useState<{ id: string; title: string; artist: string } | null>(null);

  const [playingId, setPlayingId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [durations, setDurations] = useState<Record<string, number>>({});

  const playingIndex = songs.findIndex((s) => s.id === playingId);
  const nowPlaying: PlayableSong | null = playingIndex >= 0 ? songs[playingIndex] : null;

  // Keep the <audio> element in step with which song is selected. Changing
  // `src` resets the element, so play() has to be re-issued after the swap.
  useEffect(() => {
    const el = audioRef.current;
    if (!el || !nowPlaying) return;
    if (el.getAttribute('data-song') !== nowPlaying.id) {
      el.setAttribute('data-song', nowPlaying.id);
      el.src = nowPlaying.url;
      if (isPlaying) void el.play().catch(() => setIsPlaying(false));
    }
  }, [nowPlaying, isPlaying]);

  const playSong = (song: PlayableSong) => {
    if (playingId === song.id) {
      const el = audioRef.current;
      if (!el) return;
      if (el.paused) {
        void el.play().catch(() => setIsPlaying(false));
        setIsPlaying(true);
      } else {
        el.pause();
        setIsPlaying(false);
      }
      return;
    }
    setPlayingId(song.id);
    setIsPlaying(true);
  };

  const step = (direction: 1 | -1) => {
    if (songs.length === 0) return;
    const index =
      direction === 1 ? nextSongIndex(playingIndex, songs.length) : previousSongIndex(playingIndex, songs.length);
    if (index < 0) return;
    setPlayingId(songs[index].id);
    setIsPlaying(true);
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
    const ok = await upload(pending.file, { title: pending.title, artist: pending.artist });
    if (ok) setPending(null);
  };

  const saveRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    await rename(editing.id, { title: editing.title.trim() || 'Untitled', artist: editing.artist.trim() });
    setEditing(null);
  };

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto space-y-8">
        <header>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">Our soundtrack</p>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold text-ink mt-1">The songs that are yours</h1>
          <p className="text-sm text-ink-muted mt-2 max-w-2xl">
            Upload the tracks that mean something to the two of you and pin one as <em>your</em> song — it plays on the
            dashboard.{' '}
            {isRemote
              ? 'Your partner hears the same playlist on their device.'
              : 'In demo mode these stay on this device only, in your browser.'}
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
              Now playing
            </h2>
          </div>

          {nowPlaying ? (
            <>
              <div className="min-w-0">
                <p className="font-semibold text-lg text-ink truncate">{nowPlaying.title}</p>
                <p className="text-sm text-ink-muted truncate">{nowPlaying.artist || 'Unknown artist'}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => step(-1)}
                  aria-label="Previous song"
                  className="p-2 rounded-full text-ink-muted hover:text-ink"
                >
                  <SkipBack className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => playSong(nowPlaying)}
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                  className="p-3 rounded-full bg-primary hover:bg-primary-hover text-on-primary shadow-cta"
                >
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" fill="currentColor" />}
                </button>
                <button
                  type="button"
                  onClick={() => step(1)}
                  aria-label="Next song"
                  className="p-2 rounded-full text-ink-muted hover:text-ink"
                >
                  <SkipForward className="w-5 h-5" />
                </button>
              </div>
            </>
          ) : (
            <p className="text-sm text-ink-muted">
              {loading ? 'Loading your songs…' : 'Nothing playing yet — upload a song below and press play.'}
            </p>
          )}

          {/* One shared <audio> drives the whole page, so two songs can never
              play over each other. */}
          <audio
            ref={audioRef}
            controls
            preload="metadata"
            className={`w-full ${nowPlaying ? '' : 'hidden'}`}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => step(1)}
            onLoadedMetadata={(e) => {
              const el = e.currentTarget;
              if (playingId && Number.isFinite(el.duration)) {
                setDurations((prev) => ({ ...prev, [playingId]: el.duration }));
              }
            }}
          >
            Your browser can’t play this audio.
          </audio>
        </section>

        {/* ---------------------------------------------------------- Upload */}
        <section aria-labelledby="upload-heading" className="space-y-3">
          <h2 id="upload-heading" className="text-2xl font-semibold text-ink flex items-center gap-2">
            <Music4 className="w-5 h-5 text-primary" aria-hidden="true" /> Add a song
          </h2>

          {pending ? (
            <form
              onSubmit={confirmUpload}
              className="rounded-[1.25rem] border border-line bg-surface p-5 space-y-4 shadow-sm"
            >
              <p className="text-xs text-ink-muted truncate">
                From <span className="font-semibold text-ink">{pending.file.name}</span>
              </p>
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
                  {uploading ? 'Uploading…' : 'Add to soundtrack'}
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
                <Upload className="w-4 h-4" /> Choose a song
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

        {/* -------------------------------------------------------- Playlist */}
        <section aria-labelledby="playlist-heading" className="space-y-3">
          <h2 id="playlist-heading" className="text-2xl font-semibold text-ink">
            Your playlist
          </h2>

          {loading ? (
            <p className="text-sm text-ink-muted">Loading…</p>
          ) : songs.length === 0 ? (
            <p className="text-sm text-ink-muted rounded-[1.25rem] border border-dashed border-line p-5">
              No songs yet. The first one you add becomes your song automatically.
            </p>
          ) : (
            <ul className="space-y-3">
              {songs.map((song) => {
                const isPinned = pinnedId ? song.id === pinnedId : song.id === currentSong?.id;
                const duration = durations[song.id] ?? song.durationSec;
                return (
                  <li key={song.id} className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
                    {editing?.id === song.id ? (
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
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => playSong(song)}
                          aria-label={playingId === song.id && isPlaying ? `Pause ${song.title}` : `Play ${song.title}`}
                          className="p-2.5 rounded-full bg-secondary text-ink hover:bg-primary hover:text-on-primary flex-shrink-0"
                        >
                          {playingId === song.id && isPlaying ? (
                            <Pause className="w-4 h-4" />
                          ) : (
                            <Play className="w-4 h-4" fill="currentColor" />
                          )}
                        </button>

                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-sm text-ink truncate flex items-center gap-1.5">
                            {song.title}
                            {isPinned && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-primary">
                                <Heart className="w-3 h-3" fill="currentColor" /> Our song
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-ink-muted truncate">
                            {song.artist || 'Unknown artist'} · {formatDuration(duration)}
                          </p>
                        </div>

                        <div className="flex items-center gap-1 flex-shrink-0">
                          {!isPinned && (
                            <button
                              type="button"
                              onClick={() => pin(song.id)}
                              aria-label={`Set “${song.title}” as our song`}
                              className="p-2 rounded-full text-ink-muted hover:text-primary"
                            >
                              <Heart className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setEditing({ id: song.id, title: song.title, artist: song.artist })}
                            aria-label={`Edit details for ${song.title}`}
                            className="p-2 rounded-full text-ink-muted hover:text-ink"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          {song.canDelete && (
                            <button
                              type="button"
                              onClick={() => remove(song.id)}
                              aria-label={`Delete ${song.title}`}
                              className="p-2 rounded-full text-ink-muted hover:text-danger"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </AppShell>
  );
}
