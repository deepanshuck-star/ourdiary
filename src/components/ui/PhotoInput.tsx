'use client';

import React, { useId, useState } from 'react';
import { ImagePlus, Loader2 } from 'lucide-react';
import { uploadImageToCloudinary } from '@/lib/cloudinary/upload';

export interface PickedPhoto {
  /** A Cloudinary delivery URL for an upload, or the link that was pasted. */
  url: string;
  /** Uploads only — callers that store it can clean the asset up on delete. */
  publicId?: string;
}

export interface PhotoInputProps {
  onPicked: (photo: PickedPhoto) => void;
  /** Names the pair of controls for screen readers. */
  label?: string;
  disabled?: boolean;
  /** Set false to offer the upload half only. */
  allowLink?: boolean;
}

/**
 * The pasted-link field is the only route a non-Cloudinary URL takes into the
 * database, so it is the one place worth validating. Deliberately not
 * extension-based: Unsplash and most CDNs serve images from extensionless
 * paths with query strings. data: URLs are rejected on purpose — inlining
 * megabytes of base64 into a Postgres row is what this control exists to stop.
 */
export function isProbablyImageUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return false;
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
  if (!parsed.hostname) return false;
  return parsed.hostname === 'localhost' || parsed.hostname.includes('.');
}

/**
 * One photo picker for every photo field in the app: a real Cloudinary upload
 * next to a paste-a-link box. Both land in the same `onPicked` callback, so a
 * caller only ever deals with a URL (plus a publicId when there is one).
 */
export function PhotoInput({
  onPicked,
  label = 'Photo',
  disabled = false,
  allowLink = true,
}: PhotoInputProps) {
  const fileId = useId();
  const linkId = useId();
  const [uploading, setUploading] = useState(false);
  const [link, setLink] = useState('');
  const [error, setError] = useState('');

  const busy = disabled || uploading;

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Cleared straight away so the same file can be picked again after a
    // failure — the change event wouldn't fire a second time otherwise.
    e.target.value = '';
    if (!file) return;

    setError('');
    setUploading(true);
    try {
      const { secureUrl, publicId } = await uploadImageToCloudinary(file);
      onPicked({ url: secureUrl, publicId });
    } catch (err: any) {
      // Demo mode and an unconfigured Cloudinary land here with a readable
      // message; the link field below still works.
      setError(err?.message || 'Could not upload that photo. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const addLink = () => {
    const value = link.trim();
    if (!isProbablyImageUrl(value)) {
      setError('That doesn’t look like an image link — paste a full https:// address.');
      return;
    }
    setError('');
    setLink('');
    onPicked({ url: value });
  };

  return (
    <div role="group" aria-label={label} className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {/* The input stays inside the label: a <button> here would swallow the
            click and never open the file picker. */}
        <label
          htmlFor={fileId}
          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-on-primary font-bold text-xs shadow-cta transition-colors ${
            busy ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:bg-primary-hover'
          }`}
        >
          {uploading ? (
            <Loader2 className="w-3.5 h-3.5 motion-safe:animate-spin" aria-hidden="true" />
          ) : (
            <ImagePlus className="w-3.5 h-3.5" aria-hidden="true" />
          )}
          <span>{uploading ? 'Uploading…' : 'Choose a photo'}</span>
          <input
            id={fileId}
            type="file"
            accept="image/*"
            className="sr-only"
            disabled={busy}
            aria-busy={uploading}
            onChange={handleFile}
          />
        </label>

        {allowLink && (
          <>
            <label htmlFor={linkId} className="text-xs font-semibold text-ink-muted">
              Or paste a link
            </label>
            <input
              id={linkId}
              type="url"
              inputMode="url"
              placeholder="https://images.unsplash.com/..."
              value={link}
              disabled={busy}
              onChange={(e) => setLink(e.target.value)}
              // This control is often rendered inside a larger form; Enter has
              // to add the link rather than submit that form.
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addLink();
                }
              }}
              className="flex-1 min-w-[12rem] px-3 py-2 rounded-xl border border-line bg-surface text-ink text-xs focus:outline-none focus:ring-2 focus:ring-focus"
            />
            <button
              type="button"
              onClick={addLink}
              disabled={busy || !link.trim()}
              className="px-4 py-2 rounded-xl border border-line bg-surface text-ink font-bold text-xs hover:bg-canvas disabled:opacity-40"
            >
              Add
            </button>
          </>
        )}
      </div>

      {error && (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
