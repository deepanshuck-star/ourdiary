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
import { Button, ButtonLink, IconButton } from '@/components/ui/Button';
import { Card, Chip, Field, inputClass } from '@/components/ui/Surface';
import { cn } from '@/lib/cn';

const EMOJI_OPTIONS = [
  { emoji: '❤️', label: 'Love' },
  { emoji: '🥺', label: 'Awww' },
  { emoji: '✨', label: 'Magic' },
  { emoji: '😂', label: 'Funny' },
  { emoji: '🥂', label: 'Cheers' },
  { emoji: '🌸', label: 'Sweet' },
  { emoji: '🔥', label: 'Fire' },
];

/** Small-caps section label — the quiet counterweight to the display serif. */
const EYEBROW = 'text-[11px] font-semibold uppercase tracking-[0.22em]';

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
        <div className="text-center py-24 space-y-4">
          <div className="text-5xl">🕊️</div>
          <h2 className="font-display text-3xl font-normal tracking-tight text-ink">Memory not found</h2>
          <p className="text-sm text-ink-muted">This moment may have been removed or changed.</p>
          <div className="pt-2">
            <ButtonLink href="/memories" variant="primary" size="sm">
              Return to Memories
            </ButtonLink>
          </div>
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
            className="flex items-center gap-1.5 text-xs font-semibold text-ink-muted hover:text-ink transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>All Memories</span>
          </Link>
          <div className="flex items-center gap-3">
            <ButtonLink href="/journey" variant="ghost" size="sm">
              <Compass className="w-3.5 h-3.5" />
              <span>Locate on Train Path</span>
            </ButtonLink>
            <IconButton
              label="Delete memory"
              variant="ghost"
              size="sm"
              onClick={() => setShowDeleteModal(true)}
              className="hover:text-danger"
            >
              <Trash2 className="w-4 h-4" />
            </IconButton>
          </div>
        </div>

        {/* Hero Card */}
        <Card className="p-6 sm:p-8 space-y-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Chip tone="primary">{memory.category}</Chip>
              <Chip tone="muted">
                <Smile className="w-3.5 h-3.5 text-primary" />
                <span className="capitalize">{memory.mood}</span>
              </Chip>
            </div>

            <div className="flex items-center gap-3 text-xs text-ink-muted">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-primary" />
                <span>{formatDate(memory.date)}</span>
              </div>
              <span>•</span>
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-primary" />
                <span>{memory.location}</span>
              </div>
            </div>
          </div>

          <h1 className="font-display text-4xl sm:text-5xl font-normal tracking-tight text-ink leading-[1.08]">
            {memory.title}
          </h1>

          {/* Shared Story Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className={cn(EYEBROW, 'text-primary flex items-center gap-2')}>
                <Heart className="w-4 h-4 fill-current" />
                The Shared Story
              </h3>
              {!isEditingStory && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditedDescription(memory.description);
                    setIsEditingStory(true);
                  }}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Edit Story
                </Button>
              )}
            </div>

            {isEditingStory ? (
              <div className="space-y-3">
                <textarea
                  rows={4}
                  value={editedDescription}
                  onChange={(e) => setEditedDescription(e.target.value)}
                  className={cn(inputClass, 'p-4 rounded-2xl')}
                />
                <div className="flex items-center justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => setIsEditingStory(false)}>
                    Cancel
                  </Button>
                  <Button variant="primary" size="sm" onClick={handleSaveDescription}>
                    Save Changes
                  </Button>
                </div>
              </div>
            ) : (
              <p className="font-display text-lg sm:text-xl font-normal text-ink leading-relaxed bg-canvas p-6 rounded-2xl border border-line">
                "{memory.description}"
              </p>
            )}
          </div>

          {/* Emoji Reactions Bar */}
          <div className="pt-5 border-t border-line flex flex-wrap items-center gap-2">
            <span className={cn(EYEBROW, 'text-ink-muted mr-2')}>
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
                  className={cn(
                    'flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold transition-all',
                    hasReacted
                      ? 'bg-primary/15 border border-primary/40 text-primary scale-105'
                      : 'bg-ink/5 border border-transparent text-ink-muted hover:text-ink hover:bg-ink/10'
                  )}
                >
                  <span>{opt.emoji}</span>
                  {count > 0 && <span>{count}</span>}
                </button>
              );
            })}
          </div>
        </Card>

        {/* Photo Gallery Grid */}
        <Card className="p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Camera className="w-5 h-5 text-primary" />
              <h3 className="font-display text-lg font-normal text-ink">
                Photo Gallery ({memory.photos?.length || 0})
              </h3>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setShowAddPhotoInput(!showAddPhotoInput)}>
              <Plus className="w-3.5 h-3.5" />
              <span>Add Photo</span>
            </Button>
          </div>

          {/* Add Photo Input */}
          {showAddPhotoInput && (
            <form onSubmit={handleAddPhotoSubmit} className="p-4 rounded-2xl bg-canvas border border-line">
              <Field id="new-photo-url" label="Add Image URL">
                <div className="flex gap-2">
                  <input
                    id="new-photo-url"
                    type="url"
                    placeholder="https://images.unsplash.com/photo-..."
                    required
                    value={newPhotoUrl}
                    onChange={(e) => setNewPhotoUrl(e.target.value)}
                    className={cn(inputClass, 'flex-1 py-2.5 text-xs')}
                  />
                  <Button type="submit" variant="secondary" size="sm" className="flex-shrink-0">
                    Save Photo
                  </Button>
                </div>
              </Field>
            </form>
          )}

          {/* Photo Thumbnails */}
          {memory.photos && memory.photos.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
              {memory.photos.map((p) => (
                <div
                  key={p.id}
                  className="group relative h-52 rounded-2xl overflow-hidden cursor-pointer shadow-card"
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
                    <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 to-transparent text-snow text-[11px] truncate">
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
            <p className="text-xs text-ink-muted py-4 text-center">No photos attached yet.</p>
          )}
        </Card>

        {/* Dual Perspectives (You & Partner) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* User 1 Perspective */}
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <img
                  src={data.couple.user1.avatar}
                  alt={data.couple.user1.name}
                  className="w-9 h-9 rounded-full object-cover ring-1 ring-ink/15"
                />
                <div>
                  <h4 className="font-semibold text-sm text-ink">{data.couple.user1.name}’s Perspective</h4>
                  <span className={cn(EYEBROW, 'text-ink-muted')}>Personal POV</span>
                </div>
              </div>
              {activeProfile.id === 'user_1' && editingPerspectiveProfile !== 'user_1' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setPerspectiveDraft(memory.perspectives?.user_1 || '');
                    setEditingPerspectiveProfile('user_1');
                  }}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Write POV
                </Button>
              )}
            </div>

            {editingPerspectiveProfile === 'user_1' ? (
              <div className="space-y-2">
                <textarea
                  rows={3}
                  value={perspectiveDraft}
                  onChange={(e) => setPerspectiveDraft(e.target.value)}
                  className={cn(inputClass, 'text-xs')}
                  placeholder="Write your side of the memory..."
                />
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => setEditingPerspectiveProfile(null)}>
                    Cancel
                  </Button>
                  <Button variant="primary" size="sm" onClick={() => handleSavePerspective('user_1')}>
                    Save
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-xs sm:text-sm text-ink-muted leading-relaxed italic bg-canvas p-4 rounded-2xl border-l-2 border-primary">
                {memory.perspectives?.user_1
                  ? `"${memory.perspectives.user_1}"`
                  : 'No perspective shared yet. Switch to Alex to write!'}
              </p>
            )}
          </Card>

          {/* User 2 Perspective */}
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <img
                  src={data.couple.user2.avatar}
                  alt={data.couple.user2.name}
                  className="w-9 h-9 rounded-full object-cover ring-1 ring-ink/15"
                />
                <div>
                  <h4 className="font-semibold text-sm text-ink">{data.couple.user2.name}’s Perspective</h4>
                  <span className={cn(EYEBROW, 'text-ink-muted')}>Personal POV</span>
                </div>
              </div>
              {activeProfile.id === 'user_2' && editingPerspectiveProfile !== 'user_2' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setPerspectiveDraft(memory.perspectives?.user_2 || '');
                    setEditingPerspectiveProfile('user_2');
                  }}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Write POV
                </Button>
              )}
            </div>

            {editingPerspectiveProfile === 'user_2' ? (
              <div className="space-y-2">
                <textarea
                  rows={3}
                  value={perspectiveDraft}
                  onChange={(e) => setPerspectiveDraft(e.target.value)}
                  className={cn(inputClass, 'text-xs')}
                  placeholder="Write your side of the memory..."
                />
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => setEditingPerspectiveProfile(null)}>
                    Cancel
                  </Button>
                  <Button variant="primary" size="sm" onClick={() => handleSavePerspective('user_2')}>
                    Save
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-xs sm:text-sm text-ink-muted leading-relaxed italic bg-canvas p-4 rounded-2xl border-l-2 border-primary">
                {memory.perspectives?.user_2
                  ? `"${memory.perspectives.user_2}"`
                  : 'No perspective shared yet. Switch to Maya to write!'}
              </p>
            )}
          </Card>
        </div>

        {/* Notes Section: Shared vs Simulated Private */}
        <Card className="p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between gap-4 pb-5 border-b border-line">
            <div>
              <h3 className="font-display text-xl font-normal text-ink flex items-center gap-2.5">
                <MessageCircle className="w-5 h-5 text-secondary" />
                Notes &amp; Reflections
              </h3>
              <p className="text-xs text-ink-muted mt-1.5">
                Leave shared reminders or private thoughts only you can see in this demo view.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Chip tone="accent">Posting as {activeProfile.name}</Chip>
            </div>
          </div>

          {/* New Note Form */}
          <form onSubmit={handleAddNote} className="p-4 rounded-2xl bg-canvas border border-line space-y-3">
            <textarea
              required
              rows={2}
              placeholder={`Write a note, reminder, or private thought as ${activeProfile.name}...`}
              value={newNoteContent}
              onChange={(e) => setNewNoteContent(e.target.value)}
              className={cn(inputClass, 'bg-surface text-xs sm:text-sm')}
            />

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              {/* Visibility Selector */}
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant={newNoteVisibility === 'shared' ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => setNewNoteVisibility('shared')}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Shared (Both can see)</span>
                </Button>
                <Button
                  type="button"
                  variant={newNoteVisibility === 'private' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setNewNoteVisibility('private')}
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>My Private Note 🔒</span>
                </Button>
              </div>

              <Button type="submit" variant="outline" size="sm">
                Post Note
              </Button>
            </div>

            {/* Locked note explainer */}
            {newNoteVisibility === 'private' && (
              <div className="p-4 rounded-xl bg-secondary/10 border border-secondary/25 text-xs space-y-1.5 animate-in fade-in">
                <p className="font-semibold flex items-center gap-1.5 text-secondary">
                  <Lock className="w-3.5 h-3.5" />
                  This note will be locked
                </p>
                <p className="text-[11px] text-ink-muted leading-relaxed">
                  Only you can see it. You can unlock it for {partnerProfile.name} any time from the note itself — and lock it again whenever you want.
                </p>
              </div>
            )}
          </form>

          {/* Notes List */}
          <div className="space-y-6">
            {/* Shared Notes Header */}
            <div>
              <h4 className={cn(EYEBROW, 'text-ink-muted mb-3 flex items-center gap-1.5')}>
                <Eye className="w-3.5 h-3.5 text-primary" />
                Shared Notes ({sharedNotes.length})
              </h4>
              {sharedNotes.length > 0 ? (
                <div className="space-y-2">
                  {sharedNotes.map((note) => (
                    <div
                      key={note.id}
                      className="p-4 rounded-2xl bg-canvas border border-line hover:border-primary/30 transition-all flex items-start justify-between gap-3"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="font-semibold text-xs text-ink">{note.authorName}</span>
                          <span className="text-[10px] text-ink-muted">{formatDate(note.createdAt)}</span>
                        </div>
                        {editingNoteId === note.id ? (
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={editingNoteContent}
                              onChange={(e) => setEditingNoteContent(e.target.value)}
                              className={cn(inputClass, 'py-2 text-xs')}
                            />
                            <div className="flex gap-2">
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => handleSaveEditedNote(note.id, 'shared')}
                              >
                                Save
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => setEditingNoteId(null)}>
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs sm:text-sm text-ink">{note.content}</p>
                        )}
                      </div>

                      {note.authorId === activeProfile.id && editingNoteId !== note.id && (
                        <div className="flex items-center gap-1">
                          <IconButton
                            label={`Lock this note (hide from ${partnerProfile.name})`}
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleNoteLock(memory.id, note.id)}
                          >
                            <Lock className="w-3.5 h-3.5" />
                          </IconButton>
                          <IconButton
                            label="Edit note"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingNoteId(note.id);
                              setEditingNoteContent(note.content);
                            }}
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </IconButton>
                          <IconButton
                            label="Delete note"
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteNote(memory.id, note.id)}
                            className="hover:text-danger"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </IconButton>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-ink-muted italic">No shared notes yet.</p>
              )}
            </div>

            {/* My Private Notes Header */}
            <div>
              <h4 className={cn(EYEBROW, 'text-primary mb-3 flex items-center gap-1.5')}>
                <Lock className="w-3.5 h-3.5" />
                My Private Notes ({myPrivateNotes.length}) — Visible only when viewing as {activeProfile.name}
              </h4>
              {myPrivateNotes.length > 0 ? (
                <div className="space-y-2">
                  {myPrivateNotes.map((note) => (
                    <div
                      key={note.id}
                      className="p-4 rounded-2xl bg-primary/5 border border-primary/20 flex flex-col gap-2"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="font-semibold text-xs text-ink">{note.authorName} (Private)</span>
                            <span className="text-[10px] text-ink-muted">{formatDate(note.createdAt)}</span>
                          </div>
                          {editingNoteId === note.id ? (
                            <div className="space-y-2">
                              <input
                                type="text"
                                value={editingNoteContent}
                                onChange={(e) => setEditingNoteContent(e.target.value)}
                                className={cn(inputClass, 'py-2 text-xs')}
                              />
                              <div className="flex gap-2">
                                <Button
                                  variant="primary"
                                  size="sm"
                                  onClick={() => handleSaveEditedNote(note.id, 'private')}
                                >
                                  Save
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => setEditingNoteId(null)}>
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-xs sm:text-sm text-ink">{note.content}</p>
                          )}
                        </div>

                        {editingNoteId !== note.id && (
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <IconButton
                              label="Edit note"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingNoteId(note.id);
                                setEditingNoteContent(note.content);
                              }}
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </IconButton>
                            <IconButton
                              label="Delete note"
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteNote(memory.id, note.id)}
                              className="hover:text-danger"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </IconButton>
                          </div>
                        )}
                      </div>

                      {/* Lock / unlock toggle — the author can share or re-seal it any time */}
                      <div className="mt-1 pt-3 border-t border-primary/15 flex items-center justify-between gap-3">
                        <span className="text-[11px] text-ink-muted">
                          Locked — only you can see this note.
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => toggleNoteLock(memory.id, note.id)}
                          className="text-[11px] px-3 py-1.5 flex-shrink-0"
                        >
                          <Unlock className="w-3 h-3" />
                          <span>Unlock for {partnerProfile.name}</span>
                        </Button>
                      </div>

                      {/* Show-on-partner's-dashboard toggle: a teaser only,
                          content stays masked server-side either way. */}
                      <label className="flex items-center gap-2 text-[11px] text-ink-muted cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={!!note.visibleWhenLocked}
                          onChange={() => toggleNoteVisibleWhenLocked(memory.id, note.id)}
                          className="w-3.5 h-3.5 rounded accent-primary"
                        />
                        <span>
                          Show this note (locked) on {partnerProfile.name}'s dashboard — content stays hidden
                        </span>
                      </label>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-ink-muted italic">No private notes recorded under your profile.</p>
              )}
            </div>

            {/* Partner's locked notes they chose to let you see exist */}
            {partnerLockedTeasers.length > 0 && (
              <div>
                <h4 className={cn(EYEBROW, 'text-secondary mb-3 flex items-center gap-1.5')}>
                  <Lock className="w-3.5 h-3.5" />
                  Locked notes from {partnerProfile.name} ({partnerLockedTeasers.length})
                </h4>
                <div className="space-y-2">
                  {partnerLockedTeasers.map((note) => (
                    <div
                      key={note.id}
                      className="p-4 rounded-2xl bg-secondary/10 border border-secondary/25 flex items-center gap-3"
                    >
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-secondary/20 text-secondary">
                        <Lock className="w-4 h-4" />
                      </div>
                      <p className="text-xs text-ink-muted">
                        {partnerProfile.name} has a locked note here. Only they can unlock it for you.
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Voice Notes (device-local, IndexedDB) */}
        <VoiceNotesSection memoryId={memory.id} />

        {/* Related Memories */}
        {relatedMemories.length > 0 && (
          <div className="space-y-4">
            <h3 className="font-display text-xl font-normal text-ink">More Memories Like This</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {relatedMemories.map((rel) => (
                <Link
                  key={rel.id}
                  href={`/memories/${rel.id}`}
                  className="p-5 rounded-2xl panel edge-lit lift group"
                >
                  <p className={cn(EYEBROW, 'text-primary')}>{rel.category}</p>
                  <h4 className="font-semibold text-sm text-ink group-hover:text-primary truncate mt-2 transition-colors">
                    {rel.title}
                  </h4>
                  <p className="text-xs text-ink-muted mt-1.5">{formatDate(rel.date)}</p>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Lightbox Modal */}
        {lightboxPhoto && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
            onClick={() => setLightboxPhoto(null)}
          >
            <div className="relative max-w-4xl max-h-[90vh]">
              <img
                src={lightboxPhoto}
                alt="Enlarged preview"
                className="max-h-[85vh] rounded-2xl object-contain shadow-card"
              />
              <IconButton
                label="Close preview"
                variant="ghost"
                onClick={() => setLightboxPhoto(null)}
                className="absolute top-4 right-4 bg-black/60 text-snow hover:text-snow hover:bg-black/90"
              >
                <X className="w-5 h-5" />
              </IconButton>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <Card className="p-6 max-w-md w-full space-y-4">
              <h3 className="font-display text-xl font-normal text-ink">Delete this memory?</h3>
              <p className="text-sm text-ink-muted leading-relaxed">
                This will permanently remove "{memory.title}" from your diary, train journey stations, and calendar.
              </p>
              <div className="flex items-center justify-end gap-3 pt-2">
                <Button variant="outline" size="sm" onClick={() => setShowDeleteModal(false)}>
                  Cancel
                </Button>
                <Button variant="danger" size="sm" onClick={handleDeleteMemory}>
                  Yes, Delete Memory
                </Button>
              </div>
            </Card>
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
        <div className="min-h-screen bg-canvas flex items-center justify-center text-ink-muted font-medium">
          Loading memory details...
        </div>
      }
    >
      <MemoryDetailContent />
    </Suspense>
  );
}
