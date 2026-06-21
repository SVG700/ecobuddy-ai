'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, Award, Calendar, CheckCircle2, Play, Flame, 
  Sparkles, Check, ChevronRight, Lock, BadgeCheck
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Challenge, UserChallenge, Achievement, UserAchievement, Trip, FuelRecord, ElectricityRecord } from '../lib/types';
import { db } from '../lib/db';
import { DynamicIcon } from './Icons';

interface ChallengesViewProps {
  challenges: Challenge[];
  userChallenges: UserChallenge[];
  achievements: Achievement[];
  userAchievements: UserAchievement[];
  trips: Trip[];
  fuelRecords: FuelRecord[];
  electricityRecords: ElectricityRecord[];
  refreshData: () => void;
}

export const ChallengesView: React.FC<ChallengesViewProps> = ({
  challenges,
  userChallenges,
  achievements,
  userAchievements,
  trips = [],
  fuelRecords = [],
  electricityRecords = [],
  refreshData
}) => {
  const [activeTab, setActiveTab] = useState<'challenges' | 'achievements'>('challenges');
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [unlockToast, setUnlockToast] = useState<Achievement | null>(null);

  // Setup listener for achievement unlocking event
  useEffect(() => {
    const handleUnlock = (e: Event) => {
      const achievement = (e as CustomEvent<Achievement>).detail;
      // Trigger confetti
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 }
      });
      // Show custom popup toast
      setUnlockToast(achievement);
      setTimeout(() => {
        setUnlockToast(null);
      }, 5000);
      refreshData();
    };

    window.addEventListener('achievement-unlocked', handleUnlock);
    return () => {
      window.removeEventListener('achievement-unlocked', handleUnlock);
    };
  }, [refreshData]);

  // Split user challenges
  const activeUCs = userChallenges.filter(uc => uc.status === 'active');
  const completedUCs = userChallenges.filter(uc => uc.status === 'completed');

  // Challenge verification helper against logged data
  const verifyChallenge = (challengeId: string): { eligible: boolean; reason?: string } => {
    if (challengeId === 'ch-1') {
      const hasEcoTrip = trips.some(t => 
        t.transport_mode === 'walking' || 
        t.transport_mode === 'bicycle' || 
        t.transport_mode === 'bus' || 
        t.transport_mode === 'train' ||
        t.transport_mode === 'metro'
      );
      return {
        eligible: hasEcoTrip,
        reason: hasEcoTrip ? undefined : 'Requires at least 1 walking, cycling, bus, or train trip.'
      };
    }
    if (challengeId === 'ch-2') {
      const hasPublicTransport = trips.some(t => 
        t.transport_mode === 'bus' || 
        t.transport_mode === 'train' ||
        t.transport_mode === 'metro'
      );
      return {
        eligible: hasPublicTransport,
        reason: hasPublicTransport ? undefined : 'Requires at least 1 public transport trip (bus, train, or metro).'
      };
    }
    if (challengeId === 'ch-3') {
      const hasElectricity = electricityRecords.length > 0;
      return {
        eligible: hasElectricity,
        reason: hasElectricity ? undefined : 'Requires at least 1 electricity log.'
      };
    }
    if (challengeId === 'ch-4') {
      return { eligible: true };
    }
    if (challengeId === 'ch-5') {
      const ecoCount = trips.filter(t => 
        t.transport_mode === 'walking' || 
        t.transport_mode === 'bicycle' || 
        t.transport_mode === 'bus' || 
        t.transport_mode === 'train' ||
        t.transport_mode === 'metro'
      ).length;
      return {
        eligible: ecoCount >= 3,
        reason: ecoCount >= 3 ? undefined : `Requires at least 3 eco-friendly trips (current: ${ecoCount}/3).`
      };
    }
    return { eligible: true };
  };

  // Check if a specific challenge is active
  const isChallengeActive = (id: string) => {
    return activeUCs.some(uc => uc.challenge_id === id);
  };

  // Check if a specific challenge is completed
  const isChallengeCompleted = (id: string) => {
    return completedUCs.some(uc => uc.challenge_id === id);
  };

  const handleStartChallenge = async (challengeId: string) => {
    try {
      await db.startChallenge(challengeId);
      refreshData();
    } catch (e) {
      console.error('Error starting challenge:', e);
    }
  };

  const handleCompleteChallenge = async (challengeId: string) => {
    setClaimingId(challengeId);
    try {
      // Complete challenge database call
      await db.completeChallenge(challengeId);
      
      // Fire confetti!
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
      
      refreshData();
    } catch (e) {
      console.error('Error completing challenge:', e);
    } finally {
      setClaimingId(null);
    }
  };

  const listContainer = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  } as const;

  const listCard = {
    hidden: { opacity: 0, y: 15, scale: 0.98 },
    show: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: { type: "spring" as const, stiffness: 120, damping: 16 }
    }
  } as const;

  return (
    <div className="space-y-6 pb-20 md:pb-6 relative">
      
      {/* Achievement Unlock Popup Toast */}
      <AnimatePresence>
        {unlockToast && (
          <motion.div 
            role="status"
            aria-live="polite"
            initial={{ opacity: 0, y: -40, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-20 left-4 right-4 md:left-auto md:right-4 md:w-80 z-50 p-4 rounded-2xl bg-zinc-950/95 border border-emerald-500 text-white shadow-2xl flex items-center gap-3"
          >
            <div className="h-10 w-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/35">
              <DynamicIcon name={unlockToast.badge_url} className="h-5.5 w-5.5" />
            </div>
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-emerald-400">🏆 Achievement Unlocked!</span>
              <span className="block font-bold text-sm text-zinc-100">{unlockToast.title}</span>
              <span className="block text-xs text-zinc-400 mt-0.5">{unlockToast.description}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Tab toggler */}
      <div className="flex border-b border-zinc-150 dark:border-zinc-800 relative" role="tablist" aria-label="Challenges and Achievements Tabs">
        <button
          onClick={() => setActiveTab('challenges')}
          role="tab"
          aria-selected={activeTab === 'challenges'}
          aria-controls="challenges-panel"
          id="challenges-tab"
          className={`relative pb-3.5 text-sm font-bold px-4 transition cursor-pointer focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none ${
            activeTab === 'challenges' 
              ? 'text-emerald-600 dark:text-emerald-400 font-extrabold' 
              : 'border-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'
          }`}
        >
          🎮 Eco Challenges
          {activeTab === 'challenges' && (
            <motion.div
              layoutId="activeChallengeTabBorder"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500"
              transition={{ type: "spring", stiffness: 350, damping: 25 }}
            />
          )}
        </button>
        <button
          onClick={() => setActiveTab('achievements')}
          role="tab"
          aria-selected={activeTab === 'achievements'}
          aria-controls="achievements-panel"
          id="achievements-tab"
          className={`relative pb-3.5 text-sm font-bold px-4 transition cursor-pointer focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none ${
            activeTab === 'achievements' 
              ? 'text-emerald-600 dark:text-emerald-400 font-extrabold' 
              : 'border-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'
          }`}
        >
          🏆 Badges & Trophies
          {activeTab === 'achievements' && (
            <motion.div
              layoutId="activeChallengeTabBorder"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500"
              transition={{ type: "spring", stiffness: 350, damping: 25 }}
            />
          )}
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'challenges' ? (
          /* ==================== CHALLENGES ZONE ==================== */
          <motion.div 
            key="challenges"
            id="challenges-panel"
            role="tabpanel"
            aria-labelledby="challenges-tab"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25 }}
            className="space-y-6"
          >
            
            {/* Active Challenges HUD */}
            {activeUCs.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
                  <Flame className="h-4.5 w-4.5 text-orange-500 animate-pulse" />
                  Active Challenges ({activeUCs.length})
                </h3>
                
                <motion.div 
                  variants={listContainer}
                  initial="hidden"
                  animate="show"
                  className="grid grid-cols-1 md:grid-cols-2 gap-4"
                >
                  {activeUCs.map((uc) => {
                    const challenge = challenges.find(c => c.id === uc.challenge_id);
                    if (!challenge) return null;
                    const { eligible, reason } = verifyChallenge(challenge.id);
                    return (
                      <motion.div 
                        variants={listCard}
                        whileHover={{ y: -3, scale: 1.01, boxShadow: "0 10px 30px -10px rgba(0,0,0,0.04)" }}
                        key={uc.id} 
                        className="p-5 rounded-3xl border border-orange-500/25 bg-orange-500/5 dark:bg-orange-950/10 flex flex-col justify-between shadow-sm relative overflow-hidden"
                      >
                        <div className="flex gap-4">
                          <div className="h-10 w-10 rounded-xl bg-orange-500/15 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0 border border-orange-500/20">
                            <DynamicIcon name={challenge.icon} className="h-5 w-5" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <h4 className="font-extrabold text-sm text-zinc-800 dark:text-zinc-200">{challenge.title}</h4>
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-wider ${
                                eligible 
                                  ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/15' 
                                  : 'bg-zinc-500/10 text-zinc-450 border-zinc-500/15 dark:text-zinc-450'
                              }`}>
                                {eligible ? 'Eligible' : 'Not Eligible'}
                              </span>
                            </div>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">{challenge.description}</p>
                            {!eligible && reason && (
                              <p className="text-[10px] text-rose-500 font-semibold mt-1.5" role="note">⚠️ {reason}</p>
                            )}
                          </div>
                        </div>

                        <div className="mt-5 flex items-center justify-between border-t border-orange-500/10 pt-4">
                          <div className="text-xs">
                            <span className="text-orange-600 dark:text-orange-400 font-bold">+{challenge.points_reward} pts</span>
                            <span className="text-zinc-400 mx-1.5">•</span>
                            <span className="text-zinc-400">{challenge.duration_days}d cycle</span>
                          </div>

                          <motion.button
                            whileHover={eligible ? { scale: 1.03 } : {}}
                            whileTap={eligible ? { scale: 0.97 } : {}}
                            onClick={() => eligible && handleCompleteChallenge(challenge.id)}
                            disabled={claimingId === challenge.id || !eligible}
                            aria-label={`Claim points for ${challenge.title}`}
                            className="flex items-center gap-1.5 px-4.5 py-2 text-xs font-bold bg-orange-500 hover:bg-orange-600 text-zinc-950 rounded-xl shadow-md shadow-orange-500/10 transition disabled:opacity-40 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:outline-none cursor-pointer"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            {claimingId === challenge.id ? 'Claiming...' : 'Claim Points'}
                          </motion.button>
                        </div>
                      </motion.div>
                    );
                  })}
                </motion.div>
              </div>
            )}

            {/* Available Challenges List */}
            <div className="space-y-3">
              <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-200">Available Daily & Weekly Challenges</h3>
              
              <motion.div 
                variants={listContainer}
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
              >
                {challenges.map((c) => {
                  const isActive = isChallengeActive(c.id);
                  const isCompleted = isChallengeCompleted(c.id);
                  
                  return (
                    <motion.div 
                      variants={listCard}
                      whileHover={{ y: -3, scale: 1.01, boxShadow: "0 10px 30px -10px rgba(0,0,0,0.04)" }}
                      key={c.id} 
                      className={`p-5 rounded-3xl border bg-white dark:bg-zinc-950/20 shadow-sm flex flex-col justify-between transition ${
                        isActive 
                          ? 'border-orange-500/20 bg-orange-500/5' 
                          : isCompleted
                          ? 'border-emerald-500/20 bg-emerald-500/5 opacity-80'
                          : 'border-zinc-150 dark:border-zinc-800/80 hover:border-zinc-250 dark:hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex gap-4">
                        <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border ${
                          isCompleted 
                            ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/25' 
                            : 'bg-zinc-50 dark:bg-zinc-900 text-zinc-500 border-zinc-200 dark:border-zinc-800'
                        }`}>
                          {isCompleted ? <Check className="h-5 w-5" /> : <DynamicIcon name={c.icon} className="h-5 w-5" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-extrabold text-sm text-zinc-800 dark:text-zinc-200">{c.title}</h4>
                            {isCompleted && (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-[9px] font-bold text-emerald-500 uppercase tracking-wide">
                                Done
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">{c.description}</p>
                        </div>
                      </div>

                      <div className="mt-5 flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800/60 pt-4">
                        <div className="text-xs">
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold">+{c.points_reward} pts</span>
                          <span className="text-zinc-400 mx-1.5">•</span>
                          <span className="text-zinc-400 capitalize">{c.category}</span>
                        </div>

                        {!isActive && !isCompleted && (
                          <motion.button
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => handleStartChallenge(c.id)}
                            aria-label={`Start challenge ${c.title}`}
                            className="flex items-center gap-1 px-4 py-2 text-xs font-bold border border-zinc-200 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800 rounded-xl transition focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none cursor-pointer"
                          >
                            <Play className="h-3 w-3 fill-current" />
                            Start Play
                          </motion.button>
                        )}

                        {isActive && (
                          <div className="flex flex-col items-end gap-1">
                            <span className="text-xs font-bold text-orange-500 flex items-center gap-1">
                              <span className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-ping"></span>
                              In Progress
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-wider ${
                              verifyChallenge(c.id).eligible 
                                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/15' 
                                : 'bg-zinc-500/10 text-zinc-450 border-zinc-500/15 dark:text-zinc-450'
                            }`}>
                              {verifyChallenge(c.id).eligible ? 'Eligible' : 'Not Eligible'}
                            </span>
                          </div>
                        )}

                        {isCompleted && (
                          <span className="text-xs font-bold text-emerald-500 flex items-center gap-1">
                            <Check className="h-4 w-4" /> Completed
                          </span>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            </div>

          </motion.div>
        ) : (
          /* ==================== ACHIEVEMENTS ZONE ==================== */
          <motion.div 
            key="achievements"
            id="achievements-panel"
            role="tabpanel"
            aria-labelledby="achievements-tab"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25 }}
            className="space-y-4"
          >
            <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-100 dark:border-zinc-900 text-xs text-zinc-500 dark:text-zinc-400 flex items-start gap-2.5">
              <Trophy className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-zinc-700 dark:text-zinc-300">Unlock Achievements with Eco Points!</span>
                <p className="text-[10px] text-zinc-400 mt-0.5">Logging trips, fuel refuels, electricity bills, and completing challenges awards points. Accumulating points automatically unlocks new badges!</p>
              </div>
            </div>

            <motion.div 
              variants={listContainer}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 sm:grid-cols-2 gap-4"
            >
              {achievements.map((ac) => {
                const isUnlocked = userAchievements.some(ua => ua.achievement_id === ac.id);
                return (
                  <motion.div 
                    variants={listCard}
                    whileHover={{ scale: 1.02, y: -3, boxShadow: "0 10px 30px -10px rgba(0,0,0,0.04)" }}
                    key={ac.id} 
                    className={`p-5 rounded-3xl border flex items-center gap-4 transition shadow-sm ${
                      isUnlocked 
                        ? 'border-emerald-500/20 bg-emerald-500/5' 
                        : 'border-zinc-150 bg-white dark:border-zinc-800/80 dark:bg-zinc-950/20 opacity-70'
                    }`}
                  >
                    <motion.div 
                      whileHover={isUnlocked ? { rotate: [0, -10, 10, -10, 0] } : { x: [-3, 3, -3, 3, 0] }}
                      transition={{ duration: 0.4 }}
                      className={`h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 border relative ${
                        isUnlocked 
                          ? 'bg-gradient-to-tr from-emerald-500/10 to-teal-500/10 text-emerald-500 border-emerald-500/20 shadow' 
                          : 'bg-zinc-50 text-zinc-300 border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800'
                      }`}
                    >
                      <DynamicIcon name={ac.badge_url} className="h-7 w-7" />
                      {!isUnlocked && (
                        <div className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-400 flex items-center justify-center border border-zinc-300 dark:border-zinc-700 shadow-sm scale-90">
                          <Lock className="h-3 w-3" />
                        </div>
                      )}
                    </motion.div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className={`font-black text-sm ${isUnlocked ? 'text-zinc-800 dark:text-zinc-200' : 'text-zinc-400'}`}>
                          {ac.title}
                        </h4>
                        {isUnlocked && <BadgeCheck className="h-4.5 w-4.5 text-emerald-500 fill-current text-zinc-950 dark:text-zinc-950" />}
                      </div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">{ac.description}</p>
                      <span className="block text-[10px] font-bold text-zinc-400 uppercase mt-1">
                        {isUnlocked ? 'Unlocked' : `Requires ${ac.points_required} pts`}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};
export default ChallengesView;
