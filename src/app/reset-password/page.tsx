'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AlertCircle, CheckCircle2, Loader2, ArrowLeft } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [sessionActive, setSessionActive] = useState(false);

  useEffect(() => {
    // Check if we have an active session or recovery token in URL
    async function checkSession() {
      if (!isSupabaseConfigured || !supabase) return;
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setSessionActive(true);
      } else {
        // If no session but hash has access_token, Supabase client parses it automatically
        // Let's check a bit later to give Supabase client time to handle hash parameters
        setTimeout(async () => {
          const { data: { session: delayedSession } } = await supabase!.auth.getSession();
          if (delayedSession) {
            setSessionActive(true);
          } else {
            setError('Recovery session not found or link has expired. Please request a new link.');
          }
        }, 1000);
      }
    }
    checkSession();
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (!isSupabaseConfigured || !supabase) {
      setError('Supabase is not configured.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;

      setSuccess(true);
      setPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err.message || 'Failed to reset password. Please try again.');
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
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">Reset Password</h1>
          <p className="mt-2 text-sm text-zinc-400">Set a new password for your EcoBuddy AI account</p>
        </div>

        {error && (
          <div className="mb-6 flex items-start gap-2.5 rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4 text-xs font-semibold text-rose-400 shadow-sm">
            <AlertCircle className="h-4.5 w-4.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-6 flex items-start gap-2.5 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-xs font-semibold text-emerald-400 shadow-sm">
            <CheckCircle2 className="h-4.5 w-4.5 shrink-0" />
            <span>Password updated successfully! You can now sign in with your new password.</span>
          </div>
        )}

        {sessionActive && !success && (
          <form onSubmit={handleReset} className="space-y-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">New Password</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-11 px-4 text-sm bg-zinc-950 border border-zinc-800 rounded-xl focus:border-emerald-500 focus:outline-none transition-colors duration-200 text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">Confirm Password</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full h-11 px-4 text-sm bg-zinc-950 border border-zinc-800 rounded-xl focus:border-emerald-500 focus:outline-none transition-colors duration-200 text-white"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-gradient-to-r from-emerald-500 to-teal-500 text-zinc-950 text-xs font-black uppercase tracking-wider rounded-xl shadow-lg hover:shadow-emerald-500/20 transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Update Password
            </button>
          </form>
        )}

        <div className="mt-8 text-center border-t border-zinc-800 pt-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
