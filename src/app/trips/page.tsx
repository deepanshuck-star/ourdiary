'use client';

import React, { useState } from 'react';
import { CalendarHeart, Loader2, MapPin, Plane, Plus, Trash2, Wallet } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { useDiary } from '@/store/DiaryContext';
import { useSpaceMode } from '@/hooks/useSpaceMode';
import { useTrips } from '@/hooks/useTrips';
import { useLocalState } from '@/lib/local-store';
import { formatDate } from '@/lib/date-utils';
import { CURRENCIES, formatMoney } from '@/lib/features/budget';
import {
  parseAmount,
  tripNights,
  tripStatus,
  validateTrip,
  type Trip,
  type TripSplit,
} from '@/lib/features/trips';

const inputClass =
  'w-full px-4 py-2.5 rounded-2xl border border-line bg-surface text-ink text-sm focus:outline-none focus:ring-2 focus:ring-focus';

function nightsLabel(trip: Trip) {
  const nights = tripNights(trip);
  return `${nights} night${nights === 1 ? '' : 's'}`;
}

function dateSpan(trip: Trip) {
  return trip.endDate ? `${formatDate(trip.startDate)} – ${formatDate(trip.endDate)}` : formatDate(trip.startDate);
}

interface TripCardProps {
  trip: Trip;
  currency: string;
  split: TripSplit;
  myId: string | null;
  partnerId: string | null;
  nameFor: (id: string) => string;
  onAddCost: (cost: { label: string; amount: number; paidBy: string }) => void;
  onRemoveCost: (costId: string) => void;
  onRemoveTrip: () => void;
  onNotes: (notes: string) => void;
  quiet?: boolean;
  /** One traveller, one wallet: no payer to choose and nothing to settle. */
  personal?: boolean;
}

function TripCard({
  trip,
  currency,
  split,
  myId,
  partnerId,
  nameFor,
  onAddCost,
  onRemoveCost,
  onRemoveTrip,
  onNotes,
  quiet,
  personal,
}: TripCardProps) {
  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');
  const [payer, setPayer] = useState<'me' | 'partner'>('me');
  const [costError, setCostError] = useState('');

  const money = (n: number) => formatMoney(n, currency);
  const myPaid = myId ? (split.paid[myId] ?? 0) : 0;
  const partnerPaid = partnerId ? (split.paid[partnerId] ?? 0) : 0;
  // Costs paid by neither of you still count toward the total but can't be settled.
  const unsettlable = Math.round((split.total - myPaid - partnerPaid) * 100) / 100;

  const submitCost = (e: React.FormEvent) => {
    e.preventDefault();
    const n = parseAmount(amount);
    if (n === null) {
      setCostError('Enter an amount above zero, with up to two decimals.');
      return;
    }
    if (!label.trim()) return;
    const paidBy = personal || payer === 'me' ? myId : partnerId;
    if (!paidBy) {
      setCostError(personal ? 'Still setting up your diary — try again in a moment.' : 'Your partner hasn’t joined this space yet.');
      return;
    }
    setCostError('');
    onAddCost({ label: label.trim(), amount: n, paidBy });
    setLabel('');
    setAmount('');
  };

  return (
    <article
      aria-labelledby={`trip-${trip.id}-title`}
      className={`rounded-[1.25rem] bg-surface border border-line p-5 sm:p-6 shadow-card ${quiet ? 'opacity-80' : ''}`}
    >
      <div className="flex items-start gap-3">
        <span
          className="w-9 h-9 rounded-full bg-purple-50 text-primary flex items-center justify-center flex-shrink-0"
          aria-hidden="true"
        >
          <Plane className="w-4 h-4" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 id={`trip-${trip.id}-title`} className="font-semibold text-ink truncate">
            {trip.title}
          </h3>
          <p className="text-xs text-ink-muted mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
            {trip.destination && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" aria-hidden="true" /> {trip.destination}
              </span>
            )}
            <span className="tabular-nums">{dateSpan(trip)}</span>
            <span className="tabular-nums">{nightsLabel(trip)}</span>
            {!personal && trip.travellerId && <span>{nameFor(trip.travellerId)} travels</span>}
          </p>
        </div>
        <button
          type="button"
          onClick={onRemoveTrip}
          aria-label={`Delete ${trip.title}`}
          className="p-2 rounded-full text-ink-muted hover:text-danger"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <section aria-label={`Costs for ${trip.title}`} className="mt-5">
        <h4 className="text-sm font-semibold text-ink flex items-center gap-2">
          <Wallet className="w-4 h-4 text-primary" aria-hidden="true" /> What it costs
        </h4>
        {trip.costs.length === 0 ? (
          <p className="text-xs text-ink-muted mt-2">Nothing booked yet.</p>
        ) : (
          <ul className="mt-2 divide-y divide-line">
            {trip.costs.map((cost) => (
              <li key={cost.id} className="flex items-center gap-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-ink truncate">{cost.label}</p>
                  {!personal && <p className="text-xs text-ink-muted">paid by {nameFor(cost.paidBy)}</p>}
                </div>
                <p className="text-sm font-semibold text-ink tabular-nums">{money(cost.amount)}</p>
                <button
                  type="button"
                  onClick={() => onRemoveCost(cost.id)}
                  aria-label={`Delete ${cost.label}`}
                  className="p-1.5 rounded-full text-ink-muted hover:text-ink"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={submitCost} className="grid sm:grid-cols-2 gap-3 mt-4" noValidate>
          <div>
            <label htmlFor={`cost-label-${trip.id}`} className="block text-xs font-semibold text-ink-muted mb-1">
              What was it?
            </label>
            <input
              id={`cost-label-${trip.id}`}
              required
              maxLength={60}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Flights"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor={`cost-amount-${trip.id}`} className="block text-xs font-semibold text-ink-muted mb-1">
              Amount ({currency})
            </label>
            <input
              id={`cost-amount-${trip.id}`}
              inputMode="decimal"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="240"
              aria-invalid={Boolean(costError)}
              aria-describedby={costError ? `cost-error-${trip.id}` : undefined}
              className={inputClass}
            />
          </div>
          {!personal && (
            <fieldset className="sm:col-span-2">
              <legend className="block text-xs font-semibold text-ink-muted mb-1">Who paid?</legend>
              <div className="flex gap-2">
                {(['me', 'partner'] as const).map((who) => (
                  <label
                    key={who}
                    className={`flex-1 text-center px-3 py-2.5 rounded-full border text-sm font-semibold cursor-pointer focus-within:ring-2 focus-within:ring-focus ${
                      payer === who ? 'bg-primary text-on-primary border-primary' : 'bg-surface text-ink border-line'
                    }`}
                  >
                    <input
                      type="radio"
                      name={`cost-payer-${trip.id}`}
                      value={who}
                      checked={payer === who}
                      onChange={() => setPayer(who)}
                      className="sr-only"
                    />
                    {who === 'me' ? (myId ? nameFor(myId) : 'Me') : partnerId ? nameFor(partnerId) : 'Partner'}
                  </label>
                ))}
              </div>
            </fieldset>
          )}
          {costError && (
            <p id={`cost-error-${trip.id}`} role="alert" className="sm:col-span-2 text-xs text-danger">
              {costError}
            </p>
          )}
          <div className="sm:col-span-2">
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold bg-primary hover:bg-primary-hover text-on-primary shadow-cta"
            >
              <Plus className="w-3.5 h-3.5" /> Add cost
            </button>
          </div>
        </form>
      </section>

      <section
        aria-label={personal ? `Total for ${trip.title}` : `Split for ${trip.title}`}
        className="mt-5 rounded-2xl bg-hero border border-line p-4"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-muted">Total</p>
          <p className="font-display text-2xl font-semibold text-ink tabular-nums">{money(split.total)}</p>
        </div>
        {!personal && (
          <>
          <dl className="grid grid-cols-2 gap-3 mt-3">
            <div className="rounded-2xl bg-surface border border-line p-3">
              <dt className="text-xs text-ink-muted">{myId ? nameFor(myId) : 'You'} paid</dt>
              <dd className="font-semibold text-ink tabular-nums mt-0.5">{money(myPaid)}</dd>
            </div>
            <div className="rounded-2xl bg-surface border border-line p-3">
              <dt className="text-xs text-ink-muted">{partnerId ? nameFor(partnerId) : 'Your partner'} paid</dt>
              <dd className="font-semibold text-ink tabular-nums mt-0.5">{money(partnerPaid)}</dd>
            </div>
          </dl>
          <p className="text-xs text-ink-muted mt-3">
            Fair share each: <span className="tabular-nums">{money(split.fairShare)}</span>
          </p>
          <p className="text-sm text-ink mt-1">
            {split.owes ? (
              <>
                <span className="font-semibold">{nameFor(split.owes.from)}</span> owes{' '}
                <span className="font-semibold">{nameFor(split.owes.to)}</span>{' '}
                <span className="font-display text-xl font-semibold tabular-nums">{money(split.owes.amount)}</span>
              </>
            ) : (
              "You're even"
            )}
          </p>
          {unsettlable > 0 && (
            <p className="text-xs text-ink-muted mt-2">
              {money(unsettlable)} was paid by someone else — it counts toward the total but can't be settled between you.
            </p>
          )}
          </>
        )}
      </section>

      <div className="mt-5">
        <label htmlFor={`trip-notes-${trip.id}`} className="block text-xs font-semibold text-ink-muted mb-1">
          Notes
        </label>
        <textarea
          id={`trip-notes-${trip.id}`}
          rows={2}
          value={trip.notes ?? ''}
          onChange={(e) => onNotes(e.target.value)}
          placeholder="Gate 42, the late train, the good coffee place."
          className={`${inputClass} resize-none`}
        />
      </div>
    </article>
  );
}

export default function TripsPage() {
  const { data, activeProfile, partnerProfile, showToast } = useDiary();
  const { isPersonal, note: spaceNote, title: spaceTitle } = useSpaceMode();
  const note = spaceNote('/trips');
  const {
    sorted,
    next,
    daysUntilReunion,
    todayISO,
    myId,
    partnerId,
    addTrip,
    updateTrip,
    removeTrip,
    addCost,
    removeCost,
    split,
  } = useTrips();

  const [currency, setCurrency] = useLocalState<string>(`trips:currency:${data.couple.id}`, 'INR');
  const [title, setTitle] = useState('');
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [traveller, setTraveller] = useState<'me' | 'partner'>('partner');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const nameFor = (id: string) => {
    if (myId && id === myId) return activeProfile.name;
    if (partnerId && id === partnerId) return partnerProfile.name;
    return 'Someone else';
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const problem = validateTrip({ title, startDate, endDate });
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    const travellerId = isPersonal || traveller === 'me' ? myId : partnerId;
    addTrip({
      title: title.trim(),
      destination: destination.trim() || undefined,
      startDate,
      endDate: endDate || undefined,
      travellerId: travellerId ?? undefined,
      notes: notes.trim() || undefined,
    });
    setTitle('');
    setDestination('');
    setStartDate('');
    setEndDate('');
    setNotes('');
    showToast('Visit added to the countdown', 'heart');
  };

  if (todayISO === null) {
    return (
      <AppShell>
        <div className="max-w-5xl mx-auto flex items-center justify-center py-24">
          <Loader2 className="w-6 h-6 text-primary animate-spin" aria-hidden="true" />
          <span className="sr-only">Loading your visits…</span>
        </div>
      </AppShell>
    );
  }

  const nextStatus = next ? tripStatus(next, todayISO) : null;
  const nextSplit = next ? split(next) : null;
  const upcoming = sorted.filter((t) => tripStatus(t, todayISO) !== 'past');
  const past = sorted.filter((t) => tripStatus(t, todayISO) === 'past');
  const money = (n: number) => formatMoney(n, currency);

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto space-y-8">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">Visits</p>
            <h1 className="font-display text-3xl sm:text-4xl font-semibold text-ink mt-1">
              {spaceTitle('/trips', "The next time we're together")}
            </h1>
            {!isPersonal && (
              <p className="text-sm text-ink-muted mt-2 max-w-2xl">
                One date to count down to, and what getting there costs — split evenly between you.
              </p>
            )}
            {note && <p className="text-sm text-ink-muted mt-2 max-w-2xl">{note}</p>}
          </div>
          <div>
            <label htmlFor="trips-currency" className="block text-xs font-semibold text-ink-muted mb-1">Currency</label>
            <select
              id="trips-currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="px-4 py-2 rounded-2xl border border-line bg-surface text-ink text-sm focus:outline-none focus:ring-2 focus:ring-focus"
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </header>

        <section aria-label="Next visit" className="rounded-[1.25rem] bg-hero border border-line shadow-card p-6 sm:p-10">
          {next && nextSplit ? (
            <div className="text-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                {nextStatus === 'together-now' ? 'Right now' : 'Days until the next visit'}
              </p>
              {nextStatus === 'together-now' ? (
                <p className="font-display text-4xl sm:text-6xl font-semibold text-ink mt-3 leading-none">
                  {isPersonal ? "You're there" : "You're together"}
                </p>
              ) : (
                <>
                  <p className="font-display text-6xl sm:text-8xl font-semibold text-ink tabular-nums leading-none mt-3">
                    {daysUntilReunion}
                  </p>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted mt-2">
                    {daysUntilReunion === 1 ? 'day to go' : 'days to go'}
                  </p>
                </>
              )}
              <h2 className="font-display text-2xl sm:text-3xl font-semibold text-ink mt-6">{next.title}</h2>
              <p className="text-sm text-ink-muted mt-1 flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
                {next.destination && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="w-4 h-4" aria-hidden="true" /> {next.destination}
                  </span>
                )}
                <span className="inline-flex items-center gap-1 tabular-nums">
                  <CalendarHeart className="w-4 h-4" aria-hidden="true" /> {dateSpan(next)}
                </span>
                <span className="tabular-nums">{nightsLabel(next)}</span>
              </p>
              <p className="text-sm text-ink mt-4">
                <span className="font-semibold tabular-nums">{money(nextSplit.total)}</span> so far
                {!isPersonal && (
                  <>
                    {' · '}
                    {nextSplit.owes
                      ? `${nameFor(nextSplit.owes.from)} owes ${nameFor(nextSplit.owes.to)} ${money(nextSplit.owes.amount)}`
                      : "You're even"}
                  </>
                )}
              </p>
            </div>
          ) : (
            <p className="text-sm text-ink-muted text-center py-10">
              Nothing booked yet. Put a date on the next visit below — it makes the distance shorter.
            </p>
          )}
        </section>

        <section aria-labelledby="add-trip" className="rounded-[1.25rem] bg-surface border border-line p-5 sm:p-6 shadow-card">
          <h2 id="add-trip" className="text-xl font-semibold text-ink flex items-center gap-2">
            <Plane className="w-5 h-5 text-primary" aria-hidden="true" /> Plan a visit
          </h2>
          <form onSubmit={submit} className="grid sm:grid-cols-2 gap-4 mt-4" noValidate>
            <div className="sm:col-span-2">
              <label htmlFor="trip-title" className="block text-xs font-semibold text-ink-muted mb-1">What is it?</label>
              <input
                id="trip-title"
                required
                maxLength={120}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ritesh comes to London"
                className={inputClass}
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="trip-destination" className="block text-xs font-semibold text-ink-muted mb-1">
                Where <span className="font-normal">(optional)</span>
              </label>
              <input
                id="trip-destination"
                maxLength={60}
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="London"
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="trip-start" className="block text-xs font-semibold text-ink-muted mb-1">Arrives</label>
              <input
                id="trip-start"
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="trip-end" className="block text-xs font-semibold text-ink-muted mb-1">
                Leaves <span className="font-normal">(optional)</span>
              </label>
              <input
                id="trip-end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={inputClass}
              />
            </div>
            {!isPersonal && (
              <fieldset className="sm:col-span-2">
                <legend className="block text-xs font-semibold text-ink-muted mb-1">Who's travelling?</legend>
                <div className="flex gap-2">
                  {(['partner', 'me'] as const).map((who) => (
                    <label
                      key={who}
                      className={`flex-1 text-center px-3 py-2.5 rounded-full border text-sm font-semibold cursor-pointer focus-within:ring-2 focus-within:ring-focus ${
                        traveller === who ? 'bg-primary text-on-primary border-primary' : 'bg-surface text-ink border-line'
                      }`}
                    >
                      <input
                        type="radio"
                        name="trip-traveller"
                        value={who}
                        checked={traveller === who}
                        onChange={() => setTraveller(who)}
                        className="sr-only"
                      />
                      {who === 'partner' ? partnerProfile.name : `${activeProfile.name} (me)`}
                    </label>
                  ))}
                </div>
              </fieldset>
            )}
            <div className="sm:col-span-2">
              <label htmlFor="trip-notes" className="block text-xs font-semibold text-ink-muted mb-1">
                Notes <span className="font-normal">(optional)</span>
              </label>
              <textarea
                id="trip-notes"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Lands at 6am, needs coffee before anything else."
                className={`${inputClass} resize-none`}
              />
            </div>
            {error && (
              <p role="alert" className="sm:col-span-2 text-sm text-danger">
                {error}
              </p>
            )}
            <div className="sm:col-span-2">
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold bg-primary hover:bg-primary-hover text-on-primary shadow-cta"
              >
                <Plus className="w-4 h-4" /> Add visit
              </button>
            </div>
          </form>
        </section>

        <section aria-labelledby="upcoming-trips" className="space-y-4">
          <h2 id="upcoming-trips" className="text-2xl font-semibold text-ink">Coming up ({upcoming.length})</h2>
          {upcoming.length === 0 ? (
            <p className="text-sm text-ink-muted rounded-[1.25rem] border border-dashed border-line p-5">
              No visits planned yet.
            </p>
          ) : (
            upcoming.map((trip) => (
              <TripCard
                key={trip.id}
                trip={trip}
                currency={currency}
                split={split(trip)}
                myId={myId}
                partnerId={partnerId}
                nameFor={nameFor}
                onAddCost={(cost) => addCost(trip.id, cost)}
                onRemoveCost={(costId) => removeCost(trip.id, costId)}
                onRemoveTrip={() => removeTrip(trip.id)}
                onNotes={(value) => updateTrip(trip.id, { notes: value })}
                personal={isPersonal}
              />
            ))
          )}
        </section>

        {past.length > 0 && (
          <section aria-labelledby="past-trips" className="space-y-4 pt-6 border-t border-line">
            <h2 id="past-trips" className="text-lg font-semibold text-ink-muted">Already been ({past.length})</h2>
            {past.map((trip) => (
              <TripCard
                key={trip.id}
                trip={trip}
                currency={currency}
                split={split(trip)}
                myId={myId}
                partnerId={partnerId}
                nameFor={nameFor}
                onAddCost={(cost) => addCost(trip.id, cost)}
                onRemoveCost={(costId) => removeCost(trip.id, costId)}
                onRemoveTrip={() => removeTrip(trip.id)}
                onNotes={(value) => updateTrip(trip.id, { notes: value })}
                personal={isPersonal}
                quiet
              />
            ))}
          </section>
        )}
      </div>
    </AppShell>
  );
}
