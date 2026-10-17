'use client';

import React, { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { useDiary } from '@/store/DiaryContext';
import { formatDate, getDaysUntil, isPastOrToday } from '@/lib/date-utils';
import { Letter } from '@/types';
import confetti from 'canvas-confetti';
import {
  MailCheck,
  Plus,
  Lock,
  MailOpen,
  Heart,
  Clock,
  Trash2,
  X,
  Send,
  FileEdit,
} from 'lucide-react';

export default function LettersPage() {
  const { data, activeProfile, partnerProfile, addLetter, deleteLetter } = useDiary();

  const [activeTab, setActiveTab] = useState<'received' | 'sent' | 'drafts'>('received');
  const [readingLetter, setReadingLetter] = useState<Letter | null>(null);
  const [showWriteModal, setShowWriteModal] = useState(false);

  // Form states
  const [letterTitle, setLetterTitle] = useState('');
  const [letterContent, setLetterContent] = useState('');
  const [unlockDate, setUnlockDate] = useState('2025-05-12');

  React.useEffect(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    setUnlockDate(d.toISOString().split('T')[0]);
  }, []);
  const [envelopeColor, setEnvelopeColor] = useState('#F8C8D8');
  const [, setIsDraft] = useState(false);

  // Filter letters based on active profile:
  // Received letters: toId === activeProfile.id && !isDraft
  const receivedLetters = data.letters.filter(
    (l) => l.toId === activeProfile.id && !l.isDraft
  );
  // Sent letters: fromId === activeProfile.id && !isDraft
  const sentLetters = data.letters.filter(
    (l) => l.fromId === activeProfile.id && !l.isDraft
  );
  // Drafts: fromId === activeProfile.id && isDraft
  const draftLetters = data.letters.filter(
    (l) => l.fromId === activeProfile.id && l.isDraft
  );

  const displayedList =
    activeTab === 'received'
      ? receivedLetters
      : activeTab === 'sent'
      ? sentLetters
      : draftLetters;

  const handleOpenLetter = (letter: Letter) => {
    const isUnlocked = isPastOrToday(letter.unlockDate);
    if (!isUnlocked && activeTab === 'received') {
      return; // Locked for recipient!
    }

    setReadingLetter(letter);

    // Fire romantic confetti when reading an unlocked letter!
    if (isUnlocked) {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#C2410C', '#FFBE98', '#E11D48', '#FED7AA'],
        disableForReducedMotion: true,
      });
    }
  };

  const handleSendLetter = (draftMode: boolean) => {
    if (!letterTitle.trim() || !letterContent.trim()) return;

    addLetter({
      title: letterTitle.trim(),
      fromId: activeProfile.id,
      toId: partnerProfile.id,
      content: letterContent.trim(),
      unlockDate,
      isDraft: draftMode,
      envelopeColor,
    });

    setLetterTitle('');
    setLetterContent('');
    setShowWriteModal(false);
  };

  return (
    <AppShell>
      <div className="space-y-6 animate-in fade-in duration-300">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-3xl bg-white border border-line shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-2xl bg-pink-100 text-pink-600">
              <MailCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900">Time Capsule Letters</h1>
              <p className="text-xs text-slate-500">
                Sealed love letters with future unlock dates, sent between {data.couple.name}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              setIsDraft(false);
              setShowWriteModal(true);
            }}
            className="px-5 py-2.5 rounded-full bg-primary hover:bg-primary-hover text-on-primary font-bold text-xs sm:text-sm shadow-cta hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Write Letter to {partnerProfile.name}</span>
          </button>
        </div>

        {/* Tab Filters */}
        <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-white border border-line shadow-xs max-w-md">
          <button
            onClick={() => setActiveTab('received')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'received'
                ? 'bg-rose-500 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Received ({receivedLetters.length})
          </button>
          <button
            onClick={() => setActiveTab('sent')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'sent'
                ? 'shadow-xs bg-primary text-on-primary'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Sent by You ({sentLetters.length})
          </button>
          <button
            onClick={() => setActiveTab('drafts')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'drafts'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Drafts ({draftLetters.length})
          </button>
        </div>

        {/* Letters Grid */}
        {displayedList.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayedList.map((letter) => {
              const isUnlocked = isPastOrToday(letter.unlockDate);
              const daysLeft = getDaysUntil(letter.unlockDate);
              const isLockedForMe = !isUnlocked && activeTab === 'received';

              return (
                <div
                  key={letter.id}
                  onClick={() => handleOpenLetter(letter)}
                  className={`group relative rounded-3xl p-6 border transition-all duration-300 flex flex-col justify-between cursor-pointer ${
                    isLockedForMe
                      ? 'bg-slate-50 border-slate-200 opacity-90'
                      : 'bg-white border-line shadow-sm hover:shadow-xl hover:-translate-y-1'
                  }`}
                  style={{
                    borderTop: `6px solid ${letter.envelopeColor || '#CBBEF4'}`,
                  }}
                >
                  <div className="space-y-4">
                    {/* Top status */}
                    <div className="flex items-center justify-between">
                      {isLockedForMe ? (
                        <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-200 text-slate-700 text-xs font-bold">
                          <Lock className="w-3.5 h-3.5" />
                          <span>Locked</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-700 text-xs font-bold border border-rose-100">
                          <MailOpen className="w-3.5 h-3.5" />
                          <span>{isUnlocked ? 'Unlocked' : 'Scheduled'}</span>
                        </span>
                      )}

                      <span className="text-[11px] text-slate-400">
                        {formatDate(letter.createdAt)}
                      </span>
                    </div>

                    {/* Envelope Stamp Graphic */}
                    <div className="flex items-center justify-between">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-rose-500 shadow-xs bg-hero">
                        <Heart className="w-6 h-6 fill-rose-500" />
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                          Unlock Date
                        </span>
                        <span className="text-xs font-extrabold text-slate-800">
                          {formatDate(letter.unlockDate)}
                        </span>
                      </div>
                    </div>

                    {/* Title */}
                    <div>
                      <h3 className="font-extrabold text-lg text-slate-900 group-hover:text-purple-600 transition-colors line-clamp-1">
                        {letter.title}
                      </h3>
                      {isLockedForMe ? (
                        <div className="mt-3 p-3 rounded-2xl bg-slate-100 border border-slate-200 text-xs text-slate-600 space-y-1">
                          <p className="font-semibold flex items-center gap-1 text-slate-800">
                            <Clock className="w-3.5 h-3.5 text-rose-500" />
                            Unlocks in {daysLeft} days
                          </p>
                          <p className="text-[11px] text-slate-500">
                            The envelope is wax-sealed! Contents remain a surprise until the unlock date.
                          </p>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-600 line-clamp-2 mt-1 leading-relaxed">
                          {letter.content}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Card bottom actions */}
                  <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold">
                    <span className="text-purple-600 flex items-center gap-1">
                      {isLockedForMe ? 'Waiting for date...' : 'Click to Read Letter →'}
                    </span>
                    {activeTab === 'drafts' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteLetter(letter.id);
                        }}
                        className="p-1 text-slate-400 hover:text-rose-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-16 text-center rounded-3xl bg-white border border-line space-y-3">
            <div className="text-5xl">💌</div>
            <h3 className="font-bold text-slate-800 text-lg">No letters in this folder</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Write a letter to your partner with a secret unlock date for an upcoming anniversary or rainy day.
            </p>
          </div>
        )}

        {/* Read Letter Modal */}
        {readingLetter && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
            onClick={() => setReadingLetter(null)}
          >
            <div
              className="bg-surface rounded-3xl p-6 sm:p-10 max-w-2xl w-full shadow-2xl border-2 border-line space-y-6 max-h-[85vh] overflow-y-auto animate-in fade-in zoom-in-95 relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Envelope Flap Header Decoration */}
              <div className="flex items-center justify-between pb-4 border-b border-rose-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-500">
                    <Heart className="w-5 h-5 fill-rose-500 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-xl text-slate-900">{readingLetter.title}</h3>
                    <p className="text-xs text-slate-400">
                      Sealed on {formatDate(readingLetter.createdAt)} • Unlocked on {formatDate(readingLetter.unlockDate)}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setReadingLetter(null)}
                  className="p-1 rounded-full text-slate-400 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Letter Paper Body */}
              <div className="p-6 rounded-2xl bg-white border border-rose-100/60 shadow-inner font-serif text-slate-800 text-sm sm:text-base leading-relaxed whitespace-pre-wrap">
                {readingLetter.content}
              </div>

              {/* Close Button */}
              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setReadingLetter(null)}
                  className="px-6 py-2.5 rounded-2xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 shadow-sm"
                >
                  Close Letter
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Compose Letter Modal */}
        {showWriteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl border border-slate-100 space-y-5 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="font-extrabold text-xl text-slate-900">
                    Write to {partnerProfile.name}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Author: {activeProfile.name} • Recipient: {partnerProfile.name}
                  </p>
                </div>
                <button
                  onClick={() => setShowWriteModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Letter Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Open on Our 3-Year Anniversary, When You Need a Hug..."
                    value={letterTitle}
                    onChange={(e) => setLetterTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-focus"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Unlock Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={unlockDate}
                      onChange={(e) => setUnlockDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-focus"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Envelope Color
                    </label>
                    <div className="flex items-center gap-2 pt-1">
                      {['#F8C8D8', '#CBBEF4', '#B6DDF4', '#B8DCD1', '#F8DEA0'].map((col) => (
                        <button
                          key={col}
                          type="button"
                          onClick={() => setEnvelopeColor(col)}
                          className={`w-7 h-7 rounded-full border-2 transition-transform ${
                            envelopeColor === col ? 'scale-125 border-slate-900' : 'border-transparent'
                          }`}
                          style={{ backgroundColor: col }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Letter Message *
                  </label>
                  <textarea
                    rows={6}
                    required
                    placeholder="Dear love, by the time you open this letter..."
                    value={letterContent}
                    onChange={(e) => setLetterContent(e.target.value)}
                    className="w-full p-4 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-focus font-serif leading-relaxed"
                  />
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => handleSendLetter(true)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-1.5"
                  >
                    <FileEdit className="w-3.5 h-3.5" />
                    <span>Save Draft</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowWriteModal(false)}
                      className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSendLetter(false)}
                      className="px-6 py-2.5 rounded-full bg-primary hover:bg-primary-hover text-on-primary font-extrabold text-xs shadow-cta hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Seal & Schedule Letter</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
