'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Heart,
  UserPlus,
  Key,
  Calendar,
  ArrowRight,
  CheckCircle2,
  Copy,
  ShieldCheck,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Field, inputClass } from '@/components/ui/Surface';
import { cn } from '@/lib/cn';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { fetchMyCouple, createCoupleSpaceRemote, joinCoupleByCodeRemote } from '@/lib/supabase/couple';
import { friendlyAuthError } from '@/lib/friendlyError';
import { useDiary } from '@/store/DiaryContext';

export default function OnboardingPage() {
  const router = useRouter();
  const { initCleanCoupleSpace, switchProfile, showToast, loadExistingCoupleSpace } = useDiary();
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');

  const supabase = getSupabaseBrowserClient();
  const [authLoading, setAuthLoading] = useState(true);
  const [authenticatedUser, setAuthenticatedUser] = useState<any>(null);

  // Cute Bitmoji avatar presets
  const CUTE_AVATARS_1 = [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Alex&backgroundColor=b6e3f4',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Leo&backgroundColor=c0aede',
    'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&auto=format&fit=crop&q=80',
  ];
  const CUTE_AVATARS_2 = [
    'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop&q=80',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Maya&backgroundColor=ffd5dc',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Zoe&backgroundColor=ffdfbf',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop&q=80',
  ];

  const [avatar1, setAvatar1] = useState(CUTE_AVATARS_1[0]);
  const [avatar2, setAvatar2] = useState(CUTE_AVATARS_2[0]);

  // Create form state
  const [coupleName, setCoupleName] = useState('');
  const [partner1Name, setPartner1Name] = useState('');
  const [partner2Name, setPartner2Name] = useState('');
  const [startDate, setStartDate] = useState('2024-01-01');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);

  // Join form state
  const [inviteCode, setInviteCode] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);

  // Check auth state on mount & auto-redirect if couple space already exists!
  useEffect(() => {
    setStartDate(new Date().toISOString().split('T')[0]);
    async function checkAuth() {
      if (!supabase) {
        setAuthLoading(false);
        setPartner1Name('You');
        setPartner2Name('Partner');
        setCoupleName('Our Couple Space');
        return;
      }

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session && session.user) {
          setAuthenticatedUser(session.user);

          // Check if this user ALREADY has a couple space!
          const existing = await fetchMyCouple(supabase);
          if (existing) {
            loadExistingCoupleSpace(session.user.id, existing.couple, existing.role);
            showToast(`Welcome back to ${existing.couple.name}! 💕`, 'heart');
            router.push('/dashboard');
            return;
          }

          const userDisplayName =
            session.user.user_metadata?.display_name ||
            (session.user.email ? session.user.email.split('@')[0] : 'You');

          setPartner1Name(userDisplayName);
          setPartner2Name('Partner');
          setCoupleName(`${userDisplayName} & Partner's Space`);
        } else {
          // Signed out on a cloud-backed app. Previously this fell through
          // to the form, and both handlers below then took their offline
          // branch — fabricating a convincing local-only space and telling
          // the visitor they had joined, while the database never heard of
          // them. Sign in first; the account is what a space is attached to.
          showToast('Please sign in first — your couple space is tied to your account.', 'info');
          router.replace('/login');
          return;
        }
      } catch (err) {
        console.error('Auth verification note:', err);
      } finally {
        setAuthLoading(false);
      }
    }

    checkAuth();
    // Intentionally run once on mount: loadExistingCoupleSpace/showToast
    // come from DiaryContext as plain (non-memoized) functions, recreated
    // on every provider render, so including them would re-run this check
    // (and its redirect/toast) far more often than intended.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, router]);

  // Auto-redirect countdown when couple space is created
  useEffect(() => {
    if (!generatedCode) return;
    setCountdown(5);
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          router.push('/dashboard');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [generatedCode, router]);

  const handleCreateCouple = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    let code = Math.random().toString(36).substring(2, 8).toUpperCase();
    let coupleId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'c_' + Date.now();
    let finalName = coupleName.trim();
    let finalStart = startDate;

    // On a cloud-backed app a space only exists if the database says so.
    // Falling back to the local branch here would hand the visitor a space
    // their partner can never join.
    if (supabase && !authenticatedUser) {
      showToast('Please sign in first — your couple space is tied to your account.', 'warn');
      setIsSubmitting(false);
      router.replace('/login');
      return;
    }

    // If Supabase is live and user is authenticated, the database is the source of truth.
    // The RPC is idempotent: it returns the user's existing space instead of creating a duplicate.
    if (supabase && authenticatedUser) {
      try {
        const remote = await createCoupleSpaceRemote(supabase, finalName, startDate);
        coupleId = remote.id;
        code = remote.invite_code;
        finalName = remote.name;
        finalStart = remote.relationship_start_date || startDate;
      } catch (err: any) {
        showToast(`Could not create your couple space: ${friendlyAuthError(err, 'couple')}`, 'warn');
        setIsSubmitting(false);
        return;
      }
    }

    // Initialize clean couple space with cute Bitmoji avatars
    initCleanCoupleSpace({
      id: coupleId,
      name: finalName,
      startDate: finalStart,
      anniversaryDate: finalStart,
      theme: 'candy',
      animationsEnabled: true,
      inviteCode: code,
      isLocked: false,
      user1: {
        id: 'user_1',
        name: partner1Name.trim() || 'You',
        avatar: avatar1,
      },
      user2: {
        id: 'user_2',
        name: partner2Name.trim() || 'Partner',
        avatar: avatar2,
      },
    });

    setGeneratedCode(code);
    setIsSubmitting(false);
    showToast('Clean couple space created with cute bitmojis! 🎉', 'heart');
  };

  const handleJoinCouple = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoinError(null);
    const cleanedCode = inviteCode.trim().toUpperCase();
    if (!cleanedCode) return;

    setIsSubmitting(true);

    // This is the bug that let a partner "join" without an account: with no
    // session the handler used to fall through to the offline branch below,
    // build a local-only space seeded with demo data, and report success.
    // Nothing reached the database, so the real space never gained a member.
    if (supabase && !authenticatedUser) {
      setJoinError('Please sign in or create an account first — a code can only be redeemed by an account.');
      setIsSubmitting(false);
      router.replace('/login');
      return;
    }

    if (supabase && authenticatedUser) {
      try {
        // Server-side RPC validates the code, enforces the 2-member limit and links the partner.
        const foundCouple = await joinCoupleByCodeRemote(supabase, cleanedCode);
        loadExistingCoupleSpace(authenticatedUser.id, foundCouple, 'partner');
        showToast(`Joined ${foundCouple.name}! Welcome to your shared space 💕`, 'success');
        router.push('/dashboard');
        return;
      } catch (err: any) {
        setJoinError(friendlyAuthError(err, 'couple'));
        setIsSubmitting(false);
        return;
      }
    }

    // Demo mode only (no Supabase configured at all). Unreachable on a
    // cloud-backed app thanks to the guard above.
    initCleanCoupleSpace({
      id: 'c_' + Date.now(),
      name: 'Our Couple Space',
      startDate: new Date().toISOString().split('T')[0],
      anniversaryDate: new Date().toISOString().split('T')[0],
      theme: 'candy',
      animationsEnabled: true,
      inviteCode: cleanedCode,
      isLocked: false,
      user1: { id: 'user_1', name: 'Partner', avatar: '/avatars/user-1.png' },
      user2: { id: 'user_2', name: 'You', avatar: '/avatars/user-2.png' },
    });
    switchProfile('user_2');
    showToast(`Successfully connected with code ${cleanedCode}! 💕`, 'success');
    router.push('/dashboard');
  };

  const copyCode = () => {
    if (generatedCode) {
      navigator.clipboard.writeText(generatedCode);
      showToast('Invite code copied to clipboard! 📋', 'success');
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-canvas bg-hero flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-xs font-semibold text-ink-muted">Verifying your account session...</p>
        </div>
      </div>
    );
  }

  return (
    // One lit card floating in a dark room.
    <div className="min-h-screen bg-canvas bg-hero flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-lg text-center">
        <Link href="/" className="inline-flex items-center gap-2.5 mb-5 group">
          <span className="w-12 h-12 rounded-2xl flex items-center justify-center bg-beam shadow-cta bloom">
            <Heart className="w-6 h-6 text-on-primary fill-on-primary" />
          </span>
          <span className="font-display text-3xl font-normal tracking-tight text-ink">
            OurDiary
          </span>
        </Link>
        <h1 className="font-display text-3xl sm:text-4xl font-normal tracking-tight text-ink">
          Set Up Your Clean Couple Space 💕
        </h1>
        <p className="mt-3 text-xs text-ink-muted">
          Strictly invite-only for exactly two people. Logged in as{' '}
          <strong className="text-ink font-semibold">{authenticatedUser?.email || 'Authenticated User'}</strong>.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg">
        <div className="panel edge-lit rounded-2xl py-8 px-6 sm:px-10 space-y-6">
          {/* Tabs */}
          <div className="flex rounded-full bg-canvas border border-line p-1">
            <button
              onClick={() => {
                setActiveTab('create');
                setJoinError(null);
              }}
              className={`flex-1 py-2.5 rounded-full text-xs font-semibold transition-all flex items-center justify-center gap-2 ${
                activeTab === 'create'
                  ? 'bg-surface text-primary shadow-sm'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              <UserPlus className="w-4 h-4" aria-hidden="true" />
              Create Space (Clean Slate)
            </button>
            <button
              onClick={() => {
                setActiveTab('join');
                setJoinError(null);
              }}
              className={`flex-1 py-2.5 rounded-full text-xs font-semibold transition-all flex items-center justify-center gap-2 ${
                activeTab === 'join'
                  ? 'bg-surface text-secondary shadow-sm'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              <Key className="w-4 h-4" aria-hidden="true" />
              Join With Code
            </button>
          </div>

          {activeTab === 'create' ? (
            !generatedCode ? (
              <form onSubmit={handleCreateCouple} className="space-y-5">
                <div className="p-3.5 rounded-xl bg-canvas border border-line text-xs text-ink-muted flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" aria-hidden="true" />
                  <p>
                    <strong className="text-ink">Clean Slate Guarantee:</strong> All initial dummy demo data (Alex &amp; Maya) will be completely cleared. Your diary will start with 0 memories so you can build your real memories from scratch!
                  </p>
                </div>

                <Field id="onboarding-couple-name" label="Couple / Space Name">
                  <input
                    id="onboarding-couple-name"
                    type="text"
                    required
                    value={coupleName}
                    onChange={(e) => setCoupleName(e.target.value)}
                    placeholder="e.g. Maya & Alex's Love Story"
                    className={inputClass}
                  />
                </Field>

                {/* Cute Bitmoji Selectors */}
                <div className="p-4 rounded-xl bg-canvas border border-line space-y-3">
                  <span className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
                    Choose Your Cute Bitmoji / Avatars:
                  </span>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-[11px] text-ink-muted font-semibold block mb-1.5">
                        Your Avatar:
                      </span>
                      <div className="flex items-center gap-1.5">
                        {CUTE_AVATARS_1.map((url) => (
                          <button
                            key={url}
                            type="button"
                            onClick={() => setAvatar1(url)}
                            className={`w-9 h-9 rounded-full overflow-hidden border transition-all ${
                              avatar1 === url
                                ? 'border-secondary ring-2 ring-secondary/40 scale-105'
                                : 'border-line opacity-60 hover:opacity-100'
                            }`}
                          >
                            <img src={url} alt="Avatar" className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <span className="text-[11px] text-ink-muted font-semibold block mb-1.5">
                        Partner&apos;s Avatar:
                      </span>
                      <div className="flex items-center gap-1.5">
                        {CUTE_AVATARS_2.map((url) => (
                          <button
                            key={url}
                            type="button"
                            onClick={() => setAvatar2(url)}
                            className={`w-9 h-9 rounded-full overflow-hidden border transition-all ${
                              avatar2 === url
                                ? 'border-primary ring-2 ring-primary/40 scale-105'
                                : 'border-line opacity-60 hover:opacity-100'
                            }`}
                          >
                            <img src={url} alt="Avatar" className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Field id="onboarding-partner1-name" label="Your Name">
                    <input
                      id="onboarding-partner1-name"
                      type="text"
                      required
                      value={partner1Name}
                      onChange={(e) => setPartner1Name(e.target.value)}
                      className={inputClass}
                    />
                  </Field>
                  <Field id="onboarding-partner2-name" label="Partner&apos;s Name">
                    <input
                      id="onboarding-partner2-name"
                      type="text"
                      required
                      value={partner2Name}
                      onChange={(e) => setPartner2Name(e.target.value)}
                      placeholder="e.g. Partner"
                      className={inputClass}
                    />
                  </Field>
                </div>

                <Field id="onboarding-start-date" label="Relationship Start Date">
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-ink-muted absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
                    <input
                      id="onboarding-start-date"
                      type="date"
                      required
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className={cn(inputClass, 'pl-11')}
                    />
                  </div>
                </Field>

                {/* The only glowing object on the screen. */}
                <Button type="submit" variant="primary" size="lg" block disabled={isSubmitting} className="text-xs">
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <>
                      Create Clean Space & Generate Invite Code
                      <ArrowRight className="w-4 h-4" aria-hidden="true" />
                    </>
                  )}
                </Button>
              </form>
            ) : (
              <div className="space-y-5 text-center">
                <div className="w-16 h-16 rounded-full bg-accent/15 text-accent flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="font-display text-xl font-normal tracking-tight text-ink">
                    Couple Space Created!
                  </h3>
                  <p className="text-xs text-ink-muted mt-1.5">
                    Send this private 6-character code to {partner2Name} to join your space.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-canvas border border-line flex items-center justify-between gap-3">
                  <span className="text-2xl font-mono font-black text-primary tracking-widest">
                    {generatedCode}
                  </span>
                  <Button variant="outline" size="sm" onClick={copyCode} className="rounded-xl">
                    <Copy className="w-4 h-4" aria-hidden="true" />
                    Copy
                  </Button>
                </div>

                <p className="text-[11px] text-ink-muted">
                  Don't worry! You can also view or regenerate this code anytime directly from your dashboard settings if it ever gets exposed.
                </p>

                {countdown !== null && (
                  <p className="text-xs text-secondary font-semibold animate-pulse">
                    Entering dashboard automatically in {countdown}s...
                  </p>
                )}

                <Button
                  type="button"
                  variant="primary"
                  size="lg"
                  block
                  onClick={() => router.push('/dashboard')}
                  className="text-xs sm:text-sm"
                >
                  <span>Enter Our Space Now →</span>
                </Button>
              </div>
            )
          ) : (
            <form onSubmit={handleJoinCouple} className="space-y-5">
              {joinError && (
                <div className="p-3.5 rounded-xl bg-danger/10 border border-danger/30 text-xs text-danger flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                  <span>{joinError}</span>
                </div>
              )}

              <Field
                id="onboarding-invite-code"
                label="Partner&apos;s 6-Character Invite Code"
                hint="Ask your partner for the invite code generated when they created your space."
              >
                <div className="relative">
                  <Key className="w-4 h-4 text-ink-muted absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
                  <input
                    id="onboarding-invite-code"
                    type="text"
                    required
                    maxLength={10}
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    placeholder="e.g. 7X8K2M"
                    className={cn(inputClass, 'pl-11 font-mono text-center tracking-widest text-base font-bold')}
                  />
                </div>
              </Field>

              {/* The only glowing object on the screen. */}
              <Button type="submit" variant="primary" size="lg" block disabled={isSubmitting} className="text-xs">
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                ) : (
                  <>
                    Join Partner Space
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </>
                )}
              </Button>
            </form>
          )}

          <div className="pt-4 border-t border-line text-center">
            <Link href="/login" className="text-xs text-ink-muted hover:text-ink font-semibold">
              ← Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
