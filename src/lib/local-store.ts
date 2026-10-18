'use client';

import { useCallback, useSyncExternalStore } from 'react';

// Device-local state for the "additional features" (streaks, quizzes, budget, ...).
// Stored in localStorage only — never synced to Supabase — and shared live between
// every component that reads the same key (and across tabs via the storage event).

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

export function writeLocal<T>(key: string, value: T) {
  cache.set(key, value);
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Quota exceeded / private mode: value still lives in memory for this visit.
  }
  emit();
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
