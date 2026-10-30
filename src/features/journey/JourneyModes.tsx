'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useDiary } from '@/store/DiaryContext';
import { useLocalState } from '@/lib/local-store';
import { formatDate, getMilestones, parseDate } from '@/lib/date-utils';
import { usePrefersReducedMotion, useWebGLSupport } from '@/components/three/capabilities';
import { ThreeFallback, ThreeLoading } from '@/components/three/ThreeFallback';
import type { TrainStation } from '@/components/three/TrainScene';
import { WorldJourney } from '@/components/world/WorldJourney';
import { ToyTrainJourney } from './ToyTrainJourney';
import { TrainFront, Box, CalendarHeart, Check, Map as MapIcon } from 'lucide-react';

const TrainScene = dynamic(() => import('@/components/three/TrainScene'), {
  ssr: false,
  loading: () => <ThreeLoading text="Laying down the tracks..." className="h-[440px] sm:h-[520px]" />,
});

const SplineTrain = dynamic(() => import('@/components/three/SplineTrain'), {
  ssr: false,
  loading: () => <ThreeLoading text="Loading your 3D scene..." className="h-[440px] sm:h-[520px]" />,
});

// Optional custom Spline scene (https://prod.spline.design/.../scene.splinecode). Inlined at build time.
const SPLINE_SCENE = (process.env.NEXT_PUBLIC_SPLINE_TRAIN_SCENE ?? '').trim();

type JourneyView = 'world' | '2d' | '3d';

export function JourneyModes() {
  const { data } = useDiary();
  // 'world' is the default only for someone who has never picked a view;
  // a couple who chose 2D or 3D keep what they chose.
  const [view, setView] = useLocalState<JourneyView>(`journey-view:${data.couple.id}`, 'world');

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <div
          role="radiogroup"
          aria-label="Journey view"
          className="inline-flex p-1 rounded-full bg-surface border border-line shadow-xs"
        >
          {(
            [
              { id: 'world', label: 'World', Icon: TrainFront },
              { id: '2d', label: '2D', Icon: MapIcon },
              { id: '3d', label: '3D', Icon: Box },
            ] as const
          ).map(({ id, label, Icon }) => (
            <button
              key={id}
              role="radio"
              aria-checked={view === id}
              onClick={() => setView(id)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-colors ${
                view === id ? 'bg-primary text-on-primary shadow-cta' : 'text-ink-muted hover:text-ink'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {view === 'world' ? (
        <WorldJourney />
      ) : view === '3d' ? (
        <Journey3D startDate={data.couple.startDate} />
      ) : (
        <ToyTrainJourney />
      )}
    </div>
  );
}

function Journey3D({ startDate }: { startDate: string }) {
  const reducedMotion = usePrefersReducedMotion();
  const webgl = useWebGLSupport();
  const [showAnyway, setShowAnyway] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);

  const validStart = !!startDate && !Number.isNaN(parseDate(startDate).getTime());
  const milestones = useMemo(() => (validStart ? getMilestones(startDate) : []), [startDate, validStart]);
  const stations = useMemo<TrainStation[]>(
    () => milestones.map((m) => ({ label: m.label, date: m.targetDate, reached: m.reached })),
    [milestones]
  );

  if (!validStart) {
    return (
      <div className="rounded-[1.25rem] bg-surface border border-line shadow-card p-8 text-center">
        <p className="font-display text-xl text-ink">Set your anniversary start date</p>
        <p className="text-xs text-ink-muted mt-1">Add it in Settings and the milestone stations will appear.</p>
      </div>
    );
  }

  const scene =
    webgl === null ? (
      <ThreeLoading text="Laying down the tracks..." className="h-[440px] sm:h-[520px]" />
    ) : !webgl ? (
      <ThreeFallback reason="no-webgl" />
    ) : reducedMotion && !showAnyway ? (
      <ThreeFallback reason="reduced-motion" onShowAnyway={() => setShowAnyway(true)} />
    ) : SPLINE_SCENE ? (
      <SplineTrain scene={SPLINE_SCENE} />
    ) : (
      <TrainScene stations={stations} selected={selected} onSelect={setSelected} still={reducedMotion} />
    );

  const current = selected !== null ? stations[selected] : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">{scene}</div>

      <div className="space-y-4">
        {current && selected !== null && (
          <div className="rounded-[1.25rem] bg-surface border border-line shadow-card p-5 space-y-2 animate-in fade-in duration-300">
            <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
              Station {selected + 1}
            </p>
            <h3 className="font-display text-2xl text-ink leading-tight">{current.label}</h3>
            <p className="text-sm text-ink-muted flex items-center gap-1.5">
              <CalendarHeart className="w-4 h-4 text-primary" />
              {formatDate(current.date)}
            </p>
            <p className="text-xs text-ink-muted">
              {current.reached
                ? 'We’ve already pulled through this one together.'
                : `Arriving in ${milestones[selected].daysLeft} day${milestones[selected].daysLeft === 1 ? '' : 's'}.`}
            </p>
          </div>
        )}

        <div className="rounded-[1.25rem] bg-surface border border-line shadow-card overflow-hidden">
          <div className="px-5 pt-5 pb-3">
            <h3 className="font-display text-xl text-ink">Milestone stations</h3>
            <p className="text-xs text-ink-muted">
              {SPLINE_SCENE ? 'Pick a stop to see its date.' : 'Pick a stop and the train will roll there.'}
            </p>
          </div>
          <ul className="px-2 pb-2 max-h-[380px] overflow-y-auto">
            {stations.map((st, i) => (
              <li key={st.label}>
                <button
                  onClick={() => setSelected(i)}
                  aria-pressed={selected === i}
                  className={`w-full text-left px-3 py-2.5 rounded-2xl flex items-center gap-3 transition-colors ${
                    selected === i ? 'bg-purple-100' : 'hover:bg-purple-50'
                  }`}
                >
                  <span
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 ${
                      st.reached ? 'bg-primary text-on-primary' : 'bg-purple-50 text-ink-muted border border-line'
                    }`}
                  >
                    {st.reached ? <Check className="w-3.5 h-3.5" /> : i + 1}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-semibold text-ink truncate">{st.label}</span>
                    <span className="block text-xs text-ink-muted">{formatDate(st.date)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
