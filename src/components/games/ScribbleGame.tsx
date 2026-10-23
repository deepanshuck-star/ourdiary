'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { Clock, Eraser, RotateCcw, Send, Trash2, Trophy } from 'lucide-react';
import { useDiary } from '@/store/DiaryContext';
import { useGameSession } from '@/hooks/useGameSession';
import { useNow } from '@/hooks/useNow';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  SCRIBBLE_BANKS,
  addGuess,
  createRound,
  nextRound,
  pickWord,
  revealedHint,
  roundOver,
  secondsLeft,
  type ScribbleState,
} from '@/lib/features/games/scribble';

const PALETTE = ['#BE185D', '#E11D48', '#9333EA', '#F59E0B', '#10B981', '#0EA5E9', '#1E293B'];

const BRUSH_SIZES = [
  { size: 3, label: 'Fine' },
  { size: 6, label: 'Medium' },
  { size: 12, label: 'Bold' },
];

/** Points travel normalised 0–1, so the two screens line up at any size. */
interface StrokePayload {
  points: { x: number; y: number }[];
  color: string;
  size: number;
}

/** Send part-way through a stroke rather than at the end, or the guesser
 *  watches a blank canvas and then a finished drawing. */
const CHUNK = 10;

export function ScribbleGame() {
  const { data, activeProfile, partnerProfile } = useDiary();
  const coupleId = data.couple.id || 'demo';

  const game = useGameSession<ScribbleState>('scribble');
  const { state, myId, partnerId, loading, notice, isRemote } = game;

  // The clock only ever comes from here — Date.now() during render fails the
  // purity rule and would freeze at prerender time anyway.
  const tick = useNow(250);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const bufferRef = useRef<{ x: number; y: number }[]>([]);
  const drawingRef = useRef(false);

  const [color, setColor] = useState(PALETTE[0]);
  const [brush, setBrush] = useState(6);
  const [isEraser, setIsEraser] = useState(false);
  const [bank, setBank] = useState(SCRIBBLE_BANKS[0]);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');

  const paint = useCallback((stroke: StrokePayload) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || stroke.points.length === 0) return;
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    stroke.points.forEach((p, i) => {
      const x = p.x * canvas.width;
      const y = p.y * canvas.height;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }, []);

  const wipe = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  // A fresh sheet on mount and at the top of every round, on both devices —
  // cheaper and more reliable than broadcasting a clear to the other screen.
  useEffect(() => {
    wipe();
  }, [wipe, state?.round]);

  // Strokes go over broadcast, never through game_sessions: a drawing is
  // hundreds of messages a minute and the board is versioned per move.
  useEffect(() => {
    if (!isRemote) return;
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const channel = supabase.channel(`scribble-strokes-${coupleId}`, {
      config: { broadcast: { self: false } },
    });
    channel
      .on('broadcast', { event: 'stroke' }, (message: { payload?: StrokePayload }) => {
        if (message.payload) paint(message.payload);
      })
      .on('broadcast', { event: 'clear' }, () => wipe())
      .subscribe();
    channelRef.current = channel;

    return () => {
      channelRef.current = null;
      void supabase.removeChannel(channel);
    };
  }, [isRemote, coupleId, paint, wipe]);

  const broadcast = useCallback((event: 'stroke' | 'clear', payload: object) => {
    void channelRef.current?.send({ type: 'broadcast', event, payload });
  }, []);

  const isDrawer = Boolean(state && myId && state.drawerId === myId);
  const over = state && tick !== null ? roundOver(state, tick) : false;
  const canDraw = isDrawer && !over;

  const pointAt = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: (e.clientX - rect.left) / rect.width, y: (e.clientY - rect.top) / rect.height };
  };

  const flush = () => {
    if (bufferRef.current.length < 2) return;
    broadcast('stroke', {
      points: bufferRef.current,
      color: isEraser ? '#FFFFFF' : color,
      size: brush,
    });
    // Carry the last point over so the next chunk joins up with this one.
    bufferRef.current = bufferRef.current.slice(-1);
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!canDraw) return;
    drawingRef.current = true;
    bufferRef.current = [pointAt(e)];
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const point = pointAt(e);
    const previous = bufferRef.current[bufferRef.current.length - 1];
    bufferRef.current.push(point);
    if (previous) paint({ points: [previous, point], color: isEraser ? '#FFFFFF' : color, size: brush });
    if (bufferRef.current.length >= CHUNK) flush();
  };

  const onPointerUp = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    flush();
    bufferRef.current = [];
  };

  const clearCanvas = () => {
    wipe();
    broadcast('clear', {});
  };

  const nameFor = (id: string | null) =>
    id === myId ? activeProfile.name : id === partnerId ? partnerProfile.name : 'Someone';

  const begin = async () => {
    if (!myId || !partnerId || tick === null) return;
    const word = pickWord(bank, Math.random);
    // turn_user_id stays null on every write: the guesser is the one sending
    // moves, so naming the drawer as the turn holder locks them out.
    await game.start(createRound([myId, partnerId], myId, word, bank, tick), null);
  };

  const advance = async () => {
    if (!state || tick === null) return;
    const word = pickWord(state.bank, Math.random, state.usedWords);
    clearCanvas();
    setDraft('');
    setError('');
    await game.move(nextRound(state, word, tick), null);
  };

  const submitGuess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!state || !myId || tick === null) return;
    const next = addGuess(state, myId, draft, tick);
    if (!next) {
      setError(over ? 'That round’s done — start the next one.' : 'Type a guess first.');
      return;
    }
    setError('');
    const ok = await game.move(next, null);
    if (ok) setDraft('');
  };

  if (loading || tick === null) return <p className="text-sm text-ink-muted">Loading…</p>;

  if (!state) {
    return (
      <div className="rounded-[1.25rem] border border-line bg-surface p-5 space-y-4 shadow-sm">
        <p className="text-sm text-ink-muted">
          One of you draws the word, the other types guesses against a ninety-second clock. You both score
          when it lands, so an unreadable drawing costs the artist too.
        </p>
        <div>
          <label htmlFor="scribble-bank" className="block text-xs font-semibold text-ink mb-1">
            Word bank
          </label>
          <select
            id="scribble-bank"
            value={bank}
            onChange={(e) => setBank(e.target.value)}
            className="w-full px-4 py-2.5 rounded-2xl border border-line bg-canvas text-ink text-sm focus:outline-none focus:ring-2 focus:ring-focus"
          >
            {SCRIBBLE_BANKS.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={begin}
          disabled={!partnerId}
          className="px-5 py-2.5 rounded-full text-xs font-semibold bg-primary hover:bg-primary-hover text-on-primary shadow-cta disabled:opacity-60"
        >
          Start drawing
        </button>
        {!partnerId && <p className="text-xs text-ink-muted">Your partner needs to join your space first.</p>}
        {!isRemote && (
          <p className="text-xs text-ink-muted italic">
            Demo mode — one device, so there’s no second screen for the drawing to appear on. Sit together and
            pass the phone.
          </p>
        )}
      </div>
    );
  }

  const left = secondsLeft(state, tick);
  const hint = revealedHint(state, tick);
  const myScore = myId ? state.scores[myId] ?? 0 : 0;
  const theirScore = partnerId ? state.scores[partnerId] ?? 0 : 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-ink" aria-live="polite">
            Round {state.round} ·{' '}
            {isDrawer ? 'You’re drawing' : `${nameFor(state.drawerId)} is drawing`}
          </p>
          <p className="text-xs text-ink-muted">{state.bank}</p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`inline-flex items-center gap-1.5 text-sm font-semibold tabular-nums ${
              left <= 10 && !over ? 'text-danger' : 'text-ink'
            }`}
          >
            <Clock className="w-4 h-4" aria-hidden="true" />
            <span className="sr-only">Seconds left:</span>
            {String(Math.floor(left / 60))}:{String(left % 60).padStart(2, '0')}
          </span>
          <button
            type="button"
            onClick={() => game.end()}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold border border-line text-ink hover:bg-canvas"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" /> New game
          </button>
        </div>
      </div>

      {notice && (
        <p role="status" className="text-xs text-ink-muted rounded-2xl bg-canvas border border-line p-3">
          {notice}
        </p>
      )}

      {/* The word is rendered for the drawer only. Never put it anywhere the
          guesser's DOM can reach, title attributes included. */}
      {isDrawer ? (
        <div className="rounded-[1.25rem] border border-line bg-hero p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">Your word</p>
          <p className="font-display text-2xl font-semibold text-ink mt-0.5">{state.word}</p>
          <p className="text-xs text-ink-muted mt-1">No letters, no numbers, no mouthing it.</p>
        </div>
      ) : (
        <div className="rounded-[1.25rem] border border-line bg-hero p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">The word</p>
          <p className="font-display text-2xl font-semibold text-ink mt-0.5 tracking-[0.3em] whitespace-pre">
            {hint}
          </p>
          <p className="text-xs text-ink-muted mt-1">More letters appear as the clock runs down.</p>
          {/* Demo mode only: one device, so whoever is holding it has to be
              able to see the word or nobody can draw it. Never offered live. */}
          {!isRemote && (
            <details className="mt-2">
              <summary className="text-xs font-semibold text-ink cursor-pointer">
                Holding the phone? Show the word
              </summary>
              <p className="font-display text-lg font-semibold text-ink mt-1">{state.word}</p>
            </details>
          )}
        </div>
      )}

      <div className="rounded-[1.25rem] border border-line bg-surface p-3.5 space-y-3">
        {isDrawer && (
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              {PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    setColor(c);
                    setIsEraser(false);
                  }}
                  aria-label={`Colour ${c}`}
                  className={`w-7 h-7 rounded-full border-2 border-white ${
                    color === c && !isEraser ? 'ring-2 ring-primary/40' : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              {BRUSH_SIZES.map((b) => (
                <button
                  key={b.size}
                  type="button"
                  onClick={() => setBrush(b.size)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-semibold border ${
                    brush === b.size
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-line text-ink-muted hover:text-ink'
                  }`}
                >
                  {b.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setIsEraser((v) => !v)}
                className={`p-1.5 rounded-lg border ${
                  isEraser ? 'border-primary bg-primary text-on-primary' : 'border-line text-ink-muted hover:text-ink'
                }`}
                aria-label="Eraser"
                aria-pressed={isEraser}
              >
                <Eraser className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={clearCanvas}
                className="p-1.5 rounded-lg border border-line text-ink-muted hover:text-danger"
                aria-label="Clear the canvas"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-line bg-white overflow-hidden touch-none select-none">
          <canvas
            ref={canvasRef}
            width={640}
            height={440}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            className={`w-full h-auto block bg-white ${canDraw ? 'cursor-crosshair' : 'cursor-default'}`}
          />
        </div>

        {!isRemote && (
          <p className="text-xs text-ink-muted italic">
            Demo mode — one device. The other screen can’t see these strokes, so keep the phone where you can
            both reach it.
          </p>
        )}
      </div>

      {over ? (
        <div className="rounded-[1.25rem] border border-line bg-canvas p-5 space-y-3">
          <p className="font-display text-xl font-semibold text-ink flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" aria-hidden="true" />
            {state.solvedBy ? `${nameFor(state.solvedBy)} got it` : 'Nobody got it'}
          </p>
          <p className="text-sm text-ink-muted">
            The word was <span className="font-semibold text-ink">{state.word}</span>.
          </p>
          <div className="flex items-center gap-5 text-sm">
            <span className="text-ink-muted">
              <span className="font-semibold text-ink">{activeProfile.name}</span>{' '}
              <span className="tabular-nums">{myScore}</span>
            </span>
            <span className="text-ink-muted">
              <span className="font-semibold text-ink">{partnerProfile.name}</span>{' '}
              <span className="tabular-nums">{theirScore}</span>
            </span>
          </div>
          <button
            type="button"
            onClick={advance}
            className="px-5 py-2.5 rounded-full text-xs font-semibold bg-primary hover:bg-primary-hover text-on-primary shadow-cta"
          >
            Next round — {nameFor(partnerId === state.drawerId ? myId : partnerId)} draws
          </button>
        </div>
      ) : (
        <form onSubmit={submitGuess} className="flex items-center gap-2">
          <label htmlFor="scribble-guess" className="sr-only">
            Your guess
          </label>
          <input
            id="scribble-guess"
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              if (error) setError('');
            }}
            disabled={isDrawer}
            placeholder={isDrawer ? 'You’re drawing — no guessing' : 'What is it?'}
            autoComplete="off"
            className="flex-1 px-4 py-2.5 rounded-2xl border border-line bg-surface text-ink text-sm focus:outline-none focus:ring-2 focus:ring-focus disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={isDrawer || !draft.trim()}
            aria-label="Send guess"
            className="p-3 rounded-full bg-primary hover:bg-primary-hover text-on-primary shadow-cta disabled:opacity-50 flex-shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      )}

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}

      <div className="rounded-[1.25rem] border border-line bg-canvas p-4 min-h-[5rem]">
        {state.guesses.length === 0 ? (
          <p className="text-sm text-ink-muted">No guesses yet.</p>
        ) : (
          <ul className="space-y-1.5">
            {[...state.guesses].reverse().map((guess, i) => (
              <li
                key={`${guess.at}-${i}`}
                className={`text-sm flex items-baseline gap-2 ${
                  guess.correct ? 'text-success font-semibold' : 'text-ink'
                }`}
              >
                <span className="text-xs text-ink-muted flex-shrink-0">{nameFor(guess.byId)}</span>
                <span>{guess.text}</span>
                {guess.correct && <span className="text-xs">got it</span>}
                {guess.nearMiss && <span className="text-xs text-primary font-semibold">so close</span>}
              </li>
            ))}
          </ul>
        )}
      </div>

      {!over && (
        <div className="flex items-center gap-5 text-xs text-ink-muted">
          <span>
            <span className="font-semibold text-ink">{activeProfile.name}</span>{' '}
            <span className="tabular-nums">{myScore}</span>
          </span>
          <span>
            <span className="font-semibold text-ink">{partnerProfile.name}</span>{' '}
            <span className="tabular-nums">{theirScore}</span>
          </span>
        </div>
      )}
    </div>
  );
}

export default ScribbleGame;
