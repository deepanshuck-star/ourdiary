import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  extensionOf,
  formatDuration,
  isAudioFile,
  nextSongIndex,
  parseSongMetaFromFilename,
  previousSongIndex,
  resolveCurrentSong,
  validateSongFile,
  MAX_SONG_BYTES,
} from '../src/lib/features/music.ts';

const read = (...p) => fs.readFileSync(path.join(process.cwd(), ...p), 'utf8');

test('extensionOf handles dotted names, no extension and trailing dots', () => {
  assert.equal(extensionOf('song.mp3'), 'mp3');
  assert.equal(extensionOf('My Song - Live.FLAC'), 'flac');
  assert.equal(extensionOf('no-extension'), '');
  assert.equal(extensionOf('trailing.'), '');
  assert.equal(extensionOf('.hidden'), '');
});

test('isAudioFile accepts by mime type', () => {
  assert.ok(isAudioFile({ name: 'a.mp3', type: 'audio/mpeg' }));
  assert.ok(isAudioFile({ name: 'a.wav', type: 'audio/wav' }));
  // Windows reports audio/mp3 where other platforms report audio/mpeg.
  assert.ok(isAudioFile({ name: 'a.mp3', type: 'audio/mp3' }));
});

test('isAudioFile falls back to the extension when the browser gives no type', () => {
  assert.ok(isAudioFile({ name: 'track.m4a', type: '' }));
  assert.ok(isAudioFile({ name: 'track.ogg', type: 'application/octet-stream' }));
  assert.equal(isAudioFile({ name: 'photo.png', type: 'image/png' }), false);
  assert.equal(isAudioFile({ name: 'notes.txt', type: '' }), false);
});

test('validateSongFile rejects non-audio, empty and oversized files', () => {
  assert.equal(validateSongFile({ name: 'a.mp3', type: 'audio/mpeg', size: 1024 }), null);

  const wrongType = validateSongFile({ name: 'a.png', type: 'image/png', size: 1024 });
  assert.match(wrongType, /audio file/i);

  const empty = validateSongFile({ name: 'a.mp3', type: 'audio/mpeg', size: 0 });
  assert.match(empty, /empty/i);

  const tooBig = validateSongFile({ name: 'a.mp3', type: 'audio/mpeg', size: MAX_SONG_BYTES + 1 });
  assert.match(tooBig, /too large/i);

  // A custom limit is honoured, so callers can tighten it.
  assert.match(validateSongFile({ name: 'a.mp3', type: 'audio/mpeg', size: 2048 }, 1024), /too large/i);
});

test('parseSongMetaFromFilename splits "Artist - Title" and strips track numbers', () => {
  assert.deepEqual(parseSongMetaFromFilename('Stephen Sanchez - Until I Found You.mp3'), {
    title: 'Until I Found You',
    artist: 'Stephen Sanchez',
  });
  assert.deepEqual(parseSongMetaFromFilename('01. Arijit Singh - Tum Hi Ho.mp3'), {
    title: 'Tum Hi Ho',
    artist: 'Arijit Singh',
  });
  assert.deepEqual(parseSongMetaFromFilename('07 - Coldplay - Yellow.flac'), {
    title: 'Coldplay - Yellow'.slice('Coldplay - '.length),
    artist: 'Coldplay',
  });
});

test('parseSongMetaFromFilename handles underscores and a bare title', () => {
  assert.deepEqual(parseSongMetaFromFilename('our_first_dance.m4a'), {
    title: 'our first dance',
    artist: '',
  });
  // A hyphen without surrounding spaces is part of the title, not a separator.
  assert.deepEqual(parseSongMetaFromFilename('well-worn.mp3'), { title: 'well-worn', artist: '' });
  assert.deepEqual(parseSongMetaFromFilename(''), { title: 'Untitled', artist: '' });
});

test('formatDuration pads seconds and copes with unknown values', () => {
  assert.equal(formatDuration(187), '3:07');
  assert.equal(formatDuration(0), '0:00');
  assert.equal(formatDuration(60), '1:00');
  assert.equal(formatDuration(null), '—');
  assert.equal(formatDuration(undefined), '—');
  assert.equal(formatDuration(Number.NaN), '—');
  assert.equal(formatDuration(-5), '—');
});

test('resolveCurrentSong prefers the pinned song, else the newest', () => {
  const songs = [
    { id: 'c', title: 'Newest' },
    { id: 'b', title: 'Middle' },
    { id: 'a', title: 'Oldest' },
  ];
  assert.equal(resolveCurrentSong(songs, 'b').id, 'b');
  assert.equal(resolveCurrentSong(songs, null).id, 'c');
  // Pinned song deleted on the other device: fall back rather than show nothing.
  assert.equal(resolveCurrentSong(songs, 'gone').id, 'c');
  assert.equal(resolveCurrentSong([], 'b'), null);
});

test('nextSongIndex / previousSongIndex wrap around the playlist', () => {
  assert.equal(nextSongIndex(0, 3), 1);
  assert.equal(nextSongIndex(2, 3), 0);
  assert.equal(nextSongIndex(-1, 3), 0);
  assert.equal(nextSongIndex(0, 0), -1);

  assert.equal(previousSongIndex(2, 3), 1);
  assert.equal(previousSongIndex(0, 3), 2);
  assert.equal(previousSongIndex(-1, 3), 2);
  assert.equal(previousSongIndex(0, 0), -1);
});

test('Migration 15: couple_songs has RLS, and only the uploader may delete', () => {
  const sql = read('supabase', 'migrations', '20261014000015_couple_songs_and_chat.sql');
  assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS public.couple_songs'));
  assert.ok(sql.includes('ALTER TABLE public.couple_songs ENABLE ROW LEVEL SECURITY;'));
  assert.ok(sql.includes('uploaded_by = auth.uid()'));
  assert.ok(sql.includes('public.is_couple_member(couple_id)'));
  // Pinning a song must not cascade a delete into the couple row.
  assert.ok(sql.includes('current_song_id UUID REFERENCES public.couple_songs(id) ON DELETE SET NULL'));
});

test('music.ts data layer targets couple_songs and the pinned-song column', () => {
  const src = read('src', 'lib', 'supabase', 'music.ts');
  assert.ok(src.includes("from('couple_songs')"));
  assert.ok(src.includes('export async function fetchSongsRemote'));
  assert.ok(src.includes('export async function createSongRemote'));
  assert.ok(src.includes('export async function deleteSongRemote'));
  assert.ok(src.includes('current_song_id'));
});

test('song upload goes through the signed Cloudinary flow, never a raw secret', () => {
  const src = read('src', 'lib', 'cloudinary', 'upload.ts');
  assert.ok(src.includes('export async function uploadSongToCloudinary'));
  assert.ok(src.includes('/api/media/sign-upload'));
  // Cloudinary treats audio as the 'video' resource type.
  assert.ok(src.includes("resourceType: 'video'"));
  assert.equal(src.includes('CLOUDINARY_API_SECRET'), false);
});
