'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Download, RotateCcw, Undo2, Eraser } from 'lucide-react';
import { useDiary } from '@/store/DiaryContext';

const PALETTE = [
  '#BE185D', // Rose primary
  '#E11D48', // Passion Red
  '#F43F5E', // Warm Pink
  '#9333EA', // Royal Purple
  '#F59E0B', // Amber Gold
  '#10B981', // Emerald
  '#0EA5E9', // Sky Blue
  '#1E293B', // Ink Slate
];

const BRUSH_SIZES = [
  { size: 3, label: 'Fine' },
  { size: 6, label: 'Medium' },
  { size: 12, label: 'Bold' },
];

export function LoveDoodleGame() {
  const { showToast } = useDiary();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [color, setColor] = useState(PALETTE[0]);
  const [brushSize, setBrushSize] = useState(6);
  const [isEraser, setIsEraser] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [history, setHistory] = useState<ImageData[]>([]);

  // Setup canvas resolution
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Fill white background initially
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHistory([ctx.getImageData(0, 0, canvas.width, canvas.height)]);
  }, []);

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = isEraser ? '#FFFFFF' : color;
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.closePath();
    setHistory((prev) => [...prev.slice(-10), ctx.getImageData(0, 0, canvas.width, canvas.height)]);
  };

  const handleUndo = () => {
    if (history.length <= 1) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const nextHistory = history.slice(0, -1);
    const last = nextHistory[nextHistory.length - 1];
    ctx.putImageData(last, 0, 0);
    setHistory(nextHistory);
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHistory([ctx.getImageData(0, 0, canvas.width, canvas.height)]);
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = `love_doodle_${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    showToast('Love Doodle downloaded! 🎨💕', 'heart');
  };

  return (
    <div className="space-y-4 max-w-lg mx-auto">
      {/* Tool Controls Bar */}
      <div className="p-3.5 rounded-2xl bg-surface border border-line space-y-3 shadow-xs">
        {/* Colors & Eraser */}
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
                className={`w-7 h-7 rounded-full border-2 transition-transform ${
                  color === c && !isEraser ? 'scale-115 ring-2 ring-primary/40 shadow-xs' : 'hover:scale-105'
                }`}
                style={{ backgroundColor: c, borderColor: '#FFFFFF' }}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => setIsEraser((v) => !v)}
            className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1 transition-colors ${
              isEraser ? 'border-primary bg-primary text-on-primary' : 'border-line text-ink hover:bg-canvas'
            }`}
          >
            <Eraser className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Eraser</span>
          </button>
        </div>

        {/* Brush sizes & actions */}
        <div className="flex items-center justify-between border-t border-line/60 pt-2.5">
          <div className="flex items-center gap-1">
            {BRUSH_SIZES.map((b) => (
              <button
                key={b.size}
                type="button"
                onClick={() => setBrushSize(b.size)}
                className={`px-2.5 py-1 rounded-xl text-xs font-semibold border transition-colors ${
                  brushSize === b.size && !isEraser
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-line text-ink-muted hover:text-ink'
                }`}
              >
                {b.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleUndo}
              disabled={history.length <= 1}
              className="p-1.5 rounded-lg border border-line text-ink-muted hover:text-ink disabled:opacity-30"
              title="Undo"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={handleClear}
              className="p-1.5 rounded-lg border border-line text-ink-muted hover:text-danger"
              title="Clear Canvas"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={handleDownload}
              className="px-3 py-1.5 rounded-xl bg-primary hover:bg-primary-hover text-on-primary text-xs font-semibold flex items-center gap-1.5 shadow-2xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Save PNG</span>
            </button>
          </div>
        </div>
      </div>

      {/* Canvas Box */}
      <div className="rounded-3xl border-2 border-line bg-white shadow-card overflow-hidden touch-none select-none">
        <canvas
          ref={canvasRef}
          width={600}
          height={480}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="w-full h-auto cursor-crosshair bg-white block"
        />
      </div>

      <div className="text-center text-xs text-ink-muted">
        <span>Draw a cute heart, sweet message, or doodle for your partner and save it! 💕</span>
      </div>
    </div>
  );
}
