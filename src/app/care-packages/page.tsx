'use client';

import React, { useMemo, useState } from 'react';
import { Camera, Loader2, Package, PackageCheck, Trash2, X } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { useDiary } from '@/store/DiaryContext';
import { useCoupleMembers } from '@/hooks/useCoupleMembers';
import { useLocalState } from '@/lib/local-store';
import { newId, useNow } from '@/hooks/useNow';
import { localDayKey } from '@/lib/features/photoOfDay';
import { destroyCloudinaryAsset, packEncryptedUrl, uploadEncryptedImage } from '@/lib/cloudinary/upload';
import { SecureImage } from '@/components/ui/SecureImage';
import {
  arrivalPhrase,
  daysUntilArrival,
  packageStatus,
  sortPackages,
  validatePackage,
  type CarePackage,
  type PackageStatus,
} from '@/lib/features/carePackages';

const inputClass =
  'w-full px-4 py-2.5 rounded-2xl border border-line bg-surface text-ink text-sm focus:outline-none focus:ring-2 focus:ring-focus';

const REACTIONS = ['😍', '🥹', '😂', '🥰', '🎁', '❤️'];

const STATUS_PILL: Record<PackageStatus, { label: string; className: string }> = {
  arrived: { label: 'Arrived', className: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  'arriving-today': { label: 'Arriving today', className: 'bg-amber-50 text-amber-700 border-amber-100' },
  'on-the-way': { label: 'On the way', className: 'bg-purple-50 text-primary border-line' },
  overdue: { label: 'Overdue', className: 'bg-rose-50 text-rose-700 border-rose-100' },
};

export default function CarePackagesPage() {
  const { data, activeProfile, partnerProfile, showToast } = useDiary();
  const { myId, partnerId } = useCoupleMembers();
  const coupleId = data.couple.id;
  // A day counter, not a clock.
  const now = useNow(60_000);
  const todayISO = now === null ? null : localDayKey(new Date(now));

  const [packages, setPackages] = useLocalState<CarePackage[]>(`carePackages:${coupleId || 'demo'}`, []);

  const [title, setTitle] = useState('');
  const [expectedOn, setExpectedOn] = useState('');
  // Empty until someone picks a day; today stands in, which is only known once
  // the clock has mounted.
  const [sentOn, setSentOn] = useState('');
  const [carrier, setCarrier] = useState('');
  const [tracking, setTracking] = useState('');
  const [note, setNote] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const sorted = useMemo(() => (todayISO ? sortPackages(packages, todayISO) : []), [packages, todayISO]);

  if (todayISO === null) {
    return (
      <AppShell>
        <div className="max-w-5xl mx-auto flex items-center justify-center gap-2 py-24 text-ink-muted">
          <Loader2 className="w-5 h-5 motion-safe:animate-spin" aria-hidden="true" />
          <p className="text-sm">Checking the post…</p>
        </div>
      </AppShell>
    );
  }

  const sentOnValue = sentOn || todayISO;

  const resetForm = () => {
    setTitle('');
    setExpectedOn('');
    setSentOn('');
    setCarrier('');
    setTracking('');
    setNote('');
    setPhoto(null);
  };

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const problem = validatePackage({ title, sentOn: sentOnValue, expectedOn });
    if (problem) {
      setError(problem);
      return;
    }
    if (!myId || !partnerId) {
      setError('Your partner hasn’t joined this space yet, so a parcel has nowhere to go.');
      return;
    }

    setError('');
    setSaving(true);
    try {
      let photoUrl: string | undefined;
      let photoPublicId: string | undefined;
      if (photo) {
        const uploaded = await uploadEncryptedImage(photo, coupleId);
        photoUrl = packEncryptedUrl(uploaded.secureUrl, uploaded.iv);
        photoPublicId = uploaded.publicId;
      }
      setPackages((prev) => [
        {
          id: newId('pkg'),
          title: title.trim(),
          fromId: myId,
          toId: partnerId,
          sentOn: sentOnValue,
          expectedOn,
          carrier: carrier.trim() || undefined,
          tracking: tracking.trim() || undefined,
          note: note.trim() || undefined,
          photoUrl,
          photoPublicId,
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]);
      resetForm();
      showToast(`On its way to ${partnerProfile.name} 📦`, 'heart');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That parcel couldn’t be saved.');
    } finally {
      setSaving(false);
    }
  };

  const markArrived = (id: string) => {
    setPackages((prev) => prev.map((p) => (p.id === id ? { ...p, arrivedOn: todayISO } : p)));
    showToast('It landed 🎉', 'heart');
  };

  const react = (id: string, emoji: string) =>
    setPackages((prev) =>
      prev.map((p) => (p.id === id ? { ...p, reaction: p.reaction === emoji ? undefined : emoji } : p))
    );

  const remove = (pkg: CarePackage) => {
    setPackages((prev) => prev.filter((p) => p.id !== pkg.id));
    // Cleanup after the row is gone; destroy never throws.
    void destroyCloudinaryAsset(pkg.photoPublicId, 'image');
    showToast('Parcel removed', 'info');
  };

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto space-y-8">
        <header>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">Care packages</p>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold text-ink mt-1">Something of yours, in the post</h1>
          <p className="text-sm text-ink-muted mt-2 max-w-2xl">
            Log a parcel once and you both get the countdown — you watch it travel, {partnerProfile.name} watches it
            arrive.
          </p>
        </header>

        {/* ------------------------------------------------------------ Log */}
        <section aria-labelledby="log-heading" className="space-y-3">
          <h2 id="log-heading" className="text-2xl font-semibold text-ink flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" aria-hidden="true" /> Post something
          </h2>
          <form onSubmit={add} noValidate className="rounded-[1.25rem] border border-line bg-surface p-5 space-y-4 shadow-card">
            <div>
              <label htmlFor="pkg-title" className="block text-xs font-semibold text-ink mb-1">
                What’s inside
              </label>
              <input
                id="pkg-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={120}
                placeholder="A jumper and too much chocolate"
                className={inputClass}
                required
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="pkg-sent" className="block text-xs font-semibold text-ink mb-1">
                  Posted on
                </label>
                <input
                  id="pkg-sent"
                  type="date"
                  value={sentOnValue}
                  onChange={(e) => setSentOn(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="pkg-expected" className="block text-xs font-semibold text-ink mb-1">
                  Should land
                </label>
                <input
                  id="pkg-expected"
                  type="date"
                  value={expectedOn}
                  onChange={(e) => setExpectedOn(e.target.value)}
                  className={inputClass}
                  required
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="pkg-carrier" className="block text-xs font-semibold text-ink mb-1">
                  Carrier <span className="font-normal text-ink-muted">(optional)</span>
                </label>
                <input
                  id="pkg-carrier"
                  value={carrier}
                  onChange={(e) => setCarrier(e.target.value)}
                  maxLength={60}
                  placeholder="India Post"
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="pkg-tracking" className="block text-xs font-semibold text-ink mb-1">
                  Tracking <span className="font-normal text-ink-muted">(optional)</span>
                </label>
                <input
                  id="pkg-tracking"
                  value={tracking}
                  onChange={(e) => setTracking(e.target.value)}
                  maxLength={120}
                  placeholder="EE123456789IN"
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label htmlFor="pkg-note" className="block text-xs font-semibold text-ink mb-1">
                Note <span className="font-normal text-ink-muted">(optional)</span>
              </label>
              <textarea
                id="pkg-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder="Don't open the small box until Friday."
                className={`${inputClass} resize-none`}
              />
            </div>

            <div>
              <label htmlFor="pkg-photo" className="block text-xs font-semibold text-ink mb-1">
                Photo <span className="font-normal text-ink-muted">(optional)</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="pkg-photo"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
                  className="block w-full text-xs text-ink-muted file:mr-3 file:py-2 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-secondary file:text-ink"
                />
                {photo && (
                  <button
                    type="button"
                    onClick={() => setPhoto(null)}
                    aria-label="Remove the selected photo"
                    className="p-1.5 rounded-full text-ink-muted hover:text-danger flex-shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold bg-primary hover:bg-primary-hover text-on-primary shadow-cta disabled:opacity-60"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 motion-safe:animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
              {saving ? 'Sending…' : 'It’s in the post'}
            </button>

            {error && (
              <p role="alert" className="text-sm text-danger">
                {error}
              </p>
            )}
          </form>
        </section>

        {/* --------------------------------------------------------- In transit */}
        <section aria-labelledby="parcels-heading" className="space-y-4">
          <h2 id="parcels-heading" className="text-2xl font-semibold text-ink">
            Parcels
          </h2>

          {sorted.length === 0 ? (
            <p className="text-sm text-ink-muted rounded-[1.25rem] border border-dashed border-line p-5">
              Nothing in the post. The next one could be a very small box.
            </p>
          ) : (
            <ul className="space-y-4">
              {sorted.map((pkg) => {
                const status = packageStatus(pkg, todayISO);
                const pill = STATUS_PILL[status];
                const days = daysUntilArrival(pkg, todayISO);
                const forMe = pkg.toId === myId;
                const fromName = pkg.fromId === myId ? activeProfile.name : partnerProfile.name;
                const toName = pkg.toId === myId ? activeProfile.name : partnerProfile.name;

                return (
                  <li key={pkg.id} className="rounded-[1.25rem] bg-surface border border-line shadow-card overflow-hidden">
                    <div className="p-5 sm:p-6 flex gap-4">
                      {status !== 'arrived' && (
                        <div className="flex-shrink-0 w-16 rounded-2xl bg-hero text-center py-3">
                          <p className="font-display text-2xl font-semibold text-ink leading-none">{Math.abs(days)}</p>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-muted mt-1">
                            {status === 'arriving-today' ? 'today' : Math.abs(days) === 1 ? 'day' : 'days'}
                          </p>
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-semibold text-ink">{pkg.title}</p>
                            <p className="text-xs text-ink-muted mt-0.5">
                              {arrivalPhrase(pkg, todayISO)} · From {fromName} to {toName}
                            </p>
                          </div>
                          <span
                            className={`flex-shrink-0 px-3 py-1 rounded-full text-[11px] font-bold border ${pill.className}`}
                          >
                            {pill.label}
                          </span>
                        </div>

                        {(pkg.carrier || pkg.tracking) && (
                          <p className="text-xs text-ink-muted mt-2">
                            {pkg.carrier}
                            {pkg.carrier && pkg.tracking ? ' · ' : ''}
                            {pkg.tracking}
                          </p>
                        )}
                        {pkg.note && <p className="text-sm text-ink-muted mt-2 whitespace-pre-wrap">{pkg.note}</p>}

                        {pkg.photoUrl && (
                          <SecureImage
                            src={pkg.photoUrl}
                            alt={pkg.title}
                            loading="lazy"
                            className="mt-3 w-full max-w-xs aspect-[4/3] object-cover rounded-2xl border border-line"
                          />
                        )}

                        <div className="mt-4 flex flex-wrap items-center gap-2">
                          {forMe && !pkg.arrivedOn && (
                            <button
                              type="button"
                              onClick={() => markArrived(pkg.id)}
                              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold bg-primary hover:bg-primary-hover text-on-primary shadow-cta"
                            >
                              <PackageCheck className="w-3.5 h-3.5" /> It arrived
                            </button>
                          )}
                          {forMe &&
                            REACTIONS.map((emoji) => (
                              <button
                                key={emoji}
                                type="button"
                                onClick={() => react(pkg.id, emoji)}
                                aria-pressed={pkg.reaction === emoji}
                                aria-label={`React with ${emoji}`}
                                className={`w-9 h-9 rounded-full text-base leading-none border ${
                                  pkg.reaction === emoji ? 'border-primary bg-purple-50' : 'border-line bg-canvas'
                                }`}
                              >
                                {emoji}
                              </button>
                            ))}
                          {!forMe && pkg.reaction && (
                            <span className="text-base" aria-label={`${toName} reacted with ${pkg.reaction}`}>
                              {pkg.reaction}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => remove(pkg)}
                            aria-label={`Delete ${pkg.title}`}
                            className="ml-auto p-2 rounded-full text-ink-muted hover:text-danger"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </AppShell>
  );
}
