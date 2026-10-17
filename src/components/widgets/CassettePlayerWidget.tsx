'use client';

import React from 'react';
import {Play, Pause, Disc3, ExternalLink} from 'lucide-react';
import { useDiary } from '@/store/DiaryContext';

export function CassettePlayerWidget() {
  const { data, toggleSoundtrack } = useDiary();

  const soundtrack = data.soundtrack || {
    currentSong: 'Until I Found You',
    currentArtist: 'Stephen Sanchez',
    isPlaying: false,
  };

  return (
    <div className="appearance-dark rounded-[1.25rem] bg-surface text-ink p-5 shadow-card border border-line space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-line">
        <div className="flex items-center gap-2">
          <Disc3 className={`w-5 h-5 text-amber-400 ${soundtrack.isPlaying ? 'animate-spin' : ''}`} />
          <span className="text-xs font-bold text-ink-muted uppercase tracking-wider">
            Our Relationship Soundtrack
          </span>
        </div>

        {soundtrack.spotifyUrl && (
          <a
            href={soundtrack.spotifyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-1"
          >
            <span>Open in Spotify</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>

      {/* Cassette Tape Illustration */}
      <div className="relative rounded-2xl bg-canvas p-4 border border-line shadow-inner flex items-center justify-between gap-4">
        {/* Left Tape Spool */}
        <div className={`w-12 h-12 rounded-full border-4 border-slate-200 bg-slate-100 flex items-center justify-center flex-shrink-0 ${soundtrack.isPlaying ? 'animate-spin' : ''}`}>
          <div className="w-4 h-4 rounded-full bg-canvas border-2 border-amber-400" />
        </div>

        {/* Center Cassette Label */}
        <div className="flex-1 text-center min-w-0">
          <div className="px-3 py-1 rounded-md bg-secondary text-ink text-[10px] font-black uppercase tracking-widest truncate">
            Side A • Our Mix
          </div>
          <p className="font-extrabold text-sm text-amber-600 truncate mt-1.5">
            {soundtrack.currentSong}
          </p>
          <p className="text-xs text-ink-muted truncate">
            {soundtrack.currentArtist}
          </p>
        </div>

        {/* Right Tape Spool */}
        <div className={`w-12 h-12 rounded-full border-4 border-slate-200 bg-slate-100 flex items-center justify-center flex-shrink-0 ${soundtrack.isPlaying ? 'animate-spin' : ''}`}>
          <div className="w-4 h-4 rounded-full bg-canvas border-2 border-amber-400" />
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between pt-1">
        <span className="text-[11px] text-ink-muted italic">
          {soundtrack.isPlaying ? '🎶 Playing couple favorite...' : 'Press play to set the mood'}
        </span>

        <button
          onClick={toggleSoundtrack}
          className="px-4 py-1.5 text-xs font-bold transition-opacity flex items-center gap-1.5 active:scale-95 bg-primary hover:bg-primary-hover text-on-primary shadow-cta rounded-full"
        >
          {soundtrack.isPlaying ? (
            <>
              <Pause className="w-3.5 h-3.5" />
              <span>Pause</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Play Mixtape</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
