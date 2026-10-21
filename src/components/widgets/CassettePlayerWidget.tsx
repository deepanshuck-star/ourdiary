'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Play, Pause, Disc3, Music4 } from 'lucide-react';
import { useCoupleSongs } from '@/hooks/useCoupleSongs';

/**
 * The dashboard cassette player. Plays the couple's one uploaded song, set
 * on the /music page — until migration 15 this was a hardcoded title and a
 * play button that toggled a boolean and played nothing.
 */
export function CassettePlayerWidget() {
  const { song, loading } = useCoupleSongs();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Swapping the pinned song on the other device shouldn't leave the old one
  // playing underneath the new label.
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    el.pause();
    setIsPlaying(false);
  }, [song?.id]);

  const toggle = () => {
    const el = audioRef.current;
    if (!el || !song) return;
    if (el.paused) {
      void el.play().catch(() => setIsPlaying(false));
    } else {
      el.pause();
    }
  };

  return (
    <div className="appearance-dark rounded-[1.25rem] bg-surface text-ink p-5 shadow-card border border-line space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-line">
        <div className="flex items-center gap-2">
          <Disc3
            className={`w-5 h-5 text-amber-400 ${isPlaying ? 'motion-safe:animate-spin' : ''}`}
            aria-hidden="true"
          />
          <span className="text-xs font-bold text-ink-muted uppercase tracking-wider">
            Our Relationship Soundtrack
          </span>
        </div>

        <Link
          href="/music"
          className="text-[11px] text-primary hover:text-primary-hover font-semibold flex items-center gap-1"
        >
          <Music4 className="w-3 h-3" aria-hidden="true" />
          <span>Change song</span>
        </Link>
      </div>

      {/* Cassette Tape Illustration */}
      <div className="relative rounded-2xl bg-canvas p-4 border border-line shadow-inner flex items-center justify-between gap-4">
        <div
          className={`w-12 h-12 rounded-full border-4 border-slate-200 bg-slate-100 flex items-center justify-center flex-shrink-0 ${
            isPlaying ? 'motion-safe:animate-spin' : ''
          }`}
          aria-hidden="true"
        >
          <div className="w-4 h-4 rounded-full bg-canvas border-2 border-amber-400" />
        </div>

        <div className="flex-1 text-center min-w-0">
          <div className="px-3 py-1 rounded-md bg-secondary text-ink text-[10px] font-black uppercase tracking-widest truncate">
            Side A • Our Mix
          </div>
          <p className="font-extrabold text-sm text-amber-600 truncate mt-1.5">
            {song ? song.title : loading ? 'Loading…' : 'No song yet'}
          </p>
          <p className="text-xs text-ink-muted truncate">
            {song ? song.artist || 'Unknown artist' : 'Upload one to get started'}
          </p>
        </div>

        <div
          className={`w-12 h-12 rounded-full border-4 border-slate-200 bg-slate-100 flex items-center justify-center flex-shrink-0 ${
            isPlaying ? 'motion-safe:animate-spin' : ''
          }`}
          aria-hidden="true"
        >
          <div className="w-4 h-4 rounded-full bg-canvas border-2 border-amber-400" />
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <span className="text-[11px] text-ink-muted italic min-w-0 truncate">
          {song
            ? isPlaying
              ? '🎶 Playing your song...'
              : 'Press play to set the mood'
            : 'Add a song to start your mixtape'}
        </span>

        {song ? (
          <button
            onClick={toggle}
            aria-label={isPlaying ? 'Pause our song' : 'Play our song'}
            className="px-4 py-1.5 text-xs font-bold transition-opacity flex items-center gap-1.5 active:scale-95 bg-primary hover:bg-primary-hover text-on-primary shadow-cta rounded-full flex-shrink-0"
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" fill="currentColor" />
                <span>Play Mixtape</span>
              </>
            )}
          </button>
        ) : (
          <Link
            href="/music"
            className="px-4 py-1.5 text-xs font-bold flex items-center gap-1.5 bg-primary hover:bg-primary-hover text-on-primary shadow-cta rounded-full flex-shrink-0"
          >
            <Music4 className="w-3.5 h-3.5" />
            <span>Add a song</span>
          </Link>
        )}
      </div>

      {song && (
        <audio
          ref={audioRef}
          src={song.url}
          preload="none"
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
          className="hidden"
        />
      )}
    </div>
  );
}
