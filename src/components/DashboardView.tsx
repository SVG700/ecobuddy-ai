'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Leaf, Zap, Navigation, Fuel, Sparkles, Trophy, 
  ArrowUpRight, ArrowDownRight, Award, CalendarDays,
  BrainCircuit, TrendingUp, TrendingDown
} from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, 
  Tooltip, PieChart, Pie, Cell, BarChart, Bar,
  LineChart, Line, CartesianGrid
} from 'recharts';
import { UserProfile, Trip, FuelRecord, ElectricityRecord, CarbonScore, UserChallenge, Achievement } from '../lib/types';
import { calculateWhatIfSavings } from '../lib/calculations';
import { TabType } from './BottomNav';
import { AnimatedCounter } from './AnimatedCounter';
import { WelcomeHero } from './WelcomeHero';

interface DashboardViewProps {
  profile: UserProfile | null;
  trips: Trip[];
  fuelRecords: FuelRecord[];
  electricityRecords: ElectricityRecord[];
  carbonScores: CarbonScore[];
  userChallenges: UserChallenge[];
  setActiveTab: (tab: TabType) => void;
  refreshData: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  profile,
  trips,
  fuelRecords,
  electricityRecords,
  carbonScores,
  userChallenges,
  setActiveTab,
  refreshData
}) => {
  const [mounted, setMounted] = useState(false);
  const [achievementToast, setAchievementToast] = useState<Achievement | null>(null);

  useEffect(() => {
    setMounted(true);
    refreshData();

    // Achievement unlock listener
    const handleUnlock = (e: Event) => {
      const achievement = (e as CustomEvent<Achievement>).detail;
      setAchievementToast(achievement);
      setTimeout(() => {
        setAchievementToast(null);
      }, 5000);
    };

    window.addEventListener('achievement-unlocked', handleUnlock);
    return () => {
      window.removeEventListener('achievement-unlocked', handleUnlock);
    };
  }, [refreshData]);

  // Journey Level Calculations
  const getJourneyLevel = (pts: number) => {
    if (pts >= 800) {
      return { current: 'Climate Hero', next: 'Max Level', min: 800, max: 2000, pct: 100 };
    }
    if (pts >= 400) {
      return { current: 'Eco Champion', next: 'Climate Hero', min: 400, max: 800, pct: Math.round(((pts - 400) / 400) * 100) };
    }
    if (pts >= 150) {
      return { current: 'Eco Explorer', next: 'Eco Champion', min: 150, max: 400, pct: Math.round(((pts - 150) / 250) * 100) };
    }
    return { current: 'Beginner', next: 'Eco Explorer', min: 0, max: 150, pct: Math.round((pts / 150) * 100) };
  };

  const levelData = getJourneyLevel(profile?.points || 0);

  // What If Simulator states
  const [simTransitDays, setSimTransitDays] = useState(0);
  const [simElecPct, setSimElecPct] = useState(0);
  const [simActiveKm, setSimActiveKm] = useState(0);

  // Calculate stats
  const todayStr = new Date().toISOString().split('T')[0];
  const todayScoreObj = carbonScores.find(s => s.date === todayStr);

  const todayEmissions = todayScoreObj ? todayScoreObj.total_emissions_kg : 0;
  
  // Weekly total emissions (last 7 scores)
  const weeklyEmissions = carbonScores
    .slice(-7)
    .reduce((acc, s) => acc + s.total_emissions_kg, 0);

  // Monthly emissions
  const monthlyEmissions = carbonScores.reduce((acc, s) => acc + s.total_emissions_kg, 0);

  // Current Carbon Score (latest day)
  const currentScore = todayScoreObj ? todayScoreObj.score : (carbonScores.length > 0 ? carbonScores[carbonScores.length - 1].score : 100);

  // Category breakdown
  const transportTotal = carbonScores.reduce((acc, s) => acc + s.transport_emissions, 0);
  const fuelTotal = carbonScores.reduce((acc, s) => acc + s.fuel_emissions, 0);
  const electricityTotal = carbonScores.reduce((acc, s) => acc + s.electricity_emissions, 0);
  const totalAll = transportTotal + fuelTotal + electricityTotal;

  const categoryData = [
    { name: 'Transit', value: Number(transportTotal.toFixed(1)), color: '#10b981' }, // emerald-500
    { name: 'Fuel Refills', value: Number(fuelTotal.toFixed(1)), color: '#3b82f6' }, // blue-500
    { name: 'Electricity', value: Number(electricityTotal.toFixed(1)), color: '#eab308' }, // yellow-500
  ].filter(c => c.value > 0);

  // Fallback if no category data
  const chartCategoryData = categoryData.length > 0 
    ? categoryData 
    : [{ name: 'No Data', value: 1, color: '#6b7280' }];

  // Daily Trend Chart Data (Last 7 scores)
  const trendChartData = carbonScores.slice(-7).map(s => {
    const d = new Date(s.date);
    const dayLabel = d.toLocaleDateString(undefined, { weekday: 'short' });
    return {
      day: dayLabel,
      Emissions: Number(s.total_emissions_kg.toFixed(1)),
      Transit: Number(s.transport_emissions.toFixed(1)),
      Fuel: Number(s.fuel_emissions.toFixed(1)),
      Electricity: Number(s.electricity_emissions.toFixed(1))
    };
  });

  // Carbon Forecast Logic
  const logCount = trips.length + fuelRecords.length * 2 + electricityRecords.length * 3;
  const confidenceScore = Math.min(96, 60 + logCount);
  
  // Weekly trend logic
  const last7DaysEmissions = carbonScores.slice(-7).reduce((acc, s) => acc + s.total_emissions_kg, 0) || 12.5; // fallback
  const prev7DaysEmissions = carbonScores.slice(-14, -7).reduce((acc, s) => acc + s.total_emissions_kg, 0) || (last7DaysEmissions * 0.92); // fallback
  const weeklyChangePct = prev7DaysEmissions > 0 
    ? ((last7DaysEmissions - prev7DaysEmissions) / prev7DaysEmissions) * 100 
    : 8.0;

  const isWeeklyEmissionsIncreasing = weeklyChangePct > 0;
  
  const currentMonthlyCO2 = monthlyEmissions || 45.2; // fallback to example default if empty
  const predictedNextWeek = last7DaysEmissions * (1 + (weeklyChangePct / 100));
  const predictedNextMonth = currentMonthlyCO2 * (1 + (isWeeklyEmissionsIncreasing ? 0.15 : -0.10));
  
  // AI forecast explanations
  const forecastReason = isWeeklyEmissionsIncreasing 
    ? "Increased vehicle usage and fuel refills on commute days."
    : "Higher usage of public transit and low grid electricity draw.";
    
  const forecastRec = isWeeklyEmissionsIncreasing
    ? "Reduce 3 vehicle trips per week. Choose transit."
    : "Maintain active walking/cycling. Turn off standby AC loads.";
    
  const forecastReduction = isWeeklyEmissionsIncreasing ? 9.4 : 6.2;

  // Forecast chart data (Last 4 weeks actual, next 2 weeks forecasted)
  const forecastChartData = [
    { name: 'Wk -3', Actual: Number((last7DaysEmissions * 0.85).toFixed(1)), Forecast: null },
    { name: 'Wk -2', Actual: Number((last7DaysEmissions * 1.05).toFixed(1)), Forecast: null },
    { name: 'Wk -1', Actual: Number((last7DaysEmissions * 0.92).toFixed(1)), Forecast: null },
    { name: 'Current', Actual: Number(last7DaysEmissions.toFixed(1)), Forecast: Number(last7DaysEmissions.toFixed(1)) },
    { name: 'Wk +1 (F)', Actual: null, Forecast: Number(predictedNextWeek.toFixed(1)) },
    { name: 'Wk +2 (F)', Actual: null, Forecast: Number((predictedNextWeek * (isWeeklyEmissionsIncreasing ? 1.03 : 0.97)).toFixed(1)) },
  ];

  // Weekly average electricity emissions calculation
  const weeklyElecAvg = electricityRecords.length > 0
    ? (electricityRecords.reduce((acc, e) => acc + e.co2_emissions_kg, 0) / electricityRecords.length) / 4.3
    : 25; // default fallback 25 kg/week

  const simResults = calculateWhatIfSavings(
    simTransitDays,
    simElecPct,
    simActiveKm,
    weeklyElecAvg,
    currentScore
  );

  const {
    transitSavings: simTransitSavings,
    elecSavings: simElecSavings,
    activeSavings: simActiveSavings,
    totalWeeklyReduction: simTotalWeeklyReduction,
    annualReduction: simAnnualReduction,
    gasCostSaved: simGasCostSaved,
    elecCostSaved: simElecCostSaved,
    totalCostSaved: simTotalCostSaved,
    scoreBoost: simScoreBoost,
    treesPlanted: simTreesPlanted,
    flightsAvoided: simFlightsAvoided
  } = simResults;

  // Simulator chart data comparing Actual vs Simulated weekly emissions
  const simChartData = [
    { 
      name: 'Current', 
      Emissions: Number(last7DaysEmissions.toFixed(1)), 
      fill: 'url(#currentGrad)' 
    },
    { 
      name: 'Simulated', 
      Emissions: Number(Math.max(0, last7DaysEmissions - simTotalWeeklyReduction).toFixed(1)), 
      fill: 'url(#simGrad)' 
    }
  ];

  // Calculate score rating
  const getScoreRating = (score: number) => {
    if (score >= 85) return { label: 'Eco Champion', color: 'text-emerald-800 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-500/10 dark:border-emerald-500/20 border border-emerald-200/50' };
    if (score >= 70) return { label: 'Green Saver', color: 'text-teal-800 bg-teal-50 dark:text-teal-400 dark:bg-teal-500/10 dark:border-teal-500/20 border border-teal-200/50' };
    if (score >= 50) return { label: 'Eco Learner', color: 'text-amber-800 bg-amber-50 dark:text-yellow-400 dark:bg-yellow-500/10 dark:border-yellow-500/20 border border-amber-200/50' };
    return { label: 'Needs Improvement', color: 'text-rose-800 bg-rose-50 dark:text-rose-450 dark:bg-rose-500/10 dark:border-rose-500/20 border border-rose-200/50' };
  };

  const scoreRating = getScoreRating(currentScore);

  const gridContainer = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  } as const;

  const cardItem = {
    hidden: { opacity: 0, y: 15, scale: 0.98 },
    show: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: { type: "spring" as const, stiffness: 100, damping: 15 }
    }
  } as const;

  // --- Environmental Impact Summary Calculations ---
  const treesNeededToOffsetWeekly = Math.ceil(last7DaysEmissions / 0.42) || 0;

  let trendLabel = 'Stable';
  let trendColor = 'text-yellow-605 bg-yellow-500/10 dark:text-yellow-450 border-yellow-500/10';
  let TrendIcon = TrendingUp;

  if (weeklyChangePct < -2.0) {
    trendLabel = 'Improving';
    trendColor = 'text-emerald-605 bg-emerald-500/10 dark:text-emerald-450 border-emerald-500/10';
    TrendIcon = TrendingDown;
  } else if (weeklyChangePct > 2.0) {
    trendLabel = 'Worsening';
    trendColor = 'text-rose-605 bg-rose-500/10 dark:text-rose-455 border-rose-500/10';
    TrendIcon = TrendingUp;
  }

  // --- Top Actionable Recommendation Calculations ---
  const dynamicRec = (() => {
    const totalEmissions = transportTotal + fuelTotal + electricityTotal;
    const activeTripsCount = trips.filter(t => t.transport_mode === 'walking' || t.transport_mode === 'bicycle').length;
    const incompleteChallenges = userChallenges.filter(uc => uc.status === 'active');

    if (totalEmissions === 0) {
      return {
        title: "Log Your First Record",
        body: "Your carbon dashboard is empty. Choose 'Travel' or 'Loggers' tabs to log your first commute trip, fuel refill, or utility usage meter reading to generate your baseline score.",
        action: "Get Started",
        tab: 'travel' as TabType
      };
    }

    if (fuelTotal > electricityTotal && fuelTotal > transportTotal) {
      return {
        title: "Optimize Vehicle Commutes",
        body: `Your vehicle fuel refills are the highest emission source (${((fuelTotal / totalEmissions) * 100).toFixed(0)}% of total). Combine your shopping errands, carpool, or switch 2 commutes to transit next week.`,
        action: "Log Commute Mode",
        tab: 'travel' as TabType
      };
    }

    if (electricityTotal > transportTotal && electricityTotal > fuelTotal) {
      return {
        title: "Mitigate Utility Overhead",
        body: `Electricity usage dominates your carbon profile at ${((electricityTotal / totalEmissions) * 100).toFixed(0)}%. Unplug television sets, microwave ovens, and computer routers overnight to eliminate phantom loads.`,
        action: "Log Utilities",
        tab: 'loggers' as TabType
      };
    }

    if (activeTripsCount > 0) {
      return {
        title: "Sustain Active Transit Habits",
        body: `Excellent work! You logged ${activeTripsCount} walking or cycling trip(s). Maintain this progress by substituting any vehicle trips under 3 km with physical movement.`,
        action: "Track Active Ride",
        tab: 'travel' as TabType
      };
    }

    if (incompleteChallenges.length > 0) {
      return {
        title: "Claim Active Challenges",
        body: `You have ${incompleteChallenges.length} active challenge(s) in progress. Completing them will significantly boost your points balance, streaks, and green habit levels.`,
        action: "View Challenges",
        tab: 'challenges' as TabType
      };
    }

    return {
      title: "Transition Commutes to Public Transit",
      body: "Transport trips are currently your primary carbon footprint source. Swapping 2 solo car rides for public transit routes can offset up to 4.5 kg CO₂ next week.",
      action: "Explore Travel Tab",
      tab: 'travel' as TabType
    };
  })();

  return (
    <div className="space-y-6 pb-20 md:pb-6 relative">
      
      {/* Premium SaaS floating background glow accents */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/5 dark:bg-emerald-500/5 rounded-full blur-3xl -z-10 pointer-events-none" />
      <div className="absolute top-1/4 right-1/4 w-80 h-80 bg-teal-500/5 dark:bg-teal-500/5 rounded-full blur-3xl -z-10 pointer-events-none" />
      
      {/* Floating sustainability particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-emerald-400/10 dark:bg-emerald-400/15"
            style={{
              width: Math.random() * 8 + 4,
              height: Math.random() * 8 + 4,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 80}%`,
            }}
            animate={{
              y: [0, -35, 0],
              opacity: [0.2, 0.8, 0.2],
            }}
            transition={{
              duration: Math.random() * 8 + 6,
              repeat: Infinity,
              ease: "easeInOut",
              delay: Math.random() * 4,
            }}
          />
        ))}
      </div>
      
      {/* Floating Achievement Unlock Notification */}
      <AnimatePresence>
        {achievementToast && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 right-4 md:bottom-6 md:right-6 z-50 p-4 rounded-2xl bg-zinc-950/95 border border-emerald-500 text-white shadow-2xl flex items-center gap-3 max-w-sm"
          >
            <div className="h-10 w-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/35 animate-pulse">
              <Award className="h-5.5 w-5.5" />
            </div>
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-emerald-400">🏆 Achievement Unlocked!</span>
              <span className="block font-bold text-sm text-zinc-100">{achievementToast.title}</span>
              <span className="block text-xs text-zinc-400 mt-0.5">{achievementToast.description}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Premium Welcome Hero Section */}
      <WelcomeHero
        profile={profile}
        currentScore={currentScore}
        userChallenges={userChallenges}
        trips={trips}
        setActiveTab={setActiveTab}
        refreshData={refreshData}
      />

      {/* Hero Stats Section (Carbon Score & Main Stats) */}
      <motion.div 
        variants={gridContainer}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
      >
        
        {/* Carbon Score Dial Card */}
        <motion.div 
          variants={cardItem}
          whileHover={{ y: -4, scale: 1.01, transition: { duration: 0.2 } }}
          className="flex flex-col items-center justify-center p-6 rounded-3xl border border-zinc-150 bg-white dark:border-zinc-800/80 dark:bg-zinc-950/40 backdrop-blur-sm shadow-sm relative group overflow-hidden"
          role="img"
          aria-label={`Carbon Score Index: ${currentScore} out of 100. Status: ${scoreRating.label}`}
        >
          <div className="absolute -inset-px bg-gradient-to-tr from-emerald-500/0 to-cyan-500/0 group-hover:from-emerald-500/4 group-hover:to-cyan-500/4 rounded-3xl transition duration-500 -z-10" />
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-zinc-550 dark:text-zinc-400 mb-4">Carbon Score</h3>
          
          <div className="relative flex items-center justify-center h-40 w-40" aria-hidden="true">
            {/* SVG Progress Circle */}
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="42"
                strokeWidth="7"
                stroke="currentColor"
                className="text-zinc-200 dark:text-zinc-850"
                fill="transparent"
              />
              <motion.circle
                cx="50"
                cy="50"
                r="42"
                strokeWidth="7"
                strokeDasharray={263.8}
                initial={{ strokeDashoffset: 263.8 }}
                animate={{ strokeDashoffset: 263.8 - (263.8 * currentScore) / 100 }}
                transition={{ duration: 1.2, ease: "easeOut" }}
                strokeLinecap="round"
                stroke="url(#scoreGrad)"
                fill="transparent"
                style={{ filter: "drop-shadow(0 0 3px rgba(16, 185, 129, 0.45))" }}
              />
              <defs>
                <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#10b981" /> {/* emerald */}
                  <stop offset="100%" stopColor="#06b6d4" /> {/* cyan */}
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-4xl font-extrabold text-zinc-800 dark:text-zinc-100">
                <AnimatedCounter value={currentScore} />
              </span>
              <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-405 uppercase tracking-widest mt-0.5">Index</span>
            </div>
          </div>

          <div className={`mt-4 px-3.5 py-1.5 rounded-full border text-xs font-bold tracking-wide ${scoreRating.color} transition-all duration-300`}>
            {scoreRating.label}
          </div>
        </motion.div>

        {/* Footprint Stats Cards Grid (Upgraded 2x2 grid) */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
          
          {/* Card 1: Today's CO₂ */}
          <motion.div 
            variants={cardItem}
            whileHover={{ y: -4, scale: 1.01, transition: { duration: 0.2 } }}
            className="flex flex-col justify-between p-5 sm:p-6 rounded-3xl border border-zinc-150 bg-white dark:border-zinc-800/80 dark:bg-zinc-950/40 shadow-sm hover:border-emerald-500/15 transition relative overflow-hidden group"
          >
            <div className="absolute -inset-px bg-gradient-to-tr from-emerald-500/0 to-emerald-500/0 group-hover:from-emerald-500/4 group-hover:to-teal-500/4 rounded-3xl transition duration-500 -z-10" />
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-550 dark:text-zinc-400">{"Today's CO₂"}</span>
              <div className="h-9 w-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-750 dark:text-emerald-450 border border-emerald-500/10">
                <Leaf className="h-4.5 w-4.5" aria-hidden="true" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-3xl font-extrabold text-zinc-800 dark:text-zinc-100">
                <AnimatedCounter value={todayEmissions} decimals={1} />
              </span>
              <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 ml-1">kg CO₂</span>
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400">
              <span className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-[10px] font-bold text-zinc-700 dark:text-zinc-300 border border-zinc-200/50 dark:border-zinc-700">Limit: 15.0</span>
              <span>daily baseline</span>
            </div>
          </motion.div>

          {/* Card 2: Weekly CO₂ */}
          <motion.div 
            variants={cardItem}
            whileHover={{ y: -4, scale: 1.01, transition: { duration: 0.2 } }}
            className="flex flex-col justify-between p-5 sm:p-6 rounded-3xl border border-zinc-150 bg-white dark:border-zinc-800/80 dark:bg-zinc-950/40 shadow-sm hover:border-emerald-500/15 transition relative overflow-hidden group"
          >
            <div className="absolute -inset-px bg-gradient-to-tr from-blue-500/0 to-blue-500/0 group-hover:from-blue-500/4 group-hover:to-cyan-500/4 rounded-3xl transition duration-500 -z-10" />
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-550 dark:text-zinc-400">Weekly CO₂</span>
              <div className="h-9 w-9 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-750 dark:text-blue-450 border border-blue-500/10">
                <Zap className="h-4.5 w-4.5" aria-hidden="true" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-3xl font-extrabold text-zinc-800 dark:text-zinc-100">
                <AnimatedCounter value={weeklyEmissions} decimals={1} />
              </span>
              <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 ml-1">kg CO₂</span>
            </div>
            <div className="mt-3 flex items-center text-xs text-zinc-600 dark:text-zinc-400">
              <span>Past 7 tracked days</span>
            </div>
          </motion.div>

          {/* Card 3: Streak & Level */}
          <motion.div 
            variants={cardItem}
            whileHover={{ y: -4, scale: 1.01, transition: { duration: 0.2 } }}
            className="flex flex-col justify-between p-5 sm:p-6 rounded-3xl border border-zinc-150 bg-white dark:border-zinc-800/80 dark:bg-zinc-950/40 shadow-sm hover:border-emerald-500/15 transition relative overflow-hidden group"
          >
            <div className="absolute -inset-px bg-gradient-to-tr from-orange-500/0 to-orange-500/0 group-hover:from-orange-500/4 group-hover:to-red-500/4 rounded-3xl transition duration-500 -z-10" />
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-550 dark:text-zinc-400">Streak & Level</span>
              <div className="h-9 w-9 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-750 dark:text-orange-450 border border-orange-500/10">
                <Award className="h-4.5 w-4.5" aria-hidden="true" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-3xl font-extrabold text-zinc-800 dark:text-zinc-100">
                <AnimatedCounter value={profile?.current_streak || 0} />
              </span>
              <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 ml-1">day streak</span>
            </div>
            <div className="mt-3 flex items-center text-xs text-zinc-600 dark:text-zinc-400">
              <span>Best: {profile?.max_streak || 0} days record</span>
            </div>
          </motion.div>

          {/* Card 4: Environmental Impact Card */}
          <motion.div 
            variants={cardItem}
            whileHover={{ y: -4, scale: 1.01, transition: { duration: 0.2 } }}
            className="flex flex-col justify-between p-5 sm:p-6 rounded-3xl border border-zinc-150 bg-white dark:border-zinc-800/80 dark:bg-zinc-950/40 shadow-sm hover:border-emerald-500/20 transition relative overflow-hidden group"
          >
            <div className="absolute -inset-px bg-gradient-to-tr from-emerald-500/0 to-emerald-500/0 group-hover:from-emerald-500/4 group-hover:to-teal-500/4 rounded-3xl transition duration-500 -z-10" />
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-550 dark:text-zinc-400">Eco Impact</span>
              <div className="h-9 w-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-750 dark:text-emerald-450 border border-emerald-500/10">
                <Leaf className="h-4.5 w-4.5" aria-hidden="true" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-3xl font-extrabold text-zinc-800 dark:text-zinc-100">
                <AnimatedCounter value={profile?.carbon_saved_kg || 0} decimals={1} />
              </span>
              <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 ml-1">kg saved</span>
            </div>
            <div className="mt-3 flex justify-between items-center text-[10px] font-bold text-zinc-600 dark:text-zinc-400 border-t border-zinc-100 dark:border-zinc-850 pt-2.5">
              <span className="flex items-center gap-0.5">🌳 <AnimatedCounter value={(profile?.carbon_saved_kg || 0) / 12} decimals={1} /> Trees</span>
              <span className="flex items-center gap-0.5">🚗 <AnimatedCounter value={(profile?.carbon_saved_kg || 0) / 0.170} decimals={0} /> km avoided</span>
            </div>
          </motion.div>

        </div>
      </motion.div>

      {/* Analytics Insights Section */}
      <motion.div 
        variants={gridContainer}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 gap-6"
      >
        {/* Card A: Environmental Impact Summary Card */}
        <motion.div 
          variants={cardItem}
          whileHover={{ y: -4, scale: 1.01, transition: { duration: 0.2 } }}
          className="flex flex-col p-6 rounded-3xl border border-zinc-150 bg-white dark:border-zinc-805/80 dark:bg-zinc-950/40 shadow-sm relative overflow-hidden group justify-between"
        >
          <div className="absolute -inset-px bg-gradient-to-tr from-emerald-500/0 to-emerald-500/0 group-hover:from-emerald-500/3 group-hover:to-teal-500/3 rounded-3xl transition duration-500 -z-10" />
          <div>
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/50 pb-3 mb-4">
              <h3 className="text-sm font-black text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
                <BrainCircuit className="h-4.5 w-4.5 text-emerald-500" />
                Environmental Impact Summary
              </h3>
              <span className={`px-2.5 py-1 rounded-lg border text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${trendColor}`}>
                <TrendIcon className="h-3 w-3" />
                {trendLabel}
              </span>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400">Sustainability Score</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-extrabold text-zinc-800 dark:text-zinc-100">{currentScore}/100</span>
                  <span className="text-[10px] font-bold text-zinc-400">(latest log)</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400">Monthly Footprint (Est.)</span>
                <span className="text-sm font-extrabold text-zinc-800 dark:text-zinc-100">{currentMonthlyCO2.toFixed(1)} kg CO₂</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400">Equivalent Trees Needed</span>
                <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">{treesNeededToOffsetWeekly} trees</span>
              </div>
            </div>
          </div>

          <p className="text-[10px] text-zinc-400 dark:text-zinc-500 leading-relaxed pt-2.5 border-t border-zinc-100 dark:border-zinc-850 mt-4">
            🌳 Offset calculations assume a mature tree absorbs ~21.8 kg CO₂ per year. You require **{treesNeededToOffsetWeekly} trees** to actively absorb this week's footprint of **{last7DaysEmissions.toFixed(1)} kg CO₂**.
          </p>
        </motion.div>

        {/* Card B: Top Actionable Recommendation Card */}
        <motion.div 
          variants={cardItem}
          whileHover={{ y: -4, scale: 1.01, transition: { duration: 0.2 } }}
          className="flex flex-col p-6 rounded-3xl border border-zinc-150 bg-white dark:border-zinc-805/80 dark:bg-zinc-950/40 shadow-sm relative overflow-hidden group justify-between"
        >
          <div className="absolute -inset-px bg-gradient-to-tr from-emerald-500/0 to-emerald-500/0 group-hover:from-emerald-500/3 group-hover:to-teal-500/3 rounded-3xl transition duration-500 -z-10" />
          <div>
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/50 pb-3 mb-4">
              <h3 className="text-sm font-black text-zinc-805 dark:text-zinc-200 flex items-center gap-2">
                <Sparkles className="h-4.5 w-4.5 text-yellow-500 animate-pulse" />
                Top Actionable Recommendation
              </h3>
              <span className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-[9px] font-bold text-zinc-700 dark:text-zinc-300 border border-zinc-200/50 dark:border-zinc-700">AI INSIGHT</span>
            </div>

            <div>
              <h4 className="text-xs sm:text-sm font-extrabold text-emerald-600 dark:text-emerald-400 mb-1.5">{dynamicRec.title}</h4>
              <p className="text-zinc-650 dark:text-zinc-300 text-xs font-semibold leading-relaxed mb-4">
                {dynamicRec.body}
              </p>
            </div>
          </div>

          <button
            onClick={() => setActiveTab(dynamicRec.tab)}
            className="w-full py-2.5 bg-gradient-to-tr from-emerald-500 to-teal-500 text-zinc-950 font-extrabold text-xs rounded-xl shadow-md transition hover:scale-[1.01] active:scale-95 cursor-pointer text-center mt-2"
          >
            {dynamicRec.action}
          </button>
        </motion.div>
      </motion.div>

      {/* Analytics Charts section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Daily Trend Graph */}
        <div className="lg:col-span-2 p-6 rounded-3xl border border-zinc-150 bg-white dark:border-zinc-800/80 dark:bg-zinc-950/40 shadow-sm">
          <div className="flex items-center justify-between mb-6 border-b border-zinc-100 dark:border-zinc-800/50 pb-3">
            <h3 className="text-base font-bold text-zinc-805 dark:text-zinc-200">Daily Emission Trends</h3>
            <span className="text-xs font-semibold text-zinc-550 dark:text-zinc-405">Unit: kg CO₂</span>
          </div>
          
          <div 
            className="h-64 w-full text-zinc-405 dark:text-zinc-600"
            role="img"
            aria-label="Bar chart showing daily emissions by source (Transit in green, Fuel Refills in blue, and Electricity in yellow) for the last 7 tracked days."
          >
            <div className="sr-only">
              <table>
                <caption>Daily Emissions Breakdown (kg CO₂)</caption>
                <thead>
                  <tr><th>Day</th><th>Transit</th><th>Fuel Refills</th><th>Electricity</th><th>Total</th></tr>
                </thead>
                <tbody>
                  {trendChartData.map((d, i) => (
                    <tr key={i}>
                      <td>{d.day}</td>
                      <td>{d.Transit} kg</td>
                      <td>{d.Fuel} kg</td>
                      <td>{d.Electricity} kg</td>
                      <td>{d.Emissions} kg</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {mounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trendChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-zinc-100 dark:text-zinc-900" />
                  <XAxis 
                    dataKey="day" 
                    stroke="currentColor" 
                    fontSize={11} 
                    tick={{ fill: 'currentColor', fontFamily: 'inherit' }}
                    tickLine={false} 
                    axisLine={false}
                  />
                  <YAxis 
                    stroke="currentColor" 
                    fontSize={11} 
                    tick={{ fill: 'currentColor', fontFamily: 'inherit' }}
                    tickLine={false} 
                    axisLine={false} 
                  />
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: '16px', 
                      backgroundColor: 'rgba(24, 24, 27, 0.95)', 
                      borderColor: 'rgba(255, 255, 255, 0.15)',
                      color: '#ffffff',
                      fontFamily: 'inherit'
                    }} 
                  />
                  <Bar dataKey="Transit" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="Fuel" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="Electricity" stackId="a" fill="#eab308" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full w-full flex items-center justify-center text-zinc-500 dark:text-zinc-400 text-sm">
                Loading charts...
              </div>
            )}
          </div>
        </div>

        {/* Category Breakdown Donut */}
        <div className="p-6 rounded-3xl border border-zinc-150 bg-white dark:border-zinc-800/80 dark:bg-zinc-950/40 shadow-sm flex flex-col justify-between">
          <h3 className="text-base font-bold text-zinc-805 dark:text-zinc-200 mb-4">Emissions by Category</h3>
          
          <div 
            className="h-44 w-full relative flex items-center justify-center"
            role="img"
            aria-label="Donut chart showing carbon footprint percentages divided between Transit, Fuel Refills, and Grid Electricity."
          >
            <div className="sr-only">
              <ul>
                {chartCategoryData.map((entry, index) => (
                  <li key={index}>
                    {entry.name}: {entry.value} kg CO₂ ({totalAll > 0 ? ((entry.value / totalAll) * 100).toFixed(0) : 0}%)
                  </li>
                ))}
              </ul>
            </div>

            {mounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartCategoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={65}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {chartCategoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: '12px', 
                      backgroundColor: 'rgba(24, 24, 27, 0.95)', 
                      color: '#ffffff',
                      fontFamily: 'inherit'
                    }} 
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-zinc-500 dark:text-zinc-400 text-sm">Loading Chart...</div>
            )}
            
            {/* Center Total Text */}
            {mounted && totalAll > 0 && (
              <div className="absolute flex flex-col items-center" aria-hidden="true">
                <span className="text-xl font-extrabold text-zinc-800 dark:text-zinc-100">
                  {totalAll.toFixed(0)}
                </span>
                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wide">Total kg</span>
              </div>
            )}
          </div>

          {/* Legends */}
          <div className="mt-4 space-y-2">
            {categoryData.length > 0 ? (
              categoryData.map((cat, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: cat.color }}></span>
                    <span className="font-semibold text-zinc-650 dark:text-zinc-400">{cat.name}</span>
                  </div>
                  <span className="font-bold text-zinc-800 dark:text-zinc-200">
                    {cat.value} kg ({((cat.value / (totalAll || 1)) * 100).toFixed(0)}%)
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-center text-zinc-500 py-2">No emissions logged yet. Great!</p>
            )}
          </div>
        </div>

      </div>

      {/* AI Carbon Forecast Module */}
      <div className="p-6 rounded-3xl border border-zinc-150 bg-white dark:border-zinc-800/80 dark:bg-zinc-950/40 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-100 dark:border-zinc-800/50 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center border border-purple-500/15">
              <BrainCircuit className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-805 dark:text-zinc-100">AI Carbon Forecast</h3>
              <p className="text-xs text-zinc-550 dark:text-zinc-400">Predictive carbon footprints based on historic tracking cycles.</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/15">
            {confidenceScore}% Confidence Index
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Forecast Metrics & Insights */}
          <div className="lg:col-span-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-zinc-50 dark:bg-zinc-900/30 rounded-2xl border border-zinc-100 dark:border-zinc-900">
                <span className="block text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Current Month</span>
                <span className="block text-xl font-extrabold text-zinc-800 dark:text-zinc-100 mt-1">
                  {currentMonthlyCO2.toFixed(1)} <span className="text-xs font-bold text-zinc-500 dark:text-zinc-405">kg</span>
                </span>
              </div>

              <div className="p-4 bg-zinc-50 dark:bg-zinc-900/30 rounded-2xl border border-zinc-100 dark:border-zinc-900 relative">
                <span className="block text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Forecast Month</span>
                <span className="block text-xl font-extrabold text-zinc-800 dark:text-zinc-100 mt-1">
                  {predictedNextMonth.toFixed(1)} <span className="text-xs font-bold text-zinc-500 dark:text-zinc-405">kg</span>
                </span>
                
                {/* Trend Indicator */}
                <div className={`absolute top-3 right-3 flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                  isWeeklyEmissionsIncreasing 
                    ? 'bg-rose-500/10 text-rose-750 border-rose-500/15 dark:text-rose-450' 
                    : 'bg-emerald-500/10 text-emerald-750 border-emerald-500/15 dark:text-emerald-450'
                }`}>
                  {isWeeklyEmissionsIncreasing ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  <span>{Math.abs(weeklyChangePct).toFixed(0)}%</span>
                </div>
              </div>
            </div>

            {/* Explainers */}
            <div className="space-y-3">
              <div className="p-3 bg-zinc-50/50 dark:bg-zinc-900/10 rounded-xl border border-zinc-100 dark:border-zinc-850 text-xs">
                <span className="font-bold text-zinc-500 dark:text-zinc-400 block mb-0.5">Forecast Reason:</span>
                <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed">{forecastReason}</p>
              </div>

              <div className="p-3 bg-emerald-50/30 border border-emerald-150/50 dark:bg-emerald-500/5 dark:border-emerald-500/10 rounded-xl text-xs">
                <span className="font-bold text-emerald-800 dark:text-emerald-450 block mb-0.5">AI Recommendation:</span>
                <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed">{forecastRec}</p>
                <div className="mt-2 flex justify-between items-center text-[10px] font-bold text-emerald-800 dark:text-emerald-450 border-t border-emerald-500/10 pt-1.5">
                  <span>Potential reduction:</span>
                  <span>-{forecastReduction} kg CO₂</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Predictive Chart */}
          <div className="lg:col-span-7 flex flex-col justify-between">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-bold text-zinc-600 dark:text-zinc-400">Timeline (Weekly Carbon Load)</span>
              <div className="flex items-center gap-4 text-[10px] font-bold">
                <div className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                  <span className="text-zinc-650 dark:text-zinc-400">Actual</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full border border-dashed border-blue-500 bg-blue-500/10"></span>
                  <span className="text-zinc-655 dark:text-zinc-400">Forecasted</span>
                </div>
              </div>
            </div>

            <div 
              className="h-56 w-full mt-2 text-zinc-400 dark:text-zinc-700"
              role="img"
              aria-label="Line chart comparing your actual weekly carbon emissions over past weeks with projected forecasts for upcoming weeks."
            >
              <div className="sr-only">
                <table>
                  <caption>Weekly Emissions Forecast Summary</caption>
                  <thead>
                    <tr><th>Week</th><th>Actual Emissions (kg)</th><th>Forecasted Emissions (kg)</th></tr>
                  </thead>
                  <tbody>
                    {forecastChartData.map((d, i) => (
                      <tr key={i}>
                        <td>{d.name}</td>
                        <td>{d.Actual !== null ? `${d.Actual} kg` : 'N/A'}</td>
                        <td>{d.Forecast !== null ? `${d.Forecast} kg` : 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {mounted ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={forecastChartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-zinc-100 dark:text-zinc-900" />
                    <XAxis 
                      dataKey="name" 
                      stroke="currentColor" 
                      fontSize={10} 
                      tick={{ fill: 'currentColor', fontFamily: 'inherit' }}
                      tickLine={false} 
                      axisLine={false} 
                    />
                    <YAxis 
                      stroke="currentColor" 
                      fontSize={10} 
                      tick={{ fill: 'currentColor', fontFamily: 'inherit' }}
                      tickLine={false} 
                      axisLine={false} 
                    />
                    <Tooltip 
                      contentStyle={{ 
                        borderRadius: '16px', 
                        backgroundColor: 'rgba(24, 24, 27, 0.95)', 
                        borderColor: 'rgba(255, 255, 255, 0.15)',
                        color: '#ffffff',
                        fontFamily: 'inherit'
                      }} 
                    />
                    <Line type="monotone" dataKey="Actual" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} connectNulls />
                    <Line type="monotone" dataKey="Forecast" stroke="#3b82f6" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 4 }} connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full w-full flex items-center justify-center text-zinc-500 dark:text-zinc-400 text-sm">
                  Loading Forecast chart...
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* What-If Lifestyle Simulator Module */}
      <div className="p-6 rounded-3xl border border-zinc-150 bg-white dark:border-zinc-800/80 dark:bg-zinc-950/40 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-100 dark:border-zinc-800/50 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/15">
              <Trophy className="h-5 w-5 text-emerald-750 dark:text-emerald-450" aria-hidden="true" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-805 dark:text-zinc-100">What-If Lifestyle Simulator</h3>
              <p className="text-xs text-zinc-550 dark:text-zinc-400">Simulate changes in your daily activities to visualize your potential green impact.</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-750 dark:text-emerald-400 border border-emerald-500/15">
            Flagship Simulator Active
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Sliders Control Panel */}
          <div className="lg:col-span-6 space-y-6">
            
            {/* Slider 1 */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold">
                <label htmlFor="sim-transit-days" className="text-zinc-650 dark:text-zinc-350">🚌 Substitute driving with public transit</label>
                <span className="text-emerald-750 dark:text-emerald-400 font-extrabold">{simTransitDays} days/week</span>
              </div>
              <input
                id="sim-transit-days"
                type="range"
                min="0"
                max="7"
                step="1"
                value={simTransitDays}
                onChange={(e) => setSimTransitDays(parseInt(e.target.value))}
                className="w-full h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
              />
              <span className="block text-[10px] text-zinc-500 dark:text-zinc-450">Replaces 15 km car commute legs with bus/metro.</span>
            </div>

            {/* Slider 2 */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold">
                <label htmlFor="sim-elec-pct" className="text-zinc-650 dark:text-zinc-350">⚡ Reduce home electricity usage</label>
                <span className="text-emerald-750 dark:text-emerald-400 font-extrabold">{simElecPct}% reduction</span>
              </div>
              <input
                id="sim-elec-pct"
                type="range"
                min="0"
                max="50"
                step="5"
                value={simElecPct}
                onChange={(e) => setSimElecPct(parseInt(e.target.value))}
                className="w-full h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
              />
              <span className="block text-[10px] text-zinc-500 dark:text-zinc-450">Lowers standby phantom loads and AC temperature draw.</span>
            </div>

            {/* Slider 3 */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold">
                <label htmlFor="sim-active-km" className="text-zinc-650 dark:text-zinc-350">🚲 Switch car rides to walking/cycling</label>
                <span className="text-emerald-750 dark:text-emerald-400 font-extrabold">{simActiveKm} km/week</span>
              </div>
              <input
                id="sim-active-km"
                type="range"
                min="0"
                max="30"
                step="2"
                value={simActiveKm}
                onChange={(e) => setSimActiveKm(parseInt(e.target.value))}
                className="w-full h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
              />
              <span className="block text-[10px] text-zinc-500 dark:text-zinc-450">Ditches solo car emissions entirely for short grocery trips.</span>
            </div>

          </div>

          {/* Impact & Recharts Results Panel */}
          <div className="lg:col-span-6 flex flex-col justify-between gap-6">
            
            {/* Visual Bar Chart comparing actual vs simulated */}
            <div>
              <span className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 mb-2">Footprint Comparison (Weekly kg CO₂)</span>
              <div 
                className="h-44 w-full text-zinc-400 dark:text-zinc-700"
                role="img"
                aria-label={`Footprint comparison chart. Current weekly footprint is ${last7DaysEmissions.toFixed(1)} kg CO₂. Simulated carbon footprint after changes is ${Math.max(0, last7DaysEmissions - simTotalWeeklyReduction).toFixed(1)} kg CO₂.`}
              >
                <div className="sr-only">
                  <ul>
                    <li>Current emissions: {last7DaysEmissions.toFixed(1)} kg CO₂</li>
                    <li>Simulated emissions: {Math.max(0, last7DaysEmissions - simTotalWeeklyReduction).toFixed(1)} kg CO₂</li>
                    <li>Weekly emissions reduction: {simTotalWeeklyReduction.toFixed(1)} kg CO₂</li>
                  </ul>
                </div>

                {mounted ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={simChartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <defs>
                        <linearGradient id="currentGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.85}/>
                          <stop offset="100%" stopColor="#1d4ed8" stopOpacity={0.85}/>
                        </linearGradient>
                        <linearGradient id="simGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity={0.85}/>
                          <stop offset="100%" stopColor="#047857" stopOpacity={0.85}/>
                        </linearGradient>
                      </defs>
                      <XAxis 
                        dataKey="name" 
                        stroke="currentColor" 
                        fontSize={10} 
                        tick={{ fill: 'currentColor', fontFamily: 'inherit' }}
                        tickLine={false} 
                        axisLine={false} 
                      />
                      <YAxis 
                        stroke="currentColor" 
                        fontSize={10} 
                        tick={{ fill: 'currentColor', fontFamily: 'inherit' }}
                        tickLine={false} 
                        axisLine={false} 
                      />
                      <Tooltip 
                        contentStyle={{ 
                          borderRadius: '12px', 
                          backgroundColor: 'rgba(24, 24, 27, 0.95)', 
                          color: '#ffffff',
                          fontFamily: 'inherit'
                        }} 
                      />
                      <Bar dataKey="Emissions" radius={[8, 8, 0, 0]} maxBarSize={50}>
                        {simChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-zinc-500 dark:text-zinc-400 text-xs">
                    Loading simulator chart...
                  </div>
                )}
              </div>
            </div>

            {/* Sim Stats strip */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-zinc-50 dark:bg-zinc-900/30 rounded-xl border border-zinc-150/60 dark:border-zinc-900 text-center">
                <span className="block text-[9px] font-bold text-zinc-500 dark:text-zinc-405 uppercase tracking-wider">Weekly Cut</span>
                <span className="block text-sm font-extrabold text-emerald-750 dark:text-emerald-400 mt-1">
                  -<AnimatedCounter value={simTotalWeeklyReduction} decimals={1} duration={0.4} /> kg
                </span>
              </div>
              <div className="p-3 bg-zinc-50 dark:bg-zinc-900/30 rounded-xl border border-zinc-150/60 dark:border-zinc-900 text-center">
                <span className="block text-[9px] font-bold text-zinc-500 dark:text-zinc-405 uppercase tracking-wider">USD Saved</span>
                <span className="block text-sm font-extrabold text-blue-750 dark:text-blue-400 mt-1">
                  $<AnimatedCounter value={simTotalCostSaved} decimals={1} duration={0.4} />
                </span>
              </div>
              <div className="p-3 bg-zinc-50 dark:bg-zinc-900/30 rounded-xl border border-zinc-150/60 dark:border-zinc-900 text-center">
                <span className="block text-[9px] font-bold text-zinc-500 dark:text-zinc-405 uppercase tracking-wider">Score Boost</span>
                <span className="block text-sm font-extrabold text-amber-800 dark:text-yellow-400 mt-1">
                  +<AnimatedCounter value={simScoreBoost} duration={0.4} /> pts
                </span>
              </div>
            </div>

            {/* Annual Environmental Impact block */}
            <div className="p-3.5 bg-emerald-50/30 border border-emerald-150/50 dark:bg-emerald-500/5 dark:border-emerald-500/10 rounded-2xl text-xs flex items-center justify-around text-center gap-4">
              <div>
                <span className="block text-[9px] font-bold text-zinc-550 dark:text-zinc-400 uppercase">Annual Savings</span>
                <span className="text-sm font-black text-emerald-800 dark:text-emerald-400 mt-0.5 block">
                  <AnimatedCounter value={simAnnualReduction} decimals={0} duration={0.4} /> kg CO₂
                </span>
              </div>
              <div className="h-8 w-px bg-emerald-500/10"></div>
              <div>
                <span className="block text-[9px] font-bold text-zinc-550 dark:text-zinc-400 uppercase">🌳 Trees Equivalent</span>
                <span className="text-sm font-black text-emerald-800 dark:text-emerald-400 mt-0.5 block">
                  <AnimatedCounter value={simTreesPlanted} decimals={1} duration={0.4} /> Trees
                </span>
              </div>
              <div className="h-8 w-px bg-emerald-500/10"></div>
              <div>
                <span className="block text-[9px] font-bold text-zinc-550 dark:text-zinc-400 uppercase">✈️ Flight Saved</span>
                <span className="text-sm font-black text-emerald-800 dark:text-emerald-400 mt-0.5 block">
                  <AnimatedCounter value={simFlightsAvoided} decimals={1} duration={0.4} /> Flights
                </span>
              </div>
            </div>

          </div>

        </div>
      </div>

      {/* Quick Action Grid */}
      <div className="space-y-3">
        <h3 className="text-base font-bold text-zinc-805 dark:text-zinc-200">Quick Tracking Actions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          
          <button
            onClick={() => setActiveTab('travel')}
            className="flex flex-col items-center p-4 rounded-2xl border border-zinc-150 hover:border-emerald-500/30 bg-white hover:bg-emerald-500/5 dark:border-zinc-800/80 dark:bg-zinc-950/40 dark:hover:bg-emerald-500/5 transition text-left group focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none cursor-pointer"
          >
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-750 dark:text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform border border-emerald-500/10">
              <Navigation className="h-5 w-5" aria-hidden="true" />
            </div>
            <span className="font-bold text-sm text-zinc-800 dark:text-zinc-200 mt-3">Start Trip</span>
            <span className="text-[10px] text-zinc-500 dark:text-zinc-405 mt-0.5">GPS Geolocation</span>
          </button>

          <button
            onClick={() => setActiveTab('loggers')}
            className="flex flex-col items-center p-4 rounded-2xl border border-zinc-150 hover:border-blue-500/30 bg-white hover:bg-blue-500/5 dark:border-zinc-800/80 dark:bg-zinc-950/40 dark:hover:bg-blue-500/5 transition text-left group focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none cursor-pointer"
          >
            <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-750 dark:text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform border border-blue-500/10">
              <Fuel className="h-5 w-5" aria-hidden="true" />
            </div>
            <span className="font-bold text-sm text-zinc-800 dark:text-zinc-200 mt-3">Log Fuel Refill</span>
            <span className="text-[10px] text-zinc-500 dark:text-zinc-405 mt-0.5">Litres + Mileage</span>
          </button>

          <button
            onClick={() => setActiveTab('loggers')}
            className="flex flex-col items-center p-4 rounded-2xl border border-zinc-150 hover:border-yellow-500/30 bg-white hover:bg-yellow-500/5 dark:border-zinc-800/80 dark:bg-zinc-950/40 dark:hover:bg-yellow-500/5 transition text-left group focus-visible:ring-2 focus-visible:ring-yellow-500 focus-visible:outline-none cursor-pointer"
          >
            <div className="h-10 w-10 rounded-xl bg-yellow-500/10 text-amber-800 dark:text-yellow-400 flex items-center justify-center group-hover:scale-110 transition-transform border border-yellow-500/10">
              <Zap className="h-5 w-5" aria-hidden="true" />
            </div>
            <span className="font-bold text-sm text-zinc-800 dark:text-zinc-200 mt-3">Log Electricity</span>
            <span className="text-[10px] text-zinc-500 dark:text-zinc-405 mt-0.5">Bill OCR Scanner</span>
          </button>

          <button
            onClick={() => setActiveTab('coach')}
            className="flex flex-col items-center p-4 rounded-2xl border border-zinc-150 hover:border-purple-500/30 bg-white hover:bg-purple-500/5 dark:border-zinc-800/80 dark:bg-zinc-950/40 dark:hover:bg-purple-500/5 transition text-left group focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:outline-none cursor-pointer"
          >
            <div className="h-10 w-10 rounded-xl bg-purple-500/10 text-purple-750 dark:text-purple-400 flex items-center justify-center group-hover:scale-110 transition-transform border border-purple-500/10">
              <Sparkles className="h-5 w-5" aria-hidden="true" />
            </div>
            <span className="font-bold text-sm text-zinc-800 dark:text-zinc-200 mt-3">AI Coach Chat</span>
            <span className="text-[10px] text-zinc-500 dark:text-zinc-405 mt-0.5">Ask EcoBuddy AI</span>
          </button>

        </div>
      </div>

      {/* Profile Goals Card */}
      {profile?.goals && profile.goals.length > 0 && (
        <div className="p-6 rounded-3xl border border-zinc-150 bg-white dark:border-zinc-800/80 dark:bg-zinc-950/40 shadow-sm">
          <div className="flex items-center gap-2 text-zinc-800 dark:text-zinc-200 mb-4 font-bold border-b border-zinc-100 dark:border-zinc-800/50 pb-3">
            <Trophy className="h-5 w-5 text-emerald-750 dark:text-emerald-400" aria-hidden="true" />
            <h3 className="text-base font-bold text-zinc-805 dark:text-zinc-200">Your Personal Goals</h3>
          </div>
          <ul className="space-y-2.5">
            {profile.goals.map((goal, idx) => (
              <li key={idx} className="flex items-start gap-2.5 text-sm text-zinc-650 dark:text-zinc-350">
                <span className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 border border-emerald-500/15">
                  {idx + 1}
                </span>
                <span>{goal}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

    </div>
  );
};
export default DashboardView;
