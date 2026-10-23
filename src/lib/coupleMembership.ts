'use client';

// ---------------------------------------------------------------------------
// Which diary is open.
//
// The upload signer runs on the server and cannot see React state, so the
// browser has to tell it which space a file belongs to. It used to infer the
// space from the caller's single membership; with a personal diary alongside
// a couple one there is no single membership to infer.
//
// Same shape as setSyncContext in src/lib/local-store.ts: a module-level
// value DiaryContext keeps current, readable from a plain function.
// ---------------------------------------------------------------------------

let activeCoupleId: string | null = null;

export function setActiveCoupleId(coupleId: string | null): void {
  activeCoupleId = coupleId || null;
}

export function getActiveCoupleId(): string | null {
  return activeCoupleId;
}
