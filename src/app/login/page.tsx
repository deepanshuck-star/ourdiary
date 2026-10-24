'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Heart, Sparkles, Lock, Mail, ArrowRight, ShieldCheck, UserCheck, AlertCircle, CheckCircle2, User } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Field, inputClass } from '@/components/ui/Surface';
import { cn } from '@/lib/cn';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { fetchMyCouple } from '@/lib/supabase/couple';
import { friendlyAuthError } from '@/lib/friendlyError';
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
          setErrorMsg(friendlyAuthError(error, 'signup'));
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
          setErrorMsg(friendlyAuthError(error, 'login'));
          setLoading(false);
        } else if (data.session) {
          setIsLiveUser(true);
          if (typeof window !== 'undefined') {
            localStorage.setItem('ourdiary_is_live_user', 'true');
            localStorage.setItem('ourdiary_current_user_id', data.session.user.id);
          }

          // Restore the existing couple space (never route established users to onboarding)
          let existing = null;
          let lookupFailed = false;
          try {
            existing = await fetchMyCouple(supabase);
          } catch (lookupErr: any) {
            lookupFailed = true;
            console.error('[OurDiary] couple lookup failed on login:', lookupErr?.message);
          }

          if (existing) {
            loadExistingCoupleSpace(data.session.user.id, existing.couple, existing.role);
            showToast(`Welcome back to ${existing.couple.name}! 💕`, 'heart');
            router.push('/dashboard');
          } else {
            if (lookupFailed) {
              showToast("Signed in! We couldn't check for an existing space — create or join one below.", 'warn');
            } else {
              showToast('Signed in! Set up your couple space to get started 💕', 'success');
            }
            router.push('/onboarding');
          }
        }
      }
    } catch (err: any) {
      setErrorMsg(friendlyAuthError(err, 'login'));
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
    // One lit card floating in a dark room.
    <div className="min-h-screen bg-canvas bg-hero flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center px-4">
        <Link href="/" className="inline-flex items-center gap-2.5 mb-5 group">
          <span className="w-12 h-12 rounded-2xl flex items-center justify-center bg-beam shadow-cta bloom">
            <Heart className="w-6 h-6 text-on-primary fill-on-primary animate-pulse" />
          </span>
          <span className="font-display text-3xl font-normal tracking-tight text-ink">
            OurDiary
          </span>
        </Link>
        <h1 className="font-display text-3xl sm:text-4xl font-normal tracking-tight text-ink">
          Welcome to your couple space 💕
        </h1>
        <p className="mt-3 text-xs text-ink-muted">
          Private, playful, and built exclusively for exactly two partners
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="panel edge-lit rounded-2xl py-8 px-6 sm:px-10 space-y-6">
          {/* Status Banner */}
          {!isSupabaseLive ? (
            <div className="p-3.5 rounded-xl bg-canvas border border-line text-ink-muted text-xs flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block text-ink">Local Demo Mode Active</span>
                <span>
                  Supabase keys are not configured yet in .env.local. You can test all features with the simulated profiles below!
                </span>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-canvas border border-line text-ink-muted text-xs flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-accent flex-shrink-0" />
              <span>Connected to live Supabase Auth &amp; Row Level Security</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-danger/10 border border-danger/30 text-danger text-xs space-y-1.5">
              <div className="flex items-center gap-2 font-bold">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
              <p className="text-[11px] text-ink-muted leading-relaxed pl-6">
                If you recently signed up, please check your email inbox to confirm your account first. Or tap &quot;Sign in as Alex / Maya&quot; below for instant demo access.
              </p>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-xl bg-accent/10 border border-accent/30 text-ink text-xs flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Quick Demo Access Buttons */}
          <div className="space-y-2.5">
            <label className="block text-[11px] font-semibold text-ink-muted uppercase tracking-[0.14em] text-center">
              Quick 1-Click Demo Access (No Account Required)
            </label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDemoSignIn('user_1', 'Alex')}
                className="rounded-xl"
              >
                <UserCheck className="w-3.5 h-3.5" aria-hidden="true" />
                Sign in as Alex
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDemoSignIn('user_2', 'Maya')}
                className="rounded-xl"
              >
                <UserCheck className="w-3.5 h-3.5" aria-hidden="true" />
                Sign in as Maya
              </Button>
            </div>
          </div>

          <div className="relative flex items-center justify-center">
            <div className="border-t border-line w-full"></div>
            <span className="bg-surface px-3 text-[11px] text-ink-muted font-semibold uppercase tracking-[0.14em] whitespace-nowrap">
              Or Use Supabase Cloud Auth
            </span>
          </div>

          {/* Sign In vs Sign Up Mode Tabs */}
          <div className="flex rounded-full bg-canvas border border-line p-1">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(false);
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`flex-1 py-2 rounded-full text-xs font-semibold transition-all ${
                !isSignUp
                  ? 'bg-surface text-ink shadow-sm'
                  : 'text-ink-muted hover:text-ink'
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
              className={`flex-1 py-2 rounded-full text-xs font-semibold transition-all ${
                isSignUp
                  ? 'bg-surface text-primary shadow-sm'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              Create Account (Sign Up)
            </button>
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            {isSignUp && (
              <Field id="signup-display-name" label="Your Name / Nickname">
                <div className="relative">
                  <User className="w-4 h-4 text-ink-muted absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
                  <input
                    id="signup-display-name"
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. Deepanshu"
                    className={cn(inputClass, 'pl-11')}
                  />
                </div>
              </Field>
            )}

            <Field id="auth-email" label="Email Address">
              <div className="relative">
                <Mail className="w-4 h-4 text-ink-muted absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
                <input
                  id="auth-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="deepanshuis18@gmail.com"
                  className={cn(inputClass, 'pl-11')}
                />
              </div>
            </Field>

            <Field id="auth-password" label="Password">
              <div className="relative">
                <Lock className="w-4 h-4 text-ink-muted absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
                <input
                  id="auth-password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="•••••••••••• (min 6 characters)"
                  className={cn(inputClass, 'pl-11')}
                />
              </div>
            </Field>

            {/* The only glowing object on the screen. */}
            <Button type="submit" variant="primary" size="lg" block loading={loading} className="text-xs">
              {loading
                ? isSignUp
                  ? 'Creating Account...'
                  : 'Signing In...'
                : isSignUp
                ? 'Create My Account 💕'
                : isSupabaseLive
                ? 'Sign in to Live Space'
                : 'Enter Demo Space'}
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Button>
          </form>

          <div className="text-center pt-4 border-t border-line">
            <Link
              href="/onboarding"
              className="text-xs text-primary hover:text-primary-hover font-semibold"
            >
              First time here? Set up couple space or join with invite code →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
