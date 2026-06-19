'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, Award, Trophy, Trash2, Plus, Sparkles, 
  Target, Mail, Calendar, Edit2, ShieldAlert 
} from 'lucide-react';
import { UserProfile, UserChallenge } from '../lib/types';
import { db } from '../lib/db';
import { AnimatedCounter } from './AnimatedCounter';

interface ProfileViewProps {
  profile: UserProfile | null;
  userChallenges: UserChallenge[];
  refreshData: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  profile,
  userChallenges,
  refreshData
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [newGoal, setNewGoal] = useState('');
  
  const [updateLoading, setUpdateLoading] = useState(false);
  const [goalError, setGoalError] = useState('');

  const completedChallengesCount = userChallenges.filter(uc => uc.status === 'completed').length;

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || updateLoading) return;

    setUpdateLoading(true);
    try {
      await db.updateProfile({ full_name: fullName.trim() });
      setIsEditing(false);
      refreshData();
    } catch (err) {
      console.error('Failed to update profile name:', err);
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleAddGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    setGoalError('');

    const goalText = newGoal.trim();
    if (!goalText) {
      setGoalError('Goal description cannot be empty.');
      return;
    }

    if (goalText.length > 80) {
      setGoalError('Please keep your goal description under 80 characters.');
      return;
    }

    if (!profile) return;

    const updatedGoals = [...profile.goals, goalText];

    try {
      await db.updateProfile({ goals: updatedGoals });
      setNewGoal('');
      refreshData();
    } catch (err) {
      console.error('Failed to add goal:', err);
    }
  };

  const handleDeleteGoal = async (indexToDelete: number) => {
    if (!profile) return;
    
    const updatedGoals = profile.goals.filter((_, idx) => idx !== indexToDelete);

    try {
      await db.updateProfile({ goals: updatedGoals });
      refreshData();
    } catch (err) {
      console.error('Failed to delete goal:', err);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.04
      }
    }
  } as const;

  const cardVariants = {
    hidden: { opacity: 0, y: 12, scale: 0.98 },
    show: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: { type: "spring" as const, stiffness: 120, damping: 16 }
    }
  } as const;

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6 pb-20 md:pb-6 relative"
    >
      {/* Decorative ambient SaaS glow accent */}
      <div className="absolute top-0 right-1/4 w-80 h-80 bg-emerald-500/5 dark:bg-emerald-500/5 rounded-full blur-3xl -z-10 pointer-events-none" />

      {/* Profile Info Card */}
      <motion.div 
        variants={cardVariants}
        className="p-6 rounded-3xl border border-zinc-150 bg-white dark:border-zinc-800/80 dark:bg-zinc-950/40 shadow-sm relative group overflow-hidden"
      >
        <div className="absolute -inset-px bg-gradient-to-tr from-emerald-500/0 to-teal-500/0 group-hover:from-emerald-500/3 group-hover:to-teal-500/3 rounded-3xl transition duration-500 -z-10" />
        <div className="flex flex-col sm:flex-row items-center gap-6">
          {/* Avatar Icon */}
          <div className="h-16 w-16 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0 border border-emerald-500/25 shadow-sm shadow-emerald-500/5">
            <User className="h-8 w-8" />
          </div>

          <div className="flex-1 text-center sm:text-left space-y-1.5">
            {isEditing ? (
              <form onSubmit={handleUpdateProfile} className="flex gap-2 max-w-sm justify-center sm:justify-start">
                <label htmlFor="edit-name-input" className="sr-only">Edit profile name</label>
                <input
                  id="edit-name-input"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="flex-1 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-sm text-zinc-800 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-100 transition focus:outline-none focus:border-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-500"
                  placeholder="Enter name"
                  maxLength={30}
                />
                <button
                  type="submit"
                  disabled={updateLoading}
                  className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-bold text-xs rounded-xl shadow-md transition disabled:opacity-50 cursor-pointer focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setFullName(profile?.full_name || '');
                  }}
                  className="px-3 py-1.5 border border-zinc-200 text-zinc-600 dark:border-zinc-800 dark:text-zinc-400 font-bold text-xs rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-900 transition cursor-pointer focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
                >
                  Cancel
                </button>
              </form>
            ) : (
              <div className="flex items-center justify-center sm:justify-start gap-2.5">
                <h3 className="text-lg font-black text-zinc-800 dark:text-zinc-100">
                  {profile?.full_name || 'Eco Buddy'}
                </h3>
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-zinc-400 hover:text-emerald-500 transition p-1 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg cursor-pointer focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
                  title="Edit Name"
                  aria-label="Edit Name"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-y-1 gap-x-4 text-xs text-zinc-400 font-semibold">
              <span className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-zinc-405" />
                {profile?.email}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-zinc-405" />
                Joined {profile?.created_at ? new Date(profile.created_at).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : 'recently'}
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Aggregate Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        
        {/* Metric 1 */}
        <motion.div 
          variants={cardVariants}
          whileHover={{ y: -4, scale: 1.02, transition: { duration: 0.15 } }}
          className="p-4 rounded-2xl border border-zinc-100 bg-white dark:border-zinc-850 dark:bg-zinc-950/20 text-center shadow-sm relative group"
        >
          <div className="absolute -inset-px bg-gradient-to-tr from-emerald-500/0 to-emerald-500/0 group-hover:from-emerald-500/3 group-hover:to-emerald-500/3 rounded-2xl transition duration-500 -z-10" />
          <Award className="mx-auto h-5 w-5 text-emerald-500 mb-1" />
          <span className="block text-2xl font-black text-zinc-800 dark:text-zinc-100">
            <AnimatedCounter value={profile?.carbon_saved_kg || 0} decimals={1} />
          </span>
          <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">CO₂ Saved (kg)</span>
        </motion.div>

        {/* Metric 2 */}
        <motion.div 
          variants={cardVariants}
          whileHover={{ y: -4, scale: 1.02, transition: { duration: 0.15 } }}
          className="p-4 rounded-2xl border border-zinc-100 bg-white dark:border-zinc-850 dark:bg-zinc-950/20 text-center shadow-sm relative group"
        >
          <div className="absolute -inset-px bg-gradient-to-tr from-yellow-500/0 to-yellow-500/0 group-hover:from-yellow-500/3 group-hover:to-yellow-500/3 rounded-2xl transition duration-500 -z-10" />
          <Trophy className="mx-auto h-5 w-5 text-yellow-500 mb-1" />
          <span className="block text-2xl font-black text-zinc-800 dark:text-zinc-100">
            <AnimatedCounter value={completedChallengesCount} />
          </span>
          <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Completed plays</span>
        </motion.div>

        {/* Metric 3 */}
        <motion.div 
          variants={cardVariants}
          whileHover={{ y: -4, scale: 1.02, transition: { duration: 0.15 } }}
          className="p-4 rounded-2xl border border-zinc-100 bg-white dark:border-zinc-850 dark:bg-zinc-950/20 text-center shadow-sm relative group"
        >
          <div className="absolute -inset-px bg-gradient-to-tr from-emerald-400/0 to-emerald-400/0 group-hover:from-emerald-400/3 group-hover:to-emerald-400/3 rounded-2xl transition duration-500 -z-10" />
          <Sparkles className="mx-auto h-5 w-5 text-emerald-400 mb-1" />
          <span className="block text-2xl font-black text-zinc-800 dark:text-zinc-100">
            <AnimatedCounter value={profile?.points || 0} />
          </span>
          <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Eco Points</span>
        </motion.div>

        {/* Metric 4 */}
        <motion.div 
          variants={cardVariants}
          whileHover={{ y: -4, scale: 1.02, transition: { duration: 0.15 } }}
          className="p-4 rounded-2xl border border-zinc-100 bg-white dark:border-zinc-850 dark:bg-zinc-950/20 text-center shadow-sm relative group"
        >
          <div className="absolute -inset-px bg-gradient-to-tr from-blue-500/0 to-blue-500/0 group-hover:from-blue-500/3 group-hover:to-blue-500/3 rounded-2xl transition duration-500 -z-10" />
          <Target className="mx-auto h-5 w-5 text-blue-500 mb-1" />
          <span className="block text-2xl font-black text-zinc-800 dark:text-zinc-100">
            <AnimatedCounter value={profile?.goals?.length || 0} />
          </span>
          <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Active Goals</span>
        </motion.div>

      </div>

      {/* Goals Manager */}
      <motion.div 
        variants={cardVariants}
        className="p-6 rounded-3xl border border-zinc-150 bg-white dark:border-zinc-800/80 dark:bg-zinc-950/40 shadow-sm space-y-6"
      >
        <div>
          <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
            <Target className="h-5 w-5 text-emerald-500" />
            Sustainability Goal Planner
          </h3>
          <p className="text-xs text-zinc-400 mt-1">Specify concrete weekly habits you want to cultivate to reduce your footprint.</p>
        </div>

        {/* Add Goal Input form */}
        <form onSubmit={handleAddGoal} className="space-y-2.5">
          <div className="flex gap-2">
            <label htmlFor="new-goal-input" className="sr-only">Add new sustainability goal</label>
            <input
              id="new-goal-input"
              type="text"
              required
              value={newGoal}
              onChange={(e) => {
                setNewGoal(e.target.value);
                setGoalError('');
              }}
              placeholder="e.g. Ditch cabs and take metro to work on Tuesdays"
              className="flex-1 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-800 placeholder-zinc-450 focus:border-emerald-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-100 dark:placeholder-zinc-650 transition"
              maxLength={85}
            />
            <button
              type="submit"
              className="h-11 px-4.5 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-500 hover:from-emerald-450 hover:to-teal-450 text-zinc-950 font-extrabold text-sm flex items-center justify-center gap-1.5 shadow-md transition active:scale-95 cursor-pointer shrink-0 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
            >
              <Plus className="h-4.5 w-4.5" />
              Add Goal
            </button>
          </div>
          {goalError && (
            <div className="flex items-center gap-1 text-xs text-rose-500 font-semibold animate-pulse">
              <ShieldAlert className="h-3.5 w-3.5" />
              <span>{goalError}</span>
            </div>
          )}
        </form>

        {/* Goals List */}
        {profile?.goals && profile.goals.length > 0 ? (
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            <AnimatePresence initial={false}>
              {profile.goals.map((goal, idx) => (
                <motion.div 
                  key={`${goal}-${idx}`} 
                  initial={{ opacity: 0, height: 0, y: -10 }}
                  animate={{ opacity: 1, height: "auto", y: 0 }}
                  exit={{ opacity: 0, height: 0, y: 10 }}
                  transition={{ duration: 0.2 }}
                  className="p-3.5 rounded-xl border border-zinc-100 bg-zinc-50/20 dark:border-zinc-900 dark:bg-zinc-950/10 flex items-center justify-between gap-3 text-xs sm:text-sm font-medium overflow-hidden"
                >
                  <div className="flex items-start gap-2.5">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-[10px] font-bold text-emerald-500">
                      {idx + 1}
                    </span>
                    <span className="text-zinc-700 dark:text-zinc-350">{goal}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteGoal(idx)}
                    className="text-zinc-400 hover:text-red-500 transition p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg cursor-pointer focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none"
                    title="Remove Goal"
                    aria-label={`Remove Goal ${idx + 1}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="text-center py-6 text-zinc-500 dark:text-zinc-400 text-xs">
            No active goals. Add some habits above to start planning!
          </div>
        )}
      </motion.div>

    </motion.div>
  );
};

export default ProfileView;
