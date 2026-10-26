'use client';

import React, { useEffect, useState } from 'react';
import { useDiary } from '@/store/DiaryContext';
import { fetchAndDecrypt, readEncryptedUrl, releaseDecryptedUrl } from '@/lib/cloudinary/upload';

/**
 * A drop-in replacement for <img> that can show an encrypted photo.
 *
 * The stored string decides what happens, not a prop: a URL carrying an
 * `#iv=` fragment is fetched and decrypted in the browser, and anything
 * without one — every photo uploaded before encryption existed, a demo-mode
 * data URL, a seeded Unsplash avatar, or any photo at all on a deployment
 * with no master key — is rendered exactly as a plain <img> would render it.
 * That is deliberate: the missing fragment is the whole backwards-
 * compatibility story, so the untouched path has to be the simple one.
 */

/** A 1×1 transparent GIF. Standing in for the real bytes keeps the element,
 *  its classes and its alt text identical in every state, so a decrypting or
 *  unreadable photo holds its place in the layout instead of collapsing. */
const BLANK_PIXEL =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

type SecureImageProps = Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
  src?: string | null;
  /** Required, same as a bare <img> should be. */
  alt: string;
};

export function SecureImage({ src, alt, className, ...rest }: SecureImageProps) {
  const { data } = useDiary();
  const coupleId = data.couple.id;

  const { url, iv } = readEncryptedUrl(src);

  const [decrypted, setDecrypted] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!iv || !url) {
      setDecrypted(null);
      setFailed(false);
      return;
    }

    let cancelled = false;
    // Held outside the promise so cleanup can revoke a URL that arrived
    // after the component (or the src) had already moved on.
    let created: string | null = null;

    setDecrypted(null);
    setFailed(false);

    fetchAndDecrypt(url, coupleId, iv)
      .then((result) => {
        if (cancelled) {
          releaseDecryptedUrl(result);
          return;
        }
        if (!result) {
          setFailed(true);
          return;
        }
        created = result;
        setDecrypted(result);
      })
      .catch(() => {
        // fetchAndDecrypt already swallows its own failures; this is the
        // backstop so a photo can never take the page down with it.
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
      // Object URLs live until revoked, and a gallery would otherwise leak
      // one per photo per scroll.
      releaseDecryptedUrl(created);
    };
  }, [url, iv, coupleId]);

  if (!iv) {
    return <img src={src ?? undefined} alt={alt} className={className} {...rest} />;
  }

  if (failed) {
    return (
      <img
        src={BLANK_PIXEL}
        alt={alt}
        className={`${className ?? ''} bg-canvas`.trim()}
        {...rest}
      />
    );
  }

  if (!decrypted) {
    return (
      <img
        src={BLANK_PIXEL}
        alt={alt}
        aria-busy="true"
        className={`${className ?? ''} bg-canvas motion-safe:animate-pulse`.trim()}
        {...rest}
      />
    );
  }

  return <img src={decrypted} alt={alt} className={className} {...rest} />;
}

export default SecureImage;
