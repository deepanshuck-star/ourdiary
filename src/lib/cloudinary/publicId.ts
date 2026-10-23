// Recovering a Cloudinary public_id from a delivery URL.
//
// Deleting an asset needs its public_id, but the app has historically stored
// only the URL for avatars and the couple photo. Rather than add columns and
// leave every existing row undeletable, the id is parsed back out of the URL
// — the mapping is well defined and this works retroactively.
//
// Pure, no network: see tests/cloudinary-public-id.test.mjs.

/** Transformation segments sit between `upload` and the version/public id. */
function isTransformationSegment(segment: string): boolean {
  // Transformations are comma-separated `k_v` pairs: `w_400,h_400,c_fill`.
  // A bare folder name never looks like that.
  return /^[a-z]{1,3}_[^/]+$/.test(segment.split(',')[0] ?? '');
}

/**
 * `https://res.cloudinary.com/demo/image/upload/v173/ourdiary/abc/song.mp3`
 *   -> `ourdiary/abc/song`
 *
 * Returns null for anything that isn't a Cloudinary delivery URL, so callers
 * can skip the delete rather than guess at an id.
 */
export function publicIdFromCloudinaryUrl(url: string | null | undefined): string | null {
  if (!url) return null;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (!/(^|\.)cloudinary\.com$/i.test(parsed.hostname)) return null;

  const segments = parsed.pathname.split('/').filter(Boolean);
  const uploadAt = segments.indexOf('upload');
  if (uploadAt === -1) return null;

  let rest = segments.slice(uploadAt + 1);

  // Drop any transformation segments, then the version marker (`v1730000000`).
  while (rest.length > 0 && isTransformationSegment(rest[0])) rest = rest.slice(1);
  if (rest.length > 0 && /^v\d+$/.test(rest[0])) rest = rest.slice(1);
  if (rest.length === 0) return null;

  const withExtension = rest.join('/');
  // The public_id excludes the format extension, but a folder name may well
  // contain a dot — so only strip a dot in the final segment.
  const lastSlash = withExtension.lastIndexOf('/');
  const lastDot = withExtension.lastIndexOf('.');
  const publicId = lastDot > lastSlash ? withExtension.slice(0, lastDot) : withExtension;

  return decodeURIComponent(publicId) || null;
}

/**
 * Whether a public_id lives in this couple's own folder. The upload signer
 * puts every asset under `ourdiary/<coupleId>/`, so this is what authorizes
 * a delete — without it, a caller could pass any id and wipe another
 * couple's media.
 */
export function isOwnedByCouple(publicId: string, coupleId: string): boolean {
  if (!publicId || !coupleId) return false;
  // Reject traversal before comparing: `ourdiary/<id>/../<other>` would
  // otherwise pass a plain prefix check.
  if (publicId.includes('..')) return false;
  return publicId.startsWith(`ourdiary/${coupleId}/`);
}

/**
 * The couple id a public_id belongs to, from the folder the signer put it in.
 *
 * Deleting used to authorize against "the caller's oldest couple", which was
 * the same single-space assumption migration 20 removed from the SQL: with a
 * personal diary alongside a couple one, a file in the newer diary belonged
 * to a couple the check never looked at. Reading the owner out of the id and
 * then proving membership of THAT couple is both correct for several spaces
 * and stricter — the id cannot name a couple the caller isn't in.
 */
export function coupleIdFromPublicId(publicId: string | null | undefined): string | null {
  if (!publicId || publicId.includes('..')) return null;
  const segments = publicId.split('/');
  if (segments.length < 3 || segments[0] !== 'ourdiary') return null;
  return segments[1] || null;
}
