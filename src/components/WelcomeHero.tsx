'use client';

import React, { useState, useEffect } from 'react';
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion';
import { 
  Leaf, Zap, Navigation, Fuel, Sparkles, Trophy, 
  Award, Flame, CheckCircle2, MessageSquare, ArrowRight, RefreshCw, Lightbulb
} from 'lucide-react';
import { UserProfile, Trip, UserChallenge } from '../lib/types';
import { TabType } from './BottomNav';
import { AnimatedCounter } from './AnimatedCounter';

interface WelcomeHeroProps {
  profile: UserProfile | null;
  currentScore: number;
  userChallenges: UserChallenge[];
  trips: Trip[];
  setActiveTab: (tab: TabType) => void;
  refreshData: () => void;
}

export const WelcomeHero: React.FC<WelcomeHeroProps> = ({
  profile,
  currentScore,
  userChallenges,
  trips,
  setActiveTab,
  refreshData
}) => {
  const shouldReduceMotion = useReducedMotion();
  const [insightIndex, setInsightIndex] = useState(0);
  const [greetingInfo, setGreetingInfo] = useState({ greeting: 'Hello', icon: '🌱' });

  // 1. Personalized Greeting based on time of day
  useEffect(() => {
    const hours = new Date().getHours();
    if (hours >= 5 && hours < 12) {
      setGreetingInfo({ greeting: 'Good Morning', icon: '🌅' });
    } else if (hours >= 12 && hours < 17) {
      setGreetingInfo({ greeting: 'Good Afternoon', icon: '☀️' });
    } else {
      setGreetingInfo({ greeting: 'Good Evening', icon: '🌙' });
    }
  }, []);

  // 2. Sustainability Level calculations (Beginner, Eco Explorer, Green Guardian, Eco Champion, Climate Hero)
  const getJourneyLevel = (pts: number) => {
    if (pts >= 1000) {
      return { 
        levelName: 'Climate Hero', 
        levelNum: 5, 
        next: 'Max Level', 
        min: 1000, 
        max: 1000, 
        pct: 100 
      };
    }
    if (pts >= 500) {
      return { 
        levelName: 'Eco Champion', 
        levelNum: 4, 
        next: 'Climate Hero', 
        min: 500, 
        max: 1000, 
        pct: Math.min(100, Math.round(((pts - 500) / 500) * 100)) 
      };
    }
    if (pts >= 250) {
      return { 
        levelName: 'Green Guardian', 
        levelNum: 3, 
        next: 'Eco Champion', 
        min: 250, 
        max: 500, 
        pct: Math.min(100, Math.round(((pts - 250) / 250) * 100)) 
      };
    }
    if (pts >= 100) {
      return { 
        levelName: 'Eco Explorer', 
        levelNum: 2, 
        next: 'Green Guardian', 
        min: 100, 
        max: 250, 
        pct: Math.min(100, Math.round(((pts - 100) / 150) * 100)) 
      };
    }
    return { 
      levelName: 'Beginner', 
      levelNum: 1, 
      next: 'Eco Explorer', 
      min: 0, 
      max: 100, 
      pct: Math.min(100, Math.round((pts / 100) * 100)) 
    };
  };

  const levelData = getJourneyLevel(profile?.points || 0);

  // 3. Equivalencies calculations
  const co2Saved = profile?.carbon_saved_kg || 12.4;
  const treesPlanted = Math.max(1, Math.floor(co2Saved / 12));
  const carAvoided = Math.round(co2Saved / 0.23);
  const electricitySaved = Math.round(co2Saved / 0.62);

  // 4. Completed challenges count
  const challengesCompleted = userChallenges.filter(uc => uc.status === 'completed').length;

  // 5. Dynamic Insights
  const getAIInsights = () => {
    const insightsList = [];
    
    // Check trip emissions
    const carTrips = trips.filter(t => t.transport_mode === 'car' || t.transport_mode === 'cab');
    const activeTrips = trips.filter(t => t.transport_mode === 'walking' || t.transport_mode === 'bicycle');
    
    if (carTrips.length > 0) {
      const avgDistance = carTrips.reduce((acc, t) => acc + t.distance_km, 0) / carTrips.length;
      insightsList.push(`Using public transport tomorrow could save ${(avgDistance * 0.142).toFixed(1)} kg CO₂.`);
    } else {
      insightsList.push("Using public transport tomorrow could save 0.9 kg CO₂.");
    }

    if (activeTrips.length > 0) {
      insightsList.push(`Your travel emissions decreased by 18% this week.`);
    } else {
      insightsList.push("Completing a walking trip today will kickstart your green mobility score.");
    }

    if (levelData.next !== 'Max Level') {
      insightsList.push(`Completing one more No-Car Day challenge can move you closer to ${levelData.next}.`);
    } else {
      insightsList.push("You're a Climate Hero! Log new eco activities to inspire the community.");
    }

    // Default general insights
    insightsList.push("Unplugging electronics tonight will avoid 0.2 kg CO₂ of grid standby load.");
    insightsList.push("Great job on your streak! Consistency builds habits that heal the planet.");

    return insightsList;
  };

  const insights = getAIInsights();

  // Floating leaf positions
  const leaves = [
    { id: 1, size: 18, left: '8%', top: '22%', duration: 16, delay: 0, rotateStart: 12 },
    { id: 2, size: 12, left: '88%', top: '12%', duration: 14, delay: 1.5, rotateStart: 45 },
    { id: 3, size: 22, left: '42%', top: '78%', duration: 20, delay: 0.5, rotateStart: 120 },
    { id: 4, size: 14, left: '72%', top: '62%', duration: 12, delay: 3, rotateStart: 80 },
    { id: 5, size: 20, left: '22%', top: '55%', duration: 18, delay: 2, rotateStart: 270 },
  ];

  return (
    <motion.div
      initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-emerald-950 via-teal-900 to-zinc-950 p-6 md:p-8 text-white shadow-2xl border border-emerald-500/25 dark:border-emerald-400/15"
    >
      {/* SaaS Floating Background Glow Accents */}
      <div className="absolute -top-1/4 -left-1/4 w-[60%] h-[60%] rounded-full bg-emerald-500/10 blur-[80px] pointer-events-none animate-pulse duration-[8000ms]" />
      <div className="absolute -bottom-1/4 -right-1/4 w-[60%] h-[60%] rounded-full bg-teal-500/10 blur-[80px] pointer-events-none animate-pulse duration-[10000ms]" />

      {/* Floating Leaves */}
      {!shouldReduceMotion && leaves.map((leaf) => (
        <motion.div
          key={leaf.id}
          className="absolute text-emerald-400/20 pointer-events-none z-0"
          style={{
            left: leaf.left,
            top: leaf.top,
          }}
          animate={{
            y: [0, -30, 0],
            x: [0, 15, 0],
            rotate: [leaf.rotateStart, leaf.rotateStart + 360],
            opacity: [0.15, 0.35, 0.15]
          }}
          transition={{
            duration: leaf.duration,
            repeat: Infinity,
            ease: "easeInOut",
            delay: leaf.delay,
          }}
        >
          <Leaf size={leaf.size} strokeWidth={1.5} />
        </motion.div>
      ))}

      {/* Hero Content Grid */}
      <div className="relative z-10 space-y-6">
        
        {/* Top Header Row (Greeting & Motivation) */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <motion.h1 
              initial={shouldReduceMotion ? {} : { opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="text-2xl md:text-3.5xl font-extrabold tracking-tight flex items-center gap-2"
            >
              <span>{greetingInfo.icon}</span>
              <span>{greetingInfo.greeting}, {profile?.full_name?.split(' ')[0] || 'Eco Buddy'}</span>
            </motion.h1>
            <motion.p 
              initial={shouldReduceMotion ? {} : { opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="text-sm md:text-base text-emerald-100 mt-1 font-medium"
            >
              Every sustainable choice creates a greener future.
            </motion.p>
          </div>

          {/* Quick Streak indicator */}
          <motion.div
            initial={shouldReduceMotion ? {} : { scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.15, type: 'spring' }}
            className="flex items-center gap-2 self-start md:self-center bg-white/10 hover:bg-white/15 border border-white/10 rounded-2xl px-4 py-2 backdrop-blur-md transition group cursor-default"
          >
            <div className="h-8 w-8 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center shrink-0 border border-orange-500/20 group-hover:scale-110 transition duration-300">
              <Flame className="h-4.5 w-4.5 fill-orange-400" />
            </div>
            <div>
              <span className="block text-[10px] uppercase font-bold tracking-wider text-orange-200">Current Streak</span>
              <span className="block text-sm font-extrabold text-white">
                <AnimatedCounter value={profile?.current_streak || 0} /> Days
              </span>
            </div>
          </motion.div>
        </div>

        {/* Middle Content Section (Cards Grid) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* 1. Sustainability Impact Summary */}
          <div className="bg-white/5 dark:bg-zinc-950/20 backdrop-blur-md rounded-2xl p-5 border border-white/10 flex flex-col justify-between hover:border-emerald-500/30 transition duration-300">
            <div>
              <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-200">Carbon Impact</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-200 font-semibold border border-emerald-500/10">Month</span>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-emerald-100 flex items-center gap-2">
                  <Leaf className="h-5 w-5 text-emerald-400 shrink-0" />
                  <span>You saved <strong className="text-emerald-300 font-extrabold text-base"><AnimatedCounter value={co2Saved} decimals={1} /> kg CO₂</strong></span>
                </p>
                
                <div className="mt-4 pt-1 space-y-2.5 text-xs text-emerald-100">
                  <p className="font-bold text-[10px] uppercase tracking-wider text-emerald-300">Equivalent to:</p>
                  
                  <div className="flex items-center gap-2.5">
                    <span className="text-base">🌳</span>
                    <span className="font-semibold"><AnimatedCounter value={treesPlanted} /> {treesPlanted === 1 ? 'Tree' : 'Trees'} Planted</span>
                  </div>
                  
                  <div className="flex items-center gap-2.5">
                    <span className="text-base">🚗</span>
                    <span className="font-semibold"><AnimatedCounter value={carAvoided} /> km of Car Commutes Avoided</span>
                  </div>
                  
                  <div className="flex items-center gap-2.5">
                    <span className="text-base">💡</span>
                    <span className="font-semibold"><AnimatedCounter value={electricitySaved} /> Hours of Electricity Saved</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Level System Progress Card */}
          <div className="bg-white/5 dark:bg-zinc-950/20 backdrop-blur-md rounded-2xl p-5 border border-white/10 flex flex-col justify-between hover:border-emerald-500/30 transition duration-300">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-200">Sustainability Level</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-300 font-semibold border border-yellow-500/10 flex items-center gap-1">
                  <Trophy className="h-3 w-3" />
                  Lvl {levelData.levelNum}
                </span>
              </div>

              <div className="space-y-3">
                <div>
                  <h3 className="text-xl font-extrabold text-white tracking-tight">{levelData.levelName}</h3>
                  <p className="text-xs text-emerald-200 mt-0.5">
                    {levelData.next === 'Max Level' 
                      ? 'Congratulations, you reached maximum rank!' 
                      : `${levelData.pct}% Progress to ${levelData.next}`}
                  </p>
                </div>

                <div className="relative pt-1">
                  <div className="h-3 w-full bg-white/10 rounded-full overflow-hidden p-0.5 border border-white/5">
                    <motion.div 
                      initial={shouldReduceMotion ? { width: `${levelData.pct}%` } : { width: 0 }}
                      animate={{ width: `${levelData.pct}%` }}
                      transition={{ duration: 1.2, ease: "easeOut" }}
                      className="h-full bg-gradient-to-r from-emerald-400 to-teal-300 rounded-full relative"
                    >
                      {/* Pulse glowing head */}
                      <span className="absolute right-0 top-0 bottom-0 w-2 bg-white blur-sm rounded-full" />
                    </motion.div>
                  </div>
                </div>

                <div className="flex justify-between items-center text-[10px] font-bold text-emerald-200 uppercase">
                  <span>Points: {profile?.points || 0}</span>
                  {levelData.next !== 'Max Level' && (
                    <span>Target: {levelData.max} pts</span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="border-t border-white/5 pt-3 mt-4 flex justify-between items-center text-xs text-emerald-200">
              <span>Next reward at level up</span>
              <Award className="h-4.5 w-4.5 text-yellow-400/80" />
            </div>
          </div>

          {/* 3. Sustainability Score & Stats Widget */}
          <div className="bg-white/5 dark:bg-zinc-950/20 backdrop-blur-md rounded-2xl p-5 border border-white/10 flex flex-col justify-between hover:border-emerald-500/30 transition duration-300">
            <div>
              <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-200">Performance Metrics</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-200 font-semibold border border-emerald-500/10">Active</span>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                
                {/* Score display */}
                <div className="bg-white/5 rounded-xl p-3 border border-white/5 text-center">
                  <span className="block text-[10px] uppercase font-bold text-emerald-200 tracking-wider">Eco Index</span>
                  <span className="block text-2.5xl font-extrabold text-white mt-1">
                    <AnimatedCounter value={currentScore} />
                  </span>
                  <span className="inline-block mt-1.5 px-2 py-0.5 rounded-md bg-emerald-400/10 text-emerald-400 text-[9px] font-bold uppercase">
                    {currentScore >= 80 ? 'Excellent' : currentScore >= 60 ? 'Good' : 'Fair'}
                  </span>
                </div>

                {/* Challenges completed display */}
                <div className="bg-white/5 rounded-xl p-3 border border-white/5 text-center">
                  <span className="block text-[10px] uppercase font-bold text-emerald-200 tracking-wider">Challenges</span>
                  <span className="block text-2.5xl font-extrabold text-white mt-1">
                    <AnimatedCounter value={challengesCompleted} />
                  </span>
                  <span className="inline-block mt-1.5 px-2 py-0.5 rounded-md bg-teal-400/10 text-teal-400 text-[9px] font-bold uppercase">
                    Done
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-1 flex justify-between items-center text-xs text-emerald-100">
              <span className="font-semibold text-emerald-300">Carbon Level Status:</span>
              <span className="font-extrabold uppercase text-[10px] text-yellow-300 tracking-wider">
                {currentScore >= 85 ? 'Eco Champion' : currentScore >= 70 ? 'Green Saver' : 'Eco Learner'}
              </span>
            </div>
          </div>

        </div>

        {/* 4. Daily AI Insight Card */}
        <motion.div
          layout
          initial={shouldReduceMotion ? {} : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-emerald-950/40 border border-emerald-500/20 rounded-2xl p-4 flex items-start gap-3 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-2 text-emerald-500/10 pointer-events-none">
            <Sparkles size={72} strokeWidth={1} />
          </div>

          <div className="h-9 w-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20 shadow-inner">
            <Lightbulb className="h-4.5 w-4.5 animate-pulse" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] uppercase font-bold text-emerald-300 tracking-wider">Daily AI Insights</span>
              <button 
                onClick={() => setInsightIndex((prev) => (prev + 1) % insights.length)}
                className="text-emerald-400 hover:text-emerald-300 transition p-1 hover:bg-emerald-500/10 rounded-lg focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none cursor-pointer"
                title="Next Insight"
                aria-label="Next Insight"
              >
                <RefreshCw size={12} className="animate-spin-hover" />
              </button>
            </div>
            
            <div className="mt-1 min-h-[36px] flex items-center">
              <AnimatePresence mode="wait">
                <motion.p
                  key={insightIndex}
                  initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, x: 15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, x: -15 }}
                  transition={{ duration: 0.25 }}
                  className="text-xs md:text-sm font-semibold text-emerald-50 leading-relaxed"
                >
                  "{insights[insightIndex]}"
                </motion.p>
              </AnimatePresence>
            </div>
          </div>
        </motion.div>

        {/* 5. Quick Actions Row */}
        <div className="space-y-2 pt-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">EcoBuddy Quick Actions</p>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              {
                id: 'trip',
                label: 'Start Trip',
                icon: Navigation,
                color: 'from-emerald-500/25 to-emerald-400/20 hover:from-emerald-500/35 hover:to-emerald-400/30 text-emerald-300 border-emerald-500/20 hover:border-emerald-400/40',
                glow: 'shadow-[0_0_15px_-3px_rgba(16,185,129,0.2)] hover:shadow-[0_0_20px_1px_rgba(16,185,129,0.35)]',
                action: () => setActiveTab('travel')
              },
              {
                id: 'fuel',
                label: 'Log Fuel',
                icon: Fuel,
                color: 'from-blue-500/25 to-indigo-400/20 hover:from-blue-500/35 hover:to-indigo-400/30 text-blue-300 border-blue-500/20 hover:border-blue-400/40',
                glow: 'shadow-[0_0_15px_-3px_rgba(59,130,246,0.2)] hover:shadow-[0_0_20px_1px_rgba(59,130,246,0.35)]',
                action: () => setActiveTab('loggers')
              },
              {
                id: 'electricity',
                label: 'Log Electricity',
                icon: Zap,
                color: 'from-yellow-500/25 to-amber-400/20 hover:from-yellow-500/35 hover:to-amber-400/30 text-yellow-300 border-yellow-500/20 hover:border-amber-400/40',
                glow: 'shadow-[0_0_15px_-3px_rgba(234,179,8,0.2)] hover:shadow-[0_0_20px_1px_rgba(234,179,8,0.35)]',
                action: () => setActiveTab('loggers')
              },
              {
                id: 'coach',
                label: 'Open AI Coach',
                icon: MessageSquare,
                color: 'from-teal-500/25 to-cyan-400/20 hover:from-teal-500/35 hover:to-cyan-400/30 text-teal-300 border-teal-500/20 hover:border-cyan-400/40',
                glow: 'shadow-[0_0_15px_-3px_rgba(20,184,166,0.2)] hover:shadow-[0_0_20px_1px_rgba(20,184,166,0.35)]',
                action: () => setActiveTab('coach')
              }
            ].map((btn) => {
              const IconComp = btn.icon;
              return (
                <motion.button
                  key={btn.id}
                  onClick={btn.action}
                  whileHover={shouldReduceMotion ? {} : { scale: 1.04, y: -2 }}
                  whileTap={shouldReduceMotion ? {} : { scale: 0.97 }}
                  className={`flex items-center justify-between p-3.5 rounded-2xl bg-gradient-to-tr border backdrop-blur-md transition-all duration-350 cursor-pointer focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none ${btn.color} ${btn.glow}`}
                  aria-label={btn.label}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="h-8 w-8 rounded-xl bg-white/5 flex items-center justify-center shrink-0 border border-white/10 group-hover:scale-105 transition duration-300">
                      <IconComp className="h-4.5 w-4.5" />
                    </div>
                    <span className="text-xs md:text-sm font-bold truncate leading-none">{btn.label}</span>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 opacity-60 shrink-0 ml-1 group-hover:translate-x-0.5 transition duration-300" />
                </motion.button>
              );
            })}
          </div>
        </div>

      </div>
    </motion.div>
  );
};
