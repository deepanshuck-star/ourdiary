'use client';

import React from 'react';
import { useDiary } from '@/store/DiaryContext';
import { SecureImage } from '@/components/ui/SecureImage';
import { useLiveRoomContext } from '@/components/providers/LiveRoomProvider';
import { FloatingReactions } from './FloatingReactions';
import { PresenceTag } from './PresenceTag';
import { ReactionBar } from './ReactionBar';

/**
 * Sits above every open game: who else is on this game screen right now, and
 * a row of reactions that float up both phones. Reads the room opened by the
 * games page, so the game below it shares the same channel.
 */
export function GameRoomBar() {
  const { partnerProfile } = useDiary();
  const room = useLiveRoomContext();

  return (
    <>
      <div className="rounded-2xl border border-line bg-surface p-3 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <SecureImage
            src={partnerProfile.avatar}
            alt=""
            className="w-9 h-9 rounded-full object-cover ring-2 ring-line shrink-0"
          />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink truncate leading-tight">{partnerProfile.name}</p>
            {room.available ? (
              <PresenceTag available here={room.partnerHere} where="this game" />
            ) : (
              <p className="text-[10px] text-ink-muted leading-tight">
                Reactions appear on both screens when you’re both signed in.
              </p>
            )}
          </div>
        </div>
        <ReactionBar onReact={room.sendReaction} label="Send a reaction to your partner" />
      </div>
      <FloatingReactions reactions={room.reactions} myId={room.myId} />
    </>
  );
}
