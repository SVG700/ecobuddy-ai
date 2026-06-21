'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, Calendar, History, 
  Printer, Clipboard, FileText, ChevronRight, Leaf 
} from 'lucide-react';
import { WeeklyReport, Trip, FuelRecord, ElectricityRecord, UserProfile, UserChallenge, Challenge } from '../lib/types';
import { db } from '../lib/db';
import { generateWeeklyReportAI } from '../lib/gemini';

interface WeeklyReportViewProps {
  reports: WeeklyReport[];
  trips: Trip[];
  fuelRecords: FuelRecord[];
  electricityRecords: ElectricityRecord[];
  profile: UserProfile | null;
  challenges?: Challenge[];
  userChallenges?: UserChallenge[];
  refreshData: () => void;
}

const SkeletonLoader = () => (
  <div className="space-y-6 animate-pulse select-none" role="status" aria-live="polite" aria-label="Compiling weekly report content">
    {/* Header skeleton */}
    <div className="flex items-center gap-3 border-b border-zinc-100 dark:border-zinc-800 pb-4">
      <div className="h-10 w-10 rounded-xl bg-zinc-200 dark:bg-zinc-800 animate-shimmer"></div>
      <div className="space-y-2 flex-1">
        <div className="h-4.5 w-1/3 bg-zinc-200 dark:bg-zinc-800 rounded-md animate-shimmer"></div>
        <div className="h-3.5 w-1/4 bg-zinc-200 dark:bg-zinc-800 rounded-md animate-shimmer"></div>
      </div>
    </div>
    
    {/* Body skeleton paragraphs */}
    <div className="space-y-4 pt-2">
      <div className="h-4 w-full bg-zinc-200 dark:bg-zinc-800 rounded-md animate-shimmer"></div>
      <div className="h-4 w-5/6 bg-zinc-200 dark:bg-zinc-800 rounded-md animate-shimmer"></div>
      <div className="h-4 w-4/5 bg-zinc-200 dark:bg-zinc-800 rounded-md animate-shimmer"></div>
      <div className="h-3.5 w-full bg-zinc-200 dark:bg-zinc-800 rounded-md pt-1 animate-shimmer"></div>
      <div className="h-4 w-11/12 bg-zinc-200 dark:bg-zinc-800 rounded-md animate-shimmer"></div>
      <div className="h-4 w-3/4 bg-zinc-200 dark:bg-zinc-800 rounded-md animate-shimmer"></div>
    </div>

    {/* Section header skeleton */}
    <div className="pt-6 space-y-3">
      <div className="h-5 w-1/2 bg-zinc-200 dark:bg-zinc-800 rounded-md animate-shimmer"></div>
      <div className="h-4 w-full bg-zinc-200 dark:bg-zinc-800 rounded-md animate-shimmer"></div>
      <div className="h-4 w-4/5 bg-zinc-200 dark:bg-zinc-800 rounded-md animate-shimmer"></div>
    </div>

    {/* Footer skeleton */}
    <div className="mt-8 pt-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-between">
      <div className="h-3.5 w-1/4 bg-zinc-200 dark:bg-zinc-800 rounded-md animate-shimmer"></div>
      <div className="h-3.5 w-1/6 bg-zinc-200 dark:bg-zinc-800 rounded-md animate-shimmer"></div>
    </div>
  </div>
);

const formatReportLabel = (startDateStr: string) => {
  const startDate = new Date(startDateStr);
  const endDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);
  const optStart: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const optEnd: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
  
  if (startDate.getFullYear() !== endDate.getFullYear()) {
    const optStartWithYear: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
    return `${startDate.toLocaleDateString(undefined, optStartWithYear)} - ${endDate.toLocaleDateString(undefined, optEnd)}`;
  }
  
  return `${startDate.toLocaleDateString(undefined, optStart)} - ${endDate.toLocaleDateString(undefined, optEnd)}`;
};

export const WeeklyReportView: React.FC<WeeklyReportViewProps> = ({
  reports,
  trips,
  fuelRecords,
  electricityRecords,
  profile,
  challenges = [],
  userChallenges = [],
  refreshData
}) => {
  const [selectedReport, setSelectedReport] = useState<WeeklyReport | null>(reports[0] || null);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showExistModal, setShowExistModal] = useState(false);
  const [pendingExistingReport, setPendingExistingReport] = useState<WeeklyReport | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Calculate stats for the current weekly cycle (last 7 days of raw data)
  const totalTripsCO2 = trips.reduce((acc, t) => acc + t.co2_emissions_kg, 0);
  const totalFuelCO2 = fuelRecords.reduce((acc, f) => acc + f.co2_emissions_kg, 0);
  const totalElectricityCO2 = electricityRecords.reduce((acc, e) => acc + e.co2_emissions_kg, 0);
  const totalCO2ThisWeek = totalTripsCO2 + totalFuelCO2 + totalElectricityCO2;

  const handleGenerateReport = async (forceRegenerate = false) => {
    // 2. Detect whether a report already exists for the current user and week_start_date
    const now = new Date();
    const weekStartStr = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    console.log('[WeeklyReportView] Checking if report already exists for week:', weekStartStr);
    const existingReport = reports.find(r => r.week_start_date === weekStartStr);
    
    if (existingReport && !forceRegenerate) {
      console.log('[WeeklyReportView] Report already exists. Opening custom option modal.');
      setPendingExistingReport(existingReport);
      setShowExistModal(true);
      return;
    }

    setShowExistModal(false);
    setGenerating(true);
    setError(null);
    setSuccessMsg(null);
    const isUpdating = !!existingReport;

    try {
      // Build context payload
      const enrichedUserChallenges = (userChallenges || []).map(uc => {
        const detail = (challenges || []).find(c => c.id === uc.challenge_id);
        return {
          id: uc.id,
          challenge_id: uc.challenge_id,
          status: uc.status,
          started_at: uc.started_at,
          completed_at: uc.completed_at,
          title: detail ? detail.title : 'Unknown Challenge',
          description: detail ? detail.description : '',
          category: detail ? detail.category : '',
          points_reward: detail ? detail.points_reward : 0
        };
      });

      const context = {
        trips,
        fuelRecords,
        electricityRecords,
        userChallenges: enrichedUserChallenges as any,
        reports,
        profile: {
          full_name: profile?.full_name || 'Eco Buddy',
          points: profile?.points || 0,
          current_streak: profile?.current_streak || 0,
          carbon_saved_kg: profile?.carbon_saved_kg || 0,
          goals: profile?.goals || []
        }
      };

      // Call Gemini report generator
      console.log('[WeeklyReportView] Requesting weekly report from Gemini...');
      const reportText = await generateWeeklyReportAI(context);
      console.log('[WeeklyReportView] Gemini API response text preview:', reportText.slice(0, 150) + '...');
      
      // Save report to database/localStorage
      console.log('[WeeklyReportView] Saving weekly report to database...');
      const newReport = await db.addWeeklyReport(reportText, totalCO2ThisWeek);
      console.log('[WeeklyReportView] Supabase insert result:', newReport);

      setSelectedReport(newReport);
      refreshData();

      // Show success notification
      setSuccessMsg(isUpdating ? 'Report updated successfully.' : 'Report generated successfully.');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: unknown) {
      const e = err as any;
      console.error('[WeeklyReportView] Failed to generate weekly report:', e);
      // 5. Replace generic error text with actual database/api error messages.
      const errorMsg = e?.message || e?.details || (typeof e === 'string' ? e : JSON.stringify(e)) || 'Unknown error';
      setError(errorMsg);
      alert(`Could not compile weekly report: ${errorMsg}`);
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = () => {
    if (!selectedReport) return;
    navigator.clipboard.writeText(selectedReport.ai_action_plan);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  // Custom JSX renderer for weekly report markdown content
  const renderReportContent = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, index) => {
      const trimmed = line.trim();
      
      if (trimmed.startsWith('## ')) {
        return <h3 key={index} className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400 mt-5 mb-2 pb-1 border-b border-zinc-100 dark:border-zinc-850">{trimmed.slice(3)}</h3>;
      }
      if (trimmed.startsWith('### ')) {
        return <h4 key={index} className="text-sm sm:text-base font-extrabold text-emerald-500 dark:text-emerald-400 mt-4 mb-1.5">{trimmed.slice(4)}</h4>;
      }
      if (trimmed.startsWith('#### ')) {
        return <h5 key={index} className="text-xs sm:text-sm font-extrabold text-zinc-700 dark:text-zinc-300 mt-3 mb-1">{trimmed.slice(5)}</h5>;
      }
      
      if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
        return (
          <li key={index} className="ml-4 list-disc text-zinc-650 dark:text-zinc-300 my-1 font-medium text-xs sm:text-sm leading-relaxed">
            {parseBold(trimmed.slice(2))}
          </li>
        );
      }
      
      const numMatch = trimmed.match(/^(\d+)\.\s(.*)/);
      if (numMatch) {
        return (
          <li key={index} className="ml-4 list-decimal text-zinc-650 dark:text-zinc-300 my-1 font-medium text-xs sm:text-sm leading-relaxed">
            {parseBold(numMatch[2])}
          </li>
        );
      }

      if (trimmed === '---') {
        return <hr key={index} className="my-4 border-zinc-150 dark:border-zinc-800" />;
      }

      if (trimmed === '') {
        return <div key={index} className="h-3"></div>;
      }

      return (
        <p key={index} className="text-zinc-650 dark:text-zinc-300 my-1.5 font-medium text-xs sm:text-sm leading-relaxed">
          {parseBold(trimmed)}
        </p>
      );
    });
  };

  const parseBold = (text: string) => {
    const parts = text.split('**');
    return parts.map((part, i) => {
      if (i % 2 === 1) {
        return <strong key={i} className="font-extrabold text-emerald-600 dark:text-emerald-400">{part}</strong>;
      }
      return part;
    });
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  } as const;

  const cardVariants = {
    hidden: { opacity: 0, y: 15, scale: 0.98 },
    show: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: { type: "spring" as const, stiffness: 100, damping: 15 }
    }
  } as const;

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 lg:grid-cols-4 gap-6 pb-20 md:pb-6 print:block relative"
    >
      
      {/* Decorative ambient background glow */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-emerald-500/5 dark:bg-emerald-500/5 rounded-full blur-3xl -z-10 pointer-events-none" />

      {/* Reports History Sidebar */}
      <motion.div 
        variants={cardVariants}
        className="lg:col-span-1 p-6 rounded-3xl border border-zinc-150 bg-white dark:border-zinc-800/80 dark:bg-zinc-950/40 shadow-sm print:hidden"
      >
        <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-200 mb-4 flex items-center gap-2">
          <History className="h-4.5 w-4.5 text-zinc-400" />
          Previous Reports
        </h3>

        {/* Generate Report Primary CTA */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => handleGenerateReport(false)}
          disabled={generating}
          className="w-full mb-5 py-3 bg-gradient-to-tr from-emerald-500 to-teal-500 hover:from-emerald-450 hover:to-teal-455 text-zinc-950 font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 shadow-md shadow-emerald-500/10 transition active:scale-95 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none cursor-pointer"
        >
          <Sparkles className="h-4 w-4 fill-current animate-pulse" />
          {generating ? 'Compiling Report...' : 'Compile Weekly Report'}
        </motion.button>

        {reports.length === 0 ? (
          <p className="text-xs text-zinc-400 text-center py-6">No reports generated yet. Click above to analyze your logs.</p>
        ) : (
          <div 
            className="space-y-2 max-h-80 overflow-y-auto pr-1 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none rounded-xl"
            tabIndex={0}
            aria-label="Previous reports history list"
          >
            {reports.map((rep) => {
              const dateStr = new Date(rep.week_start_date).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              });
              const isSelected = selectedReport?.id === rep.id;
              
              return (
                <motion.button
                  whileHover={{ scale: 1.015 }}
                  whileTap={{ scale: 0.985 }}
                  key={rep.id}
                  onClick={() => setSelectedReport(rep)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border text-left text-xs font-bold transition cursor-pointer focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none ${
                    isSelected 
                      ? 'border-emerald-500 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400' 
                      : 'border-zinc-100 hover:border-zinc-250 bg-zinc-50/20 dark:border-zinc-800/80 dark:hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-zinc-400" />
                    <span>Week of {dateStr}</span>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 opacity-60 text-zinc-450" />
                </motion.button>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Main Report Document Reader */}
      <motion.div 
        variants={cardVariants}
        className="lg:col-span-3 p-6 sm:p-8 rounded-3xl border border-zinc-150 bg-white dark:border-zinc-800/80 dark:bg-zinc-950/40 shadow-sm print:border-none print:shadow-none print:bg-transparent"
      >
        {successMsg && (
          <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-450 rounded-2xl text-xs font-semibold flex items-center justify-between shadow-sm">
            <span>{successMsg}</span>
            <button onClick={() => setSuccessMsg(null)} className="text-[10px] uppercase font-black hover:underline cursor-pointer border-none bg-transparent text-emerald-600 dark:text-emerald-450">Dismiss</button>
          </div>
        )}
        {error && (
          <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-2xl text-xs font-semibold flex items-center justify-between shadow-sm">
            <span>Could not compile report: {error}</span>
            <button onClick={() => setError(null)} className="text-[10px] uppercase font-black hover:underline cursor-pointer border-none bg-transparent text-rose-500">Dismiss</button>
          </div>
        )}
        <AnimatePresence mode="wait">
          {generating ? (
            <motion.div
              key="generating-loader"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <SkeletonLoader />
            </motion.div>
          ) : selectedReport ? (
            <motion.div
              key={selectedReport.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              
              {/* Document Header Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-100 dark:border-zinc-800 pb-4 print:hidden">
                <div className="flex items-center gap-2.5">
                  <Calendar className="h-5 w-5 text-emerald-500" />
                  <div>
                    <h3 className="font-extrabold text-sm text-zinc-800 dark:text-zinc-200">
                      Weekly Analysis: {formatReportLabel(selectedReport.week_start_date)}
                    </h3>
                    <span className="text-[10px] text-zinc-405">Carbon Intensity: {selectedReport.total_emissions_kg.toFixed(1)} kg CO₂</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={copyToClipboard}
                    className="flex h-9 px-3 items-center justify-center gap-1.5 text-xs font-bold bg-zinc-100 hover:bg-zinc-250 text-zinc-650 dark:bg-zinc-800 dark:text-zinc-355 dark:hover:bg-zinc-700 rounded-xl transition cursor-pointer focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
                  >
                    <Clipboard className="h-3.5 w-3.5" />
                    {copied ? 'Copied!' : 'Copy Plan'}
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handlePrint}
                    className="flex h-9 w-9 items-center justify-center bg-zinc-100 hover:bg-zinc-250 text-zinc-650 dark:bg-zinc-800 dark:text-zinc-355 dark:hover:bg-zinc-700 rounded-xl transition cursor-pointer focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
                    title="Print Report"
                    aria-label="Print Report"
                  >
                    <Printer className="h-3.5 w-3.5" />
                  </motion.button>
                </div>
              </div>

              {/* Document Body */}
              <div className="prose dark:prose-invert max-w-none text-zinc-850 dark:text-zinc-250 select-text">
                {renderReportContent(selectedReport.ai_action_plan)}
              </div>              {/* Document Footer */}
              <div className="mt-8 pt-4 border-t border-zinc-100 dark:border-zinc-800 text-center text-[10px] text-zinc-500 dark:text-zinc-400 flex items-center justify-between">
                <span>EcoBuddy AI Sustainability Auditor</span>
                <span>Audit ID: {selectedReport.id.split('-')[0]}</span>
              </div>

            </motion.div>
          ) : (
            <motion.div
              key="empty-state"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-20"
            >
              <Leaf className="mx-auto h-12 w-12 text-zinc-300 dark:text-zinc-700 stroke-[1.25] mb-4 animate-bounce" />
              <h3 className="font-bold text-base text-zinc-700 dark:text-zinc-350">Generate Your Weekly Audit</h3>
              <p className="text-xs text-zinc-400 max-w-[280px] mx-auto mt-1 leading-relaxed">
                We compile your transportation miles, electricity consumption, and fuel refills to estimate your weekly footprint and craft a personalized AI green roadmap.
              </p>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => handleGenerateReport(false)}
                disabled={generating}
                className="mt-6 px-6 py-3 bg-gradient-to-tr from-emerald-500 to-teal-500 text-zinc-950 font-extrabold text-xs rounded-xl shadow-md transition active:scale-95 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none cursor-pointer"
              >
                {generating ? 'Processing Data...' : 'Compile First Report'}
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Global CSS Shimmer loader styles */}
      <style jsx global>{`
        @keyframes shimmer {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }
        .animate-shimmer {
          background: linear-gradient(90deg, #f4f4f5 25%, #e4e4e7 50%, #f4f4f5 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite linear;
        }
        .dark .animate-shimmer {
          background: linear-gradient(90deg, #18181b 25%, #27272a 50%, #18181b 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite linear;
        }
      `}</style>

      {/* Modal Overlay & Card */}
      <AnimatePresence>
        {showExistModal && pendingExistingReport && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowExistModal(false)}
              className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm"
            />
            
            {/* Modal Content */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-md p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-xl z-10"
              role="dialog"
              aria-modal="true"
              aria-labelledby="modal-title"
            >
              <div className="flex items-center gap-3 mb-4 text-emerald-500">
                <Leaf className="h-6 w-6 stroke-[2]" />
                <h4 id="modal-title" className="font-extrabold text-zinc-900 dark:text-zinc-50 text-base sm:text-lg">
                  Report Already Exists
                </h4>
              </div>
              
              <p className="text-zinc-650 dark:text-zinc-300 text-xs sm:text-sm font-medium mb-6 leading-relaxed">
                A weekly report has already been compiled for this week ({new Date(pendingExistingReport.week_start_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}). Would you like to view the existing report or regenerate a fresh data-driven analysis using your latest logs?
              </p>
              
              <div className="flex flex-col sm:flex-row gap-3 justify-end">
                <button
                  onClick={() => {
                    setSelectedReport(pendingExistingReport);
                    setShowExistModal(false);
                  }}
                  className="px-4 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-200 font-bold text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 transition cursor-pointer"
                >
                  View Existing Report
                </button>
                <button
                  onClick={() => handleGenerateReport(true)}
                  className="px-4 py-2.5 bg-gradient-to-tr from-emerald-500 to-teal-500 hover:from-emerald-450 hover:to-teal-455 text-zinc-950 font-extrabold text-xs rounded-xl shadow-md transition cursor-pointer"
                >
                  Regenerate Report
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </motion.div>
  );
};

export default WeeklyReportView;
