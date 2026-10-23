'use client';

import { useMemo } from 'react';
import { useDiary } from '@/store/DiaryContext';
import { useCoupleMembers } from '@/hooks/useCoupleMembers';
import {
  gameAllowed,
  personalNote,
  reasonFor,
  routeAccess,
  titleFor,
  waitingCount,
  widgetAccess,
  type Access,
  type SpaceContext,
  type SpaceKind,
} from '@/lib/features/spaceMode';

export interface SpaceModeApi extends SpaceContext {
  kind: SpaceKind;
  hasPartner: boolean;
  loading: boolean;
  isPersonal: boolean;
  myId: string | null;
  partnerId: string | null;
  /** How many routes a couple diary is still waiting on. */
  waiting: number;
  access: (href: string) => Access;
  widget: (name: string) => Access;
  /** Shorthand: is this widget renderable at all right now? */
  showWidget: (name: string) => boolean;
  reason: (href: string) => string | null;
  note: (href: string) => string | null;
  title: (href: string, fallback: string) => string;
  allowsGame: (requires: readonly string[] | undefined) => boolean;
}

/**
 * The single answer to "what is this diary, and who is in it".
 *
 * Everything that hides, adapts or waits reads from here, so the three
 * states in spaceMode.ts are decided in one place rather than re-derived
 * page by page.
 */
export function useSpaceMode(): SpaceModeApi {
  const { data } = useDiary();
  const { myId, partnerId, loading } = useCoupleMembers();

  // Spaces created before migration 20 have no `kind`; the column defaults
  // to 'couple' and so does this, so existing diaries are untouched.
  const kind: SpaceKind = data.couple.kind === 'personal' ? 'personal' : 'couple';
  const hasPartner = Boolean(partnerId);

  const ctx = useMemo<SpaceContext>(
    () => ({ kind, hasPartner, loading }),
    [kind, hasPartner, loading]
  );

  return useMemo<SpaceModeApi>(
    () => ({
      kind,
      hasPartner,
      loading,
      isPersonal: kind === 'personal',
      myId,
      partnerId,
      waiting: waitingCount(ctx),
      access: (href) => routeAccess(href, ctx),
      widget: (name) => widgetAccess(name, ctx),
      showWidget: (name) => widgetAccess(name, ctx) !== 'hidden',
      reason: reasonFor,
      note: (href) => (kind === 'personal' ? personalNote(href) : null),
      title: (href, fallback) => titleFor(href, ctx, fallback),
      allowsGame: (requires) => gameAllowed(requires, ctx),
    }),
    [ctx, kind, hasPartner, loading, myId, partnerId]
  );
}
