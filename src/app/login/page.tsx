'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Heart, Sparkles, Lock, Mail, ArrowRight, ShieldCheck, UserCheck, AlertCircle, CheckCircle2, User } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useDiary } from '@/store/DiaryContext';

export default function LoginPage() {
  const router = useRouter();
  const { switchProfile, showToast, setIsLiveUser, loadExistingCoupleSpace } = useDiary();
  const [isSignUp, setIsSignUp] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const supabase = getSupabaseBrowserClient();
  const isSupabaseLive = !!supabase;

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    if (!isSupabaseLive) {
      // In demo mode, sign in immediately
      setTimeout(() => {
        setLoading(false);
        showToast('Signed in to OurDiary Demo space! 💕', 'success');
        router.push('/dashboard');
      }, 400);
      return;
    }

    try {
      if (isSignUp) {
        // Sign up flow
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              display_name: displayName.trim() || email.split('@')[0],
            },
          },
        });

        if (error) {
          setErrorMsg(error.message);
          setLoading(false);
        } else if (data.session) {
          setIsLiveUser(true);
          if (typeof window !== 'undefined') {
            localStorage.setItem('ourdiary_is_live_user', 'true');
            localStorage.setItem('ourdiary_current_user_id', data.session.user.id);
          }
          showToast('Account created successfully! Welcome to OurDiary 💕', 'success');
          router.push('/onboarding');
        } else if (data.user) {
          setSuccessMsg(
            'Account created! Please check your inbox at ' +
              email +
              ' and click the confirmation link, then return here to sign in.'
          );
          setLoading(false);
        }
      } else {
        // Sign in flow
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          setErrorMsg(error.message);
          setLoading(false);
        } else if (data.session) {
          setIsLiveUser(true);
          if (typeof window !== 'undefined') {
            localStorage.setItem('ourdiary_is_live_user', 'true');
            localStorage.setItem('ourdiary_current_user_id', data.session.user.id);
          }

          // Check if this user already has an established couple space
          const { data: memberData } = await supabase
            .from('couple_members')
            .select('couple_id, role, couples(*)')
            .eq('user_id', data.session.user.id)
            .maybeSingle();

          if (memberData && memberData.couples) {
            const coupleObj = memberData.couples as any;
            loadExistingCoupleSpace(data.session.user.id, coupleObj);
            showToast(`Welcome back to ${coupleObj.name}! 💕`, 'heart');
            router.push('/dashboard');
          } else {
            showToast('Signed in! Set up your couple space to get started 💕', 'success');
            router.push('/onboarding');
          }
        }
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Authentication failed');
      setLoading(false);
    }
  };

  const handleDemoSignIn = (profileId: 'user_1' | 'user_2', name: string) => {
    setIsLiveUser(false);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('ourdiary_is_live_user');
    }
    switchProfile(profileId);
    showToast(`Signed in as ${name} (Demo Profile — Resets on refresh) 💕`, 'success');
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFF8EE] via-[#F8C8D8]/20 to-[#CBBEF4]/20 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link href="/" className="inline-flex items-center gap-2 mb-4 group">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#F8C8D8] via-[#CBBEF4] to-[#B6DDF4] flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
            <Heart className="w-6 h-6 text-rose-500 fill-rose-500 animate-pulse" />
          </div>
          <span className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-rose-500 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
            OurDiary
          </span>
        </Link>
        <h2 className="text-2xl font-extrabold text-slate-900">
          Welcome to your couple space 💕
        </h2>
        <p className="mt-2 text-xs text-slate-500">
          Private, playful, and built exclusively for exactly two partners
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-6 shadow-xl rounded-3xl border border-[#EFE4D6] sm:px-10 space-y-6">
          {/* Status Banner */}
          {!isSupabaseLive ? (
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200/60 text-amber-800 text-xs flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Local Demo Mode Active</span>
                <span>
                  Supabase keys are not configured yet in .env.local. You can test all features with the simulated profiles below!
                </span>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200/60 text-emerald-800 text-xs flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>Connected to live Supabase Auth & Row Level Security</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs space-y-1">
              <div className="flex items-center gap-2 font-bold">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
              <p className="text-[11px] text-rose-600/90 leading-relaxed pl-6">
                If you recently signed up, please check your email inbox to confirm your account first. Or tap &quot;Sign in as Alex / Maya&quot; below for instant demo access.
              </p>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Quick Demo Access Buttons */}
          <div className="space-y-2">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">
              Quick 1-Click Demo Access (No Account Required)
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleDemoSignIn('user_1', 'Alex')}
                className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-2xl bg-rose-50 hover:bg-rose-100/80 border border-rose-200 text-rose-700 text-xs font-bold transition-all shadow-xs"
              >
                <UserCheck className="w-3.5 h-3.5" />
                Sign in as Alex
              </button>
              <button
                type="button"
                onClick={() => handleDemoSignIn('user_2', 'Maya')}
                className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-2xl bg-purple-50 hover:bg-purple-100/80 border border-purple-200 text-purple-700 text-xs font-bold transition-all shadow-xs"
              >
                <UserCheck className="w-3.5 h-3.5" />
                Sign in as Maya
              </button>
            </div>
          </div>

          <div className="relative flex items-center justify-center">
            <div className="border-t border-slate-200 w-full"></div>
            <span className="bg-white px-3 text-[11px] text-slate-400 font-semibold uppercase">
              Or Use Supabase Cloud Auth
            </span>
          </div>

          {/* Sign In vs Sign Up Mode Tabs */}
          <div className="flex rounded-2xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(false);
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                !isSignUp
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setIsSignUp(true);
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                isSignUp
                  ? 'bg-white text-rose-600 shadow-xs'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Create Account (Sign Up)
            </button>
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            {isSignUp && (
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Your Name / Nickname
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. Deepanshu"
                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 text-xs focus:ring-2 focus:ring-rose-300 focus:outline-hidden"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="deepanshuis18@gmail.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 text-xs focus:ring-2 focus:ring-rose-300 focus:outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="•••••••••••• (min 6 characters)"
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 text-xs focus:ring-2 focus:ring-rose-300 focus:outline-hidden"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl shadow-md bg-gradient-to-r from-rose-500 to-purple-600 text-white text-xs font-extrabold hover:opacity-95 transition-opacity disabled:opacity-50"
            >
              {loading
                ? isSignUp
                  ? 'Creating Account...'
                  : 'Signing In...'
                : isSignUp
                ? 'Create My Account 💕'
                : isSupabaseLive
                ? 'Sign in to Live Space'
                : 'Enter Demo Space'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="text-center pt-2 border-t border-slate-100">
            <Link
              href="/onboarding"
              className="text-xs text-rose-600 hover:text-rose-700 font-semibold"
            >
              First time here? Set up couple space or join with invite code →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
