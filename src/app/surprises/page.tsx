'use client';

import React, { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Clock, Gift, Loader2, Lock, MapPin, Navigation, Send, Trash2, Unlock } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { useDiary } from '@/store/DiaryContext';
import { useLocalState } from '@/lib/local-store';
import { newId, useNow } from '@/hooks/useNow';
import { splitDuration } from '@/lib/features/countdowns';
import {
  evaluateUnlock,
  formatDistance,
  isValidLatLng,
  type LatLng,
  type SurpriseNote,
} from '@/lib/features/surprises';
import type { ProfileId } from '@/types';

const inputClass =
  'w-full px-4 py-2.5 rounded-2xl border border-line bg-surface text-ink text-sm focus:outline-none focus:ring-2 focus:ring-focus';

const RADII = [50, 100, 250, 500, 1000];

/** One-shot position read. Only ever called from an explicit button tap. */
function getPositionOnce(): Promise<LatLng> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      reject(new Error('Location isn’t available in this browser.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => {
        if (err.code === err.PERMISSION_DENIED) reject(new Error('Location permission was denied. You can allow it in your browser settings.'));
        else if (err.code === err.TIMEOUT) reject(new Error('Finding your location took too long. Try again outdoors or near a window.'));
        else reject(new Error('We couldn’t find your location just now.'));
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  });
}

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function ReceivedNote({
  note,
  now,
  fromName,
  onUpdate,
}: {
  note: SurpriseNote;
  now: number | null;
  fromName: string;
  onUpdate: (patch: Partial<SurpriseNote>) => void;
}) {
  const reduceMotion = useReducedMotion() ?? false;
  const [checking, setChecking] = useState(false);
  const [status, setStatus] = useState('');
  const state = evaluateUnlock(note, now ?? 0);
  const unlocked = now !== null && state.unlocked;
  const timeLeft = note.unlockAt && now !== null ? splitDuration(Date.parse(note.unlockAt) - now) : null;

  const check = async () => {
    setChecking(true);
    setStatus('');
    try {
      const pos = await getPositionOnce();
      const result = evaluateUnlock(note, Date.now(), pos);
      const patch: Partial<SurpriseNote> = {};
      if (result.placeOk) patch.placeConfirmedAt = new Date().toISOString();
      if (result.unlocked) patch.unlockedAt = new Date().toISOString();
      if (Object.keys(patch).length) onUpdate(patch);
      if (result.unlocked) setStatus('You found it.');
      else if (result.placeOk) setStatus('You’re in the right place — now just wait for the time.');
      else if (result.distanceM !== undefined)
        setStatus(`Not quite — you’re about ${formatDistance(result.distanceM)} away.`);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Could not check your location.');
    } finally {
      setChecking(false);
    }
  };

  return (
    <li className="rounded-[1.25rem] bg-surface border border-line shadow-card overflow-hidden">
      <AnimatePresence mode="wait" initial={false}>
        {unlocked ? (
          <motion.div
            key="open"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, rotateX: -12, y: 8 }}
            animate={{ opacity: 1, rotateX: 0, y: 0 }}
            transition={{ duration: reduceMotion ? 0.15 : 0.45 }}
            className="p-5 sm:p-6"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary flex items-center gap-1.5">
              <Unlock className="w-3.5 h-3.5" aria-hidden="true" /> From {fromName}
            </p>
            <p className="font-display text-xl font-semibold text-ink mt-2">{note.teaser}</p>
            <p className="text-sm text-ink mt-3 whitespace-pre-wrap leading-relaxed">{note.message}</p>
          </motion.div>
        ) : (
          <motion.div key="locked" exit={{ opacity: 0 }} className="p-5 sm:p-6 bg-hero">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" aria-hidden="true" /> Sealed by {fromName}
            </p>
            <p className="font-display text-xl font-semibold text-ink mt-2">{note.teaser}</p>
            <ul className="mt-3 space-y-1.5 text-sm text-ink-muted">
              {note.unlockAt && (
                <li className="flex items-start gap-2">
                  <Clock className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" aria-hidden="true" />
                  <span>
                    {state.timeOk ? 'Time’s up — ' : `Opens ${formatWhen(note.unlockAt)}`}
                    {timeLeft && !timeLeft.past && ` (in ${timeLeft.days}d ${timeLeft.hours}h ${timeLeft.minutes}m)`}
                    {state.timeOk && (note.place && note.rule === 'all' ? 'now find the place.' : 'ready.')}
                  </span>
                </li>
              )}
              {note.place && (
                <li className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" aria-hidden="true" />
                  <span>
                    {state.placeOk
                      ? 'Place found.'
                      : `Opens within ${formatDistance(note.radiusM ?? 100)} of ${note.place.label || 'a special spot'}`}
                  </span>
                </li>
              )}
              {note.unlockAt && note.place && (
                <li className="text-xs">{note.rule === 'all' ? 'Both need to come true.' : 'Either one will open it.'}</li>
              )}
            </ul>
            {note.place && !state.placeOk && (
              <button
                type="button"
                onClick={check}
                disabled={checking}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold bg-primary hover:bg-primary-hover text-on-primary shadow-cta disabled:opacity-60"
              >
                {checking ? <Loader2 className="w-3.5 h-3.5 motion-safe:animate-spin" /> : <Navigation className="w-3.5 h-3.5" />}
                Check if I'm there
              </button>
            )}
            <p className="text-xs text-ink-muted mt-2 min-h-4" aria-live="polite">
              {status}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}

export default function SurprisesPage() {
  const { data, activeProfile, partnerProfile, showToast } = useDiary();
  const now = useNow(30_000);
  const me = data.activeProfileId;
  const partner: ProfileId = me === 'user_1' ? 'user_2' : 'user_1';
  const names: Record<ProfileId, string> = { user_1: data.couple.user1.name, user_2: data.couple.user2.name };

  const [notes, setNotes] = useLocalState<SurpriseNote[]>(`surprises:${data.couple.id}`, []);
  const received = notes.filter((n) => n.toId === me);
  const sent = notes.filter((n) => n.fromId === me);

  const [teaser, setTeaser] = useState('');
  const [message, setMessage] = useState('');
  const [useTime, setUseTime] = useState(true);
  const [unlockAt, setUnlockAt] = useState('');
  const [usePlace, setUsePlace] = useState(false);
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [placeLabel, setPlaceLabel] = useState('');
  const [radius, setRadius] = useState(100);
  const [rule, setRule] = useState<'all' | 'any'>('all');
  const [locating, setLocating] = useState(false);
  const [formError, setFormError] = useState('');

  const updateNote = (id: string, patch: Partial<SurpriseNote>) =>
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, ...patch } : n)));

  const fillCurrentLocation = async () => {
    setLocating(true);
    setFormError('');
    try {
      const pos = await getPositionOnce();
      setLat(pos.lat.toFixed(6));
      setLng(pos.lng.toFixed(6));
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not get your location.');
    } finally {
      setLocating(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!teaser.trim() || !message.trim()) {
      setFormError('Add a teaser and the note itself.');
      return;
    }
    let unlockIso: string | undefined;
    if (useTime) {
      const t = new Date(unlockAt);
      if (!unlockAt || Number.isNaN(t.getTime())) {
        setFormError('Pick when the note should open.');
        return;
      }
      unlockIso = t.toISOString();
    }
    let place: SurpriseNote['place'];
    if (usePlace) {
      const la = Number(lat);
      const ln = Number(lng);
      if (lat.trim() === '' || lng.trim() === '' || !isValidLatLng(la, ln)) {
        setFormError('Enter a valid latitude (−90 to 90) and longitude (−180 to 180), or use your current location.');
        return;
      }
      place = { lat: la, lng: ln, label: placeLabel.trim() || undefined };
    }
    const note: SurpriseNote = {
      id: newId('surprise'),
      fromId: me,
      toId: partner,
      teaser: teaser.trim(),
      message: message.trim(),
      createdAt: new Date().toISOString(),
      unlockAt: unlockIso,
      place,
      radiusM: place ? radius : undefined,
      rule,
    };
    setNotes((prev) => [note, ...prev]);
    setTeaser('');
    setMessage('');
    setUnlockAt('');
    setLat('');
    setLng('');
    setPlaceLabel('');
    showToast(`Sealed for ${partnerProfile.name}`, 'heart');
  };

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto space-y-8">
        <header>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">Surprise notes</p>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold text-ink mt-1">Little secrets, perfectly timed</h1>
          <p className="text-sm text-ink-muted mt-2 max-w-2xl">
            Leave a note that opens at the right moment, or at the right place. Location is only checked when someone taps
            “Check if I'm there” — never in the background.
          </p>
        </header>

        <section aria-labelledby="for-you" className="space-y-3">
          <h2 id="for-you" className="text-2xl font-semibold text-ink flex items-center gap-2">
            <Gift className="w-5 h-5 text-primary" aria-hidden="true" /> For you, {activeProfile.name}
          </h2>
          {received.length === 0 ? (
            <p className="text-sm text-ink-muted rounded-[1.25rem] border border-dashed border-line p-5">
              Nothing waiting yet. Maybe drop a hint to {partnerProfile.name}.
            </p>
          ) : (
            <ul className="grid md:grid-cols-2 gap-4">
              {received.map((n) => (
                <ReceivedNote
                  key={n.id}
                  note={n}
                  now={now}
                  fromName={names[n.fromId]}
                  onUpdate={(patch) => updateNote(n.id, patch)}
                />
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="write-heading" className="rounded-[1.25rem] bg-surface border border-line p-5 sm:p-6 shadow-card">
          <h2 id="write-heading" className="text-xl font-semibold text-ink">Write one for {partnerProfile.name}</h2>
          <form onSubmit={handleSubmit} className="mt-4 space-y-5" noValidate>
            <div>
              <label htmlFor="s-teaser" className="block text-xs font-semibold text-ink-muted mb-1">
                Teaser (what {partnerProfile.name} sees while it's locked)
              </label>
              <input id="s-teaser" maxLength={80} value={teaser} onChange={(e) => setTeaser(e.target.value)} placeholder="Open me where we first met" className={inputClass} />
            </div>
            <div>
              <label htmlFor="s-message" className="block text-xs font-semibold text-ink-muted mb-1">Your note</label>
              <textarea id="s-message" rows={4} maxLength={2000} value={message} onChange={(e) => setMessage(e.target.value)} className={`${inputClass} resize-y`} />
            </div>

            <fieldset className="space-y-3">
              <legend className="text-xs font-semibold text-ink-muted">Unlock when…</legend>
              <label className="flex items-center gap-2 text-sm text-ink">
                <input type="checkbox" checked={useTime} onChange={(e) => setUseTime(e.target.checked)} className="w-4 h-4 accent-primary" />
                A date and time arrives
              </label>
              {useTime && (
                <div className="pl-6 max-w-xs">
                  <label htmlFor="s-when" className="block text-xs font-semibold text-ink-muted mb-1">Opens at</label>
                  <input id="s-when" type="datetime-local" value={unlockAt} onChange={(e) => setUnlockAt(e.target.value)} className={inputClass} />
                </div>
              )}
              <label className="flex items-center gap-2 text-sm text-ink">
                <input type="checkbox" checked={usePlace} onChange={(e) => setUsePlace(e.target.checked)} className="w-4 h-4 accent-primary" />
                {partnerProfile.name} is at a special place
              </label>
              {usePlace && (
                <div className="pl-6 grid sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <button
                      type="button"
                      onClick={fillCurrentLocation}
                      disabled={locating}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold border border-line text-ink hover:border-primary disabled:opacity-60"
                    >
                      {locating ? <Loader2 className="w-3.5 h-3.5 motion-safe:animate-spin" /> : <Navigation className="w-3.5 h-3.5" />}
                      Use my current location
                    </button>
                  </div>
                  <div>
                    <label htmlFor="s-lat" className="block text-xs font-semibold text-ink-muted mb-1">Latitude</label>
                    <input id="s-lat" inputMode="decimal" value={lat} onChange={(e) => setLat(e.target.value)} placeholder="19.0760" className={inputClass} />
                  </div>
                  <div>
                    <label htmlFor="s-lng" className="block text-xs font-semibold text-ink-muted mb-1">Longitude</label>
                    <input id="s-lng" inputMode="decimal" value={lng} onChange={(e) => setLng(e.target.value)} placeholder="72.8777" className={inputClass} />
                  </div>
                  <div>
                    <label htmlFor="s-label" className="block text-xs font-semibold text-ink-muted mb-1">Place name (shown as a hint)</label>
                    <input id="s-label" maxLength={60} value={placeLabel} onChange={(e) => setPlaceLabel(e.target.value)} placeholder="Our café" className={inputClass} />
                  </div>
                  <div>
                    <label htmlFor="s-radius" className="block text-xs font-semibold text-ink-muted mb-1">Within</label>
                    <select id="s-radius" value={radius} onChange={(e) => setRadius(Number(e.target.value))} className={inputClass}>
                      {RADII.map((r) => (
                        <option key={r} value={r}>{formatDistance(r)}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
              {useTime && usePlace && (
                <div className="pl-6">
                  <label htmlFor="s-rule" className="block text-xs font-semibold text-ink-muted mb-1">Needs</label>
                  <select id="s-rule" value={rule} onChange={(e) => setRule(e.target.value as 'all' | 'any')} className={`${inputClass} max-w-xs`}>
                    <option value="all">Both the time and the place</option>
                    <option value="any">Either the time or the place</option>
                  </select>
                </div>
              )}
              {!useTime && !usePlace && (
                <p className="text-xs text-ink-muted pl-6">With no conditions, the note opens right away.</p>
              )}
            </fieldset>

            {formError && (
              <p role="alert" className="text-sm text-danger">{formError}</p>
            )}
            <button type="submit" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold bg-primary hover:bg-primary-hover text-on-primary shadow-cta">
              <Send className="w-4 h-4" /> Seal the note
            </button>
          </form>
        </section>

        <section aria-labelledby="sent-heading" className="space-y-3">
          <h2 id="sent-heading" className="text-2xl font-semibold text-ink">Notes you've sent</h2>
          {sent.length === 0 ? (
            <p className="text-sm text-ink-muted">None yet.</p>
          ) : (
            <ul className="rounded-[1.25rem] bg-surface border border-line shadow-card divide-y divide-line">
              {sent.map((n) => {
                const st = evaluateUnlock(n, now ?? 0);
                const opened = now !== null && st.unlocked;
                return (
                  <li key={n.id} className="flex items-center gap-3 px-4 sm:px-5 py-3">
                    <span className="w-8 h-8 rounded-full bg-purple-50 text-primary flex items-center justify-center flex-shrink-0" aria-hidden="true">
                      {opened ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-ink truncate">{n.teaser}</p>
                      <p className="text-xs text-ink-muted">
                        {opened ? 'Unlocked' : 'Still sealed'}
                        {n.unlockAt && ` · ${formatWhen(n.unlockAt)}`}
                        {n.place && ` · near ${n.place.label || `${n.place.lat.toFixed(3)}, ${n.place.lng.toFixed(3)}`}`}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setNotes((prev) => prev.filter((x) => x.id !== n.id))}
                      aria-label={`Delete note ${n.teaser}`}
                      className="p-2 rounded-full text-ink-muted hover:text-ink"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
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
