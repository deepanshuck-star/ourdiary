import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Join class names, with later Tailwind utilities beating earlier ones.
 *
 * Both packages were already dependencies but nothing used them. The UI
 * primitives need it: a caller passing `className="rounded-full"` has to be
 * able to beat the variant's own `rounded-2xl` rather than landing in an
 * undefined order fight with it.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
