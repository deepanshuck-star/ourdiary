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
          setPartner1Name('You');
          setPartner2Name('Partner');
          setCoupleName('Our Couple Space');
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

    // Mock / Offline join
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
      <div className="min-h-screen bg-gradient-to-br from-[#FFF8EE] via-[#F8C8D8]/20 to-[#CBBEF4]/20 flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto" />
          <p className="text-xs font-semibold text-slate-600">Verifying your account session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFF8EE] via-[#F8C8D8]/20 to-[#CBBEF4]/20 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-lg text-center">
        <Link href="/" className="inline-flex items-center gap-2 mb-4 group">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#F8C8D8] via-[#CBBEF4] to-[#B6DDF4] flex items-center justify-center shadow-md">
            <Heart className="w-6 h-6 text-rose-500 fill-rose-500" />
          </div>
          <span className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-rose-500 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
            OurDiary
          </span>
        </Link>
        <h2 className="text-2xl font-extrabold text-slate-900">
          Set Up Your Clean Couple Space 💕
        </h2>
        <p className="mt-2 text-xs text-slate-500">
          Strictly invite-only for exactly two people. Logged in as{' '}
          <strong className="text-slate-700">{authenticatedUser?.email || 'Authenticated User'}</strong>.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg">
        <div className="bg-white py-8 px-6 shadow-xl rounded-3xl border border-[#EFE4D6] sm:px-10 space-y-6">
          {/* Tabs */}
          <div className="flex rounded-2xl bg-slate-100 p-1">
            <button
              onClick={() => {
                setActiveTab('create');
                setJoinError(null);
              }}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                activeTab === 'create'
                  ? 'bg-white text-rose-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              Create Space (Clean Slate)
            </button>
            <button
              onClick={() => {
                setActiveTab('join');
                setJoinError(null);
              }}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                activeTab === 'join'
                  ? 'bg-white text-purple-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Key className="w-4 h-4" />
              Join With Code
            </button>
          </div>

          {activeTab === 'create' ? (
            !generatedCode ? (
              <form onSubmit={handleCreateCouple} className="space-y-4">
                <div className="p-3 rounded-2xl bg-rose-50/70 border border-rose-100 text-xs text-rose-900 flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-rose-500 mt-0.5 flex-shrink-0" />
                  <p>
                    <strong>Clean Slate Guarantee:</strong> All initial dummy demo data (Alex & Maya) will be completely cleared. Your diary will start with 0 memories so you can build your real memories from scratch!
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Couple / Space Name
                  </label>
                  <input
                    type="text"
                    required
                    value={coupleName}
                    onChange={(e) => setCoupleName(e.target.value)}
                    placeholder="e.g. Maya & Alex's Love Story"
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 text-xs focus:ring-2 focus:ring-rose-300 focus:outline-hidden"
                  />
                </div>

                {/* Cute Bitmoji Selectors */}
                <div className="p-3 rounded-2xl bg-gradient-to-r from-pink-50 to-purple-50 border border-pink-200/60 space-y-2">
                  <span className="text-[11px] font-bold text-slate-700 block">
                    Choose Your Cute Bitmoji / Avatars:
                  </span>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-[10px] text-slate-500 font-semibold block mb-1">
                        Your Avatar:
                      </span>
                      <div className="flex items-center gap-1.5">
                        {CUTE_AVATARS_1.map((url) => (
                          <button
                            key={url}
                            type="button"
                            onClick={() => setAvatar1(url)}
                            className={`w-9 h-9 rounded-full overflow-hidden border-2 transition-all ${
                              avatar1 === url
                                ? 'border-purple-600 ring-2 ring-purple-300 scale-105'
                                : 'border-white opacity-70 hover:opacity-100'
                            }`}
                          >
                            <img src={url} alt="Avatar" className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-500 font-semibold block mb-1">
                        Partner&apos;s Avatar:
                      </span>
                      <div className="flex items-center gap-1.5">
                        {CUTE_AVATARS_2.map((url) => (
                          <button
                            key={url}
                            type="button"
                            onClick={() => setAvatar2(url)}
                            className={`w-9 h-9 rounded-full overflow-hidden border-2 transition-all ${
                              avatar2 === url
                                ? 'border-rose-600 ring-2 ring-rose-300 scale-105'
                                : 'border-white opacity-70 hover:opacity-100'
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
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Your Name
                    </label>
                    <input
                      type="text"
                      required
                      value={partner1Name}
                      onChange={(e) => setPartner1Name(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 text-xs focus:ring-2 focus:ring-rose-300 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Partner&apos;s Name
                    </label>
                    <input
                      type="text"
                      required
                      value={partner2Name}
                      onChange={(e) => setPartner2Name(e.target.value)}
                      placeholder="e.g. Partner"
                      className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 text-xs focus:ring-2 focus:ring-rose-300 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Relationship Start Date
                  </label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="date"
                      required
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 text-xs focus:ring-2 focus:ring-rose-300 focus:outline-hidden"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 px-4 rounded-2xl shadow-md bg-gradient-to-r from-rose-500 to-purple-600 text-white text-xs font-extrabold hover:opacity-95 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      Create Clean Space & Generate Invite Code
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            ) : (
              <div className="space-y-5 text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900">
                    Couple Space Created!
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Send this private 6-character code to {partner2Name} to join your space.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-between">
                  <span className="text-2xl font-mono font-black text-rose-600 tracking-widest">
                    {generatedCode}
                  </span>
                  <button
                    onClick={copyCode}
                    className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 shadow-xs flex items-center gap-1.5 text-xs font-bold"
                  >
                    <Copy className="w-4 h-4" />
                    Copy
                  </button>
                </div>

                <p className="text-[11px] text-slate-400">
                  Don't worry! You can also view or regenerate this code anytime directly from your dashboard settings if it ever gets exposed.
                </p>

                {countdown !== null && (
                  <p className="text-xs text-purple-600 font-bold animate-pulse">
                    Entering dashboard automatically in {countdown}s...
                  </p>
                )}

                <button
                  type="button"
                  onClick={() => router.push('/dashboard')}
                  className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-rose-500 to-purple-600 text-white text-xs sm:text-sm font-extrabold shadow-md hover:opacity-95 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  <span>Enter Our Space Now →</span>
                </button>
              </div>
            )
          ) : (
            <form onSubmit={handleJoinCouple} className="space-y-4">
              {joinError && (
                <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
                  <span>{joinError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Partner&apos;s 6-Character Invite Code
                </label>
                <div className="relative">
                  <Key className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    maxLength={10}
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    placeholder="e.g. 7X8K2M"
                    className="w-full pl-10 pr-4 py-2.5 font-mono text-center tracking-widest text-base font-bold rounded-2xl border border-slate-200 focus:ring-2 focus:ring-purple-300 focus:outline-hidden"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5">
                  Ask your partner for the invite code generated when they created your space.
                </p>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 px-4 rounded-2xl shadow-md bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-extrabold hover:opacity-95 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    Join Partner Space
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          <div className="pt-3 border-t border-slate-100 text-center">
            <Link href="/login" className="text-xs text-slate-500 hover:text-slate-700 font-semibold">
              ← Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
