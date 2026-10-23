'use client';

import React, { useMemo, useState } from 'react';
import { BookOpen, Printer, Heart } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { useDiary } from '@/store/DiaryContext';
import { useSpaceMode } from '@/hooks/useSpaceMode';
import { formatDate } from '@/lib/date-utils';
import { availableYears } from '@/lib/features/yearReview';
import type { Couple, Memory } from '@/types';

// The book is designed as paper: fixed light colours so it looks (and prints) the same in dark mode.
const PRINT_CSS = `
@page { size: A4; margin: 0; }
.book-page { aspect-ratio: 210 / 297; }
@media print {
  html, body { background: #ffffff !important; }
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .book-page {
    width: 210mm; height: 297mm; aspect-ratio: auto; margin: 0 !important;
    border-radius: 0 !important; box-shadow: none !important; border: 0 !important;
    break-after: page; page-break-after: always; overflow: hidden;
  }
  .book-page:last-child { break-after: auto; page-break-after: auto; }
}
`;

type YearChoice = number | 'all';

function CoverPage({ couple, label, count, range }: { couple: Couple; label: string; count: number; range: string }) {
  return (
    <section className="book-page relative flex flex-col items-center justify-center gap-6 bg-[#FDF2F8] text-[#2A1520] px-[10%] text-center overflow-hidden">
      <div className="absolute inset-[4%] border border-[#F9A8D4] rounded-[1rem] pointer-events-none" aria-hidden="true" />
      <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#9D174D]">Our memory book</p>
      {couple.photoUrl ? (
        <img src={couple.photoUrl} alt="" className="w-40 h-40 rounded-full object-cover border-4 border-white shadow" />
      ) : (
        <div className="flex items-center">
          <img src={couple.user1.avatar} alt="" className="w-24 h-24 rounded-full object-cover border-4 border-white" />
          <img src={couple.user2.avatar} alt="" className="w-24 h-24 rounded-full object-cover border-4 border-white -ml-5" />
        </div>
      )}
      <h2 className="font-display text-4xl sm:text-5xl font-semibold leading-tight">{couple.name}</h2>
      <p className="font-display italic text-lg text-[#6B4A5A]">
        {couple.user1.name} &amp; {couple.user2.name}
      </p>
      <div className="w-16 h-px bg-[#BE185D]" aria-hidden="true" />
      <p className="text-sm text-[#6B4A5A]">
        {label} · {count} {count === 1 ? 'memory' : 'memories'}
        {range ? ` · ${range}` : ''}
      </p>
    </section>
  );
}

function MemoryPage({ memory, couple, pageNo }: { memory: Memory; couple: Couple; pageNo: number }) {
  const [hero, ...rest] = memory.photos || [];
  const perspectives = (['user_1', 'user_2'] as const)
    .map((id) => ({ id, text: memory.perspectives?.[id], name: id === 'user_1' ? couple.user1.name : couple.user2.name }))
    .filter((p) => p.text && p.text.trim());
  return (
    <section className="book-page relative flex flex-col bg-white text-[#2A1520] px-[8%] py-[7%] gap-4 overflow-hidden">
      {hero && (
        <img
          src={hero.url}
          alt={hero.caption || memory.title}
          className={`w-full ${rest.length ? 'h-[38%]' : 'h-[46%]'} object-cover rounded-[0.75rem] flex-shrink-0`}
        />
      )}
      {rest.length > 0 && (
        <div className="grid grid-cols-3 gap-2 h-[11%] flex-shrink-0">
          {rest.slice(0, 3).map((p) => (
            <img key={p.id} src={p.url} alt={p.caption || ''} className="w-full h-full object-cover rounded-[0.5rem]" />
          ))}
        </div>
      )}
      <div className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#9D174D]">
          {formatDate(memory.date)}
          {memory.location ? ` · ${memory.location}` : ''}
        </p>
        <h3 className="font-display text-2xl sm:text-3xl font-semibold leading-tight">{memory.title}</h3>
      </div>
      {memory.description && (
        <p className="text-sm leading-relaxed text-[#4A2E3B] line-clamp-[8] whitespace-pre-line">{memory.description}</p>
      )}
      {perspectives.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 min-h-0">
          {perspectives.map((p) => (
            <blockquote key={p.id} className="border-l-2 border-[#BE185D] pl-3 text-xs italic text-[#4A2E3B] line-clamp-5">
              “{p.text}”
              <footer className="not-italic font-semibold text-[#9D174D] mt-1">— {p.name}</footer>
            </blockquote>
          ))}
        </div>
      )}
      <p className="absolute bottom-[3%] inset-x-0 text-center text-[10px] text-[#6B4A5A]">{pageNo}</p>
    </section>
  );
}

function ClosingPage({ couple }: { couple: Couple }) {
  return (
    <section className="book-page flex flex-col items-center justify-center gap-4 bg-[#FDF2F8] text-[#2A1520] px-[10%] text-center">
      <Heart className="w-8 h-8 text-[#BE185D]" aria-hidden="true" />
      <p className="font-display text-3xl font-semibold">To be continued…</p>
      <p className="text-sm text-[#6B4A5A]">
        Made with love by {couple.user1.name} &amp; {couple.user2.name}
      </p>
    </section>
  );
}

function Book({ couple, memories, label }: { couple: Couple; memories: Memory[]; label: string }) {
  const range =
    memories.length > 1
      ? `${formatDate(memories[0].date)} – ${formatDate(memories[memories.length - 1].date)}`
      : '';
  return (
    <>
      <CoverPage couple={couple} label={label} count={memories.length} range={range} />
      {memories.map((m, i) => (
        <MemoryPage key={m.id} memory={m} couple={couple} pageNo={i + 1} />
      ))}
      <ClosingPage couple={couple} />
    </>
  );
}

export default function MemoryBookPage() {
  const { data, isHydrated } = useDiary();
  const { note: spaceNote, title } = useSpaceMode();
  const note = spaceNote('/memory-book');
  const years = useMemo(() => availableYears(data.memories), [data.memories]);
  const [choice, setChoice] = useState<YearChoice>('all');

  const memories = useMemo(
    () =>
      data.memories
        .filter((m) => choice === 'all' || m.date.startsWith(String(choice)))
        .slice()
        .sort((a, b) => a.date.localeCompare(b.date)),
    [data.memories, choice]
  );
  const label = choice === 'all' ? 'Every chapter so far' : `The year ${choice}`;

  return (
    <>
      <style>{PRINT_CSS}</style>

      {/* On screen: the app with a live preview. Hidden entirely when printing. */}
      <div className="print:hidden">
        <AppShell>
          <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-300">
            <header className="rounded-[1.5rem] bg-hero px-6 py-8 sm:px-10 flex flex-wrap items-end justify-between gap-5">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-purple-800">Memory book</p>
                <h1 className="font-display text-3xl sm:text-4xl font-semibold text-ink">
                  {title('/memory-book', 'Your story, in print')}
                </h1>
                <p className="text-sm text-slate-700 mt-2 max-w-md">
                  A cover, then one page per memory. Save it as a PDF or print it to keep on the shelf.
                </p>
                {note && <p className="text-sm text-ink-muted mt-2 max-w-md">{note}</p>}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 text-sm text-ink-muted">
                  <span>Chapter</span>
                  <select
                    value={String(choice)}
                    onChange={(e) => setChoice(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                    className="min-h-11 px-4 rounded-full border border-line bg-surface text-ink font-semibold"
                  >
                    <option value="all">All years</option>
                    {years.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  onClick={() => window.print()}
                  disabled={!isHydrated || memories.length === 0}
                  className="min-h-11 px-5 rounded-full bg-primary hover:bg-primary-hover text-on-primary text-sm font-semibold shadow-cta inline-flex items-center gap-2 disabled:opacity-50"
                >
                  <Printer className="w-4 h-4" aria-hidden="true" />
                  Save as PDF / Print
                </button>
              </div>
            </header>

            {!isHydrated ? (
              <div className="h-96 rounded-[1.25rem] bg-purple-50 animate-pulse" />
            ) : memories.length === 0 ? (
              <div className="py-16 px-6 text-center rounded-[1.25rem] border border-dashed border-purple-200 bg-surface space-y-2">
                <BookOpen className="w-8 h-8 mx-auto text-primary" aria-hidden="true" />
                <p className="font-display text-xl font-semibold text-ink">No memories in this chapter yet</p>
                <p className="text-sm text-ink-muted">Add a few moments and your book will fill itself in.</p>
              </div>
            ) : (
              <div className="space-y-6" aria-label="Book preview">
                <p className="text-xs text-ink-muted text-center">
                  Preview · {memories.length + 2} pages. Tip: turn on “Background graphics” in the print dialog.
                </p>
                <div className="space-y-6 [&_.book-page]:mx-auto [&_.book-page]:w-full [&_.book-page]:max-w-[34rem] [&_.book-page]:rounded-[1.25rem] [&_.book-page]:shadow-card [&_.book-page]:border [&_.book-page]:border-line">
                  <Book couple={data.couple} memories={memories} label={label} />
                </div>
              </div>
            )}
          </div>
        </AppShell>
      </div>

      {/* Print only: just the pages, no app chrome. */}
      {isHydrated && memories.length > 0 && (
        <div className="hidden print:block">
          <Book couple={data.couple} memories={memories} label={label} />
        </div>
      )}
    </>
  );
}
