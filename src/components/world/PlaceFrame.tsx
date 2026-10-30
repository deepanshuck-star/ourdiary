'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { W, VIEW_H, VIEW_W, useOnscreen, usePace, type WorldState } from './kit';
import { WorldControls } from './WorldControls';

export type Hover = { label: string; description: string } | null;

const PLACE_LINKS = [
  { href: '/dashboard', label: 'Home' },
  { href: '/world/forest', label: 'Memory Forest' },
  { href: '/world/river', label: 'Love River' },
  { href: '/world/mountains', label: 'Dream Mountains' },
  { href: '/world/starlight', label: 'Starlight Hill' },
];

/**
 * The shared shape of a place: a way back, the scene, and the words under
 * it. Each place puts its own real items in plain text below the scene, so
 * nothing in the world is reachable only by tapping something that moves.
 */
export function PlaceFrame({
  s,
  current,
  title,
  line,
  sceneLabel,
  svgRef,
  hovered,
  overlay,
  children,
  caption,
}: {
  s: WorldState;
  current: string;
  title: string;
  line: string;
  sceneLabel: string;
  svgRef: React.RefObject<SVGSVGElement | null>;
  hovered: Hover;
  overlay?: React.ReactNode;
  children: React.ReactNode;
  caption?: React.ReactNode;
}) {
  const rootRef = React.useRef<HTMLElement>(null);
  const onscreen = useOnscreen(rootRef);
  usePace(rootRef, s.ambience.pace);

  return (
    <div className="space-y-4">
      <nav aria-label="Places in your world" className="flex flex-wrap items-center gap-2">
        <Link
          href="/world"
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold border"
          style={{ background: W.paper, color: W.ink, borderColor: '#DCCFBC' }}
        >
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
          Your world
        </Link>
        {PLACE_LINKS.map((p) => (
          <Link
            key={p.href}
            href={p.href}
            aria-current={p.href === current ? 'page' : undefined}
            className="rounded-full px-3 py-1.5 text-xs font-semibold border"
            style={
              p.href === current
                ? { background: W.ink, color: W.paper, borderColor: W.ink }
                : { background: W.paper, color: W.ink, borderColor: '#DCCFBC' }
            }
          >
            {p.label}
          </Link>
        ))}
      </nav>

      <section
        ref={rootRef}
        className="living-world relative rounded-[2rem] overflow-hidden border shadow-card"
        data-onscreen={onscreen ? 'true' : 'false'}
        data-weather={s.weather}
        style={{ background: W.paper, borderColor: '#E7DCCB' }}
        aria-label={title}
      >
        <div className="relative aspect-[4/3] sm:aspect-[16/8] lg:aspect-[16/7]">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
            preserveAspectRatio="xMidYMid slice"
            className="absolute inset-0 w-full h-full"
            role="group"
            aria-label={sceneLabel}
          >
            {children}
          </svg>
          {hovered && (
            <div
              className="pointer-events-none absolute left-3 bottom-3 max-w-[80%] rounded-2xl px-3 py-1.5 text-xs font-semibold shadow-sm"
              style={{ background: W.paper, color: W.ink }}
            >
              {hovered.label} · <span style={{ color: '#6B5E55' }}>{hovered.description}</span>
            </div>
          )}
          {overlay}
          <div className="absolute right-3 top-3">
            <WorldControls />
          </div>
        </div>
        <div className="px-5 py-4 sm:px-7 sm:py-5" style={{ color: W.ink }}>
          <h1 className="lw-handwritten text-3xl sm:text-4xl leading-none">{title}</h1>
          <p className="mt-2 text-sm leading-relaxed" style={{ color: W.inkSoft }}>
            {line}
          </p>
          {caption}
        </div>
      </section>
    </div>
  );
}

/** A paper panel for a place's real items, below its scene. */
export function PlacePanel({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="rounded-[1.5rem] border p-5 sm:p-6" style={{ background: W.paper, borderColor: '#E7DCCB', color: W.ink }}>
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 className="lw-handwritten text-2xl leading-none">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function EmptyNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm leading-relaxed" style={{ color: W.inkSoft }}>
      {children}
    </p>
  );
}
