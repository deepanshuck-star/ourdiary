'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { useDiary } from '@/store/DiaryContext';
import { useSpaceMode } from '@/hooks/useSpaceMode';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { leaveSpaceRemote, type SpaceKind } from '@/lib/supabase/couple';
import {
  SlidersHorizontal,
  Heart,
  Sparkles,
  Download,
  Upload,
  RotateCcw,
  ShieldAlert,
  Save,
  Bell,
  Smartphone,
  Send,
  LogOut,
  BookHeart,
  ArrowRightLeft,
  DoorOpen,
  UserPlus,
  Copy,
  Check,
  User,
  Users,
} from 'lucide-react';
import {
  getNotificationPermission,
  requestPushPermission,
  sendPushNotification,
} from '@/lib/notifications';
import { uploadImageToCloudinary } from '@/lib/cloudinary/upload';
import { getAppearance, setAppearance, type Appearance } from '@/lib/appearance';
import { getPalette, setPalette, PALETTES, type Palette } from '@/lib/palette';

export default function SettingsPage() {
  const {
    data,
    activeProfile,
    updateCouple,
    updateProfile,
    resetAllData,
    exportJSON,
    importJSON,
    showToast,
    isLiveUser,
    logout,
    spaces,
    spacesLoading,
    refreshSpaces,
    switchSpace,
    createSpace,
  } = useDiary();

  const { isPersonal } = useSpaceMode();

  const [pushPermission, setPushPermission] = useState<NotificationPermission>('default');
  const [appearance, setAppearanceState] = useState<Appearance>('light');
  const [palette, setPaletteState] = useState<Palette>('rose');

  useEffect(() => {
    setPushPermission(getNotificationPermission());
    setAppearanceState(getAppearance());
    setPaletteState(getPalette());
  }, []);

  const handleEnablePush = async () => {
    const granted = await requestPushPermission();
    setPushPermission(getNotificationPermission());
    if (granted) {
      showToast('Romantic Push Notifications enabled! 🔔💕', 'success');
    } else {
      showToast('Notification permission was not granted.', 'warn');
    }
  };

  const handleTestPush = async () => {
    const sent = await sendPushNotification('OurDiary 💕 Romantic Alert', {
      body: 'Your push notification is active! When your partner sends a love ping or hug, you’ll be notified.',
      url: '/dashboard',
    });
    if (sent) {
      showToast('Dispatched test notification! 🔔', 'heart');
    } else {
      showToast('Please enable notifications first!', 'warn');
    }
  };

  // Couple Settings
  const [coupleName, setCoupleName] = useState(data.couple.name);
  const [startDate, setStartDate] = useState(data.couple.startDate);
  const [anniversaryDate, setAnniversaryDate] = useState(data.couple.anniversaryDate);
  const [theme, setTheme] = useState(data.couple.theme);
  const [animationsEnabled, setAnimationsEnabled] = useState(data.couple.animationsEnabled);

  // Profile 1 Settings
  const [user1Name, setUser1Name] = useState(data.couple.user1.name);
  const [user1Nickname, setUser1Nickname] = useState(data.couple.user1.nickname || '');
  const [user1Avatar, setUser1Avatar] = useState(data.couple.user1.avatar);
  const [user1Bio, setUser1Bio] = useState(data.couple.user1.bio || '');

  // Profile 2 Settings
  const [user2Name, setUser2Name] = useState(data.couple.user2.name);
  const [user2Nickname, setUser2Nickname] = useState(data.couple.user2.nickname || '');
  const [user2Avatar, setUser2Avatar] = useState(data.couple.user2.avatar);
  const [user2Bio, setUser2Bio] = useState(data.couple.user2.bio || '');

  // Couple photo
  const [couplePhoto, setCouplePhoto] = useState(data.couple.photoUrl || '');
  const [uploadingCouplePhoto, setUploadingCouplePhoto] = useState(false);
  const [uploadingUser1Photo, setUploadingUser1Photo] = useState(false);
  const [uploadingUser2Photo, setUploadingUser2Photo] = useState(false);

  const handleUploadCouplePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadingCouplePhoto(true);
    try {
      const { secureUrl } = await uploadImageToCloudinary(file);
      setCouplePhoto(secureUrl);
      updateCouple({ photoUrl: secureUrl });
      showToast('Couple photo updated! 💕', 'heart');
    } catch (err: any) {
      showToast(err?.message || 'Could not upload that photo. Please try again.', 'warn');
    } finally {
      setUploadingCouplePhoto(false);
    }
  };

  const handleUploadProfilePhoto = async (
    profileId: 'user_1' | 'user_2',
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const setUploading = profileId === 'user_1' ? setUploadingUser1Photo : setUploadingUser2Photo;
    const setAvatarState = profileId === 'user_1' ? setUser1Avatar : setUser2Avatar;
    setUploading(true);
    try {
      const { secureUrl } = await uploadImageToCloudinary(file);
      setAvatarState(secureUrl);
      updateProfile(profileId, { avatar: secureUrl });
      showToast('Photo updated! 💕', 'heart');
    } catch (err: any) {
      showToast(err?.message || 'Could not upload that photo. Please try again.', 'warn');
    } finally {
      setUploading(false);
    }
  };

  // Your diaries — one account can hold a personal diary and couple spaces
  const [newSpaceName, setNewSpaceName] = useState('');
  const [newSpaceStart, setNewSpaceStart] = useState('');
  const [creatingKind, setCreatingKind] = useState<SpaceKind | null>(null);
  const [openingSpaceId, setOpeningSpaceId] = useState<string | null>(null);
  const [leaveTargetId, setLeaveTargetId] = useState<string | null>(null);
  const [leavingSpace, setLeavingSpace] = useState(false);
  const [spaceError, setSpaceError] = useState<string | null>(null);
  const [spaceNotice, setSpaceNotice] = useState<string | null>(null);
  const [copiedInvite, setCopiedInvite] = useState(false);

  useEffect(() => {
    refreshSpaces();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Switching diaries swaps out everything these forms were seeded from, so
  // re-seed them rather than letting one diary's name sit over another's.
  useEffect(() => {
    setCoupleName(data.couple.name);
    setStartDate(data.couple.startDate);
    setAnniversaryDate(data.couple.anniversaryDate);
    setTheme(data.couple.theme);
    setAnimationsEnabled(data.couple.animationsEnabled);
    setUser1Name(data.couple.user1.name);
    setUser1Nickname(data.couple.user1.nickname || '');
    setUser1Avatar(data.couple.user1.avatar);
    setUser1Bio(data.couple.user1.bio || '');
    setUser2Name(data.couple.user2.name);
    setUser2Nickname(data.couple.user2.nickname || '');
    setUser2Avatar(data.couple.user2.avatar);
    setUser2Bio(data.couple.user2.bio || '');
    setCouplePhoto(data.couple.photoUrl || '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.couple.id]);

  const existingPersonal = spaces.find((space) => space.kind === 'personal') || null;

  const handleOpenSpace = async (coupleId: string) => {
    setSpaceError(null);
    setSpaceNotice(null);
    setOpeningSpaceId(coupleId);
    try {
      await switchSpace(coupleId);
    } catch (err: any) {
      setSpaceError(err?.message || 'Could not open that diary. Please try again.');
    } finally {
      setOpeningSpaceId(null);
    }
  };

  const handleCreateSpace = async (kind: SpaceKind) => {
    setSpaceError(null);
    setSpaceNotice(null);
    setCreatingKind(kind);
    // An account keeps at most one personal diary: the server hands back the
    // existing one, which would otherwise look like the button did nothing.
    const personalBefore = existingPersonal?.id ?? null;
    try {
      const createdId = await createSpace(
        newSpaceName.trim() || (kind === 'personal' ? 'My diary' : 'Our diary'),
        newSpaceStart || new Date().toISOString().slice(0, 10),
        kind
      );
      if (kind === 'personal' && createdId && createdId === personalBefore) {
        setSpaceNotice(
          'You already keep a personal diary, so we opened that one instead of starting a second — an account only ever has one.'
        );
      } else {
        setNewSpaceName('');
        setNewSpaceStart('');
        setSpaceNotice(
          kind === 'personal' ? 'Your personal diary is open.' : 'Your new couple space is open.'
        );
      }
    } catch (err: any) {
      setSpaceError(err?.message || 'Could not start that diary. Please try again.');
    } finally {
      setCreatingKind(null);
    }
  };

  const handleCopyInviteCode = async () => {
    const code = data.couple.inviteCode;
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopiedInvite(true);
      window.setTimeout(() => setCopiedInvite(false), 2000);
      showToast('Invite code copied 💌', 'heart');
    } catch {
      setSpaceError('Could not reach the clipboard — the code above can be copied by hand.');
    }
  };

  const handleConfirmLeave = async () => {
    const target = spaces.find((space) => space.id === leaveTargetId);
    if (!target) return;
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setSpaceError('Leaving a diary only works in a signed-in space.');
      setLeaveTargetId(null);
      return;
    }
    setLeavingSpace(true);
    setSpaceError(null);
    setSpaceNotice(null);
    try {
      await leaveSpaceRemote(supabase, target.id);
      const remaining = await refreshSpaces();
      setLeaveTargetId(null);
      showToast(`You have left ${target.name}.`, 'info');
      // Leaving the diary that is open would leave the app showing a space
      // this account no longer belongs to.
      if (target.id === data.couple.id && remaining.length > 0) {
        await switchSpace(remaining[0].id);
      }
    } catch (err: any) {
      setSpaceError(err?.message || 'Could not leave that diary. Please try again.');
    } finally {
      setLeavingSpace(false);
    }
  };

  // Reset modal state
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Save couple information
  const handleSaveCouple = (e: React.FormEvent) => {
    e.preventDefault();
    updateCouple({
      name: coupleName.trim(),
      startDate,
      anniversaryDate,
      theme,
      animationsEnabled,
    });
  };

  // Save profile 1
  const handleSaveUser1 = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile('user_1', {
      name: user1Name.trim(),
      nickname: user1Nickname.trim() || undefined,
      avatar: user1Avatar.trim(),
      bio: user1Bio.trim() || undefined,
    });
  };

  // Save profile 2
  const handleSaveUser2 = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile('user_2', {
      name: user2Name.trim(),
      nickname: user2Nickname.trim() || undefined,
      avatar: user2Avatar.trim(),
      bio: user2Bio.trim() || undefined,
    });
  };

  // Export JSON file download
  const handleExport = () => {
    const jsonStr = exportJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `OurDiary_${coupleName.replace(/\s+/g, '_')}_backup.json`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('Diary data exported successfully as JSON! 📦', 'success');
  };

  // Import JSON file upload
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        importJSON(content);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleConfirmReset = () => {
    resetAllData();
    setShowResetConfirm(false);
  };

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-300">
        {/* Header */}
        <div className="flex items-center gap-3 p-6 rounded-3xl bg-white border border-line shadow-xs">
          <div className="p-2 rounded-2xl bg-slate-100 text-slate-700">
            <SlidersHorizontal className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">Application Settings</h1>
            <p className="text-xs text-slate-500">
              Customize your couple names, anniversaries, profiles, themes, and backup demo data
            </p>
          </div>
        </div>

        {/* Couple Space Account & Session Card (Visible at Top!) */}
        <div className="rounded-3xl bg-white border border-line p-6 sm:p-8 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <LogOut className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-extrabold text-lg text-slate-900">Couple Space Account & Session</h2>
                <p className="text-xs text-slate-500">
                  Manage your current session, switch accounts, or log out of this space
                </p>
              </div>
            </div>
            <span
              className={`text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider self-start sm:self-auto ${
                isLiveUser ? 'bg-purple-100 text-purple-800' : 'bg-amber-100 text-amber-800'
              }`}
            >
              {isLiveUser ? 'Live Cloud Space 🔒' : 'Local Demo Mode 🧪'}
            </span>
          </div>

          <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-slate-800">
                Active Space: <span className="text-purple-600 font-extrabold">{data.couple.name}</span>
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {isLiveUser
                  ? 'Your couple space is securely connected and synced with the Supabase database.'
                  : 'You are currently in interactive demo mode. You can log in with an email to connect with your partner in real time.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => logout(true)}
                className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm flex items-center gap-2 transition-all cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Log Out of OurDiary</span>
              </button>

              <Link
                href="/login"
                className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs shadow-xs flex items-center gap-1.5 transition-all"
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                <span>Switch / Sign In</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Your diaries — every space this account belongs to, and the switch between them */}
        <div className="rounded-3xl bg-white border border-line p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <BookHeart className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-lg text-slate-900">Your diaries</h2>
              <p className="text-xs text-slate-500">
                A diary of your own and the spaces you share — open whichever one you want to write in
              </p>
            </div>
          </div>

          {spaceError && (
            <p
              role="alert"
              className="text-xs font-semibold text-rose-800 bg-rose-50 border border-rose-100 rounded-2xl px-3.5 py-2.5"
            >
              {spaceError}
            </p>
          )}

          {spaceNotice && (
            <p className="text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-100 rounded-2xl px-3.5 py-2.5">
              {spaceNotice}
            </p>
          )}

          {/* 1. The list */}
          <div className="space-y-3">
            {spacesLoading && spaces.length === 0 && (
              <p className="text-xs text-slate-500">Loading your diaries…</p>
            )}

            {!spacesLoading && spaces.length === 0 && (
              <p className="text-xs text-slate-500">
                Nothing to list yet. Diaries live in the cloud, so sign in to see and switch between them.
              </p>
            )}

            {spaces.map((space) => {
              const isCurrent = space.id === data.couple.id;
              return (
                <div
                  key={space.id}
                  className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isCurrent ? 'border-primary bg-purple-50/70' : 'border-slate-100 bg-slate-50/70'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-extrabold text-slate-900 truncate">{space.name}</p>
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                          space.kind === 'personal'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {space.kind === 'personal' ? 'Personal' : 'Couple'}
                      </span>
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider bg-slate-200 text-slate-700">
                        {space.role === 'creator' ? 'Creator' : 'Partner'}
                      </span>
                      {isCurrent && (
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider bg-purple-100 text-purple-800">
                          Open now
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {space.role === 'creator' ? 'You started this diary' : 'You joined this diary'}
                      {space.startDate ? ` · since ${space.startDate}` : ''}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenSpace(space.id)}
                      disabled={isCurrent || openingSpaceId !== null}
                      className="px-4 py-2 rounded-full bg-primary hover:bg-primary-hover text-on-primary font-bold text-xs shadow-cta flex items-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5" />
                      <span>
                        {isCurrent ? 'Currently open' : openingSpaceId === space.id ? 'Opening…' : 'Open'}
                      </span>
                    </button>

                    {/* Only a partner can leave; the creator removes the partner instead */}
                    {space.role === 'partner' && (
                      <button
                        type="button"
                        onClick={() => setLeaveTargetId(space.id)}
                        className="px-4 py-2 rounded-xl bg-white border border-rose-200 text-rose-700 font-bold text-xs hover:bg-rose-50 shadow-xs flex items-center gap-1.5"
                      >
                        <DoorOpen className="w-3.5 h-3.5" />
                        <span>Leave</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 2. Start another */}
          <div className="p-4 rounded-2xl border border-slate-100 bg-white space-y-4">
            <div>
              <h3 className="font-bold text-sm text-slate-900">Start another diary</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                A personal diary is yours alone. A couple space starts empty and waits for a partner to join by code.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="new-space-name"
                  className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1"
                >
                  Diary name
                </label>
                <input
                  id="new-space-name"
                  type="text"
                  value={newSpaceName}
                  onChange={(e) => setNewSpaceName(e.target.value)}
                  placeholder="Dear Diary"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-focus"
                />
              </div>

              <div>
                <label
                  htmlFor="new-space-start"
                  className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1"
                >
                  Start date
                </label>
                <input
                  id="new-space-start"
                  type="date"
                  value={newSpaceStart}
                  onChange={(e) => setNewSpaceStart(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-focus"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleCreateSpace('personal')}
                disabled={creatingKind !== null}
                className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <User className="w-3.5 h-3.5" />
                <span>{creatingKind === 'personal' ? 'Opening…' : 'Create a personal diary'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleCreateSpace('couple')}
                disabled={creatingKind !== null}
                className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs shadow-xs flex items-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Users className="w-3.5 h-3.5" />
                <span>{creatingKind === 'couple' ? 'Creating…' : 'Start a couple space'}</span>
              </button>
            </div>

            {existingPersonal && (
              <p className="text-[11px] text-slate-500">
                You already keep a personal diary ({existingPersonal.name}). One is the limit, so that button opens
                the one you have rather than making another.
              </p>
            )}
          </div>

          {/* 3. Invite a partner — turns this personal diary into a shared one */}
          {data.couple.kind === 'personal' && (
            <div className="p-5 sm:p-6 rounded-2xl bg-purple-50/70 border border-purple-100 space-y-4">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-purple-600" />
                <h3 className="font-extrabold text-base text-purple-950">Invite a partner into this diary</h3>
              </div>

              <p className="text-xs text-purple-800/80 leading-relaxed">
                Give this code to your partner. The moment they use it,{' '}
                <strong className="font-bold">{data.couple.name}</strong> stops being a diary for one and becomes a
                shared one — and everything already in it comes along. Every memory, letter, note and photo you have
                written stays exactly where it is, now visible to both of you. Nothing is copied, and nothing starts over.
              </p>

              <div className="flex flex-wrap items-center gap-3">
                <span className="font-mono text-lg font-extrabold tracking-[0.3em] text-purple-700 bg-white border border-purple-200 rounded-xl px-4 py-2.5">
                  {data.couple.inviteCode || '——————'}
                </span>
                <button
                  type="button"
                  onClick={handleCopyInviteCode}
                  disabled={!data.couple.inviteCode}
                  className="px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-on-primary font-bold text-xs shadow-cta flex items-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {copiedInvite ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedInvite ? 'Copied' : 'Copy invite code'}</span>
                </button>
              </div>

              <p className="text-[11px] text-purple-900 bg-white/70 p-3 rounded-xl border border-purple-200/60 leading-relaxed">
                ⚠️ This cannot be undone. Once someone joins, this diary is a shared one for good — even if they later
                leave, it does not turn back into a diary for one. Start a separate personal diary above if you want to
                keep writing somewhere only you can read.
              </p>
            </div>
          )}
        </div>

        {/* Couple & Relationship Settings Card */}
        <div className="rounded-3xl bg-white border border-line p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
            <Heart className="w-5 h-5 text-rose-500 fill-rose-500" />
            <h2 className="font-extrabold text-lg text-slate-900">Relationship Basics</h2>
          </div>

          <form onSubmit={handleSaveCouple} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Couple Display Name
                </label>
                <input
                  type="text"
                  required
                  value={coupleName}
                  onChange={(e) => setCoupleName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-focus"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Relationship Start Date
                </label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-focus"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Next Anniversary Date
                </label>
                <input
                  type="date"
                  required
                  value={anniversaryDate}
                  onChange={(e) => setAnniversaryDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-focus"
                />
              </div>
            </div>

            {/* Couple theme — tints the header gradient within the chosen palette */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Header tint
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { id: 'candy', name: 'Classic' },
                  { id: 'sunset', name: 'Dusk' },
                  { id: 'lavender', name: 'Soft' },
                  { id: 'mint', name: 'Deep' },
                ].map((th) => (
                  <button
                    key={th.id}
                    type="button"
                    aria-pressed={theme === th.id}
                    onClick={() => setTheme(th.id as any)}
                    className={`p-3 rounded-2xl border text-left transition-colors ${
                      theme === th.id
                        ? 'border-primary ring-2 ring-primary/30 bg-purple-50'
                        : 'border-line hover:border-purple-300 bg-surface'
                    }`}
                  >
                    <div data-theme={th.id} className="h-8 rounded-full bg-hero mb-2" />
                    <span className="text-xs font-semibold text-ink">{th.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={animationsEnabled}
                  onChange={(e) => setAnimationsEnabled(e.target.checked)}
                  className="w-4 h-4 rounded text-purple-600 focus:ring-focus"
                />
                <span className="text-xs font-semibold text-slate-700">Enable UI train & card animations</span>
              </label>

              <button
                type="submit"
                className="px-5 py-2.5 rounded-full bg-primary hover:bg-primary-hover text-on-primary font-semibold text-xs shadow-cta transition-colors flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save relationship details</span>
              </button>
            </div>
          </form>
        </div>

        {/* Palette — per-device preference, applied instantly */}
        <div className="rounded-3xl bg-white border border-line p-6 shadow-sm">
          <h3 className="font-extrabold text-base text-slate-900 mb-1">Palette</h3>
          <p className="text-xs text-slate-500 mb-4">
            The colours and lettering the whole app wears. Saved on this device only.
          </p>
          <div role="radiogroup" aria-label="Palette" className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {PALETTES.map((option) => (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={palette === option.id}
                onClick={() => {
                  setPalette(option.id);
                  setPaletteState(option.id);
                }}
                className={`p-3 rounded-2xl border text-left transition-colors ${
                  palette === option.id
                    ? 'border-primary ring-2 ring-primary/30 bg-purple-50'
                    : 'border-line hover:border-purple-300 bg-surface'
                }`}
              >
                <div className="flex h-8 rounded-full overflow-hidden mb-2 border border-line">
                  {option.swatch.map((colour) => (
                    <span key={colour} className="flex-1" style={{ backgroundColor: colour }} />
                  ))}
                </div>
                <span className="text-xs font-semibold text-ink">{option.name}</span>
                <p className="text-[11px] text-ink-muted mt-0.5">{option.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Appearance — per-device preference, applied instantly */}
        <div className="rounded-3xl bg-white border border-line p-6 shadow-sm">
          <h3 className="font-extrabold text-base text-slate-900 mb-1">Appearance</h3>
          <p className="text-xs text-slate-500 mb-4">
            Choose light or dark, or follow this device’s setting. Saved on this device only.
          </p>
          <div role="radiogroup" aria-label="Appearance" className="inline-flex p-1 rounded-full bg-slate-100 border border-line">
            {(['light', 'dark', 'system'] as const).map((option) => (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={appearance === option}
                onClick={() => {
                  setAppearance(option);
                  setAppearanceState(option);
                }}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold capitalize transition-colors ${
                  appearance === option ? 'bg-primary text-on-primary shadow-cta' : 'text-slate-600 hover:text-ink'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        {/* Couple Photo */}
        <div className="rounded-3xl bg-white border border-line p-6 shadow-sm">
          <h3 className="font-extrabold text-base text-slate-900 mb-1">Couple Photo</h3>
          <p className="text-xs text-slate-500 mb-4">
            A photo of both of you together — shown in the top-left of the navbar.
          </p>
          <div className="flex items-center gap-4">
            {couplePhoto ? (
              <img
                src={couplePhoto}
                alt="Couple"
                className="w-16 h-16 rounded-2xl object-cover ring-2 ring-secondary shadow-xs"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
                <Heart className="w-6 h-6" />
              </div>
            )}
            <label className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 shadow-sm cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              <span>{uploadingCouplePhoto ? 'Uploading…' : couplePhoto ? 'Change Photo' : 'Upload Photo'}</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploadingCouplePhoto}
                onChange={handleUploadCouplePhoto}
              />
            </label>
          </div>
        </div>

        {/* Profiles Customization — one column in a personal diary, which has no partner */}
        <div className={`grid grid-cols-1 gap-6 ${isPersonal ? '' : 'md:grid-cols-2'}`}>
          {/* User 1 Profile Form */}
          <div className="rounded-3xl bg-white border border-line p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <img
                src={user1Avatar}
                alt={user1Name}
                className="w-10 h-10 rounded-full object-cover ring-2 ring-secondary"
              />
              <div>
                <h3 className="font-extrabold text-base text-slate-900">User 1 (You)</h3>
                <span className="text-xs text-slate-400">Default: Alex</span>
              </div>
            </div>

            <form onSubmit={handleSaveUser1} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Display Name</label>
                <input
                  type="text"
                  required
                  value={user1Name}
                  onChange={(e) => setUser1Name(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-focus"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Nickname</label>
                <input
                  type="text"
                  value={user1Nickname}
                  onChange={(e) => setUser1Nickname(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-focus"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Photo</label>
                {isLiveUser && activeProfile.id !== 'user_1' ? (
                  <p className="text-[11px] text-slate-400 mb-1.5">
                    Only {data.couple.user1.name} can upload their own photo.
                  </p>
                ) : (
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 mb-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50 cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{uploadingUser1Photo ? 'Uploading…' : 'Upload Photo'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploadingUser1Photo}
                      onChange={(e) => handleUploadProfilePhoto('user_1', e)}
                    />
                  </label>
                )}
                <input
                  type="url"
                  required
                  value={user1Avatar}
                  onChange={(e) => setUser1Avatar(e.target.value)}
                  placeholder="Or paste an image URL"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-focus"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Bio / Status</label>
                <input
                  type="text"
                  value={user1Bio}
                  onChange={(e) => setUser1Bio(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-focus"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-2 font-bold text-xs bg-primary hover:bg-primary-hover text-on-primary shadow-cta rounded-full"
                >
                  Update User 1
                </button>
              </div>
            </form>
          </div>

          {/* User 2 Profile Form — hidden in a personal diary, which has no partner */}
          {!isPersonal && (
            <div className="rounded-3xl bg-white border border-line p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                <img
                  src={user2Avatar}
                  alt={user2Name}
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-secondary"
                />
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">User 2 (Partner)</h3>
                  <span className="text-xs text-slate-400">Default: Maya</span>
                </div>
              </div>

              <form onSubmit={handleSaveUser2} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Display Name</label>
                  <input
                    type="text"
                    required
                    value={user2Name}
                    onChange={(e) => setUser2Name(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-focus"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Nickname</label>
                  <input
                    type="text"
                    value={user2Nickname}
                    onChange={(e) => setUser2Nickname(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-focus"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Photo</label>
                  {isLiveUser && activeProfile.id !== 'user_2' ? (
                    <p className="text-[11px] text-slate-400 mb-1.5">
                      Only {data.couple.user2.name} can upload their own photo.
                    </p>
                  ) : (
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 mb-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50 cursor-pointer">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{uploadingUser2Photo ? 'Uploading…' : 'Upload Photo'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={uploadingUser2Photo}
                        onChange={(e) => handleUploadProfilePhoto('user_2', e)}
                      />
                    </label>
                  )}
                  <input
                    type="url"
                    required
                    value={user2Avatar}
                    onChange={(e) => setUser2Avatar(e.target.value)}
                    placeholder="Or paste an image URL"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-focus"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Bio / Status</label>
                  <input
                    type="text"
                    value={user2Bio}
                    onChange={(e) => setUser2Bio(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-focus"
                  />
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    className="px-4 py-2 font-bold text-xs bg-primary hover:bg-primary-hover text-on-primary shadow-cta rounded-full"
                  >
                    Update User 2
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Free Web Push Notifications & Progressive Web App (PWA) Card */}
        <div className="rounded-3xl bg-white border border-line p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-extrabold text-lg text-slate-900">Romantic Push Notifications</h2>
                <p className="text-xs text-slate-500">
                  100% Free native device alerts when your partner sends love pings, warm hugs, or answers daily sparks
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
                  pushPermission === 'granted'
                    ? 'bg-emerald-100 text-emerald-800'
                    : pushPermission === 'denied'
                    ? 'bg-rose-100 text-rose-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {pushPermission === 'granted'
                  ? 'Active 🔔'
                  : pushPermission === 'denied'
                  ? 'Blocked in Browser 🚫'
                  : 'Not Enabled ⏳'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-100 space-y-3">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-purple-600" />
                <h4 className="font-bold text-sm text-purple-950">Notification Permissions</h4>
              </div>
              <p className="text-xs text-purple-800/80 leading-relaxed">
                Uses the free W3C Web Push & Service Worker API directly in your browser. No third-party subscriptions or paid server tier required!
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                {pushPermission !== 'granted' ? (
                  <button
                    type="button"
                    onClick={handleEnablePush}
                    className="px-4 py-2 font-bold text-xs flex items-center gap-1.5 bg-primary hover:bg-primary-hover text-on-primary shadow-cta rounded-full"
                  >
                    <Bell className="w-3.5 h-3.5" />
                    <span>Enable Free Push Notifications</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleTestPush}
                    className="px-4 py-2 rounded-xl bg-white border border-purple-200 text-purple-700 font-bold text-xs hover:bg-purple-100 shadow-xs flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Test Notification</span>
                  </button>
                )}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-100 space-y-3">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-amber-600" />
                <h4 className="font-bold text-sm text-amber-950">Mobile App Installation (PWA)</h4>
              </div>
              <p className="text-xs text-amber-800/80 leading-relaxed">
                Add OurDiary to your phone's home screen for a full-screen, standalone app experience.
              </p>
              <div className="text-[11px] text-amber-900 bg-white/70 p-2.5 rounded-xl border border-amber-200/60 leading-relaxed">
                📱 <strong>iOS (Safari):</strong> Tap <em>Share</em> &rarr; <em>Add to Home Screen</em><br />
                🤖 <strong>Android (Chrome):</strong> Tap <em>Menu (⋮)</em> &rarr; <em>Install App / Add to Home Screen</em>
              </div>
            </div>
          </div>
        </div>

        {/* Data Persistence, Export, Import & Reset */}
        <div className="rounded-3xl bg-white border border-line p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
            <Download className="w-5 h-5 text-indigo-500" />
            <h2 className="font-extrabold text-lg text-slate-900">Data Management & Backup</h2>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            All your memories, notes, and events are stored locally in your browser's <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">localStorage</code>. You can back up your entire diary to a JSON file, or restore a previously saved diary on any device.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Export */}
            <button
              onClick={handleExport}
              className="p-4 rounded-2xl bg-indigo-50/80 border border-indigo-100 hover:bg-indigo-100/80 transition-all text-left flex flex-col justify-between"
            >
              <div>
                <Download className="w-5 h-5 text-indigo-600 mb-2" />
                <h4 className="font-bold text-sm text-indigo-950">Export Diary JSON</h4>
                <p className="text-[11px] text-indigo-700 mt-1">
                  Save all memories, letters & settings as a downloadable file.
                </p>
              </div>
              <span className="text-xs font-extrabold text-indigo-600 mt-3 block">Download File ↓</span>
            </button>

            {/* Import */}
            <label className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-100 hover:bg-emerald-100/80 transition-all text-left flex flex-col justify-between cursor-pointer">
              <div>
                <Upload className="w-5 h-5 text-emerald-600 mb-2" />
                <h4 className="font-bold text-sm text-emerald-950">Import Diary JSON</h4>
                <p className="text-[11px] text-emerald-700 mt-1">
                  Restore an exported backup with automatic schema validation.
                </p>
              </div>
              <span className="text-xs font-extrabold text-emerald-600 mt-3 block">Choose File ↑</span>
              <input
                type="file"
                accept=".json,application/json"
                onChange={handleImportFile}
                className="hidden"
              />
            </label>

            {/* Reset */}
            <button
              onClick={() => setShowResetConfirm(true)}
              className="p-4 rounded-2xl bg-rose-50/80 border border-rose-100 hover:bg-rose-100/80 transition-all text-left flex flex-col justify-between"
            >
              <div>
                <RotateCcw className="w-5 h-5 text-rose-600 mb-2" />
                <h4 className="font-bold text-sm text-rose-950">Reset All Demo Data</h4>
                <p className="text-[11px] text-rose-700 mt-1">
                  Restore fresh 12 sample memories and initial couple profiles.
                </p>
              </div>
              <span className="text-xs font-extrabold text-rose-600 mt-3 block">Reset to Sample ↻</span>
            </button>
          </div>
        </div>

        {/* Leave Diary Confirmation Modal */}
        {leaveTargetId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-rose-100 space-y-4 animate-in fade-in zoom-in-95">
              <div className="flex items-center gap-3 text-rose-600">
                <DoorOpen className="w-6 h-6" />
                <h3 className="font-extrabold text-lg text-slate-900">Leave this diary?</h3>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">
                You will no longer see{' '}
                <strong className="font-bold text-slate-800">
                  {spaces.find((space) => space.id === leaveTargetId)?.name}
                </strong>{' '}
                or anything written in it. What you wrote there stays with the diary, and you can only come back if
                its creator shares the invite code with you again.
              </p>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setLeaveTargetId(null)}
                  disabled={leavingSpace}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmLeave}
                  disabled={leavingSpace}
                  className="px-5 py-2 rounded-xl bg-rose-600 text-white font-bold text-xs hover:bg-rose-700 shadow-sm disabled:opacity-50"
                >
                  {leavingSpace ? 'Leaving…' : 'Yes, leave this diary'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Reset Confirmation Modal */}
        {showResetConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-rose-100 space-y-4 animate-in fade-in zoom-in-95">
              <div className="flex items-center gap-3 text-rose-600">
                <ShieldAlert className="w-6 h-6" />
                <h3 className="font-extrabold text-lg text-slate-900">Reset Demo Data?</h3>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">
                This will overwrite any memories or notes you've created and restore the initial sample dataset (Alex & Maya, 12 memories, letters, and bucket list).
              </p>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmReset}
                  className="px-5 py-2 rounded-xl bg-rose-600 text-white font-bold text-xs hover:bg-rose-700 shadow-sm"
                >
                  Yes, Reset Everything
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
