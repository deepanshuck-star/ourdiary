// Quota-safe caching of a space in localStorage, which is a few megabytes at
// most.
//
// The whole diary used to be written with a bare setItem. Once a couple had
// a handful of photos stored as base64 data URLs — which the old upload path
// created, inlining a 4MB photo as ~5.5MB of text — the write threw
// QuotaExceededError, and because nothing caught it the exception came out of
// a useEffect inside DiaryProvider and took the entire app down on load.
//
// This cache is a warm-start convenience, nothing more: a live space refetches
// everything from Supabase anyway. So failing to write it must never be worse
// than a slightly slower first paint.
//
// Import-free, like the rest of src/lib's pure modules, so tests/cache-quota
// can load it under `node --test` — the runner cannot resolve the @/ alias.
// Hence the structural shapes below instead of OurDiaryData: they describe
// only the two places a photo can hide.

interface CachedPhoto {
  url?: string | null;
}

interface CachedMemory {
  photos?: CachedPhoto[] | null;
}

export interface CacheableSpace {
  memories?: CachedMemory[] | null;
  couple?: { photoUrl?: string | null } | null;
}

/** True for the quota error, whichever name the browser gives it. */
export function isQuotaError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { name?: string; code?: number };
  return (
    e.name === 'QuotaExceededError' ||
    e.name === 'NS_ERROR_DOM_QUOTA_REACHED' || // Firefox
    e.code === 22 ||
    e.code === 1014
  );
}

/**
 * The same space with inline base64 photos dropped.
 *
 * Those are the megabytes, and they are the one part the cache can afford to
 * lose: a live space reloads its photos from the database on the next fetch.
 * Everything else — memories, dates, notes, settings — is small and stays.
 */
export function slimForCache<T extends CacheableSpace>(data: T): T {
  return {
    ...data,
    memories: (data.memories || []).map((memory) => ({
      ...memory,
      photos: (memory.photos || []).filter((photo) => !isInlineImage(photo?.url)),
    })),
    couple: {
      ...data.couple,
      photoUrl: isInlineImage(data.couple?.photoUrl) ? undefined : data.couple?.photoUrl,
    },
  } as T;
}

function isInlineImage(url: string | null | undefined): boolean {
  return typeof url === 'string' && url.startsWith('data:');
}

/**
 * Writes the cache, degrading instead of throwing.
 *
 * Full copy first; on a quota failure, retry without the inline photos; if
 * even that will not fit, drop the key entirely rather than leave a stale
 * half-space behind. Returns what it managed to store, for callers that want
 * to log it.
 */
export function cacheDiaryData(key: string, data: CacheableSpace): 'full' | 'slim' | 'none' {
  if (typeof window === 'undefined') return 'none';

  try {
    window.localStorage.setItem(key, JSON.stringify(data));
    return 'full';
  } catch (err) {
    if (!isQuotaError(err)) return 'none';
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(slimForCache(data)));
    return 'slim';
  } catch {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // Storage is unusable entirely (private mode, blocked). Nothing to do.
    }
    return 'none';
  }
}
