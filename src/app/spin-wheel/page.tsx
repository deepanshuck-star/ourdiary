'use client';

import React, { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { useDiary } from '@/store/DiaryContext';
import {
  RotateCcw,
  Plus,
  Trash2,
  Calendar,
  Utensils,
  Smile,
  X,
} from 'lucide-react';

const SLICE_COLORS = [
  '#F8C8D8',
  '#CBBEF4',
  '#B6DDF4',
  '#F8DEA0',
  '#B8DCD1',
  '#F5A3A3',
  '#E8D5C4',
  '#D7C0AE',
];

export default function SpinWheelPage() {
  const { data, addWheelOption, deleteWheelOption, addEvent, addBucketItem, showToast } =
    useDiary();

  const [activeCategory, setActiveCategory] = useState<'food' | 'activity'>('food');
  const [rotation, setRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newOptionText, setNewOptionText] = useState('');

  const allOptions = data.customWheelOptions || [];
  const currentOptions = allOptions.filter((o) => o.category === activeCategory);

  const numSlices = Math.max(currentOptions.length, 1);
  const sliceAngle = 360 / numSlices;

  const handleSpin = () => {
    if (isSpinning || currentOptions.length === 0) return;

    setIsSpinning(true);
    setWinner(null);

    // Pick random index
    const winningIndex = Math.floor(Math.random() * currentOptions.length);
    // Extra full spins (5-8 rotations)
    const extraSpins = (5 + Math.floor(Math.random() * 3)) * 360;
    // Calculate target angle pointing to the top (270 deg / top marker)
    const targetAngle = extraSpins + (360 - winningIndex * sliceAngle - sliceAngle / 2);

    const finalRotation = rotation + targetAngle;
    setRotation(finalRotation);

    setTimeout(() => {
      setIsSpinning(false);
      setWinner(currentOptions[winningIndex].text);
      showToast(`The wheel picked: ${currentOptions[winningIndex].text}! 🎉`, 'heart');
    }, 3800);
  };

  const handleAddOption = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOptionText.trim()) return;
    addWheelOption(newOptionText.trim(), activeCategory);
    setNewOptionText('');
    setShowAddModal(false);
  };

  const handleSaveToCalendar = () => {
    if (!winner) return;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    addEvent({
      title: `Date: ${winner}`,
      date: tomorrow.toISOString().split('T')[0],
      category: 'Date Night',
      description: 'Chosen by spinning the Couple Date Wheel! 🎡',
    });
    showToast('Saved to couple calendar for tomorrow! 📅', 'success');
  };

  const handleSaveToBucketList = () => {
    if (!winner) return;
    addBucketItem({
      title: winner,
      category: activeCategory === 'food' ? 'Food' : 'Activities',
      completed: false,
      createdBy: data.activeProfileId,
      notes: 'Added from the Couple Date Wheel 🎡',
    });
    showToast('Added to couple bucket list! 🪣', 'heart');
  };

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-300">
        {/* Header */}
        <div className="rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-hero">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-3xl shadow-xs">
              🎡
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900">Spin the Date Wheel</h1>
              <p className="text-xs sm:text-sm text-slate-700 font-medium">
                Can’t decide where to eat or what to do? Let destiny pick your next date!
              </p>
            </div>
          </div>

          <div className="flex rounded-2xl bg-white/80 p-1 shadow-xs border border-white">
            <button
              onClick={() => {
                setActiveCategory('food');
                setWinner(null);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeCategory === 'food'
                  ? 'shadow-xs bg-primary text-on-primary'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Utensils className="w-3.5 h-3.5" />
              <span>What to Eat? 🍕</span>
            </button>
            <button
              onClick={() => {
                setActiveCategory('activity');
                setWinner(null);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeCategory === 'activity'
                  ? 'bg-rose-500 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Smile className="w-3.5 h-3.5" />
              <span>What to Do? 🎡</span>
            </button>
          </div>
        </div>

        {/* Wheel & Options Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Wheel Canvas Container (7 cols) */}
          <div className="lg:col-span-7 rounded-3xl bg-white border border-line p-6 shadow-sm flex flex-col items-center justify-center relative overflow-hidden">
            {/* Pointer Marker */}
            <div className="absolute top-4 z-20 flex flex-col items-center">
              <div className="w-6 h-6 bg-rose-600 rotate-45 rounded-sm shadow-md border-2 border-white" />
            </div>

            {/* SVG Interactive Wheel */}
            <div className="relative w-72 h-72 sm:w-80 sm:h-80 my-4">
              <svg
                viewBox="0 0 300 300"
                className="w-full h-full drop-shadow-xl"
                style={{
                  transform: `rotate(${rotation}deg)`,
                  transition: isSpinning
                    ? 'transform 3.8s cubic-bezier(0.15, 0.9, 0.25, 1)'
                    : 'none',
                }}
              >
                {currentOptions.map((opt, i) => {
                  const startAngle = (i * sliceAngle * Math.PI) / 180;
                  const endAngle = (((i + 1) * sliceAngle) * Math.PI) / 180;

                  const x1 = 150 + 140 * Math.cos(startAngle);
                  const y1 = 150 + 140 * Math.sin(startAngle);
                  const x2 = 150 + 140 * Math.cos(endAngle);
                  const y2 = 150 + 140 * Math.sin(endAngle);

                  const pathD = `M 150 150 L ${x1} ${y1} A 140 140 0 0 1 ${x2} ${y2} Z`;
                  const color = SLICE_COLORS[i % SLICE_COLORS.length];

                  const textAngle = (i * sliceAngle + sliceAngle / 2);
                  const textRad = (textAngle * Math.PI) / 180;
                  const tx = 150 + 90 * Math.cos(textRad);
                  const ty = 150 + 90 * Math.sin(textRad);

                  return (
                    <g key={opt.id}>
                      <path d={pathD} fill={color} stroke="#FFFFFF" strokeWidth="2.5" />
                      <text
                        x={tx}
                        y={ty}
                        fill="#292538"
                        fontSize="9.5"
                        fontWeight="bold"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        transform={`rotate(${textAngle + 90}, ${tx}, ${ty})`}
                        className="select-none pointer-events-none"
                      >
                        {opt.text.length > 14 ? opt.text.substring(0, 12) + '…' : opt.text}
                      </text>
                    </g>
                  );
                })}
                {/* Center Cap */}
                <circle cx="150" cy="150" r="26" fill="#FFFFFF" stroke="#EFE4D6" strokeWidth="3" />
                <circle cx="150" cy="150" r="16" fill="#292538" />
              </svg>
            </div>

            {/* Spin Trigger Button */}
            <button
              onClick={handleSpin}
              disabled={isSpinning || currentOptions.length === 0}
              className="mt-2 py-3 px-8 font-extrabold text-sm transition-all flex items-center gap-2 active:scale-95 disabled:opacity-40 bg-primary hover:bg-primary-hover text-on-primary shadow-cta rounded-full"
            >
              <RotateCcw className={`w-4 h-4 ${isSpinning ? 'animate-spin' : ''}`} />
              <span>{isSpinning ? 'Spinning Destiny...' : 'Spin the Wheel! 🎲'}</span>
            </button>
          </div>

          {/* Options Manager (5 cols) */}
          <div className="lg:col-span-5 rounded-3xl bg-white border border-line p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900">
                  Wheel Options ({currentOptions.length})
                </h3>
                <p className="text-[11px] text-slate-400">Add or remove your couple favorites</p>
              </div>

              <button
                onClick={() => setShowAddModal(true)}
                className="px-3 py-1.5 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 text-xs font-bold flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Option</span>
              </button>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {currentOptions.map((opt) => (
                <div
                  key={opt.id}
                  className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3 text-xs"
                >
                  <span className="font-bold text-slate-800">{opt.text}</span>
                  <button
                    onClick={() => deleteWheelOption(opt.id)}
                    className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                    title="Remove from wheel"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Winner Celebration Modal */}
        {winner && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-purple-100 text-center space-y-5 animate-in zoom-in-95">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-amber-400 to-rose-400 text-white flex items-center justify-center text-3xl mx-auto shadow-lg shadow-rose-200 animate-bounce">
                🌟
              </div>

              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-purple-700 bg-purple-100 px-3 py-1 rounded-full">
                  The Wheel Has Spoken!
                </span>
                <h3 className="text-2xl font-black text-slate-900 mt-2">
                  {winner}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Ready to make it happen? Save it right to your schedule!
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
                <button
                  onClick={handleSaveToCalendar}
                  className="flex-1 py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 bg-primary hover:bg-primary-hover text-on-primary shadow-cta rounded-full"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Schedule for Tomorrow</span>
                </button>

                <button
                  onClick={handleSaveToBucketList}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-800 text-xs font-bold hover:bg-slate-200 flex items-center justify-center gap-1.5"
                >
                  <span>Add to Bucket List 🪣</span>
                </button>
              </div>

              <button
                onClick={() => setWinner(null)}
                className="text-xs text-slate-400 hover:text-slate-600 font-semibold"
              >
                Close & Spin Again
              </button>
            </div>
          </div>
        )}

        {/* Add Option Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-sm text-slate-900">
                  Add New {activeCategory === 'food' ? 'Food' : 'Activity'} Option
                </h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-1 rounded-full hover:bg-slate-100 text-slate-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddOption} className="space-y-3">
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Authentic Korean BBQ 🥩"
                  value={newOptionText}
                  onChange={(e) => setNewOptionText(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-focus focus:outline-hidden"
                />

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 text-xs font-bold bg-primary hover:bg-primary-hover text-on-primary shadow-cta rounded-full"
                  >
                    Add to Wheel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
