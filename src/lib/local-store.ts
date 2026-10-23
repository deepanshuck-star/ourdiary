'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { fetchFeatureStateRemote, upsertFeatureStateRemote } from '@/lib/supabase/xsync';

// Device-local state for the "additional features" (streaks, quizzes, budget, ...).
// Most keys are localStorage-only and stay that way. A specific allowlist of
// prefixes (below) is ALSO synced to Supabase, so both partners' devices see
// the same data — see SYNCED_SHARED_PREFIXES / SYNCED_OWNED_PREFIX.

const PREFIX = 'ourdiary-x:';
const listeners = new Set<() => void>();
const cache = new Map<string, unknown>();
const fallbacks = new Map<string, unknown>();

function stableFallback<T>(key: string, fallback: T): T {
  if (!fallbacks.has(key)) fallbacks.set(key, fallback);
  return fallbacks.get(key) as T;
}

function read<T>(key: string, fallback: T): T {
  if (cache.has(key)) return cache.get(key) as T;
  let value = stableFallback(key, fallback);
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    if (raw !== null) value = JSON.parse(raw) as T;
  } catch {
    // Blocked storage or bad JSON: fall back to the default.
  }
  cache.set(key, value);
  return value;
}

function emit() {
  listeners.forEach((listener) => listener());
}

/** Write to the local cache/localStorage without pushing to Supabase (used to apply a remote fetch). */
function applyLocal<T>(key: string, value: T) {
  cache.set(key, value);
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Quota exceeded / private mode.
  }
  emit();
}

// ============================================================================
// Cross-device sync — a specific allowlist of key prefixes only. Everything
// else (3D view toggles, which quiz tab is open, gallery grid/ring choice,
// etc.) stays purely local, unchanged.
// ============================================================================

const SYNCED_SHARED_PREFIXES = [
  'mood-history:',
  'dateIdeas:votes:',
  'dateIdeas:custom:',
  'dateIdeas:planned:',
  'countdowns:custom:',
  'budget:',
  'surprises:',
  'games:',
  // Long-distance: each partner's time zone and home city. These have to
  // cross devices or none of the sleep-aware features can work — "deliver
  // when they wake" needs to know when their morning is, and that lives on
  // their phone, not mine.
  'longDistance:',
  'carePackages:',
  'trips:',
  'photoOfDay:',
  'morningMail:',
];
const SYNCED_OWNED_PREFIX = 'quiz:';

export function isSyncedKey(key: string): boolean {
  return key.startsWith(SYNCED_OWNED_PREFIX) || SYNCED_SHARED_PREFIXES.some((p) => key.startsWith(p));
}
export function isOwnedKey(key: string): boolean {
  return key.startsWith(SYNCED_OWNED_PREFIX);
}

interface SyncContext {
  supabase: ReturnType<typeof getSupabaseBrowserClient>;
  coupleId: string;
  userId: string;
  /** This device's own role slot ('user_1' | 'user_2'), used to tell "my quiz
   * progress" apart from "my partner's quiz progress" in the same key scheme. */
  mySlot: 'user_1' | 'user_2';
}

let syncCtx: SyncContext | null = null;
let syncedCoupleId: string | null = null;
let onSyncError: ((message: string) => void) | null = null;

/** Lets the app (which has a toast system) learn about background sync failures. */
export function setSyncErrorHandler(handler: ((message: string) => void) | null) {
  onSyncError = handler;
}

/**
 * Called by DiaryContext once a live couple space is loaded (and again if the
 * couple or the signed-in user changes). Triggers one fetch of every synced
 * feature-state row for this couple; subsequent writes push automatically.
 */
export function setSyncContext(ctx: { coupleId: string; userId: string; mySlot: 'user_1' | 'user_2' } | null) {
  if (!ctx) {
    // Logging out (or switching accounts): drop the in-memory cache for
    // every synced key too, not just localStorage — otherwise the next
    // login could briefly show the previous user's data from memory before
    // the fresh fetch lands, or skip the fetch entirely if it's the same
    // couple id reused by a different session.
    syncCtx = null;
    syncedCoupleId = null;
    for (const key of Array.from(cache.keys())) {
      if (isSyncedKey(key)) cache.delete(key);
    }
    return;
  }
  const supabase = getSupabaseBrowserClient();
  if (!supabase) {
    syncCtx = null;
    return;
  }
  syncCtx = { supabase, coupleId: ctx.coupleId, userId: ctx.userId, mySlot: ctx.mySlot };

  if (syncedCoupleId === ctx.coupleId) return; // already fetched this couple's state this session
  syncedCoupleId = ctx.coupleId;

  fetchFeatureStateRemote(supabase, ctx.coupleId)
    .then((rows) => {
      for (const row of rows) {
        // The row's feature_key IS the exact local key string it was saved
        // under (including any trailing :user_1/:user_2 slot), so no
        // translation is needed — just write it straight into the cache.
        applyLocal(row.featureKey, row.data);
      }
    })
    .catch((err) => {
      console.error('[OurDiary] Failed to load synced feature data:', err);
      onSyncError?.("Couldn't load some of your saved data from the server — showing what's on this device.");
    });
}

function pushToSupabase(key: string, value: unknown) {
  if (!syncCtx || !isSyncedKey(key)) return;
  if (isOwnedKey(key)) {
    // Only push the slot that's actually mine — I have no write access to my
    // partner's row anyway (enforced by RLS), so don't even try.
    if (!key.endsWith(':' + syncCtx.mySlot)) return;
  }
  const ownerUserId = isOwnedKey(key) ? syncCtx.userId : null;
  const supabase = syncCtx.supabase;
  if (!supabase) return;
  upsertFeatureStateRemote(supabase, syncCtx.coupleId, key, ownerUserId, value).catch((err) => {
    console.error(`[OurDiary] Failed to sync "${key}" to the server:`, err);
    onSyncError?.("Couldn't sync this change to the server — it's only on this device for now.");
  });
}

export function writeLocal<T>(key: string, value: T) {
  applyLocal(key, value);
  pushToSupabase(key, value);
}

export function readLocal<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  return read(key, fallback);
}

export function useLocalState<T>(
  key: string,
  fallback: T
): [T, (next: T | ((prev: T) => T)) => void] {
  const subscribe = useCallback(
    (onChange: () => void) => {
      listeners.add(onChange);
      const onStorage = (e: StorageEvent) => {
        if (e.key === PREFIX + key) {
          cache.delete(key);
          onChange();
        }
      };
      window.addEventListener('storage', onStorage);
      return () => {
        listeners.delete(onChange);
        window.removeEventListener('storage', onStorage);
      };
    },
    [key]
  );

  const value = useSyncExternalStore(
    subscribe,
    () => read(key, fallback),
    () => stableFallback(key, fallback)
  );

  const setValue = useCallback(
    (next: T | ((prev: T) => T)) => {
      const prev = read(key, fallback);
      const resolved = typeof next === 'function' ? (next as (p: T) => T)(prev) : next;
      writeLocal(key, resolved);
    },
    [key, fallback]
  );

  return [value, setValue];
}
