'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { UserProfile } from '../lib/types';
import { db } from '../lib/db';

interface AuthScreenProps {
  onAuthComplete: (profile: UserProfile) => void;
}

const mapAuthError = (err: unknown): string => {
  if (!err) return 'Something went wrong. Please retry.';
  
  let message = '';
  if (typeof err === 'string') {
    message = err.toLowerCase();
  } else if (err && typeof err === 'object') {
    const errorObj = err as Record<string, unknown>;
    message = (
      typeof errorObj.message === 'string' ? errorObj.message : 
      typeof errorObj.error_description === 'string' ? errorObj.error_description : 
      typeof errorObj.error === 'string' ? errorObj.error : 
      JSON.stringify(err)
    ).toLowerCase();
  } else {
    message = String(err).toLowerCase();
  }

  if (
    message.includes('invalid grant') || 
    message.includes('credentials') || 
    message.includes('invalid email') || 
    message.includes('invalid password') ||
    message.includes('password')
  ) {
    if (message.includes('short') || message.includes('at least 6 characters')) {
      return 'Password must be at least 6 characters long.';
    }
    return 'Invalid email or password';
  }
  
  if (
    message.includes('user not found') || 
    message.includes('account not found') || 
    message.includes('user_not_found')
  ) {
    return 'Account not found';
  }
  
  if (
    message.includes('email not confirmed') || 
    message.includes('confirm your email') ||
    message.includes('unverified')
  ) {
    return 'Please verify your email address before signing in.';
  }

  if (
    message.includes('network') || 
    message.includes('failed to fetch') || 
    message.includes('unable to connect') || 
    message.includes('invalid path') ||
    message.includes('request url') ||
    message.includes('typeerror') ||
    message.includes('fetch')
  ) {
    return 'Unable to connect. Please try again.';
  }

  if (
    message.includes('rate limit') || 
    message.includes('too many requests') || 
    message.includes('429')
  ) {
    return 'Too many attempts. Please try again later.';
  }

  if (
    message.includes('already registered') || 
    message.includes('email_exists') ||
    message.includes('user already exists')
  ) {
    return 'An account with this email already exists.';
  }

  return 'Something went wrong. Please retry.';
};

export const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthComplete }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      if (!isSupabaseConfigured || !supabase) {
        // Safe offline mode simulation if they submit
        const mockProfile = {
          id: 'mock-user-123',
          email: email || 'eco.buddy@example.com',
          full_name: fullName || 'Eco Explorer',
          points: 100,
          current_streak: 1,
          max_streak: 1,
          carbon_saved_kg: 0.0,
          goals: ['Use public transport', 'Reduce electricity bill by 10%'],
          created_at: new Date().toISOString()
        };
        localStorage.setItem('eb_profile', JSON.stringify(mockProfile));
        onAuthComplete(mockProfile);
        setLoading(false);
        return;
      }

      if (isForgotPassword) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setSuccessMsg('Password reset link sent to your email!');
      } else if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
            }
          }
        });
        if (error) throw error;
        if (data.user) {
          setSuccessMsg('Account created successfully! Please check your email for verification.');
          if (data.session) {
            let profile: UserProfile;
            try {
              profile = await db.getProfile();
            } catch (e) {
              profile = {
                id: data.user.id,
                email: data.user.email || email,
                full_name: fullName || data.user.user_metadata?.full_name || 'Eco Explorer',
                points: 0,
                current_streak: 0,
                max_streak: 0,
                carbon_saved_kg: 0,
                goals: [],
                created_at: data.user.created_at || new Date().toISOString()
              };
            }
            onAuthComplete(profile);
          }
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (error) throw error;
        if (data.user) {
          let profile: UserProfile;
          try {
            profile = await db.getProfile();
          } catch (e) {
            profile = {
              id: data.user.id,
              email: data.user.email || email,
              full_name: data.user.user_metadata?.full_name || 'Eco Explorer',
              points: 0,
              current_streak: 0,
              max_streak: 0,
              carbon_saved_kg: 0,
              goals: [],
              created_at: data.user.created_at || new Date().toISOString()
            };
          }
          onAuthComplete(profile);
        }
      }
    } catch (err: unknown) {
      setError(mapAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-radial from-emerald-900 via-zinc-950 to-black p-4 text-white">
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-emerald-500/20 bg-zinc-900/80 p-8 shadow-2xl backdrop-blur-xl animate-fade-in">
        
        {/* App Title */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-400 to-teal-500 shadow-lg shadow-emerald-500/35">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="h-8 w-8 text-zinc-950">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v17.25m0 0a9 9 0 0 1-9-9c0-2.083.775-3.984 2.052-5.432m6.948 14.432a9 9 0 0 0 9-9c0-2.083-.775-3.984-2.052-5.432M12 3a9 9 0 0 0-6.948 3.568M12 3a9 9 0 0 1 6.948 3.568" />
            </svg>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">EcoBuddy AI</h1>
          <p className="mt-2 text-sm text-zinc-400">Your AI-Powered Sustainability Coach</p>
        </div>

        {/* Database Status Tag */}
        <div className="mb-6 flex justify-center">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${isSupabaseConfigured ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${isSupabaseConfigured ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400 animate-pulse'}`}></span>
            {isSupabaseConfigured ? 'Connected to Cloud' : 'Developer Sandbox Mode'}
          </span>
        </div>

        <form onSubmit={handleAuth} className="space-y-5">
          {isSignUp && !isForgotPassword && (
            <div>
              <label htmlFor="fullName" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">Full Name</label>
              <input
                id="fullName"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your name"
                className="w-full rounded-xl border border-zinc-700/50 bg-zinc-800/40 px-4 py-3 text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none transition-all"
              />
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">Email Address</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full rounded-xl border border-zinc-700/50 bg-zinc-800/40 px-4 py-3 text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none transition-all"
            />
          </div>

          {!isForgotPassword && (
            <div>
              <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">Password</label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-zinc-700/50 bg-zinc-800/40 px-4 py-3 text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none transition-all"
              />
            </div>
          )}

          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                key="error-msg"
                role="alert"
                aria-live="assertive"
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="flex items-start gap-2.5 rounded-xl border border-red-500/20 bg-red-500/10 p-3.5 text-xs text-red-400 shadow-sm"
              >
                <AlertCircle className="h-4.5 w-4.5 shrink-0 text-red-400 mt-0.5" aria-hidden="true" />
                <span>{error}</span>
              </motion.div>
            )}

            {successMsg && (
              <motion.div
                key="success-msg"
                role="status"
                aria-live="polite"
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="flex items-start gap-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3.5 text-xs text-emerald-400 shadow-sm"
              >
                <CheckCircle2 className="h-4.5 w-4.5 shrink-0 text-emerald-400 mt-0.5" aria-hidden="true" />
                <span>{successMsg}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {!isForgotPassword && (
            <div className="flex justify-end text-xs">
              <button
                type="button"
                onClick={() => {
                  setIsForgotPassword(true);
                  setError('');
                  setSuccessMsg('');
                }}
                className="text-emerald-400 hover:text-emerald-300 transition focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none rounded px-1.5 py-0.5 cursor-pointer"
              >
                Forgot Password?
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 py-3.5 font-bold text-zinc-955 shadow-md shadow-emerald-500/15 hover:from-emerald-400 hover:to-teal-400 active:scale-[0.98] transition disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none cursor-pointer"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-zinc-955" />
                Processing...
              </span>
            ) : isForgotPassword ? (
              'Send Reset Link'
            ) : isSignUp ? (
              'Create Account'
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-zinc-400">
          {isForgotPassword ? (
            <button
              type="button"
              onClick={() => {
                setIsForgotPassword(false);
                setError('');
                setSuccessMsg('');
              }}
              className="text-emerald-400 hover:underline focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none rounded px-1 cursor-pointer"
            >
              Back to Sign In
            </button>
          ) : (
            <span>
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError('');
                  setSuccessMsg('');
                }}
                className="font-semibold text-emerald-400 hover:underline focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none rounded px-1 cursor-pointer"
              >
                {isSignUp ? 'Sign In' : 'Sign Up'}
              </button>
            </span>
          )}
        </div>

      </div>
    </div>
  );
};
