'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Gift, ImagePlus, Loader2, Trash2, X } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { useDiary } from '@/store/DiaryContext';
import { useCoupleMembers } from '@/hooks/useCoupleMembers';
import { newId } from '@/hooks/useNow';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useLocalState } from '@/lib/local-store';
import { destroyCloudinaryAsset } from '@/lib/cloudinary/upload';
import { SecureImage } from '@/components/ui/SecureImage';
import { createGiftRemote, deleteGiftRemote, fetchGiftsRemote, type GiftRow } from '@/lib/supabase/gifts';
import { PhotoInput, type PickedPhoto } from '@/components/ui/PhotoInput';
import { OCCASIONS, formatGiftDate, splitByDirection, tallyGifts, validateGift } from '@/lib/features/gifts';

const inputClass =
  'w-full px-4 py-2.5 rounded-2xl border border-line bg-surface text-ink text-sm focus:outline-none focus:ring-2 focus:ring-focus';

/** Demo-mode gift. Ids are profile slots; the photo is a hosted URL. */
interface LocalGift {
  id: string;
  fromUserId: string;
  toUserId: string;
  createdBy: string;
  title: string;
  occasion: string | null;
  note: string | null;
  photoUrl: string | null;
  photoPublicId: string | null;
  givenOn: string | null;
  createdAt: string;
}

type Tab = 'received' | 'given';

export default function GiftsPage() {
  const { data, activeProfile, partnerProfile, isLiveUser, currentUserId, showToast } = useDiary();
  const { myId, partnerId, isRemote } = useCoupleMembers();
  const coupleId = data.couple.id;
  const supabase = isLiveUser && currentUserId ? getSupabaseBrowserClient() : null;
  const live = Boolean(supabase && coupleId && isRemote);

  const [remote, setRemote] = useState<GiftRow[]>([]);
  const [local, setLocal] = useLocalState<LocalGift[]>(`gifts:${coupleId || 'demo'}`, []);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab>('received');

  // Logging a gift you were given is the common case, so that's the default.
  const [direction, setDirection] = useState<'received' | 'given'>('received');
  const [title, setTitle] = useState('');
  const [occasion, setOccasion] = useState('');
  const [note, setNote] = useState('');
  const [givenOn, setGivenOn] = useState('');
  // The photo is uploaded as soon as it is picked, so only its URL is held.
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoPublicId, setPhotoPublicId] = useState<string | null>(null);

  const gifts = useMemo(
    () =>
      live
        ? remote.map((g) => ({
            id: g.id,
            fromUserId: g.fromUserId,
            toUserId: g.toUserId,
            createdBy: g.createdBy,
            title: g.title,
            occasion: g.occasion,
            note: g.note,
            photoUrl: g.photoUrl,
            photoPublicId: g.photoPublicId,
            givenOn: g.givenOn,
            createdAt: g.createdAt,
          }))
        : local,
    [live, remote, local]
  );

  const { received, given } = useMemo(() => splitByDirection(gifts, myId), [gifts, myId]);
  const tally = useMemo(() => tallyGifts(gifts, myId), [gifts, myId]);

  const reload = useCallback(async () => {
    if (!live || !supabase) {
      setLoading(false);
      return;
    }
    try {
      setRemote(await fetchGiftsRemote(supabase, coupleId));
      setError('');
    } catch (err) {
      console.error('[OurDiary] Failed to load gifts:', err);
      setError('We couldn’t load your wardrobe just now.');
    } finally {
      setLoading(false);
    }
  }, [live, supabase, coupleId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const resetForm = () => {
    setTitle('');
    setOccasion('');
    setNote('');
    setGivenOn('');
    setPhotoUrl(null);
    setPhotoPublicId(null);
  };

  const handlePickedPhoto = (picked: PickedPhoto) => {
    setPhotoUrl(picked.url);
    setPhotoPublicId(picked.publicId ?? null);
  };

  /** Dropping a photo before the gift is saved would otherwise orphan it. */
  const clearPhoto = async () => {
    const orphan = photoPublicId;
    setPhotoUrl(null);
    setPhotoPublicId(null);
    if (orphan) await destroyCloudinaryAsset(orphan, 'image');
  };

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const problem = validateGift(title, note);
    if (problem) {
      setError(problem);
      return;
    }
    if (!myId || !partnerId) {
      setError('Your partner hasn’t joined this space yet, so a gift has nobody to come from.');
      return;
    }
    const fromUserId = direction === 'received' ? partnerId : myId;
    const toUserId = direction === 'received' ? myId : partnerId;

    setError('');
    setSaving(true);
    try {
      if (live && supabase && currentUserId) {
        try {
          await createGiftRemote(supabase, coupleId, currentUserId, {
            fromUserId,
            toUserId,
            title: title.trim(),
            occasion,
            note: note.trim(),
            photoUrl,
            photoPublicId,
            givenOn: givenOn || null,
          });
        } catch (insertErr) {
          // Don't leave an orphaned image behind if the row never landed.
          if (photoPublicId) await destroyCloudinaryAsset(photoPublicId, 'image');
          throw insertErr;
        }
        await reload();
      } else {
        setLocal((prev) => [
          {
            id: newId('gift'),
            fromUserId,
            toUserId,
            createdBy: myId,
            title: title.trim(),
            occasion: occasion || null,
            note: note.trim() || null,
            photoUrl,
            photoPublicId,
            givenOn: givenOn || null,
            createdAt: new Date().toISOString(),
          },
          ...prev,
        ]);
      }
      resetForm();
      setTab(direction);
      showToast('Added to the wardrobe 🎁', 'heart');
    } catch (err: any) {
      setError(err?.message || 'That gift couldn’t be saved.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string, photoPublicId: string | null) => {
    try {
      if (live && supabase) {
        await deleteGiftRemote(supabase, id);
        // Delete the row first: an orphaned image costs storage, a deleted
        // image under a surviving row shows a broken card.
        if (photoPublicId) await destroyCloudinaryAsset(photoPublicId, 'image');
        setRemote((prev) => prev.filter((g) => g.id !== id));
      } else {
        setLocal((prev) => prev.filter((g) => g.id !== id));
      }
      showToast('Removed from the wardrobe', 'info');
    } catch {
      showToast('Only whoever added it can remove it.', 'warn');
    }
  };

  const visible = tab === 'received' ? received : given;
  const counterpartName = tab === 'received' ? partnerProfile.name : activeProfile.name;

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto space-y-8">
        <header>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">Gifts wardrobe</p>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold text-ink mt-1">Everything you've given each other</h1>
          <p className="text-sm text-ink-muted mt-2 max-w-2xl">
            Log a gift once and it shows up on both sides — yours to look back on, theirs to be reminded of.{' '}
            {live ? 'Shared with your partner.' : 'In demo mode this stays on this device.'}
          </p>
          {tally.received + tally.given > 0 && (
            <p className="text-xs text-ink-muted mt-2">
              {tally.received} received · {tally.given} given
            </p>
          )}
        </header>

        {/* ------------------------------------------------------------ Add */}
        <section aria-labelledby="add-heading" className="space-y-3">
          <h2 id="add-heading" className="text-2xl font-semibold text-ink flex items-center gap-2">
            <Gift className="w-5 h-5 text-primary" aria-hidden="true" /> Log a gift
          </h2>
          <form onSubmit={add} className="rounded-[1.25rem] border border-line bg-surface p-5 space-y-4 shadow-sm">
            <fieldset>
              <legend className="block text-xs font-semibold text-ink mb-1.5">Which way round?</legend>
              <div className="flex flex-wrap gap-2">
                {(['received', 'given'] as const).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDirection(d)}
                    aria-pressed={direction === d}
                    className={`px-4 py-2 rounded-full text-xs font-semibold ${
                      direction === d ? 'bg-primary text-on-primary shadow-cta' : 'bg-canvas border border-line text-ink'
                    }`}
                  >
                    {d === 'received' ? `${partnerProfile.name} gave it to me` : `I gave it to ${partnerProfile.name}`}
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="gift-title" className="block text-xs font-semibold text-ink mb-1">
                  The gift
                </label>
                <input
                  id="gift-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="The blue scarf"
                  className={inputClass}
                  required
                />
              </div>
              <div>
                <label htmlFor="gift-occasion" className="block text-xs font-semibold text-ink mb-1">
                  Occasion <span className="font-normal text-ink-muted">(optional)</span>
                </label>
                <select
                  id="gift-occasion"
                  value={occasion}
                  onChange={(e) => setOccasion(e.target.value)}
                  className={inputClass}
                >
                  <option value="">—</option>
                  {OCCASIONS.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="gift-date" className="block text-xs font-semibold text-ink mb-1">
                  When <span className="font-normal text-ink-muted">(optional)</span>
                </label>
                <input
                  id="gift-date"
                  type="date"
                  value={givenOn}
                  onChange={(e) => setGivenOn(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <p className="block text-xs font-semibold text-ink mb-1">
                  Photo <span className="font-normal text-ink-muted">(optional)</span>
                </p>
                <div className="flex items-center gap-2">
                  <PhotoInput onPicked={handlePickedPhoto} label="Gift photo" disabled={saving} />
                  {photoUrl && (
                    <>
                      <img
                        src={photoUrl}
                        alt="The gift photo you picked"
                        className="w-10 h-10 rounded-xl object-cover border border-line flex-shrink-0"
                      />
                      <button
                        type="button"
                        onClick={clearPhoto}
                        aria-label="Remove the selected photo"
                        className="p-1.5 rounded-full text-ink-muted hover:text-danger flex-shrink-0"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="gift-note" className="block text-xs font-semibold text-ink mb-1">
                Note <span className="font-normal text-ink-muted">(optional)</span>
              </label>
              <textarea
                id="gift-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder="Still the warmest thing I own."
                className={`${inputClass} resize-none`}
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold bg-primary hover:bg-primary-hover text-on-primary shadow-cta disabled:opacity-60"
            >
              {saving ? (
                <Loader2 className="w-3.5 h-3.5 motion-safe:animate-spin" />
              ) : (
                <ImagePlus className="w-3.5 h-3.5" />
              )}
              {saving ? 'Saving…' : 'Add to the wardrobe'}
            </button>

            {error && (
              <p role="alert" className="text-sm text-danger">
                {error}
              </p>
            )}
          </form>
        </section>

        {/* --------------------------------------------------------- Lists */}
        <section aria-labelledby="wardrobe-heading" className="space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 id="wardrobe-heading" className="text-2xl font-semibold text-ink">
              The wardrobe
            </h2>
            <div className="flex gap-2" role="tablist" aria-label="Gift direction">
              {(['received', 'given'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  role="tab"
                  aria-selected={tab === t}
                  onClick={() => setTab(t)}
                  className={`px-4 py-2 rounded-full text-xs font-semibold ${
                    tab === t ? 'bg-primary text-on-primary shadow-cta' : 'bg-canvas border border-line text-ink'
                  }`}
                >
                  {t === 'received' ? `Given to me (${received.length})` : `I gave (${given.length})`}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <p className="text-sm text-ink-muted">Loading…</p>
          ) : visible.length === 0 ? (
            <p className="text-sm text-ink-muted rounded-[1.25rem] border border-dashed border-line p-5">
              {tab === 'received'
                ? `Nothing from ${partnerProfile.name} logged yet.`
                : `You haven't logged anything you've given ${partnerProfile.name} yet.`}
            </p>
          ) : (
            <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {visible.map((gift) => (
                <li
                  key={gift.id}
                  className="rounded-2xl border border-line bg-surface shadow-sm overflow-hidden flex flex-col"
                >
                  {gift.photoUrl && (
                    <div className="relative w-full aspect-[4/3] bg-canvas">
                      {/* Cloudinary and data URLs both go through a plain img:
                          next/image would need every Cloudinary cloud name in
                          remotePatterns, and can't handle a data URL at all. */}
                      <SecureImage
                        src={gift.photoUrl}
                        alt={gift.title}
                        className="absolute inset-0 w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  )}
                  <div className="p-4 flex-1 flex flex-col gap-1">
                    <p className="font-semibold text-sm text-ink">{gift.title}</p>
                    <p className="text-xs text-ink-muted">
                      {gift.occasion ? `${gift.occasion} · ` : ''}
                      {formatGiftDate(gift.givenOn)}
                    </p>
                    {gift.note && <p className="text-xs text-ink-muted mt-1 whitespace-pre-wrap">{gift.note}</p>}
                    <div className="mt-auto pt-3 flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                        {tab === 'received' ? `From ${counterpartName}` : `To ${partnerProfile.name}`}
                      </span>
                      {gift.createdBy === myId && (
                        <button
                          type="button"
                          onClick={() => remove(gift.id, gift.photoPublicId)}
                          aria-label={`Remove ${gift.title}`}
                          className="p-1.5 rounded-full text-ink-muted hover:text-danger"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
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
