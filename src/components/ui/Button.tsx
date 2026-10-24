'use client';

import React from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';

/**
 * The button, rebuilt for the cinematic language.
 *
 * On a dark field a solid flat fill reads as a hole rather than a control,
 * so the primary action is a gradient that carries its own light and throws
 * a coloured bloom. The bloom grows on hover and the face lifts 2px — the
 * feedback is the light changing, not a border moving, which is what keeps
 * it feeling like a lit surface rather than a sticker.
 *
 * Secondary actions deliberately have almost no chrome. On a dark screen
 * every outlined box competes with the photographs, and the photographs are
 * the point.
 */

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

const BASE =
  'relative inline-flex items-center justify-center gap-2 font-semibold tracking-tight ' +
  'rounded-full select-none bloom ' +
  'disabled:opacity-40 disabled:pointer-events-none disabled:shadow-none';

const VARIANTS: Record<ButtonVariant, string> = {
  // The one lit object on the screen.
  primary: 'bg-beam shadow-cta',
  // Carries the violet rather than the rose, for a second action of equal weight.
  secondary: 'bg-secondary text-on-primary shadow-cta',
  // A lifted plane: visible, but it does not glow.
  outline: 'bg-surface text-ink border border-line shadow-sm',
  // No chrome at all. For tertiary actions inside an already-lifted panel.
  ghost: 'bg-transparent text-ink-muted hover:text-ink shadow-none hover:shadow-none',
  danger: 'bg-danger text-white shadow-sm',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'text-xs px-4 py-2',
  md: 'text-sm px-6 py-2.5',
  lg: 'text-base px-8 py-3.5',
};

interface CommonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Shows a spinner and blocks interaction. */
  loading?: boolean;
  block?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export type ButtonProps = CommonProps &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'children'>;

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  block = false,
  className,
  children,
  disabled,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      // Tells assistive tech the control is busy rather than just dead.
      aria-busy={loading || undefined}
      className={cn(BASE, VARIANTS[variant], SIZES[size], block && 'w-full', className)}
      {...rest}
    >
      {loading && <Loader2 className="w-4 h-4 motion-safe:animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
}

export type ButtonLinkProps = CommonProps &
  Omit<React.ComponentProps<typeof Link>, 'className' | 'children'>;

/** The same face on a real link, so navigation stays navigation. */
export function ButtonLink({
  variant = 'primary',
  size = 'md',
  block = false,
  className,
  children,
  ...rest
}: ButtonLinkProps) {
  return (
    <Link
      className={cn(BASE, VARIANTS[variant], SIZES[size], block && 'w-full', className)}
      {...rest}
    >
      {children}
    </Link>
  );
}

/**
 * A round button for a lone icon. `label` is required — an icon button with
 * no accessible name is invisible to a screen reader, and these are used for
 * destructive things like unsend and delete.
 */
export interface IconButtonProps extends Omit<ButtonProps, 'children' | 'size' | 'block'> {
  label: string;
  size?: ButtonSize;
  children: React.ReactNode;
}

const ICON_SIZES: Record<ButtonSize, string> = {
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-12 h-12',
};

export function IconButton({
  label,
  variant = 'outline',
  size = 'md',
  className,
  children,
  ...rest
}: IconButtonProps) {
  return (
    <Button
      variant={variant}
      size={size}
      aria-label={label}
      title={label}
      className={cn('p-0', ICON_SIZES[size], className)}
      {...rest}
    >
      {children}
    </Button>
  );
}
