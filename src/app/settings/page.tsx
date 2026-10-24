'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Chip, Field, inputClass } from '@/components/ui/Surface';
import { cn } from '@/lib/cn';
import { useDiary } from '@/store/DiaryContext';
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
} from 'lucide-react';
import {
  getNotificationPermission,
  requestPushPermission,
  sendPushNotification,
} from '@/lib/notifications';
import { uploadImageToCloudinary } from '@/lib/cloudinary/upload';
import { getAppearance, setAppearance, type Appearance } from '@/lib/appearance';
import { getPalette, setPalette, PALETTES, type Palette } from '@/lib/palette';

/**
 * A file input dressed as a button. `<input type="file">` cannot be styled,
 * so the label carries the face — a quiet lifted plane rather than a glowing
 * one, because uploading a photo is not the page's primary action.
 */
const UPLOAD_BUTTON =
  'inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-surface border border-line ' +
  'text-ink text-xs font-semibold shadow-sm cursor-pointer bloom';

/** Export / import / reset: three recessed wells that lift when pointed at. */
const DATA_TILE =
  'p-4 rounded-xl bg-canvas border border-line text-left flex flex-col justify-between h-full';

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
  } = useDiary();

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
        <div className="flex items-center gap-4 p-6 sm:p-8 rounded-2xl bg-hero border border-line shadow-card edge-lit">
          <span className="p-2.5 rounded-xl bg-ink/5 text-primary flex-shrink-0">
            <SlidersHorizontal className="w-5 h-5" />
          </span>
          <div className="min-w-0">
            <h1 className="font-display text-2xl sm:text-3xl font-normal tracking-tight text-ink">
              Application Settings
            </h1>
            <p className="text-xs text-ink-muted mt-1.5">
              Customize your couple names, anniversaries, profiles, themes, and backup demo data
            </p>
          </div>
        </div>

        {/* Couple Space Account & Session Card (Visible at Top!) */}
        <div className="panel edge-lit rounded-2xl p-6 sm:p-8 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-line gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <span className="w-10 h-10 rounded-xl bg-primary/12 text-primary flex items-center justify-center flex-shrink-0">
                <LogOut className="w-5 h-5" />
              </span>
              <div className="min-w-0">
                <h2 className="font-display text-xl font-normal tracking-tight text-ink">
                  Couple Space Account &amp; Session
                </h2>
                <p className="text-xs text-ink-muted mt-1">
                  Manage your current session, switch accounts, or log out of this space
                </p>
              </div>
            </div>
            <Chip tone={isLiveUser ? 'accent' : 'muted'} className="self-start sm:self-auto uppercase">
              {isLiveUser ? 'Live Cloud Space 🔒' : 'Local Demo Mode 🧪'}
            </Chip>
          </div>

          <div className="bg-canvas p-4 rounded-xl border border-line flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-ink">
                Active Space: <span className="text-secondary font-bold">{data.couple.name}</span>
              </p>
              <p className="text-[11px] text-ink-muted mt-1 leading-relaxed">
                {isLiveUser
                  ? 'Your couple space is securely connected and synced with the Supabase database.'
                  : 'You are currently in interactive demo mode. You can log in with an email to connect with your partner in real time.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
              <Button variant="danger" size="sm" onClick={() => logout(true)}>
                <LogOut className="w-4 h-4" aria-hidden="true" />
                <span>Log Out of OurDiary</span>
              </Button>

              <ButtonLink href="/login" variant="outline" size="sm">
                <Sparkles className="w-3.5 h-3.5 text-secondary" aria-hidden="true" />
                <span>Switch / Sign In</span>
              </ButtonLink>
            </div>
          </div>
        </div>

        {/* Couple & Relationship Settings Card */}
        <div className="panel edge-lit rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-line">
            <Heart className="w-5 h-5 text-primary fill-primary flex-shrink-0" />
            <h2 className="font-display text-xl font-normal tracking-tight text-ink">
              Relationship Basics
            </h2>
          </div>

          <form onSubmit={handleSaveCouple} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field id="settings-couple-name" label="Couple Display Name">
                <input
                  id="settings-couple-name"
                  type="text"
                  required
                  value={coupleName}
                  onChange={(e) => setCoupleName(e.target.value)}
                  className={inputClass}
                />
              </Field>

              <Field id="settings-start-date" label="Relationship Start Date">
                <input
                  id="settings-start-date"
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className={inputClass}
                />
              </Field>

              <Field id="settings-anniversary-date" label="Next Anniversary Date">
                <input
                  id="settings-anniversary-date"
                  type="date"
                  required
                  value={anniversaryDate}
                  onChange={(e) => setAnniversaryDate(e.target.value)}
                  className={inputClass}
                />
              </Field>
            </div>

            {/* Couple theme — tints the header gradient within the chosen palette */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted mb-2.5">
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
                    className={cn(
                      'p-3 rounded-xl border text-left transition-all',
                      theme === th.id
                        ? 'border-primary/60 bg-primary/10 shadow-cta'
                        : 'border-line bg-canvas hover:border-primary/35'
                    )}
                  >
                    <div data-theme={th.id} className="h-8 rounded-full bg-hero mb-2" />
                    <span className="text-xs font-semibold text-ink">{th.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={animationsEnabled}
                  onChange={(e) => setAnimationsEnabled(e.target.checked)}
                  className="w-4 h-4 rounded accent-primary focus:ring-focus"
                />
                <span className="text-xs font-semibold text-ink">Enable UI train &amp; card animations</span>
              </label>

              <Button type="submit" variant="primary" size="sm">
                <Save className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Save relationship details</span>
              </Button>
            </div>
          </form>
        </div>

        {/* Palette — per-device preference, applied instantly */}
        <div className="panel edge-lit rounded-2xl p-6 sm:p-8">
          <h3 className="font-display text-lg font-normal tracking-tight text-ink">Palette</h3>
          <p className="text-xs text-ink-muted mt-1.5 mb-5">
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
                className={cn(
                  'p-3.5 rounded-xl border text-left transition-all',
                  palette === option.id
                    ? 'border-primary/60 bg-primary/10 shadow-cta'
                    : 'border-line bg-canvas hover:border-primary/35'
                )}
              >
                <div className="flex h-8 rounded-full overflow-hidden mb-2.5 border border-line">
                  {option.swatch.map((colour) => (
                    <span key={colour} className="flex-1" style={{ backgroundColor: colour }} />
                  ))}
                </div>
                <span className="text-xs font-semibold text-ink">{option.name}</span>
                <p className="text-[11px] text-ink-muted mt-1">{option.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Appearance — per-device preference, applied instantly */}
        <div className="panel edge-lit rounded-2xl p-6 sm:p-8">
          <h3 className="font-display text-lg font-normal tracking-tight text-ink">Appearance</h3>
          <p className="text-xs text-ink-muted mt-1.5 mb-5">
            Choose light or dark, or follow this device’s setting. Saved on this device only.
          </p>
          <div role="radiogroup" aria-label="Appearance" className="inline-flex p-1 rounded-full bg-canvas border border-line">
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
                className={cn(
                  'px-4 py-1.5 rounded-full text-xs font-semibold capitalize transition-all',
                  appearance === option ? 'bg-beam shadow-cta' : 'text-ink-muted hover:text-ink'
                )}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        {/* Couple Photo */}
        <div className="panel edge-lit rounded-2xl p-6 sm:p-8">
          <h3 className="font-display text-lg font-normal tracking-tight text-ink">Couple Photo</h3>
          <p className="text-xs text-ink-muted mt-1.5 mb-5">
            A photo of both of you together — shown in the top-left of the navbar.
          </p>
          <div className="flex items-center gap-4">
            {couplePhoto ? (
              <img
                src={couplePhoto}
                alt="Couple"
                className="w-16 h-16 rounded-2xl object-cover ring-1 ring-line shadow-sm"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-canvas border border-line flex items-center justify-center text-ink-muted">
                <Heart className="w-6 h-6" />
              </div>
            )}
            <label className={cn(UPLOAD_BUTTON, uploadingCouplePhoto && 'opacity-60')}>
              <Upload className="w-3.5 h-3.5" aria-hidden="true" />
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

        {/* Profiles Customization (2 cols) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* User 1 Profile Form */}
          <div className="panel edge-lit rounded-2xl p-6 space-y-5">
            <div className="flex items-center gap-3 pb-4 border-b border-line">
              <img
                src={user1Avatar}
                alt={user1Name}
                className="w-10 h-10 rounded-full object-cover ring-1 ring-line"
              />
              <div className="min-w-0">
                <h3 className="font-display text-lg font-normal tracking-tight text-ink">User 1 (You)</h3>
                <span className="text-[11px] text-ink-muted">Default: Alex</span>
              </div>
            </div>

            <form onSubmit={handleSaveUser1} className="space-y-4">
              <Field id="settings-user1-name" label="Display Name">
                <input
                  id="settings-user1-name"
                  type="text"
                  required
                  value={user1Name}
                  onChange={(e) => setUser1Name(e.target.value)}
                  className={inputClass}
                />
              </Field>

              <Field id="settings-user1-nickname" label="Nickname">
                <input
                  id="settings-user1-nickname"
                  type="text"
                  value={user1Nickname}
                  onChange={(e) => setUser1Nickname(e.target.value)}
                  className={inputClass}
                />
              </Field>

              <Field id="settings-user1-avatar" label="Photo">
                {isLiveUser && activeProfile.id !== 'user_1' ? (
                  <p className="text-[11px] text-ink-muted mb-2">
                    Only {data.couple.user1.name} can upload their own photo.
                  </p>
                ) : (
                  <label className={cn(UPLOAD_BUTTON, 'mb-2', uploadingUser1Photo && 'opacity-60')}>
                    <Upload className="w-3.5 h-3.5" aria-hidden="true" />
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
                  id="settings-user1-avatar"
                  type="url"
                  required
                  value={user1Avatar}
                  onChange={(e) => setUser1Avatar(e.target.value)}
                  placeholder="Or paste an image URL"
                  className={inputClass}
                />
              </Field>

              <Field id="settings-user1-bio" label="Bio / Status">
                <input
                  id="settings-user1-bio"
                  type="text"
                  value={user1Bio}
                  onChange={(e) => setUser1Bio(e.target.value)}
                  className={inputClass}
                />
              </Field>

              <div className="pt-1 flex justify-end">
                <Button type="submit" variant="primary" size="sm">
                  Update User 1
                </Button>
              </div>
            </form>
          </div>

          {/* User 2 Profile Form */}
          <div className="panel edge-lit rounded-2xl p-6 space-y-5">
            <div className="flex items-center gap-3 pb-4 border-b border-line">
              <img
                src={user2Avatar}
                alt={user2Name}
                className="w-10 h-10 rounded-full object-cover ring-1 ring-line"
              />
              <div className="min-w-0">
                <h3 className="font-display text-lg font-normal tracking-tight text-ink">User 2 (Partner)</h3>
                <span className="text-[11px] text-ink-muted">Default: Maya</span>
              </div>
            </div>

            <form onSubmit={handleSaveUser2} className="space-y-4">
              <Field id="settings-user2-name" label="Display Name">
                <input
                  id="settings-user2-name"
                  type="text"
                  required
                  value={user2Name}
                  onChange={(e) => setUser2Name(e.target.value)}
                  className={inputClass}
                />
              </Field>

              <Field id="settings-user2-nickname" label="Nickname">
                <input
                  id="settings-user2-nickname"
                  type="text"
                  value={user2Nickname}
                  onChange={(e) => setUser2Nickname(e.target.value)}
                  className={inputClass}
                />
              </Field>

              <Field id="settings-user2-avatar" label="Photo">
                {isLiveUser && activeProfile.id !== 'user_2' ? (
                  <p className="text-[11px] text-ink-muted mb-2">
                    Only {data.couple.user2.name} can upload their own photo.
                  </p>
                ) : (
                  <label className={cn(UPLOAD_BUTTON, 'mb-2', uploadingUser2Photo && 'opacity-60')}>
                    <Upload className="w-3.5 h-3.5" aria-hidden="true" />
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
                  id="settings-user2-avatar"
                  type="url"
                  required
                  value={user2Avatar}
                  onChange={(e) => setUser2Avatar(e.target.value)}
                  placeholder="Or paste an image URL"
                  className={inputClass}
                />
              </Field>

              <Field id="settings-user2-bio" label="Bio / Status">
                <input
                  id="settings-user2-bio"
                  type="text"
                  value={user2Bio}
                  onChange={(e) => setUser2Bio(e.target.value)}
                  className={inputClass}
                />
              </Field>

              <div className="pt-1 flex justify-end">
                <Button type="submit" variant="primary" size="sm">
                  Update User 2
                </Button>
              </div>
            </form>
          </div>
        </div>

        {/* Free Web Push Notifications & Progressive Web App (PWA) Card */}
        <div className="panel edge-lit rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-line gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <span className="w-10 h-10 rounded-xl bg-primary/12 text-primary flex items-center justify-center flex-shrink-0">
                <Bell className="w-5 h-5" />
              </span>
              <div className="min-w-0">
                <h2 className="font-display text-xl font-normal tracking-tight text-ink">
                  Romantic Push Notifications
                </h2>
                <p className="text-xs text-ink-muted mt-1">
                  100% Free native device alerts when your partner sends love pings, warm hugs, or answers daily sparks
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <Chip
                tone={pushPermission === 'granted' ? 'accent' : 'muted'}
                className={cn('uppercase', pushPermission === 'denied' && 'text-danger border-danger/30 bg-danger/10')}
              >
                {pushPermission === 'granted'
                  ? 'Active 🔔'
                  : pushPermission === 'denied'
                  ? 'Blocked in Browser 🚫'
                  : 'Not Enabled ⏳'}
              </Chip>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-canvas border border-line space-y-3">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-secondary flex-shrink-0" />
                <h4 className="font-semibold text-sm text-ink">Notification Permissions</h4>
              </div>
              <p className="text-xs text-ink-muted leading-relaxed">
                Uses the free W3C Web Push &amp; Service Worker API directly in your browser. No third-party subscriptions or paid server tier required!
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                {pushPermission !== 'granted' ? (
                  <Button variant="primary" size="sm" onClick={handleEnablePush}>
                    <Bell className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Enable Free Push Notifications</span>
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" onClick={handleTestPush}>
                    <Send className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Send Test Notification</span>
                  </Button>
                )}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-canvas border border-line space-y-3">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-accent flex-shrink-0" />
                <h4 className="font-semibold text-sm text-ink">Mobile App Installation (PWA)</h4>
              </div>
              <p className="text-xs text-ink-muted leading-relaxed">
                Add OurDiary to your phone's home screen for a full-screen, standalone app experience.
              </p>
              <div className="text-[11px] text-ink-muted bg-surface p-3 rounded-lg border border-line leading-relaxed">
                📱 <strong className="text-ink">iOS (Safari):</strong> Tap <em>Share</em> &rarr; <em>Add to Home Screen</em><br />
                🤖 <strong className="text-ink">Android (Chrome):</strong> Tap <em>Menu (⋮)</em> &rarr; <em>Install App / Add to Home Screen</em>
              </div>
            </div>
          </div>
        </div>

        {/* Data Persistence, Export, Import & Reset */}
        <div className="panel edge-lit rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-line">
            <Download className="w-5 h-5 text-secondary flex-shrink-0" />
            <h2 className="font-display text-xl font-normal tracking-tight text-ink">
              Data Management &amp; Backup
            </h2>
          </div>

          <p className="text-xs text-ink-muted leading-relaxed">
            All your memories, notes, and events are stored locally in your browser's <code className="bg-canvas border border-line px-1.5 py-0.5 rounded text-ink">localStorage</code>. You can back up your entire diary to a JSON file, or restore a previously saved diary on any device.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Export */}
            <button
              onClick={handleExport}
              className={cn(DATA_TILE, 'lift')}
            >
              <div>
                <Download className="w-5 h-5 text-secondary mb-2.5" aria-hidden="true" />
                <h4 className="font-semibold text-sm text-ink">Export Diary JSON</h4>
                <p className="text-[11px] text-ink-muted mt-1.5 leading-relaxed">
                  Save all memories, letters &amp; settings as a downloadable file.
                </p>
              </div>
              <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-secondary mt-4 block">
                Download File ↓
              </span>
            </button>

            {/* Import */}
            <label className={cn(DATA_TILE, 'lift cursor-pointer')}>
              <div>
                <Upload className="w-5 h-5 text-accent mb-2.5" aria-hidden="true" />
                <h4 className="font-semibold text-sm text-ink">Import Diary JSON</h4>
                <p className="text-[11px] text-ink-muted mt-1.5 leading-relaxed">
                  Restore an exported backup with automatic schema validation.
                </p>
              </div>
              <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-accent mt-4 block">
                Choose File ↑
              </span>
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
              className={cn(DATA_TILE, 'lift')}
            >
              <div>
                <RotateCcw className="w-5 h-5 text-danger mb-2.5" aria-hidden="true" />
                <h4 className="font-semibold text-sm text-ink">Reset All Demo Data</h4>
                <p className="text-[11px] text-ink-muted mt-1.5 leading-relaxed">
                  Restore fresh 12 sample memories and initial couple profiles.
                </p>
              </div>
              <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-danger mt-4 block">
                Reset to Sample ↻
              </span>
            </button>
          </div>
        </div>

        {/* Reset Confirmation Modal */}
        {showResetConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
            <div className="panel edge-lit rounded-2xl p-6 sm:p-8 max-w-md w-full space-y-4 animate-in fade-in zoom-in-95">
              <div className="flex items-center gap-3">
                <ShieldAlert className="w-6 h-6 text-danger flex-shrink-0" />
                <h3 className="font-display text-xl font-normal tracking-tight text-ink">
                  Reset Demo Data?
                </h3>
              </div>
              <p className="text-sm text-ink-muted leading-relaxed">
                This will overwrite any memories or notes you've created and restore the initial sample dataset (Alex &amp; Maya, 12 memories, letters, and bucket list).
              </p>
              <div className="flex items-center justify-end gap-3 pt-2">
                <Button variant="ghost" size="sm" onClick={() => setShowResetConfirm(false)}>
                  Cancel
                </Button>
                <Button variant="danger" size="sm" onClick={handleConfirmReset}>
                  Yes, Reset Everything
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
