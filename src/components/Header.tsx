'use client';

import React from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { UserProfile } from '../lib/types';
import { LogOut, Flame, Award, Sun, Moon } from 'lucide-react';

interface HeaderProps {
  profile: UserProfile | null;
  onLogout: () => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({ profile, onLogout, isDarkMode, onToggleTheme }) => {
  const handleLogout = async () => {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    }
    // Clean up local profile session
    localStorage.removeItem('eb_profile');
    onLogout();
  };

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200/50 bg-white/70 py-4.5 px-4 backdrop-blur-md dark:border-zinc-800/50 dark:bg-zinc-950/70 transition-colors duration-200">
      <div className="mx-auto flex max-w-5xl items-center justify-between">
        
        {/* Brand Logo */}
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-500 shadow-md shadow-emerald-500/20">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="h-6 w-6 text-zinc-950">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v17.25m0 0a9 9 0 0 1-9-9c0-2.083.775-3.984 2.052-5.432m6.948 14.432a9 9 0 0 0 9-9c0-2.083-.775-3.984-2.052-5.432M12 3a9 9 0 0 0-6.948 3.568M12 3a9 9 0 0 1 6.948 3.568" />
            </svg>
          </div>
          <span className="hidden sm:inline-block font-extrabold text-xl bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent dark:from-emerald-400 dark:to-teal-400">
            EcoBuddy AI
          </span>
        </div>

        {/* User Stats & Logout */}
        <div className="flex items-center gap-3 sm:gap-4">
          
          {/* Streak Counter */}
          <div 
            className="flex items-center gap-1.5 rounded-full bg-orange-500/10 px-3 py-1.5 text-orange-600 dark:text-orange-400 border border-orange-500/10"
            aria-label={`Current streak: ${profile?.current_streak || 0} days`}
            title={`Current streak: ${profile?.current_streak || 0} days`}
          >
            <Flame className="h-4.5 w-4.5 fill-current animate-pulse" aria-hidden="true" />
            <span className="text-sm font-bold">{profile?.current_streak || 0}d</span>
          </div>

          {/* Points Counter */}
          <div 
            className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1.5 text-emerald-600 dark:text-emerald-400 border border-emerald-500/10"
            aria-label={`Total points: ${profile?.points || 0}`}
            title={`Total points: ${profile?.points || 0}`}
          >
            <Award className="h-4.5 w-4.5" aria-hidden="true" />
            <span className="text-sm font-bold">{profile?.points || 0} pts</span>
          </div>

          {/* Theme Toggle Button */}
          <button
            onClick={onToggleTheme}
            title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            aria-label={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-100 text-zinc-650 hover:text-emerald-500 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:text-emerald-400 transition focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none cursor-pointer"
          >
            {isDarkMode ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
          </button>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            title="Log Out"
            aria-label="Log Out"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-100 text-zinc-650 hover:bg-red-500/10 hover:text-red-500 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-red-500/10 dark:hover:text-red-400 transition focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none cursor-pointer"
          >
            <LogOut className="h-4.5 w-4.5" />
          </button>

        </div>

      </div>
    </header>
  );
};
