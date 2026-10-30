'use client';

import React from 'react';
import {
  ACCESSORIES,
  ACCESSORY_LABEL,
  EXPRESSIONS,
  EXPRESSION_LABEL,
  HAIR_COLORS,
  HAIR_LABEL,
  HAIR_STYLES,
  NICKNAME_MAX,
  OUTFITS,
  PETS,
  PET_LABEL,
  SKIN_TONES,
  setPet,
  updateOwnAvatar,
  type Avatar,
  type Slot,
} from '@/lib/world/avatar';
import { Figure, PetFigure, W, useWorldAvatars } from './kit';

/** A large portrait of one figure, drawn by the same code as the world. */
export function AvatarPortrait({ avatar, name, size = 160 }: { avatar: Avatar; name: string; size?: number }) {
  return (
    <svg viewBox="-30 360 60 80" width={size} height={(size * 80) / 60} role="img" aria-label={`${name}'s figure in your world`} className="block">
      <rect x={-30} y={360} width={60} height={80} rx={10} fill="#F3EDE2" />
      <ellipse cx={0} cy={434} rx={18} ry={3} fill="#E2D8C8" />
      <Figure avatar={avatar} x={0} y={416} name={name} />
    </svg>
  );
}

function Swatches({ label, options, value, onPick }: { label: string; options: readonly string[]; value: string; onPick: (v: string) => void }) {
  return (
    <fieldset>
      <legend className="text-[11px] font-bold uppercase tracking-wider mb-1.5" style={{ color: W.inkSoft }}>
        {label}
      </legend>
      <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
        {options.map((c, i) => (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={value === c}
            aria-label={`${label} ${i + 1}`}
            onClick={() => onPick(c)}
            className="w-8 h-8 rounded-full border-2 focus:outline-none focus-visible:ring-2"
            style={{ background: c, borderColor: value === c ? W.ink : '#E7DCCB', boxShadow: value === c ? `0 0 0 2px ${W.paper} inset` : undefined }}
          />
        ))}
      </div>
    </fieldset>
  );
}

function Pills<T extends string>({ label, options, labels, value, onPick }: { label: string; options: readonly T[]; labels: Record<T, string>; value: T; onPick: (v: T) => void }) {
  return (
    <fieldset>
      <legend className="text-[11px] font-bold uppercase tracking-wider mb-1.5" style={{ color: W.inkSoft }}>
        {label}
      </legend>
      <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <button
            key={o}
            type="button"
            role="radio"
            aria-checked={value === o}
            onClick={() => onPick(o)}
            className="px-3 py-1.5 rounded-full text-xs font-semibold border focus:outline-none focus-visible:ring-2"
            style={value === o ? { background: W.ink, color: W.paper, borderColor: W.ink } : { background: W.paper, color: W.ink, borderColor: '#DCCFBC' }}
          >
            {labels[o]}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

/**
 * Edit your own figure. Only your own: the editor is given your slot and
 * writes only to it, so neither partner can change how the other appears.
 */
export function AvatarEditor({ mySlot, myName }: { mySlot: Slot; myName: string }) {
  const [avatars, setAvatars] = useWorldAvatars();
  const mine = avatars[mySlot];
  const change = (changes: Partial<Avatar>) => setAvatars(updateOwnAvatar(avatars, mySlot, changes));
  // The nickname is a draft while you type and saved when you leave the
  // field: saving cleans it, and cleaning trims, so saving per keystroke
  // made it impossible to type a space between two words.
  const [nickDraft, setNickDraft] = React.useState(mine.nickname);
  const [editingNick, setEditingNick] = React.useState(false);
  const commitNick = () => {
    setEditingNick(false);
    if (nickDraft !== mine.nickname) change({ nickname: nickDraft });
  };

  return (
    <div className="space-y-5">
      <div className="flex justify-center">
        <AvatarPortrait avatar={mine} name={myName} size={150} />
      </div>
      <Swatches label="Skin" options={SKIN_TONES} value={mine.skin} onPick={(skin) => change({ skin })} />
      <Pills label="Hair" options={HAIR_STYLES} labels={HAIR_LABEL} value={mine.hair} onPick={(hair) => change({ hair })} />
      <Swatches label="Hair colour" options={HAIR_COLORS} value={mine.hairColor} onPick={(hairColor) => change({ hairColor })} />
      <Swatches label="Clothes" options={OUTFITS} value={mine.outfit} onPick={(outfit) => change({ outfit })} />
      <Pills label="Something extra" options={ACCESSORIES} labels={ACCESSORY_LABEL} value={mine.accessory} onPick={(accessory) => change({ accessory })} />
      <Pills label="Expression" options={EXPRESSIONS} labels={EXPRESSION_LABEL} value={mine.expression} onPick={(expression) => change({ expression })} />
      <label className="block">
        <span className="block text-[11px] font-bold uppercase tracking-wider mb-1.5" style={{ color: W.inkSoft }}>
          Nickname in the world
        </span>
        <input
          value={editingNick ? nickDraft : mine.nickname}
          maxLength={NICKNAME_MAX}
          onFocus={() => {
            setNickDraft(mine.nickname);
            setEditingNick(true);
          }}
          onChange={(e) => setNickDraft(e.target.value)}
          onBlur={commitNick}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          }}
          placeholder="Optional"
          className="w-full rounded-xl border px-3 py-2 text-sm"
          style={{ borderColor: '#DCCFBC', background: '#FFFDF9', color: W.ink }}
        />
      </label>
    </div>
  );
}

/** The pet belongs to both of you, so either of you can choose. */
export function PetChooser() {
  const [avatars, setAvatars] = useWorldAvatars();
  return (
    <div className="flex items-center gap-4">
      <svg viewBox="-30 -18 60 30" width={112} height={56} aria-hidden="true">
        <rect x={-30} y={-18} width={60} height={30} rx={8} fill="#F3EDE2" />
        <PetFigure pet={avatars.pet} x={0} y={0} night={false} />
      </svg>
      <Pills label="Your pet" options={PETS} labels={PET_LABEL} value={avatars.pet} onPick={(pet) => setAvatars(setPet(avatars, pet))} />
    </div>
  );
}
