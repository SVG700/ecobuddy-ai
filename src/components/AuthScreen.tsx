'use client';

import React, { useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

interface AuthScreenProps {
  onAuthComplete: (profile: any) => void;
}

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
          // Auto login offline if email verification is bypassed or not strictly enforced
          if (data.session) {
            onAuthComplete(data.user);
          }
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (error) throw error;
        if (data.user) {
          onAuthComplete(data.user);
        }
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoMode = () => {
    // Standard mock profile
    const defaultProfile = {
      id: 'mock-user-123',
      email: 'eco.buddy@example.com',
      full_name: 'Alex Green',
      points: 320,
      current_streak: 5,
      max_streak: 12,
      carbon_saved_kg: 45.2,
      goals: ['Use public transport 3x a week', 'Unplug chargers at night', 'Walk to nearby stores'],
      created_at: new Date().toISOString()
    };
    if (!localStorage.getItem('eb_profile')) {
      localStorage.setItem('eb_profile', JSON.stringify(defaultProfile));
    }
    onAuthComplete(getLocalProfile() || defaultProfile);
  };

  const getLocalProfile = () => {
    try {
      const p = localStorage.getItem('eb_profile');
      return p ? JSON.parse(p) : null;
    } catch {
      return null;
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

          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3.5 text-xs text-red-400">
              {error}
            </div>
          )}

          {successMsg && (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3.5 text-xs text-emerald-400">
              {successMsg}
            </div>
          )}

          {!isForgotPassword && (
            <div className="flex justify-end text-xs">
              <button
                type="button"
                onClick={() => {
                  setIsForgotPassword(true);
                  setError('');
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
            className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 py-3.5 font-bold text-zinc-950 shadow-md shadow-emerald-500/15 hover:from-emerald-400 hover:to-teal-400 active:scale-98 transition disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none cursor-pointer"
          >
            {loading ? 'Processing...' : isForgotPassword ? 'Send Reset Link' : isSignUp ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span className="h-px w-1/3 bg-zinc-800"></span>
            <span>OR</span>
            <span className="h-px w-1/3 bg-zinc-800"></span>
          </div>

          {/* Quick Sandbox Demo Login */}
          <button
            type="button"
            onClick={handleDemoMode}
            className="w-full rounded-xl border border-emerald-500/20 bg-emerald-500/5 py-3 text-sm font-semibold text-emerald-400 hover:bg-emerald-500/10 active:scale-98 transition focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none cursor-pointer"
          >
            🚀 Launch Instant Demo Mode (No Setup)
          </button>

          <div className="text-center text-sm text-zinc-400">
            {isForgotPassword ? (
              <button
                type="button"
                onClick={() => {
                  setIsForgotPassword(false);
                  setError('');
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
    </div>
  );
};
