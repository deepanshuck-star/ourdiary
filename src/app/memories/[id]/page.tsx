'use client';

import React, { useState, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { useDiary } from '@/store/DiaryContext';
import { formatDate } from '@/lib/date-utils';
import { VoiceNotesSection } from '@/components/widgets/VoiceNotesSection';
import {
  Calendar,
  MapPin,
  Smile,
  ArrowLeft,
  Heart,
  MessageCircle,
  Lock,
  Eye,
  Plus,
  Trash2,
  Edit3,
  X,
  Camera,
  Compass,
  Unlock,
} from 'lucide-react';

const EMOJI_OPTIONS = [
  { emoji: '❤️', label: 'Love' },
  { emoji: '🥺', label: 'Awww' },
  { emoji: '✨', label: 'Magic' },
  { emoji: '😂', label: 'Funny' },
  { emoji: '🥂', label: 'Cheers' },
  { emoji: '🌸', label: 'Sweet' },
  { emoji: '🔥', label: 'Fire' },
];

function MemoryDetailContent() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const {
    data,
    activeProfile,
    partnerProfile,
    updateMemory,
    deleteMemory,
    addPhotoToMemory,
    deletePhotoFromMemory,
    addReaction,
    addNote,
    deleteNote,
    updateNote,
    toggleNoteLock,
    toggleNoteVisibleWhenLocked,
  } = useDiary();

  const memory = data.memories.find((m) => m.id === id);

  // States
  const [isEditingStory, setIsEditingStory] = useState(false);
  const [editedDescription, setEditedDescription] = useState('');
  const [editingPerspectiveProfile, setEditingPerspectiveProfile] = useState<string | null>(null);
  const [perspectiveDraft, setPerspectiveDraft] = useState('');

  // Note form state
  const [newNoteContent, setNewNoteContent] = useState('');
  const [newNoteVisibility, setNewNoteVisibility] = useState<'shared' | 'private'>('shared');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteContent, setEditingNoteContent] = useState('');

  // Photo modal states
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null);
  const [showAddPhotoInput, setShowAddPhotoInput] = useState(false);
  const [newPhotoUrl, setNewPhotoUrl] = useState('');

  // Delete modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  if (!memory) {
    return (
      <AppShell>
        <div className="text-center py-20 space-y-4">
          <div className="text-5xl">🕊️</div>
          <h2 className="text-2xl font-bold text-slate-800">Memory not found</h2>
          <p className="text-sm text-slate-500">This moment may have been removed or changed.</p>
          <Link
            href="/memories"
            className="inline-block px-5 py-2.5 font-semibold text-xs bg-primary hover:bg-primary-hover text-on-primary shadow-cta rounded-full"
          >
            Return to Memories
          </Link>
        </div>
      </AppShell>
    );
  }

  // Perspective states
  const handleSaveDescription = () => {
    updateMemory(memory.id, { description: editedDescription });
    setIsEditingStory(false);
  };

  const handleSavePerspective = (profileId: string) => {
    updateMemory(memory.id, {
      perspectives: {
        ...memory.perspectives,
        [profileId]: perspectiveDraft,
      },
    });
    setEditingPerspectiveProfile(null);
  };

  // Notes
  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteContent.trim()) return;
    addNote(memory.id, newNoteContent.trim(), newNoteVisibility);
    setNewNoteContent('');
  };

  const handleSaveEditedNote = (noteId: string, currentVis: 'shared' | 'private') => {
    if (!editingNoteContent.trim()) return;
    updateNote(memory.id, noteId, editingNoteContent.trim(), currentVis);
    setEditingNoteId(null);
  };

  // Photo adding
  const handleAddPhotoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPhotoUrl.trim()) return;
    addPhotoToMemory(memory.id, { url: newPhotoUrl.trim() });
    setNewPhotoUrl('');
    setShowAddPhotoInput(false);
  };

  const handleDeleteMemory = () => {
    deleteMemory(memory.id);
    router.push('/memories');
  };

  // Group notes: shared (both can see), my own locked notes, and — only
  // when the author opted in — a teaser for the partner's locked note
  // (content always masked server-side; a locked note the partner did NOT
  // opt to show is never in this list at all).
  const allNotes = memory.notes || [];
  const sharedNotes = allNotes.filter((n) => n.visibility === 'shared');
  const myPrivateNotes = allNotes.filter(
    (n) => n.visibility === 'private' && n.authorId === activeProfile.id
  );
  const partnerLockedTeasers = allNotes.filter(
    (n) => n.visibility === 'private' && n.authorId !== activeProfile.id
  );

  // Related memories (same category or nearby)
  const relatedMemories = data.memories
    .filter((m) => m.id !== memory.id && (m.category === memory.category || m.mood === memory.mood))
    .slice(0, 3);

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-300">
        {/* Navigation bar */}
        <div className="flex items-center justify-between">
          <Link
            href="/memories"
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>All Memories</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/journey"
              className="flex items-center gap-1 text-xs font-semibold text-purple-600 hover:text-purple-700 bg-purple-50 px-3 py-1.5 rounded-xl"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Locate on Train Path</span>
            </Link>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
              title="Delete memory"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Hero Card */}
        <div className="rounded-3xl bg-white border border-line p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-rose-50 text-rose-700 text-xs font-bold border border-rose-100">
                {memory.category}
              </span>
              <span className="px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-bold flex items-center gap-1">
                <Smile className="w-3.5 h-3.5 text-purple-600" />
                <span className="capitalize">{memory.mood}</span>
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-500">
              <div className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-purple-500" />
                <span>{formatDate(memory.date)}</span>
              </div>
              <span>•</span>
              <div className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-rose-500" />
                <span>{memory.location}</span>
              </div>
            </div>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 leading-tight">
            {memory.title}
          </h1>

          {/* Shared Story Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
                The Shared Story
              </h3>
              {!isEditingStory && (
                <button
                  onClick={() => {
                    setEditedDescription(memory.description);
                    setIsEditingStory(true);
                  }}
                  className="text-xs font-semibold text-purple-600 hover:text-purple-700 flex items-center gap-1"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Edit Story
                </button>
              )}
            </div>

            {isEditingStory ? (
              <div className="space-y-3">
                <textarea
                  rows={4}
                  value={editedDescription}
                  onChange={(e) => setEditedDescription(e.target.value)}
                  className="w-full p-4 rounded-2xl border border-purple-200 text-sm focus:ring-2 focus:ring-focus"
                />
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => setIsEditingStory(false)}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveDescription}
                    className="px-4 py-1.5 text-xs font-bold bg-primary hover:bg-primary-hover text-on-primary shadow-cta rounded-full"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-base text-slate-700 leading-relaxed bg-amber-50/40 p-5 rounded-2xl border border-amber-100/60 font-serif">
                "{memory.description}"
              </p>
            )}
          </div>

          {/* Emoji Reactions Bar */}
          <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-400 mr-2 uppercase tracking-wider">
              React:
            </span>
            {EMOJI_OPTIONS.map((opt) => {
              const count = memory.reactions?.filter((r) => r.emoji === opt.emoji).length || 0;
              const hasReacted = memory.reactions?.some(
                (r) => r.emoji === opt.emoji && r.userId === activeProfile.id
              );

              return (
                <button
                  key={opt.emoji}
                  onClick={() => addReaction(memory.id, opt.emoji, opt.label)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    hasReacted
                      ? 'bg-rose-100 border border-rose-300 text-rose-800 scale-105'
                      : 'bg-slate-100 border border-transparent text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <span>{opt.emoji}</span>
                  {count > 0 && <span>{count}</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Photo Gallery Grid */}
        <div className="rounded-3xl bg-white border border-line p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Camera className="w-5 h-5 text-emerald-500" />
              <h3 className="font-bold text-base text-slate-900">
                Photo Gallery ({memory.photos?.length || 0})
              </h3>
            </div>
            <button
              onClick={() => setShowAddPhotoInput(!showAddPhotoInput)}
              className="flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Photo</span>
            </button>
          </div>

          {/* Add Photo Input */}
          {showAddPhotoInput && (
            <form onSubmit={handleAddPhotoSubmit} className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100 space-y-3">
              <label className="block text-xs font-bold text-emerald-900">Add Image URL</label>
              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/photo-..."
                  required
                  value={newPhotoUrl}
                  onChange={(e) => setNewPhotoUrl(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-focus"
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-xs"
                >
                  Save Photo
                </button>
              </div>
            </form>
          )}

          {/* Photo Thumbnails */}
          {memory.photos && memory.photos.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {memory.photos.map((p) => (
                <div
                  key={p.id}
                  className="group relative h-48 rounded-2xl overflow-hidden cursor-pointer shadow-xs border border-slate-100"
                  onClick={() => setLightboxPhoto(p.url)}
                >
                  <img
                    src={p.url}
                    alt={p.caption || 'Memory photo'}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {p.caption && (
                    <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/70 to-transparent text-snow text-[11px] truncate">
                      {p.caption}
                    </div>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deletePhotoFromMemory(memory.id, p.id);
                    }}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-snow opacity-0 group-hover:opacity-100 transition-opacity hover:bg-danger-solid"
                    title="Remove photo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 py-4 text-center">No photos attached yet.</p>
          )}
        </div>

        {/* Dual Perspectives (You & Partner) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* User 1 Perspective */}
          <div className="rounded-3xl bg-white border border-line p-6 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <img
                  src={data.couple.user1.avatar}
                  alt={data.couple.user1.name}
                  className="w-8 h-8 rounded-full object-cover ring-2 ring-secondary"
                />
                <div>
                  <h4 className="font-bold text-sm text-slate-900">{data.couple.user1.name}’s Perspective</h4>
                  <span className="text-[10px] text-slate-400">Personal POV</span>
                </div>
              </div>
              {activeProfile.id === 'user_1' && editingPerspectiveProfile !== 'user_1' && (
                <button
                  onClick={() => {
                    setPerspectiveDraft(memory.perspectives?.user_1 || '');
                    setEditingPerspectiveProfile('user_1');
                  }}
                  className="text-xs font-semibold text-purple-600 hover:text-purple-700 flex items-center gap-1"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Write POV
                </button>
              )}
            </div>

            {editingPerspectiveProfile === 'user_1' ? (
              <div className="space-y-2">
                <textarea
                  rows={3}
                  value={perspectiveDraft}
                  onChange={(e) => setPerspectiveDraft(e.target.value)}
                  className="w-full p-3 rounded-xl border border-purple-200 text-xs focus:ring-2 focus:ring-focus"
                  placeholder="Write your side of the memory..."
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setEditingPerspectiveProfile(null)}
                    className="px-3 py-1 rounded-lg border border-slate-200 text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleSavePerspective('user_1')}
                    className="px-3 py-1 text-xs font-bold bg-primary hover:bg-primary-hover text-on-primary shadow-cta rounded-full"
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed italic bg-purple-50/40 p-3.5 rounded-2xl border border-purple-100/60">
                {memory.perspectives?.user_1
                  ? `"${memory.perspectives.user_1}"`
                  : 'No perspective shared yet. Switch to Alex to write!'}
              </p>
            )}
          </div>

          {/* User 2 Perspective */}
          <div className="rounded-3xl bg-white border border-line p-6 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <img
                  src={data.couple.user2.avatar}
                  alt={data.couple.user2.name}
                  className="w-8 h-8 rounded-full object-cover ring-2 ring-secondary"
                />
                <div>
                  <h4 className="font-bold text-sm text-slate-900">{data.couple.user2.name}’s Perspective</h4>
                  <span className="text-[10px] text-slate-400">Personal POV</span>
                </div>
              </div>
              {activeProfile.id === 'user_2' && editingPerspectiveProfile !== 'user_2' && (
                <button
                  onClick={() => {
                    setPerspectiveDraft(memory.perspectives?.user_2 || '');
                    setEditingPerspectiveProfile('user_2');
                  }}
                  className="text-xs font-semibold text-purple-600 hover:text-purple-700 flex items-center gap-1"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Write POV
                </button>
              )}
            </div>

            {editingPerspectiveProfile === 'user_2' ? (
              <div className="space-y-2">
                <textarea
                  rows={3}
                  value={perspectiveDraft}
                  onChange={(e) => setPerspectiveDraft(e.target.value)}
                  className="w-full p-3 rounded-xl border border-purple-200 text-xs focus:ring-2 focus:ring-focus"
                  placeholder="Write your side of the memory..."
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setEditingPerspectiveProfile(null)}
                    className="px-3 py-1 rounded-lg border border-slate-200 text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleSavePerspective('user_2')}
                    className="px-3 py-1 text-xs font-bold bg-primary hover:bg-primary-hover text-on-primary shadow-cta rounded-full"
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed italic bg-purple-50/40 p-3.5 rounded-2xl border border-purple-100/60">
                {memory.perspectives?.user_2
                  ? `"${memory.perspectives.user_2}"`
                  : 'No perspective shared yet. Switch to Maya to write!'}
              </p>
            )}
          </div>
        </div>

        {/* Notes Section: Shared vs Simulated Private */}
        <div className="rounded-3xl bg-white border border-line p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-indigo-500" />
                Notes & Reflections
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Leave shared reminders or private thoughts only you can see in this demo view.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 font-semibold border border-purple-100">
                Posting as {activeProfile.name}
              </span>
            </div>
          </div>

          {/* New Note Form */}
          <form onSubmit={handleAddNote} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <textarea
              required
              rows={2}
              placeholder={`Write a note, reminder, or private thought as ${activeProfile.name}...`}
              value={newNoteContent}
              onChange={(e) => setNewNoteContent(e.target.value)}
              className="w-full p-3 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-focus bg-white"
            />

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              {/* Visibility Selector */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setNewNoteVisibility('shared')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    newNoteVisibility === 'shared'
                      ? 'shadow-xs bg-primary text-on-primary'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Shared (Both can see)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setNewNoteVisibility('private')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    newNoteVisibility === 'private'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>My Private Note 🔒</span>
                </button>
              </div>

              <button
                type="submit"
                className="px-4 py-1.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition-colors"
              >
                Post Note
              </button>
            </div>

            {/* Locked note explainer */}
            {newNoteVisibility === 'private' && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 space-y-1 animate-in fade-in">
                <p className="font-bold flex items-center gap-1.5 text-rose-700">
                  <Lock className="w-3.5 h-3.5" />
                  This note will be locked
                </p>
                <p className="text-[11px] text-rose-600 leading-relaxed">
                  Only you can see it. You can unlock it for {partnerProfile.name} any time from the note itself — and lock it again whenever you want.
                </p>
              </div>
            )}
          </form>

          {/* Notes List */}
          <div className="space-y-4">
            {/* Shared Notes Header */}
            <div>
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-purple-600" />
                Shared Notes ({sharedNotes.length})
              </h4>
              {sharedNotes.length > 0 ? (
                <div className="space-y-2">
                  {sharedNotes.map((note) => (
                    <div
                      key={note.id}
                      className="p-3.5 rounded-2xl bg-white border border-slate-200 hover:border-purple-200 transition-all flex items-start justify-between gap-3"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-xs text-slate-800">{note.authorName}</span>
                          <span className="text-[10px] text-slate-400">{formatDate(note.createdAt)}</span>
                        </div>
                        {editingNoteId === note.id ? (
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={editingNoteContent}
                              onChange={(e) => setEditingNoteContent(e.target.value)}
                              className="w-full p-2 border rounded-lg text-xs"
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleSaveEditedNote(note.id, 'shared')}
                                className="px-2 py-1 text-xs bg-primary hover:bg-primary-hover text-on-primary shadow-cta rounded-full"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setEditingNoteId(null)}
                                className="px-2 py-1 border text-xs rounded"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs sm:text-sm text-slate-700">{note.content}</p>
                        )}
                      </div>

                      {note.authorId === activeProfile.id && editingNoteId !== note.id && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => toggleNoteLock(memory.id, note.id)}
                            className="p-1 text-slate-400 hover:text-rose-600"
                            title={`Lock this note (hide from ${partnerProfile.name})`}
                          >
                            <Lock className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingNoteId(note.id);
                              setEditingNoteContent(note.content);
                            }}
                            className="p-1 text-slate-400 hover:text-purple-600"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => deleteNote(memory.id, note.id)}
                            className="p-1 text-slate-400 hover:text-rose-600"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No shared notes yet.</p>
              )}
            </div>

            {/* My Private Notes Header */}
            <div className="pt-2">
              <h4 className="text-xs font-bold text-rose-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-rose-500" />
                My Private Notes ({myPrivateNotes.length}) — Visible only when viewing as {activeProfile.name}
              </h4>
              {myPrivateNotes.length > 0 ? (
                <div className="space-y-2">
                  {myPrivateNotes.map((note) => (
                    <div
                      key={note.id}
                      className="p-3.5 rounded-2xl bg-rose-50/60 border border-rose-200 flex flex-col gap-2"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-xs text-rose-900">{note.authorName} (Private)</span>
                            <span className="text-[10px] text-rose-400">{formatDate(note.createdAt)}</span>
                          </div>
                          {editingNoteId === note.id ? (
                            <div className="space-y-2">
                              <input
                                type="text"
                                value={editingNoteContent}
                                onChange={(e) => setEditingNoteContent(e.target.value)}
                                className="w-full p-2 border rounded-lg text-xs"
                              />
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleSaveEditedNote(note.id, 'private')}
                                  className="px-2 py-1 bg-rose-600 text-white text-xs rounded"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => setEditingNoteId(null)}
                                  className="px-2 py-1 border text-xs rounded"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-xs sm:text-sm text-slate-800">{note.content}</p>
                          )}
                        </div>

                        {editingNoteId !== note.id && (
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                              onClick={() => {
                                setEditingNoteId(note.id);
                                setEditingNoteContent(note.content);
                              }}
                              className="p-1 text-slate-400 hover:text-rose-600"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => deleteNote(memory.id, note.id)}
                              className="p-1 text-slate-400 hover:text-rose-600"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Lock / unlock toggle — the author can share or re-seal it any time */}
                      <div className="mt-1 pt-2 border-t border-rose-200/60 flex items-center justify-between">
                        <span className="text-[11px] text-rose-600">
                          Locked — only you can see this note.
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleNoteLock(memory.id, note.id)}
                          className="px-2.5 py-1 rounded-lg bg-white border border-rose-200 text-rose-700 hover:bg-rose-100 text-[11px] font-bold shadow-2xs flex items-center gap-1 transition-colors"
                        >
                          <Unlock className="w-3 h-3" />
                          <span>Unlock for {partnerProfile.name}</span>
                        </button>
                      </div>

                      {/* Show-on-partner's-dashboard toggle: a teaser only,
                          content stays masked server-side either way. */}
                      <label className="flex items-center gap-2 text-[11px] text-rose-700 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={!!note.visibleWhenLocked}
                          onChange={() => toggleNoteVisibleWhenLocked(memory.id, note.id)}
                          className="w-3.5 h-3.5 rounded accent-rose-600"
                        />
                        <span>
                          Show this note (locked) on {partnerProfile.name}'s dashboard — content stays hidden
                        </span>
                      </label>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No private notes recorded under your profile.</p>
              )}
            </div>

            {/* Partner's locked notes they chose to let you see exist */}
            {partnerLockedTeasers.length > 0 && (
              <div className="pt-2">
                <h4 className="text-xs font-bold text-purple-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-purple-500" />
                  Locked notes from {partnerProfile.name} ({partnerLockedTeasers.length})
                </h4>
                <div className="space-y-2">
                  {partnerLockedTeasers.map((note) => (
                    <div
                      key={note.id}
                      className="p-3.5 rounded-2xl bg-purple-50/60 border border-purple-200 flex items-center gap-3"
                    >
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-primary text-on-primary">
                        <Lock className="w-4 h-4" />
                      </div>
                      <p className="text-xs text-purple-800">
                        {partnerProfile.name} has a locked note here. Only they can unlock it for you.
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Voice Notes (device-local, IndexedDB) */}
        <VoiceNotesSection memoryId={memory.id} />

        {/* Related Memories */}
        {relatedMemories.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-bold text-base text-slate-900">More Memories Like This</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {relatedMemories.map((rel) => (
                <Link
                  key={rel.id}
                  href={`/memories/${rel.id}`}
                  className="p-4 rounded-2xl bg-white border border-line shadow-xs hover:shadow-md transition-all group"
                >
                  <p className="text-[11px] font-semibold text-rose-500">{rel.category}</p>
                  <h4 className="font-bold text-sm text-slate-800 group-hover:text-purple-600 truncate mt-1">
                    {rel.title}
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">{formatDate(rel.date)}</p>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Lightbox Modal */}
        {lightboxPhoto && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
            onClick={() => setLightboxPhoto(null)}
          >
            <div className="relative max-w-4xl max-h-[90vh]">
              <img
                src={lightboxPhoto}
                alt="Enlarged preview"
                className="max-h-[85vh] rounded-2xl object-contain shadow-2xl"
              />
              <button
                onClick={() => setLightboxPhoto(null)}
                className="absolute top-4 right-4 p-2 rounded-full bg-black/60 text-snow hover:bg-black/90"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-rose-100 space-y-4">
              <h3 className="text-lg font-bold text-slate-900">Delete this memory?</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                This will permanently remove "{memory.title}" from your diary, train journey stations, and calendar.
              </p>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold text-xs"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteMemory}
                  className="px-4 py-2 rounded-xl bg-rose-600 text-white font-bold text-xs"
                >
                  Yes, Delete Memory
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </AppShell>
  );
}

export default function MemoryDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-canvas flex items-center justify-center text-slate-500 font-medium">
          Loading memory details...
        </div>
      }
    >
      <MemoryDetailContent />
    </Suspense>
  );
}
