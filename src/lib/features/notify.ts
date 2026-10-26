// What each action says in the other person's feed. Pure — no React, no
// network, no secrets — see tests/notify.test.mjs.
//
// Every builder here returns a title and a destination only. The feed's own
// generic line (describe() in ./notifications) fills in the detail, so a
// notification never has to carry what was actually written. The one
// exception is a chat preview, which the couple has to switch on by hand.

import type { NotificationKind } from './notifications';

export interface NotifyPayload {
  kind: NotificationKind;
  title: string;
  /** Null unless the content was explicitly opted into (chat previews). */
  body: string | null;
  href: string | null;
}

/** The feed is read by the recipient, so an unknown actor is "your partner". */
const UNKNOWN_ACTOR = 'Your partner';

export function actorLabel(actorName?: string | null): string {
  return (typeof actorName === 'string' ? actorName.trim() : '') || UNKNOWN_ACTOR;
}

function payload(kind: NotificationKind, title: string, href: string | null): NotifyPayload {
  return { kind, title, body: null, href };
}

export function memoryAdded(actorName?: string | null): NotifyPayload {
  return payload('memory', `${actorLabel(actorName)} added a memory`, '/memories');
}

/** Shared notes only. A private note must not announce that it exists. */
export function noteAdded(actorName?: string | null): NotifyPayload {
  return payload('note', `${actorLabel(actorName)} left a note`, '/memories');
}

export function photoAdded(actorName?: string | null): NotifyPayload {
  return payload('photo', `${actorLabel(actorName)} added a photo`, '/memories');
}

export function eventAdded(actorName?: string | null): NotifyPayload {
  return payload('event', `${actorLabel(actorName)} added a calendar event`, '/calendar');
}

/** Title only — the letter's own words stay in the letter. */
export function letterSent(actorName?: string | null): NotifyPayload {
  return payload('letter', `${actorLabel(actorName)} wrote you a letter`, '/letters');
}

export function pingSent(actorName?: string | null): NotifyPayload {
  return payload('ping', `${actorLabel(actorName)} is thinking of you`, '/dashboard');
}

export function hugSent(actorName?: string | null): NotifyPayload {
  return payload('hug', `${actorLabel(actorName)} sent you a hug`, '/dashboard');
}

export function moodUpdated(actorName?: string | null): NotifyPayload {
  return payload('mood', `${actorLabel(actorName)} updated their mood`, '/dashboard');
}

/**
 * The preview comes from previewFor(), which already returns null when the
 * couple has previews off. Anything blank is normalised back to null so the
 * feed falls through to its generic line rather than showing an empty row.
 */
export function messageSent(actorName?: string | null, preview?: string | null): NotifyPayload {
  const body = typeof preview === 'string' ? preview.trim() : '';
  return {
    kind: 'message',
    title: `${actorLabel(actorName)} sent you a message`,
    body: body || null,
    href: '/chat',
  };
}
