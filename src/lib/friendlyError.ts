/**
 * Turns a raw Supabase/Postgres/auth error into a short, non-technical
 * message safe to show a user. The original error is still logged to the
 * console (dev tools only) for debugging, never rendered in the UI.
 */
export function friendlyAuthError(err: unknown, context: 'login' | 'signup' | 'couple' = 'login'): string {
  const raw = err instanceof Error ? err.message : typeof err === 'string' ? err : '';
  if (raw) console.error(`[OurDiary ${context} error]`, raw);

  const msg = raw.toLowerCase();

  if (msg.includes('invalid login credentials')) {
    return 'That email or password is incorrect. Please try again.';
  }
  if (msg.includes('email not confirmed')) {
    return 'Please confirm your email first — check your inbox for the confirmation link.';
  }
  if (msg.includes('user already registered') || msg.includes('already registered')) {
    return 'An account with this email already exists. Try signing in instead.';
  }
  if (msg.includes('password') && (msg.includes('short') || msg.includes('weak') || msg.includes('least'))) {
    return 'Please choose a stronger password (at least 6 characters).';
  }
  if (msg.includes('rate limit') || msg.includes('too many requests')) {
    return 'Too many attempts. Please wait a moment and try again.';
  }
  if (
    msg.includes('schema cache') ||
    msg.includes('relation') ||
    msg.includes('does not exist') ||
    msg.includes('permission denied') ||
    msg.includes('violates') ||
    msg.includes('constraint')
  ) {
    // Internal/database detail — never shown verbatim to the user.
    return "We're having trouble reaching your couple space right now. Please try again in a moment.";
  }
  if (msg.includes('invalid invite code')) {
    return 'Invalid invite code! Please check with your partner and try again.';
  }
  if (msg.includes('limited to exactly two')) {
    return 'This couple space is already full (strictly limited to 2 partners).';
  }
  if (msg.includes('already belong to a different couple')) {
    return "You're already part of a couple space.";
  }
  if (!raw) {
    return 'Something went wrong. Please try again.';
  }
  // Fallback: if the message doesn't look like it leaks internals, it's
  // usually a Supabase auth validation message safe enough to show as-is
  // (e.g. "Unable to validate email address: invalid format").
  const looksInternal = /sql|postgres|supabase|rls|row-level|fk|foreign key|column|table|schema|function/i.test(raw);
  return looksInternal ? 'Something went wrong. Please try again.' : raw;
}
