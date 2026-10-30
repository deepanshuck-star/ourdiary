'use client';

import React from 'react';
import Link from 'next/link';
import { useDiary } from '@/store/DiaryContext';
import { usePresence } from '@/components/providers/PresenceProvider';
import type { Slot } from '@/lib/world/avatar';
import { W, useWorldAvatars } from './kit';
import { AvatarEditor, AvatarPortrait, PetChooser } from './AvatarEditor';
import { PlacePanel } from './PlaceFrame';

const LINKS = [
  { href: '/our-stats', label: 'Love stats', blurb: 'Your story in numbers' },
  { href: '/long-distance', label: 'Long distance', blurb: 'Time zones, the miles between, and when you next see each other' },
  { href: '/countdowns', label: 'Countdowns', blurb: 'Days until the dates that matter' },
  { href: '/coupons', label: 'Love coupons', blurb: 'Little promises, redeemable' },
  { href: '/world', label: 'Your world', blurb: 'Every place in your little world' },
];

/**
 * Us: the two of you as you appear in the world. Each partner shapes only
 * their own figure; the other is shown as they chose it.
 */
export function UsPage() {
  const { data, activeProfile, partnerProfile } = useDiary();
  const { available, partnerOnline, label } = usePresence();
  const [avatars] = useWorldAvatars();
  const mySlot = data.activeProfileId as Slot;
  const partnerSlot: Slot = mySlot === 'user_1' ? 'user_2' : 'user_1';
  const partnerAvatar = avatars[partnerSlot];

  return (
    <div className="space-y-5">
      <header className="rounded-[2rem] border px-6 py-6" style={{ background: W.paper, borderColor: '#E7DCCB', color: W.ink }}>
        <h1 className="lw-handwritten text-4xl leading-none">Us</h1>
        <p className="mt-2 text-sm leading-relaxed" style={{ color: W.inkSoft }}>
          How the two of you appear in your little world. You shape yours; {partnerProfile.name} shapes theirs.
        </p>
      </header>

      <div className="grid lg:grid-cols-2 gap-5">
        <PlacePanel title={`You, ${activeProfile.name}`}>
          <AvatarEditor mySlot={mySlot} myName={activeProfile.name} />
        </PlacePanel>
        <div className="space-y-5">
          <PlacePanel title={partnerProfile.name}>
            <div className="flex items-center gap-5">
              <AvatarPortrait avatar={partnerAvatar} name={partnerProfile.name} size={120} />
              <div className="min-w-0 space-y-2">
                {partnerAvatar.nickname && (
                  <p className="lw-handwritten text-2xl leading-none">“{partnerAvatar.nickname}”</p>
                )}
                <p className="text-sm leading-relaxed" style={{ color: W.inkSoft }}>
                  This is how {partnerProfile.name} chose to look. Only they can change it.
                </p>
                {/* Real presence only — never implied by the picture. */}
                {available && (
                  <p className="text-xs font-semibold" style={{ color: partnerOnline ? '#245C58' : W.inkSoft }}>
                    {label.text}
                  </p>
                )}
              </div>
            </div>
          </PlacePanel>
          <PlacePanel title="A companion">
            <PetChooser />
            <p className="mt-3 text-[11px]" style={{ color: W.inkSoft }}>
              The pet belongs to both of you, so either of you can choose. It sleeps in your garden.
            </p>
          </PlacePanel>
          <PlacePanel title="More of us">
            <ul className="space-y-1.5">
              {LINKS.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="block rounded-xl border px-3 py-2" style={{ borderColor: '#E7DCCB', background: '#FFFDF9', color: W.ink }}>
                    <span className="block text-sm font-semibold">{l.label}</span>
                    <span className="block text-[11px]" style={{ color: W.inkSoft }}>
                      {l.blurb}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </PlacePanel>
        </div>
      </div>
    </div>
  );
}

export default UsPage;
