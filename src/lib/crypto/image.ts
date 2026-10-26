// Browser-side image compression, run immediately before encryption.
//
// ORDER MATTERS, and it is not negotiable: compress, then encrypt. Ciphertext
// is indistinguishable from random noise, so nothing downstream — not WebP,
// not gzip, not Cloudinary's own transformations — can shrink it by a single
// byte. Whatever size the bytes are when they are sealed is the size they are
// forever. Shrinking a 6MB phone photo to ~200KB first is the difference
// between an encrypted gallery that loads and one nobody waits for.
//
// Re-encoding through a canvas also drops every EXIF block, which means the
// GPS coordinates of someone's home no longer travel with their photos. That
// is a privacy win we get for free here and could not get after encryption,
// because by then we can no longer see what we are storing.
//
// The sizing maths is exported separately from anything that touches a canvas
// so it can be unit-tested under `node --test` without a DOM — see
// tests/image-compress.test.mjs.

/** Longest edge of the grid/list thumbnail. */
export const THUMB_MAX_EDGE = 400;
/** Longest edge of the full-screen view. Covers a 2x phone screen. */
export const DISPLAY_MAX_EDGE = 1600;

/** WebP quality per variant. Thumbnails are small enough to go lower. */
export const THUMB_QUALITY = 0.7;
export const DISPLAY_QUALITY = 0.82;

export interface Dimensions {
  width: number;
  height: number;
}

/**
 * The size an image should be drawn at to fit inside a square of `maxEdge`,
 * keeping its aspect ratio.
 *
 * Never upscales: a 120px avatar asked to fit 1600 stays 120px, because
 * stretching it would cost bytes and add nothing. Results are whole pixels
 * and never zero — a very wide panorama scaled down still needs one row.
 *
 * Returns 0x0 for nonsense input (a zero-size or non-finite bitmap) so the
 * caller can skip the file instead of handing a canvas a NaN.
 */
export function fitWithin(width: number, height: number, maxEdge: number): Dimensions {
  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    !Number.isFinite(maxEdge) ||
    width <= 0 ||
    height <= 0 ||
    maxEdge <= 0
  ) {
    return { width: 0, height: 0 };
  }

  const longest = Math.max(width, height);
  if (longest <= maxEdge) {
    return { width: Math.round(width), height: Math.round(height) };
  }

  const scale = maxEdge / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/**
 * Whether re-encoding this file through a canvas is a good idea.
 *
 * GIFs are excluded because a canvas keeps only the first frame, and SVGs
 * because rasterising one throws away the thing that makes it an SVG. Both
 * are better off uploaded as they are (encrypted, just not compressed).
 */
export function isCompressibleImage(type: string | null | undefined): boolean {
  if (!type) return false;
  const mime = type.toLowerCase().split(';')[0].trim();
  if (!mime.startsWith('image/')) return false;
  return mime !== 'image/gif' && mime !== 'image/svg+xml';
}

export type VariantName = 'thumb' | 'display';

export interface ImageVariant extends Dimensions {
  name: VariantName;
  blob: Blob;
}

export interface CompressedImage {
  thumb: ImageVariant;
  display: ImageVariant;
  /** Source dimensions, before scaling — worth storing for layout. */
  source: Dimensions;
}

/** True when this browser can do the work. Safari was late to OffscreenCanvas. */
export function canCompressInBrowser(): boolean {
  return (
    typeof createImageBitmap === 'function' &&
    typeof OffscreenCanvas === 'function' &&
    typeof OffscreenCanvas.prototype.convertToBlob === 'function'
  );
}

async function encodeVariant(
  bitmap: ImageBitmap,
  name: VariantName,
  maxEdge: number,
  quality: number
): Promise<ImageVariant> {
  const { width, height } = fitWithin(bitmap.width, bitmap.height, maxEdge);
  if (!width || !height) {
    throw new Error('That image has no usable dimensions.');
  }

  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('This browser would not give us a canvas to resize with.');
  }
  ctx.drawImage(bitmap, 0, 0, width, height);

  const blob = await canvas.convertToBlob({ type: 'image/webp', quality });
  return { name, blob, width, height };
}

/**
 * Produces the two variants we store for every photo.
 *
 * `imageOrientation: 'from-image'` is passed deliberately: the EXIF we are
 * about to discard is the only thing telling a viewer that a phone photo is
 * rotated, so the rotation has to be baked into the pixels here or portrait
 * shots come out sideways.
 *
 * Throws if the browser cannot do it — callers fall back to uploading the
 * original file rather than failing the upload.
 */
export async function compressImage(file: Blob): Promise<CompressedImage> {
  if (!canCompressInBrowser()) {
    throw new Error('This browser cannot compress images.');
  }

  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  try {
    const source: Dimensions = { width: bitmap.width, height: bitmap.height };
    // Sequential, not Promise.all: both encodes are CPU-bound on the same
    // thread anyway, and running them together just doubles peak memory on
    // the phones that can least afford it.
    const display = await encodeVariant(bitmap, 'display', DISPLAY_MAX_EDGE, DISPLAY_QUALITY);
    const thumb = await encodeVariant(bitmap, 'thumb', THUMB_MAX_EDGE, THUMB_QUALITY);
    return { thumb, display, source };
  } finally {
    // Bitmaps hold decoded pixels — several times the file size — until they
    // are closed, and a gallery upload decodes many in a row.
    bitmap.close();
  }
}
