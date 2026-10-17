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
    <div className="rounded-3xl bg-[#292538] text-white p-5 shadow-md border border-slate-700 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-700/60">
        <div className="flex items-center gap-2">
          <Disc3 className={`w-5 h-5 text-amber-400 ${soundtrack.isPlaying ? 'animate-spin' : ''}`} />
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Our Relationship Soundtrack
          </span>
        </div>

        {soundtrack.spotifyUrl && (
          <a
            href={soundtrack.spotifyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
          >
            <span>Open in Spotify</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>

      {/* Cassette Tape Illustration */}
      <div className="relative rounded-2xl bg-gradient-to-r from-slate-800 via-slate-900 to-slate-800 p-4 border border-slate-700 shadow-inner flex items-center justify-between gap-4">
        {/* Left Tape Spool */}
        <div className={`w-12 h-12 rounded-full border-4 border-slate-600 bg-slate-800 flex items-center justify-center flex-shrink-0 ${soundtrack.isPlaying ? 'animate-spin' : ''}`}>
          <div className="w-4 h-4 rounded-full bg-slate-950 border-2 border-amber-400" />
        </div>

        {/* Center Cassette Label */}
        <div className="flex-1 text-center min-w-0">
          <div className="px-3 py-1 rounded-md bg-[#CBBEF4] text-[#292538] text-[10px] font-black uppercase tracking-widest truncate">
            Side A • Our Mix
          </div>
          <p className="font-extrabold text-sm text-amber-300 truncate mt-1.5">
            {soundtrack.currentSong}
          </p>
          <p className="text-xs text-slate-400 truncate">
            {soundtrack.currentArtist}
          </p>
        </div>

        {/* Right Tape Spool */}
        <div className={`w-12 h-12 rounded-full border-4 border-slate-600 bg-slate-800 flex items-center justify-center flex-shrink-0 ${soundtrack.isPlaying ? 'animate-spin' : ''}`}>
          <div className="w-4 h-4 rounded-full bg-slate-950 border-2 border-amber-400" />
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between pt-1">
        <span className="text-[11px] text-slate-400 italic">
          {soundtrack.isPlaying ? '🎶 Playing couple favorite...' : 'Press play to set the mood'}
        </span>

        <button
          onClick={toggleSoundtrack}
          className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-rose-500 to-purple-600 text-white text-xs font-bold shadow-xs hover:opacity-95 transition-opacity flex items-center gap-1.5 active:scale-95"
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
