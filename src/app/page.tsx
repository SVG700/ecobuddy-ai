'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../lib/db';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { 
  UserProfile, Trip, FuelRecord, ElectricityRecord, 
  CarbonScore, Challenge, UserChallenge, Achievement, UserAchievement, WeeklyReport 
} from '../lib/types';

// Components
import { AuthScreen } from '../components/AuthScreen';
import { Header } from '../components/Header';
import { BottomNav, TabType } from '../components/BottomNav';
import { DashboardView } from '../components/DashboardView';
import { TravelTracker } from '../components/TravelTracker';
import { LoggersView } from '../components/LoggersView';
import { ChallengesView } from '../components/ChallengesView';
import { AICoachView } from '../components/AICoachView';
import { WeeklyReportView } from '../components/WeeklyReportView';
import { ProfileView } from '../components/ProfileView';

// UI icons
import { Leaf, Navigation, Fuel, Zap } from 'lucide-react';

export default function Home() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [speedDialOpen, setSpeedDialOpen] = useState(false);
  
  // Database states
  const [trips, setTrips] = useState<Trip[]>([]);
  const [fuelRecords, setFuelRecords] = useState<FuelRecord[]>([]);
  const [electricityRecords, setElectricityRecords] = useState<ElectricityRecord[]>([]);
  const [carbonScores, setCarbonScores] = useState<CarbonScore[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [userChallenges, setUserChallenges] = useState<UserChallenge[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([]);
  const [weeklyReports, setWeeklyReports] = useState<WeeklyReport[]>([]);

  // Theme state
  const [isDarkMode, setIsDarkMode] = useState(true); // Default to gorgeous dark mode!

  // Check auth status on mount
  useEffect(() => {
    async function checkAuth() {
      try {
        if (isSupabaseConfigured && supabase) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            const prof = await db.getProfile();
            setProfile(prof);
          } else {
            // Restore local session only if user explicitly launched sandbox/demo mode
            const localProf = localStorage.getItem('eb_profile');
            const isSandbox = localStorage.getItem('eb_sandbox_mode') === 'true';
            if (localProf && isSandbox) {
              setProfile(JSON.parse(localProf));
            } else {
              setProfile(null);
            }
          }
        } else {
          const localProf = localStorage.getItem('eb_profile');
          const isSandbox = localStorage.getItem('eb_sandbox_mode') === 'true';
          if (localProf && isSandbox) {
            setProfile(JSON.parse(localProf));
          } else {
            setProfile(null);
          }
        }
      } catch (e) {
        console.error('Auth check error:', e);
        setProfile(null);
      } finally {
        setAuthChecking(false);
      }
    }
    checkAuth();
  }, []);

  // Initialize theme
  useEffect(() => {
    const cachedTheme = localStorage.getItem('eb_theme');
    if (cachedTheme) {
      const isDark = cachedTheme === 'dark';
      setIsDarkMode(isDark);
      applyTheme(isDark);
    } else {
      applyTheme(true);
    }
  }, []);

  const applyTheme = (dark: boolean) => {
    if (dark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const toggleTheme = () => {
    const newDark = !isDarkMode;
    setIsDarkMode(newDark);
    localStorage.setItem('eb_theme', newDark ? 'dark' : 'light');
    applyTheme(newDark);
  };

  const profileRef = useRef(profile);
  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  // Fetch all user specific details
  const refreshUserData = useCallback(async () => {
    if (!profileRef.current) return;
    try {
      const [
        t, f, e, cs, ch, uc, ac, ua, wr, p
      ] = await Promise.all([
        db.getTrips(),
        db.getFuelRecords(),
        db.getElectricityRecords(),
        db.getCarbonScores(),
        db.getChallenges(),
        db.getUserChallenges(),
        db.getAchievements(),
        db.getUserAchievements(),
        db.getWeeklyReports(),
        db.getProfile()
      ]);

      setTrips(t);
      setFuelRecords(f);
      setElectricityRecords(e);
      setCarbonScores(cs);
      setChallenges(ch);
      setUserChallenges(uc);
      setAchievements(ac);
      setUserAchievements(ua);
      setWeeklyReports(wr);
      setProfile(p);
    } catch (err) {
      console.error('Error refreshing application data:', err);
    }
  }, []);

  // Trigger refresh on profile change
  const profileId = profile?.id;
  useEffect(() => {
    if (profileId) {
      refreshUserData();
    }
  }, [profileId, refreshUserData]);

  const handleAuthComplete = (newProfile: UserProfile) => {
    setProfile(newProfile);
  };

  const handleLogout = () => {
    setProfile(null);
    setActiveTab('dashboard');
  };

  // Render view based on tab
  const renderTabView = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <DashboardView
            profile={profile}
            trips={trips}
            fuelRecords={fuelRecords}
            electricityRecords={electricityRecords}
            carbonScores={carbonScores}
            userChallenges={userChallenges}
            setActiveTab={setActiveTab}
            refreshData={refreshUserData}
          />
        );
      case 'travel':
        return (
          <TravelTracker 
            trips={trips} 
            refreshData={refreshUserData} 
          />
        );
      case 'loggers':
        return (
          <LoggersView
            fuelRecords={fuelRecords}
            electricityRecords={electricityRecords}
            refreshData={refreshUserData}
          />
        );
      case 'challenges':
        return (
          <ChallengesView
            challenges={challenges}
            userChallenges={userChallenges}
            achievements={achievements}
            userAchievements={userAchievements}
            trips={trips}
            fuelRecords={fuelRecords}
            electricityRecords={electricityRecords}
            refreshData={refreshUserData}
          />
        );
      case 'coach':
        return (
          <AICoachView
            profile={profile}
            trips={trips}
            fuelRecords={fuelRecords}
            electricityRecords={electricityRecords}
          />
        );
      case 'weekly-report':
        return (
          <WeeklyReportView
            reports={weeklyReports}
            trips={trips}
            fuelRecords={fuelRecords}
            electricityRecords={electricityRecords}
            profile={profile}
            userChallenges={userChallenges}
            refreshData={refreshUserData}
          />
        );
      case 'profile':
        return (
          <ProfileView
            profile={profile}
            userChallenges={userChallenges}
            refreshData={refreshUserData}
          />
        );
      default:
        return (
          <DashboardView
            profile={profile}
            trips={trips}
            fuelRecords={fuelRecords}
            electricityRecords={electricityRecords}
            carbonScores={carbonScores}
            userChallenges={userChallenges}
            setActiveTab={setActiveTab}
            refreshData={refreshUserData}
          />
        );
    }
  };

  if (authChecking) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-955 text-white">
        <div className="flex flex-col items-center gap-3">
          <Leaf className="h-10 w-10 text-emerald-400 animate-bounce" />
          <p className="text-sm font-semibold tracking-wider text-zinc-400">Syncing session...</p>
        </div>
      </div>
    );
  }

  // Not signed in
  if (!profile) {
    return <AuthScreen onAuthComplete={handleAuthComplete} />;
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50 transition-colors duration-200 flex flex-col md:flex-row">
      
      {/* Desktop Sidebar Nav (visible only on md screens and up) */}
      <aside className="hidden md:flex flex-col w-64 border-r border-zinc-200 dark:border-zinc-900 bg-white dark:bg-zinc-955 h-screen sticky top-0 p-5">
        <div className="mb-8 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-500 shadow-md">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="h-5 w-5 text-zinc-950">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v17.25m0 0a9 9 0 0 1-9-9c0-2.083.775-3.984 2.052-5.432m6.948 14.432a9 9 0 0 0 9-9c0-2.083-.775-3.984-2.052-5.432M12 3a9 9 0 0 0-6.948 3.568M12 3a9 9 0 0 1 6.948 3.568" />
            </svg>
          </div>
          <span className="font-extrabold text-lg bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent dark:from-emerald-400 dark:to-teal-400">
            EcoBuddy AI
          </span>
        </div>

        <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
        
        {/* Desktop profile/settings click at the bottom of sidebar */}
        <div className="mt-auto border-t border-zinc-100 dark:border-zinc-900 pt-4">
          <button
            onClick={() => setActiveTab('profile')}
            className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition ${
              activeTab === 'profile' 
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold' 
                : 'text-zinc-650 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-900/60'
            }`}
          >
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0 border border-emerald-500/15">
              <Leaf className="h-4 w-4" />
            </div>
            <div>
              <span className="block text-xs font-bold text-zinc-800 dark:text-zinc-200">
                {profile.full_name}
              </span>
              <span className="block text-[10px] text-zinc-400">Goal Planner</span>
            </div>
          </button>
        </div>
      </aside>

      {/* Main layout wrapper */}
      <div className="flex-1 flex flex-col min-h-screen">
        
        {/* Header (Top Nav) */}
        <Header 
          profile={profile} 
          onLogout={handleLogout} 
          isDarkMode={isDarkMode} 
          onToggleTheme={toggleTheme} 
          onNavigate={setActiveTab}
        />

        {/* View Content Port */}
        <main className="flex-1 max-w-5xl w-full mx-auto px-3.5 pt-4 pb-28 md:px-6 md:py-8 overflow-x-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              role="tabpanel"
              id={`${activeTab}-panel`}
              aria-labelledby={`${activeTab}-tab`}
            >
              {renderTabView()}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Floating Speed Dial FAB (Mobile only) */}
        <div className="fixed bottom-20 right-4 z-40 md:hidden flex flex-col items-end gap-2.5">
          <AnimatePresence>
            {speedDialOpen && (
              <motion.div
                id="mobile-quick-action-menu"
                role="menu"
                initial={{ opacity: 0, scale: 0.85, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.85, y: 15 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="flex flex-col gap-2.5 bg-zinc-900/90 border border-emerald-500/20 p-2.5 rounded-2xl shadow-xl backdrop-blur-lg"
              >
                <button
                  role="menuitem"
                  onClick={() => {
                    setActiveTab('travel');
                    setSpeedDialOpen(false);
                  }}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold text-emerald-400 hover:bg-emerald-500/10 rounded-xl transition"
                >
                  <Navigation className="h-4.5 w-4.5" />
                  <span>Start Trip</span>
                </button>
                <button
                  role="menuitem"
                  onClick={() => {
                    setActiveTab('loggers');
                    setSpeedDialOpen(false);
                  }}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold text-blue-400 hover:bg-blue-500/10 rounded-xl transition"
                >
                  <Fuel className="h-4.5 w-4.5" />
                  <span>Log Fuel</span>
                </button>
                <button
                  role="menuitem"
                  onClick={() => {
                    setActiveTab('loggers');
                    setSpeedDialOpen(false);
                  }}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold text-yellow-400 hover:bg-yellow-500/10 rounded-xl transition"
                >
                  <Zap className="h-4.5 w-4.5" />
                  <span>Log Grid</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
          <button
            onClick={() => setSpeedDialOpen(!speedDialOpen)}
            aria-expanded={speedDialOpen}
            aria-haspopup="true"
            aria-controls="mobile-quick-action-menu"
            className="h-12 w-12 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-500 text-zinc-950 flex items-center justify-center shadow-lg shadow-emerald-500/20 hover:scale-105 active:scale-95 transition"
            title="Quick Action Menu"
          >
            <motion.span 
              animate={{ rotate: speedDialOpen ? 45 : 0 }} 
              className="text-2xl font-bold block"
            >
              +
            </motion.span>
          </button>
        </div>

        {/* Mobile Bottom Navigation (visible only on mobile) */}
        <div className="md:hidden">
          <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
        </div>
        
      </div>
    </div>
  );
}
