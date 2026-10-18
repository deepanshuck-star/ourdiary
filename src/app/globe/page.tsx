'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { AppShell } from '@/components/layout/AppShell';
import { useDiary } from '@/store/DiaryContext';
import { useLocalState } from '@/lib/local-store';
import { formatDate } from '@/lib/date-utils';
import { usePrefersReducedMotion, useWebGLSupport } from '@/components/three/capabilities';
import type { GlobeMarker } from '@/components/three/MemoryGlobe';
import {
  buildNominatimUrl,
  geocodeProgress,
  locationKey,
  msUntilNextRequest,
  parseNominatimResponse,
  pendingLocationKeys,
  type GeocodeCache,
  type GeocodeEntry,
} from '@/lib/features/geocode-queue';
import type { Memory } from '@/types';
import {
  ArrowRight,
  Globe2,
  ImageOff,
  Info,
  Loader2,
  MapPin,
  MapPinOff,
  Pause,
  Play,
  RefreshCw,
} from 'lucide-react';

const MemoryGlobe = dynamic(() => import('@/components/three/MemoryGlobe'), {
  ssr: false,
  loading: () => <GlobePlaceholder text="Spinning up your globe..." />,
});

const EMPTY_CACHE: GeocodeCache = {};

// Shared across mounts so navigating away and back never breaks Nominatim's 1 req/s policy.
let lastRequestAt: number | null = null;

function sleep(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) return reject(new DOMException('aborted', 'AbortError'));
    const id = window.setTimeout(resolve, ms);
    signal.addEventListener(
      'abort',
      () => {
        window.clearTimeout(id);
        reject(new DOMException('aborted', 'AbortError'));
      },
      { once: true }
    );
  });
}

/**
 * Looks up uncached places one at a time. Each effect run handles exactly one place;
 * writing the result to the cache changes `pending`, which schedules the next one.
 */
function useGeocoder(locations: string[], cacheKey: string) {
  const [cache, setCache] = useLocalState<GeocodeCache>(cacheKey, EMPTY_CACHE);
  const [failed, setFailed] = useState<string[]>([]);
  const [blocked, setBlocked] = useState(false);
  const [active, setActive] = useState<string | null>(null);

  const pending = useMemo(
    () => pendingLocationKeys(locations, cache).filter((k) => !failed.includes(k)),
    [locations, cache, failed]
  );
  const next = blocked ? null : (pending[0] ?? null);

  useEffect(() => {
    if (!next) {
      setActive(null);
      return;
    }
    const controller = new AbortController();
    const run = async () => {
      try {
        await sleep(msUntilNextRequest(lastRequestAt, Date.now()), controller.signal);
        setActive(next);
        lastRequestAt = Date.now();
        const res = await fetch(buildNominatimUrl(next), {
          signal: controller.signal,
          headers: { Accept: 'application/json' },
        });
        if (res.status === 429 || res.status === 403) {
          // Rate limited / refused: stop for this visit rather than hammering the service.
          setBlocked(true);
          return;
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const entry: GeocodeEntry = parseNominatimResponse(await res.json());
        setCache((prev) => ({ ...prev, [next]: entry }));
      } catch (err) {
        if ((err as { name?: string })?.name === 'AbortError') return;
        // Network trouble: skip this place for now, offer a retry.
        setFailed((prev) => (prev.includes(next) ? prev : [...prev, next]));
      }
    };
    void run();
    return () => controller.abort();
  }, [next, setCache]);

  const retry = () => {
    setFailed([]);
    setBlocked(false);
  };

  return { cache, active, failed, blocked, pendingCount: pending.length, retry };
}

type Place = {
  key: string;
  name: string;
  memories: Memory[];
  entry: GeocodeEntry | undefined;
};

export default function GlobePage() {
  const { data } = useDiary();
  const reducedMotion = usePrefersReducedMotion();
  const webgl = useWebGLSupport();

  const memoriesWithPlace = useMemo(
    () =>
      [...data.memories]
        .filter((m) => locationKey(m.location))
        .sort((a, b) => (a.date < b.date ? 1 : -1)),
    [data.memories]
  );
  const unplacedCount = data.memories.length - memoriesWithPlace.length;
  const locations = useMemo(() => memoriesWithPlace.map((m) => m.location), [memoriesWithPlace]);

  const geo = useGeocoder(locations, `globe-geocache:${data.couple.id}`);
  const progress = geocodeProgress(locations, geo.cache);

  const places = useMemo(() => {
    const map = new Map<string, Place>();
    for (const m of memoriesWithPlace) {
      const key = locationKey(m.location);
      const existing = map.get(key);
      if (existing) existing.memories.push(m);
      else map.set(key, { key, name: m.location.trim(), memories: [m], entry: geo.cache[key] });
    }
    return Array.from(map.values());
  }, [memoriesWithPlace, geo.cache]);

  const markers = useMemo<GlobeMarker[]>(
    () =>
      places.flatMap((p) =>
        p.entry?.status === 'found' ? [{ id: p.key, lat: p.entry.lat, lng: p.entry.lng }] : []
      ),
    [places]
  );

  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [memoryIndex, setMemoryIndex] = useState(0);
  const [focus, setFocus] = useState<{ lat: number; lng: number; key: number } | null>(null);
  const [spinPaused, setSpinPaused] = useState(false);
  const focusCounter = useRef(0);

  const selectedPlace = places.find((p) => p.key === selectedKey) ?? null;
  const selectedMemory = selectedPlace?.memories[Math.min(memoryIndex, selectedPlace.memories.length - 1)];

  const selectPlace = (place: Place) => {
    if (place.entry?.status !== 'found') return;
    setSelectedKey(place.key);
    setMemoryIndex(0);
    focusCounter.current += 1;
    setFocus({ lat: place.entry.lat, lng: place.entry.lng, key: focusCounter.current });
  };

  const autoRotate = !reducedMotion && !spinPaused && selectedKey === null;
  const lookingUp = geo.active !== null;

  return (
    <AppShell>
      <div className="space-y-6 animate-in fade-in duration-300">
        {/* Header */}
        <div className="relative overflow-hidden rounded-[1.25rem] p-6 sm:p-8 bg-hero shadow-card">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="space-y-1.5">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-ink-muted flex items-center gap-1.5">
                <Globe2 className="w-3.5 h-3.5" /> Memory Globe
              </p>
              <h1 className="font-display text-3xl sm:text-4xl text-ink">Everywhere we’ve loved</h1>
              <p className="text-sm text-ink-muted max-w-lg">
                Every place your story has touched, glowing on one little world. Spin it, then tap a place
                to fly there.
              </p>
            </div>
            <div className="flex gap-3 text-center">
              <div className="px-4 py-2 rounded-2xl bg-surface/80 backdrop-blur border border-line">
                <p className="font-display text-2xl text-ink">{markers.length}</p>
                <p className="text-[10px] uppercase tracking-wider font-bold text-ink-muted">Places</p>
              </div>
              <div className="px-4 py-2 rounded-2xl bg-surface/80 backdrop-blur border border-line">
                <p className="font-display text-2xl text-ink">{memoriesWithPlace.length}</p>
                <p className="text-[10px] uppercase tracking-wider font-bold text-ink-muted">Memories</p>
              </div>
            </div>
          </div>
        </div>

        {/* Lookup progress / problems */}
        {progress.total > 0 && (lookingUp || geo.pendingCount > 0 || geo.failed.length > 0 || geo.blocked) && (
          <div
            className="rounded-[1.25rem] bg-surface border border-line p-4 shadow-card space-y-2"
            role="status"
            aria-live="polite"
          >
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="flex items-center gap-2 text-ink">
                {lookingUp ? (
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                ) : (
                  <MapPin className="w-4 h-4 text-primary" />
                )}
                {geo.blocked
                  ? 'OpenStreetMap asked us to slow down. We’ll try the rest later.'
                  : geo.failed.length > 0 && !lookingUp && geo.pendingCount === 0
                    ? `Couldn’t reach OpenStreetMap for ${geo.failed.length} place${geo.failed.length === 1 ? '' : 's'}.`
                    : `Finding your places on the map… ${progress.done} of ${progress.total}`}
              </span>
              {(geo.blocked || (geo.failed.length > 0 && !lookingUp)) && (
                <button
                  onClick={geo.retry}
                  className="px-3 py-1.5 rounded-full bg-primary hover:bg-primary-hover text-on-primary text-xs font-bold flex items-center gap-1.5 shadow-cta"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Retry
                </button>
              )}
            </div>
            <div className="h-1.5 rounded-full bg-purple-100 overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-[width] duration-500"
                style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }}
              />
            </div>
          </div>
        )}

        {memoriesWithPlace.length === 0 ? (
          <div className="rounded-[1.25rem] bg-surface border border-line p-12 text-center shadow-card space-y-3 max-w-xl mx-auto">
            <div className="w-14 h-14 mx-auto rounded-full bg-purple-100 text-primary flex items-center justify-center">
              <MapPin className="w-6 h-6" />
            </div>
            <h2 className="font-display text-2xl text-ink">Your map is waiting</h2>
            <p className="text-sm text-ink-muted">
              Add a location to a memory (a city, a café, a beach) and it will light up here.
            </p>
            <Link
              href="/memories/new"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary hover:bg-primary-hover text-on-primary text-sm font-bold shadow-cta"
            >
              Add a memory <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Globe */}
            <div className="lg:col-span-3 rounded-[1.25rem] bg-surface border border-line shadow-card p-4 sm:p-6 flex flex-col">
              <div className="flex items-center justify-between gap-3 mb-2">
                <p className="text-xs text-ink-muted">
                  {webgl === false ? 'Globe unavailable on this device' : 'Drag to spin the globe'}
                </p>
                {webgl !== false && !reducedMotion && (
                  <button
                    onClick={() => {
                      if (selectedKey) {
                        setSelectedKey(null);
                        setSpinPaused(false);
                      } else {
                        setSpinPaused((p) => !p);
                      }
                    }}
                    className="px-3 py-1.5 rounded-full border border-line text-xs font-semibold text-ink-muted hover:text-ink hover:bg-purple-50 flex items-center gap-1.5"
                  >
                    {autoRotate ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    {autoRotate ? 'Pause spin' : 'Resume spin'}
                  </button>
                )}
              </div>
              <div className="w-full max-w-[560px] mx-auto">
                {webgl === null ? (
                  <GlobePlaceholder text="Spinning up your globe..." />
                ) : webgl ? (
                  <MemoryGlobe
                    markers={markers}
                    selectedId={selectedKey}
                    focus={focus}
                    autoRotate={autoRotate}
                    instant={reducedMotion}
                    label={`Globe showing ${markers.length} memory places`}
                  />
                ) : (
                  <div className="aspect-square rounded-full bg-purple-50 border border-line flex flex-col items-center justify-center text-center p-10 gap-2">
                    <Globe2 className="w-10 h-10 text-primary" />
                    <p className="font-display text-xl text-ink">The globe needs WebGL</p>
                    <p className="text-xs text-ink-muted max-w-xs">
                      Your browser can’t draw 3D graphics right now, but every place is still listed alongside.
                    </p>
                  </div>
                )}
              </div>
              <p className="mt-4 text-[11px] text-ink-muted flex items-start gap-1.5">
                <Info className="w-3.5 h-3.5 flex-shrink-0 mt-px" />
                <span>
                  To place memories on the globe, their place names are sent to OpenStreetMap (Nominatim) for
                  lookup. Results are saved on this device, so each place is only looked up once.
                </span>
              </p>
            </div>

            {/* Side panel */}
            <div className="lg:col-span-2 space-y-4">
              {selectedPlace && selectedMemory && (
                <MemoryCard
                  memory={selectedMemory}
                  placeName={selectedPlace.name}
                  index={memoryIndex}
                  total={selectedPlace.memories.length}
                  onIndex={setMemoryIndex}
                />
              )}

              <div className="rounded-[1.25rem] bg-surface border border-line shadow-card overflow-hidden">
                <div className="px-5 pt-5 pb-3">
                  <h2 className="font-display text-xl text-ink">Our places</h2>
                  <p className="text-xs text-ink-muted">Tap a place to fly there.</p>
                </div>
                <ul className="max-h-[420px] overflow-y-auto px-2 pb-2">
                  {places.map((place) => {
                    const found = place.entry?.status === 'found';
                    const missing = place.entry?.status === 'notfound';
                    const isActive = place.key === selectedKey;
                    const isLooking = geo.active === place.key;
                    return (
                      <li key={place.key}>
                        <button
                          onClick={() => selectPlace(place)}
                          disabled={!found}
                          aria-pressed={isActive}
                          className={`w-full text-left px-3 py-2.5 rounded-2xl flex items-center gap-3 transition-colors ${
                            isActive ? 'bg-purple-100' : found ? 'hover:bg-purple-50' : 'opacity-70 cursor-default'
                          }`}
                        >
                          <span
                            className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                              found ? 'bg-primary text-on-primary' : 'bg-purple-50 text-ink-muted'
                            }`}
                          >
                            {isLooking ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : missing ? (
                              <MapPinOff className="w-4 h-4" />
                            ) : (
                              <MapPin className="w-4 h-4" />
                            )}
                          </span>
                          <span className="flex-1 min-w-0">
                            <span className="block text-sm font-semibold text-ink truncate">{place.name}</span>
                            <span className="block text-xs text-ink-muted truncate">
                              {missing
                                ? 'Couldn’t find this one on the map'
                                : !place.entry
                                  ? isLooking
                                    ? 'Looking it up…'
                                    : geo.failed.includes(place.key)
                                      ? 'Lookup failed, retry above'
                                      : 'Waiting to be looked up'
                                  : `${place.memories.length} ${place.memories.length === 1 ? 'memory' : 'memories'}`}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
                {unplacedCount > 0 && (
                  <p className="px-5 py-3 border-t border-line text-xs text-ink-muted">
                    {unplacedCount} {unplacedCount === 1 ? 'memory has' : 'memories have'} no location yet.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function GlobePlaceholder({ text }: { text: string }) {
  return (
    <div className="relative w-full aspect-square flex items-center justify-center">
      <div className="w-3/4 aspect-square rounded-full bg-purple-50 animate-pulse" />
      <span className="absolute text-xs font-semibold text-ink-muted">{text}</span>
    </div>
  );
}

function MemoryCard({
  memory,
  placeName,
  index,
  total,
  onIndex,
}: {
  memory: Memory;
  placeName: string;
  index: number;
  total: number;
  onIndex: (i: number) => void;
}) {
  const photo = memory.photos?.[0];
  return (
    <article className="rounded-[1.25rem] bg-surface border border-line shadow-card overflow-hidden animate-in fade-in duration-300">
      <div className="relative h-48 bg-purple-50">
        {photo ? (
          <img
            src={photo.url}
            alt={photo.caption || memory.title}
            className="w-full h-full object-cover"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-ink-muted">
            <ImageOff className="w-8 h-8" />
          </div>
        )}
        <span className="absolute left-3 bottom-3 px-3 py-1 rounded-full bg-black/55 backdrop-blur text-snow text-[11px] font-semibold flex items-center gap-1 max-w-[85%]">
          <MapPin className="w-3 h-3 flex-shrink-0" />
          <span className="truncate">{placeName}</span>
        </span>
      </div>
      <div className="p-5 space-y-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-primary">{formatDate(memory.date)}</p>
          <h3 className="font-display text-xl text-ink leading-tight">{memory.title}</h3>
        </div>
        <div className="flex items-center justify-between gap-3">
          {total > 1 ? (
            <div className="flex items-center gap-1.5" aria-label="Memories at this place">
              {Array.from({ length: total }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => onIndex(i)}
                  aria-label={`Memory ${i + 1} of ${total}`}
                  aria-current={i === index}
                  className={`h-2 rounded-full transition-all ${i === index ? 'w-5 bg-primary' : 'w-2 bg-purple-200'}`}
                />
              ))}
            </div>
          ) : (
            <span />
          )}
          <Link
            href={`/memories/${memory.id}`}
            className="px-4 py-2 rounded-full bg-primary hover:bg-primary-hover text-on-primary text-xs font-bold shadow-cta flex items-center gap-1.5"
          >
            Open memory <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </article>
  );
}
