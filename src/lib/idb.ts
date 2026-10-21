// Tiny IndexedDB helper for device-local binary data (voice notes, and demo
// mode's couple songs). Nothing here is synced to Supabase.

const DB_NAME = 'ourdiary-x';
// v2 added the songs store for demo mode. Bumping the version runs
// onupgradeneeded again on devices that already have v1, which creates the
// new store without touching existing voice notes.
const DB_VERSION = 2;
export const VOICE_STORE = 'voiceNotes';
export const SONG_STORE = 'coupleSongs';

export interface VoiceNoteRecord {
  id: string;
  memoryId: string;
  coupleId: string;
  authorId: 'user_1' | 'user_2';
  authorName: string;
  createdAt: string; // ISO
  durationSec: number;
  mimeType: string;
  blob: Blob;
}

export function isIndexedDbSupported(): boolean {
  return typeof window !== 'undefined' && 'indexedDB' in window;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (!isIndexedDbSupported()) return Promise.reject(new Error('IndexedDB is not available'));
  if (dbPromise) return dbPromise;
  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const req = window.indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(VOICE_STORE)) {
        const store = db.createObjectStore(VOICE_STORE, { keyPath: 'id' });
        store.createIndex('memoryId', 'memoryId', { unique: false });
      }
      if (!db.objectStoreNames.contains(SONG_STORE)) {
        const store = db.createObjectStore(SONG_STORE, { keyPath: 'id' });
        store.createIndex('coupleId', 'coupleId', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => {
      dbPromise = null;
      reject(req.error ?? new Error('Could not open IndexedDB'));
    };
  });
  return dbPromise;
}

function done<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function listVoiceNotes(memoryId: string, coupleId: string): Promise<VoiceNoteRecord[]> {
  const db = await openDb();
  const tx = db.transaction(VOICE_STORE, 'readonly');
  const rows = await done(tx.objectStore(VOICE_STORE).index('memoryId').getAll(memoryId) as IDBRequest<VoiceNoteRecord[]>);
  return rows
    .filter((r) => r.coupleId === coupleId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function saveVoiceNote(record: VoiceNoteRecord): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(VOICE_STORE, 'readwrite');
  await done(tx.objectStore(VOICE_STORE).put(record));
}

export async function deleteVoiceNote(id: string): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(VOICE_STORE, 'readwrite');
  await done(tx.objectStore(VOICE_STORE).delete(id));
}

// ---------------------------------------------------------------- Songs ---
// Demo mode only. A live couple space keeps songs on Cloudinary with their
// metadata in Supabase (src/lib/supabase/music.ts), so both partners hear
// the same playlist; here the file never leaves the device.

export interface LocalSongRecord {
  id: string;
  coupleId: string;
  title: string;
  artist: string;
  createdAt: string; // ISO
  durationSec: number | null;
  mimeType: string;
  blob: Blob;
}

export async function listSongs(coupleId: string): Promise<LocalSongRecord[]> {
  const db = await openDb();
  const tx = db.transaction(SONG_STORE, 'readonly');
  const rows = await done(
    tx.objectStore(SONG_STORE).index('coupleId').getAll(coupleId) as IDBRequest<LocalSongRecord[]>
  );
  return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function saveSong(record: LocalSongRecord): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(SONG_STORE, 'readwrite');
  await done(tx.objectStore(SONG_STORE).put(record));
}

export async function deleteSong(id: string): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(SONG_STORE, 'readwrite');
  await done(tx.objectStore(SONG_STORE).delete(id));
}
