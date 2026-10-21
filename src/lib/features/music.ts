// Pure helpers for the couple soundtrack. No React, no network — so the
// validation and parsing rules can be tested directly (tests/music.test.mjs).

/** 20MB covers a ~5 minute MP3 at 320kbps with room to spare. */
export const MAX_SONG_BYTES = 20 * 1024 * 1024;

/**
 * Audio types we accept. Browsers disagree on what they report for the same
 * file — Windows often sends `audio/mp3` where everything else sends
 * `audio/mpeg` — so the extension is checked as a fallback below.
 */
export const ACCEPTED_AUDIO_TYPES = [
  'audio/mpeg',
  'audio/mp3',
  'audio/mp4',
  'audio/m4a',
  'audio/x-m4a',
  'audio/aac',
  'audio/ogg',
  'audio/wav',
  'audio/x-wav',
  'audio/webm',
  'audio/flac',
];

export const ACCEPTED_AUDIO_EXTENSIONS = ['mp3', 'm4a', 'aac', 'ogg', 'oga', 'wav', 'webm', 'flac'];

export function extensionOf(filename: string): string {
  const dot = filename.lastIndexOf('.');
  if (dot <= 0 || dot === filename.length - 1) return '';
  return filename.slice(dot + 1).toLowerCase();
}

export function isAudioFile(file: { name: string; type: string }): boolean {
  if (file.type && ACCEPTED_AUDIO_TYPES.includes(file.type.toLowerCase())) return true;
  // Some browsers hand over an empty or generic type for audio picked from
  // disk, so fall back to the extension rather than rejecting a valid MP3.
  return ACCEPTED_AUDIO_EXTENSIONS.includes(extensionOf(file.name));
}

/** Returns an error message, or null when the file is fine to upload. */
export function validateSongFile(
  file: { name: string; type: string; size: number },
  maxBytes: number = MAX_SONG_BYTES
): string | null {
  if (!isAudioFile(file)) {
    return 'Please choose an audio file (MP3, M4A, WAV, OGG or FLAC).';
  }
  if (file.size === 0) {
    return 'That file is empty.';
  }
  if (file.size > maxBytes) {
    return `That song is too large (max ${Math.round(maxBytes / (1024 * 1024))}MB).`;
  }
  return null;
}

/**
 * Best-effort title/artist from a filename, so the upload form starts
 * pre-filled instead of blank. Handles the two conventions music files
 * actually use: "Artist - Title" and "01. Artist - Title".
 */
export function parseSongMetaFromFilename(filename: string): { title: string; artist: string } {
  const ext = extensionOf(filename);
  let base = ext ? filename.slice(0, filename.length - ext.length - 1) : filename;

  // Strip a leading track number: "01 ", "01. ", "01 - ".
  base = base.replace(/^\s*\d{1,3}\s*[-.)]?\s+/, '');
  // Underscores and dots are stand-ins for spaces in a lot of filenames.
  base = base.replace(/[_]+/g, ' ').replace(/\s+/g, ' ').trim();

  const dash = base.indexOf(' - ');
  if (dash > 0) {
    const artist = base.slice(0, dash).trim();
    const title = base.slice(dash + 3).trim();
    if (artist && title) return { title, artist };
  }
  return { title: base || 'Untitled', artist: '' };
}

/** "3:07" from 187 seconds. Returns an em dash when the duration is unknown. */
export function formatDuration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || !Number.isFinite(seconds) || seconds < 0) return '—';
  const whole = Math.round(seconds);
  const mins = Math.floor(whole / 60);
  const secs = whole % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}
