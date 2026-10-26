'use client';

import React, { useMemo, useState } from 'react';
import { Camera, Flame, ImagePlus, Loader2, Trash2 } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { useDiary } from '@/store/DiaryContext';
import { useCoupleMembers } from '@/hooks/useCoupleMembers';
import { newId, useNow } from '@/hooks/useNow';
import { useLocalState } from '@/lib/local-store';
import { destroyCloudinaryAsset, packEncryptedUrl, uploadEncryptedImage } from '@/lib/cloudinary/upload';
import { SecureImage } from '@/components/ui/SecureImage';
import {
  MAX_CAPTION_LENGTH,
  bothPostedStreak,
  buildStrip,
  dayHeading,
  hasPosted,
  localDayKey,
  photoFor,
  removePhoto,
  upsertPhoto,
  type DayPhoto,
} from '@/lib/features/photoOfDay';

const inputClass =
  'w-full px-4 py-2.5 rounded-2xl border border-line bg-surface text-ink text-sm focus:outline-none focus:ring-2 focus:ring-focus';

export default function PhotoOfTheDayPage() {
  const { data, activeProfile, partnerProfile, showToast } = useDiary();
  const { myId, partnerId } = useCoupleMembers();
  const coupleId = data.couple.id;

  const now = useNow(60_000);
  const [photos, setPhotos] = useLocalState<DayPhoto[]>(`photoOfDay:${coupleId || 'demo'}`, []);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  // Null until mounted; everything date-shaped waits for it rather than
  // reading the clock during render.
  const todayKey = now === null ? null : localDayKey(new Date(now));

  const strip = useMemo(() => buildStrip(photos, myId, partnerId, 60), [photos, myId, partnerId]);
  const streak = useMemo(
    () => (todayKey ? bothPostedStreak(photos, myId, partnerId, todayKey) : 0),
    [photos, myId, partnerId, todayKey]
  );

  const mineToday = todayKey ? photoFor(photos, myId, todayKey) : null;
  const theirsToday = todayKey ? photoFor(photos, partnerId, todayKey) : null;
  const postedToday = todayKey ? hasPosted(photos, myId, todayKey) : false;

  const pickPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    // Clear the input so the same file can be chosen again after an error.
    e.target.value = '';
    if (!file || !todayKey || !myId) return;

    setError('');
    setUploading(true);
    try {
      const replaced = photoFor(photos, myId, todayKey);
      const { secureUrl, publicId, iv } = await uploadEncryptedImage(file, coupleId);
      setPhotos((prev) =>
        upsertPhoto(prev, {
          id: newId('pod'),
          authorId: myId,
          day: todayKey,
          // The iv rides in the fragment; publicId is stored separately and
          // stays clean for destroyCloudinaryAsset.
          url: packEncryptedUrl(secureUrl, iv),
          publicId,
          caption: caption.trim() || undefined,
          createdAt: new Date().toISOString(),
        })
      );
      setCaption('');
      showToast(postedToday ? 'Swapped today’s photo 📷' : 'Posted for today 📷', 'heart');
      // Only after the replacement is saved — this never throws.
      if (replaced?.publicId && replaced.publicId !== publicId) {
        await destroyCloudinaryAsset(replaced.publicId, 'image');
      }
    } catch (err: any) {
      setError(err?.message || 'That photo couldn’t be saved.');
    } finally {
      setUploading(false);
    }
  };

  const remove = async (photo: DayPhoto) => {
    setPhotos((prev) => removePhoto(prev, photo.id));
    showToast('Taken down', 'info');
    if (photo.publicId) await destroyCloudinaryAsset(photo.publicId, 'image');
  };

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto space-y-8">
        <header>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">Photo of the day</p>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold text-ink mt-1">One photo each, every day</h1>
          <p className="text-sm text-ink-muted mt-2 max-w-2xl">
            Not the highlights — whatever today actually looked like. One frame each, side by side, kept as a strip
            you can scroll back through.
          </p>
          {streak > 0 && (
            <p className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-full bg-secondary text-ink text-xs font-semibold">
              <Flame className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
              {streak} {streak === 1 ? 'day' : 'days'} you both posted
            </p>
          )}
        </header>

        {/* --------------------------------------------------------- Today */}
        <section aria-labelledby="today-heading" className="space-y-3">
          <h2 id="today-heading" className="text-2xl font-semibold text-ink flex items-center gap-2">
            <Camera className="w-5 h-5 text-primary" aria-hidden="true" /> Today
          </h2>

          {todayKey === null ? (
            <div className="rounded-[1.25rem] bg-hero border border-line shadow-card p-10 flex items-center justify-center gap-2 text-sm text-ink-muted">
              <Loader2 className="w-4 h-4 motion-safe:animate-spin" aria-hidden="true" />
              Warming up the clock…
            </div>
          ) : (
            <div className="rounded-[1.25rem] bg-hero border border-line shadow-card p-5 sm:p-6 space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                    {activeProfile.name}
                  </p>
                  {mineToday ? (
                    <PhotoFrame
                      photo={mineToday}
                      alt={mineToday.caption || `${activeProfile.name}’s photo for today`}
                      onRemove={() => remove(mineToday)}
                    />
                  ) : (
                    <div className="aspect-square rounded-2xl border border-dashed border-line bg-surface flex flex-col items-center justify-center gap-2 p-5 text-center">
                      <ImagePlus className="w-6 h-6 text-ink-muted" aria-hidden="true" />
                      <p className="text-xs text-ink-muted">Your frame for today is empty.</p>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                    {partnerProfile.name}
                  </p>
                  {theirsToday ? (
                    <PhotoFrame
                      photo={theirsToday}
                      alt={theirsToday.caption || `${partnerProfile.name}’s photo for today`}
                    />
                  ) : (
                    <div className="aspect-square rounded-2xl border border-dashed border-line bg-surface flex flex-col items-center justify-center gap-2 p-5 text-center">
                      <Camera className="w-6 h-6 text-ink-muted" aria-hidden="true" />
                      <p className="text-xs text-ink-muted">
                        {partnerProfile.name}’s photo will land here whenever their day gets round to it.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4 pt-1">
                <div>
                  <label htmlFor="pod-caption" className="block text-xs font-semibold text-ink mb-1">
                    Caption <span className="font-normal text-ink-muted">(optional)</span>
                  </label>
                  <input
                    id="pod-caption"
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    maxLength={MAX_CAPTION_LENGTH}
                    placeholder="The light at 7pm."
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="pod-photo" className="block text-xs font-semibold text-ink mb-1">
                    {postedToday ? 'Swap today’s photo' : 'Post today’s photo'}
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      id="pod-photo"
                      type="file"
                      accept="image/*"
                      disabled={uploading || !myId}
                      onChange={pickPhoto}
                      className="block w-full text-xs text-ink-muted file:mr-3 file:py-2 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-on-primary disabled:opacity-60"
                    />
                    {uploading && (
                      <Loader2 className="w-4 h-4 text-ink-muted motion-safe:animate-spin flex-shrink-0" aria-hidden="true" />
                    )}
                  </div>
                  <p className="text-[11px] text-ink-muted mt-1">
                    {uploading ? 'Uploading…' : 'One a day — a new one replaces the last.'}
                  </p>
                </div>
              </div>

              {error && (
                <p role="alert" className="text-sm text-danger">
                  {error}
                </p>
              )}
            </div>
          )}
        </section>

        {/* --------------------------------------------------------- Strip */}
        <section aria-labelledby="strip-heading" className="space-y-4">
          <h2 id="strip-heading" className="text-2xl font-semibold text-ink">
            The strip
          </h2>

          {strip.length === 0 ? (
            <p className="text-sm text-ink-muted rounded-[1.25rem] border border-dashed border-line p-5">
              Nothing here yet. The first photo starts the strip.
            </p>
          ) : (
            <ul className="space-y-4">
              {strip.map(({ day, mine, theirs, complete }) => (
                <li
                  key={day}
                  className={`rounded-[1.25rem] border bg-surface shadow-card p-4 sm:p-5 ${
                    complete ? 'border-primary/30' : 'border-line'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <p className="text-xs font-semibold text-ink">{todayKey ? dayHeading(day, todayKey) : day}</p>
                    {complete && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Both of you</span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <StripFrame
                      photo={mine}
                      name={activeProfile.name}
                      onRemove={mine ? () => remove(mine) : undefined}
                    />
                    <StripFrame photo={theirs} name={partnerProfile.name} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </AppShell>
  );
}

function PhotoFrame({
  photo,
  alt,
  onRemove,
}: {
  photo: DayPhoto;
  alt: string;
  onRemove?: () => void;
}) {
  return (
    <figure className="space-y-2">
      <div className="relative aspect-square rounded-2xl overflow-hidden border border-line bg-canvas">
        <SecureImage src={photo.url} alt={alt} loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            aria-label="Take down this photo"
            className="absolute top-2 right-2 p-1.5 rounded-full bg-surface/90 text-ink-muted hover:text-danger"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      {photo.caption && <figcaption className="text-xs text-ink-muted">{photo.caption}</figcaption>}
    </figure>
  );
}

/** One person's slot in an archive row — quiet rather than empty when missing. */
function StripFrame({
  photo,
  name,
  onRemove,
}: {
  photo: DayPhoto | null;
  name: string;
  onRemove?: () => void;
}) {
  if (!photo) {
    return (
      <div className="aspect-square rounded-2xl border border-dashed border-line bg-canvas flex items-center justify-center p-3">
        <p className="text-[11px] text-ink-muted text-center">No photo from {name}</p>
      </div>
    );
  }
  return <PhotoFrame photo={photo} alt={photo.caption || `${name}’s photo`} onRemove={onRemove} />;
}
