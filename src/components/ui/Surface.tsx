'use client';

import React from 'react';
import { cn } from '@/lib/cn';

/**
 * The surfaces the cinematic language is built from.
 *
 * One rule runs through all of them: a plane is read as lifted because it is
 * fractionally brighter than the page and carries a hairline of light along
 * its top edge — not because it is outlined. On a dark field an obvious
 * border reads as a sticker rather than a surface, and more importantly it
 * competes with the photographs, which is what this app is mostly made of.
 */

export type CardTone = 'plain' | 'glow' | 'flat';

const TONES: Record<CardTone, string> = {
  // The default lifted plane.
  plain: 'panel edge-lit',
  // Carries the hero wash — for the one card that should feel lit from within.
  glow: 'bg-hero border border-line shadow-card edge-lit',
  // Recessed: darker than the page, for wells and empty states.
  flat: 'bg-canvas border border-line',
};

export interface CardProps extends React.HTMLAttributes<HTMLElement> {
  tone?: CardTone;
  /** Lifts and warms its edge on hover; only for cards that are themselves a link or button. */
  interactive?: boolean;
  /** A card is often a list item or a landmark, not always a div. */
  as?: 'div' | 'section' | 'article' | 'li';
}

export function Card({
  tone = 'plain',
  interactive = false,
  as: Tag = 'div',
  className,
  children,
  ...rest
}: CardProps) {
  return (
    <Tag
      className={cn(
        'rounded-2xl overflow-hidden',
        TONES[tone],
        interactive && 'lift cursor-pointer',
        className
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}

export type ChipTone = 'muted' | 'primary' | 'accent' | 'solid';

const CHIP_TONES: Record<ChipTone, string> = {
  // Barely there: a label, not an object.
  muted: 'bg-ink/5 text-ink-muted border border-line',
  primary: 'bg-primary/15 text-primary border border-primary/30',
  accent: 'bg-secondary/15 text-secondary border border-secondary/30',
  solid: 'bg-beam border border-transparent',
};

/** A small translucent label. Tinted glass rather than a painted block. */
export function Chip({
  tone = 'muted',
  className,
  children,
  ...rest
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: ChipTone }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1 rounded-full',
        'text-[11px] font-semibold tracking-wide leading-none',
        CHIP_TONES[tone],
        className
      )}
      {...rest}
    >
      {children}
    </span>
  );
}

/**
 * A page or section heading.
 *
 * The eyebrow was repeated as the same long class string on every page; it
 * belongs in one place now that its styling is part of the language.
 */
export function SectionHeader({
  eyebrow,
  title,
  description,
  actions,
  id,
  className,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  id?: string;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-wrap items-end justify-between gap-4', className)}>
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
            {eyebrow}
          </p>
        )}
        <h2
          id={id}
          className="font-display text-2xl sm:text-3xl font-normal tracking-tight text-ink mt-1.5"
        >
          {title}
        </h2>
        {description && <p className="text-sm text-ink-muted mt-2 max-w-2xl">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
    </div>
  );
}

/**
 * A labelled form control. The label is tied to the input and the error is
 * announced, which several of the hand-rolled forms were inconsistent about.
 */
export function Field({
  id,
  label,
  hint,
  error,
  children,
  className,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string | null;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={id} className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-[11px] text-ink-muted">{hint}</p>}
      {error && (
        <p role="alert" className="text-xs font-semibold text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * The shared input face. Recessed rather than raised — a text box is
 * something you type into, so it reads as a well cut out of the panel, and
 * the focus ring is the only light it carries.
 */
export const inputClass =
  'w-full px-4 py-3 rounded-xl bg-canvas text-ink text-sm border border-line ' +
  'placeholder:text-ink-muted/50 focus:outline-none focus:border-primary/60 ' +
  'focus:shadow-[0_0_24px_-8px_var(--color-primary)] transition-all';
