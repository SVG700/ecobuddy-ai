'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BrainCircuit, Sparkles, Send, Trash2, ArrowRight, User, 
  TrendingUp, TrendingDown, HelpCircle, DollarSign, Leaf, Zap, 
  Compass, CheckSquare, Square, ChevronDown, ChevronUp, RefreshCw,
  AlertTriangle, CheckCircle, BarChart3, Coins, Flame
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Trip, FuelRecord, ElectricityRecord, UserProfile, CarbonScore } from '../lib/types';
import { askEcoCoach, CoachContext, generateHeuristicWeeklyReport } from '../lib/gemini';
import { db } from '../lib/db';
import { AnimatedCounter } from './AnimatedCounter';

interface AICoachViewProps {
  profile: UserProfile | null;
  trips: Trip[];
  fuelRecords: FuelRecord[];
  electricityRecords: ElectricityRecord[];
}

interface Message {
  id: string;
  sender: 'user' | 'coach';
  text: string;
  timestamp: Date;
}

export const AICoachView: React.FC<AICoachViewProps> = ({
  profile,
  trips,
  fuelRecords,
  electricityRecords
}) => {
  // Navigation & Interactive states
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditProgress, setAuditProgress] = useState(0);
  const [auditStatus, setAuditStatus] = useState('');
  const [chatOpen, setChatOpen] = useState(false);
  
  // Chat States
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Action plan interactive state
  const [completedActions, setCompletedActions] = useState<Record<string, boolean>>({});

  // Auto-scroll chat
  useEffect(() => {
    if (chatOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, chatLoading, chatOpen]);

  // Load chat & action plan status from localStorage
  useEffect(() => {
    const cachedChat = localStorage.getItem('eb_coach_chat');
    if (cachedChat) {
      try {
        setMessages(JSON.parse(cachedChat).map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp)
        })));
      } catch (e) {
        console.error(e);
      }
    } else {
      const name = profile?.full_name?.split(' ')[0] || 'Eco Buddy';
      setMessages([
        {
          id: 'init-1',
          sender: 'coach',
          text: `### 👋 Hi ${name}! I am your **AI Sustainability Advisor**!
          
Ask me any questions about your carbon footprint, green routes, or energy-saving habits.`,
          timestamp: new Date()
        }
      ]);
    }

    const cachedActions = localStorage.getItem('eb_advisor_actions');
    if (cachedActions) {
      try {
        setCompletedActions(JSON.parse(cachedActions));
      } catch (e) {
        console.error(e);
      }
    }
  }, [profile]);

  // Run audit simulation
  const handleRunAudit = () => {
    setIsAuditing(true);
    setAuditProgress(0);
    setAuditStatus('Analyzing travel logs...');

    const statuses = [
      { progress: 25, label: 'Calculating trip emissions...' },
      { progress: 50, label: 'Reading grid electricity records...' },
      { progress: 75, label: 'Correlating carbon trends...' },
      { progress: 95, label: 'Formulating action plan with Gemini AI...' },
      { progress: 100, label: 'Audit complete!' }
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < statuses.length) {
        const step = statuses[currentStep];
        setAuditProgress(step.progress);
        setAuditStatus(step.label);
        currentStep++;
      } else {
        clearInterval(interval);
        setTimeout(() => {
          setIsAuditing(false);
          // Play confetti for audit success
          confetti({
            particleCount: 80,
            spread: 50,
            origin: { y: 0.8 }
          });
        }, 600);
      }
    }, 450);
  };

  // Perform calculations for insights
  const totalTripsCO2 = trips.reduce((acc, t) => acc + t.co2_emissions_kg, 0);
  const totalFuelCO2 = fuelRecords.reduce((acc, f) => acc + f.co2_emissions_kg, 0);
  const totalElectricityCO2 = electricityRecords.reduce((acc, e) => acc + e.co2_emissions_kg, 0);
  const totalEmissions = totalTripsCO2 + totalFuelCO2 + totalElectricityCO2;

  // Breakdown percentages
  const tripsPct = totalEmissions > 0 ? (totalTripsCO2 / totalEmissions) * 100 : 0;
  const fuelPct = totalEmissions > 0 ? (totalFuelCO2 / totalEmissions) * 100 : 0;
  const elecPct = totalEmissions > 0 ? (totalElectricityCO2 / totalEmissions) * 100 : 0;
  
  // Total vehicle contributes (trips car/cab + fuel refuel)
  const vehicleCO2 = fuelRecords.reduce((acc, f) => acc + f.co2_emissions_kg, 0) + 
                     trips.filter(t => t.transport_mode === 'car' || t.transport_mode === 'cab').reduce((acc, t) => acc + t.co2_emissions_kg, 0);
  const vehiclePct = totalEmissions > 0 ? (vehicleCO2 / totalEmissions) * 100 : 0;

  // Calculate weekly trend: emissions of last 7 days vs previous 7 days
  const getWeeklyTrend = () => {
    const now = new Date();
    const oneDayMs = 24 * 60 * 60 * 1000;
    
    const last7Days = trips.filter(t => (now.getTime() - new Date(t.start_time).getTime()) <= 7 * oneDayMs).reduce((acc, t) => acc + t.co2_emissions_kg, 0) +
                      fuelRecords.filter(f => (now.getTime() - new Date(f.purchase_date).getTime()) <= 7 * oneDayMs).reduce((acc, f) => acc + f.co2_emissions_kg, 0);
                      
    const prev7Days = trips.filter(t => {
      const diff = now.getTime() - new Date(t.start_time).getTime();
      return diff > 7 * oneDayMs && diff <= 14 * oneDayMs;
    }).reduce((acc, t) => acc + t.co2_emissions_kg, 0) +
    fuelRecords.filter(f => {
      const diff = now.getTime() - new Date(f.purchase_date).getTime();
      return diff > 7 * oneDayMs && diff <= 14 * oneDayMs;
    }).reduce((acc, f) => acc + f.co2_emissions_kg, 0);

    const change = last7Days - prev7Days;
    const pct = prev7Days > 0 ? (change / prev7Days) * 100 : 0;

    return {
      current: last7Days,
      previous: prev7Days,
      percent: pct,
      increased: change > 0
    };
  };

  const trend = getWeeklyTrend();

  // Savings suggestions calculations
  // Switch to transit: e.g. Car (0.170 kg/km) to Metro (0.028 kg/km) -> saving 0.142 kg/km.
  // Assume a default commuter distance of 15km, twice a week -> 60km.
  const transitSavingsCO2 = 60 * 0.142; // ~8.5 kg CO2 saved
  // Electricity savings: 10% reduction of electricity average bill (e.g. 15 kWh saved -> 15 * 0.85 = 12.75 kg CO2)
  const elecSavingsCO2 = (totalElectricityCO2 > 0 ? totalElectricityCO2 * 0.10 : 12.75);
  // Total potential savings
  const potentialCO2Saved = Number((transitSavingsCO2 + elecSavingsCO2 + 3.0).toFixed(1)); // +3kg for bottle challenge
  
  // Cost savings:
  // Fuel saved: ~5 Litres petrol saved per week -> ~$8.00
  // Electricity saved: 15 kWh -> ~$3.50
  const potentialCostSavings = Number((5 * 1.80 + (elecSavingsCO2 / 0.85) * 0.18).toFixed(2));

  // Score boost:
  const potentialScoreBoost = Math.min(15, 100 - (profile?.points ? Math.round(profile.points/20) : 70));

  // Chat message submit
  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || chatLoading) return;

    const userMsg: Message = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date()
    };

    const updated = [...messages, userMsg];
    setMessages(updated);
    localStorage.setItem('eb_coach_chat', JSON.stringify(updated));
    setInputText('');
    setChatLoading(true);

    const context: CoachContext = {
      trips,
      fuelRecords,
      electricityRecords,
      profile: {
        full_name: profile?.full_name || 'Eco Buddy',
        points: profile?.points || 0,
        current_streak: profile?.current_streak || 0,
        carbon_saved_kg: profile?.carbon_saved_kg || 0,
        goals: profile?.goals || []
      }
    };

    try {
      const reply = await askEcoCoach(textToSend, context);
      const coachMsg: Message = {
        id: `msg-reply-${Date.now()}`,
        sender: 'coach',
        text: reply,
        timestamp: new Date()
      };
      const finalMsgs = [...updated, coachMsg];
      setMessages(finalMsgs);
      localStorage.setItem('eb_coach_chat', JSON.stringify(finalMsgs));
    } catch (e) {
      console.error(e);
      const errMsg: Message = {
        id: `msg-err-${Date.now()}`,
        sender: 'coach',
        text: '⚠️ Communication timeout. Using local advisor engine.',
        timestamp: new Date()
      };
      setMessages([...updated, errMsg]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleClearChat = () => {
    if (window.confirm('Clear conversation history?')) {
      const name = profile?.full_name?.split(' ')[0] || 'Eco Buddy';
      const reset: Message[] = [
        {
          id: 'init-1',
          sender: 'coach',
          text: `### 👋 Hi ${name}! I am your **AI Sustainability Advisor**!
          
Ask me any questions about your carbon footprint, green routes, or energy-saving habits.`,
          timestamp: new Date()
        }
      ];
      setMessages(reset);
      localStorage.setItem('eb_coach_chat', JSON.stringify(reset));
    }
  };

  // Toggle Action Plan Checkbox
  const toggleActionItem = (id: string, pointsReward: number) => {
    const nextVal = !completedActions[id];
    const updated = { ...completedActions, [id]: nextVal };
    setCompletedActions(updated);
    localStorage.setItem('eb_advisor_actions', JSON.stringify(updated));

    if (nextVal) {
      // Confetti burst for item complete!
      confetti({
        particleCount: 40,
        spread: 30,
        colors: ['#10b981', '#34d399', '#6ee7b7']
      });

      // Award profile points
      if (profile) {
        db.updateProfile({ points: profile.points + pointsReward });
      }
    }
  };

  const renderMessageContent = (text: string) => {
    return text.split('\n').map((line, idx) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('### ')) return <h4 key={idx} className="text-sm font-extrabold text-emerald-400 mt-2 mb-0.5">{trimmed.slice(4)}</h4>;
      if (trimmed.startsWith('## ')) return <h3 key={idx} className="text-base font-extrabold text-emerald-400 mt-3 mb-1">{trimmed.slice(3)}</h3>;
      if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) return <li key={idx} className="ml-4 list-disc text-zinc-350 my-0.5 text-xs">{trimmed.slice(2)}</li>;
      if (trimmed === '') return <div key={idx} className="h-2"></div>;
      return <p key={idx} className="text-zinc-350 my-0.5 text-xs leading-relaxed">{trimmed}</p>;
    });
  };

  // Action Plan list items
  const actionItems = [
    { id: 'act-1', text: 'Use public transport (metro/bus) for 2 commutes', points: 40 },
    { id: 'act-2', text: 'Reduce electricity units by 10% (unplug phantom loads)', points: 30 },
    { id: 'act-3', text: 'Complete a "No-Car Day" eco challenge', points: 50 }
  ];

  const coachContainer = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  } as const;

  const coachCard = {
    hidden: { opacity: 0, y: 15, scale: 0.98 },
    show: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: { type: "spring" as const, stiffness: 100, damping: 15 }
    }
  } as const;

  return (
    <div className="space-y-6 pb-20 md:pb-6 relative">
      
      {/* Decorative glow elements */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-emerald-500/5 dark:bg-emerald-500/5 rounded-full blur-3xl -z-10 pointer-events-none" />
      
      {/* 1. Header Banner & Audit CTA */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl border border-emerald-500/25 bg-gradient-to-tr from-zinc-950 via-emerald-950/20 to-zinc-900 p-6 shadow-md shadow-emerald-500/5"
      >
        
        {/* Decorative background grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#022c22_1px,transparent_1px),linear-gradient(to_bottom,#022c22_1px,transparent_1px)] bg-[size:24px_24px] opacity-10"></div>
        
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-2xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center border border-emerald-500/25 shrink-0 shadow-lg shadow-emerald-500/10 animate-pulse">
              <BrainCircuit className="h-6.5 w-6.5" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-zinc-100 flex items-center gap-1.5">
                AI Sustainability Advisor <Sparkles className="h-4.5 w-4.5 text-emerald-400" />
              </h2>
              <p className="text-xs text-zinc-400 mt-1 max-w-md">
                Continuous machine learning analysis of your commuting, electrical grids, and fuel records to advise on footprint reduction.
              </p>
            </div>
          </div>
          
          <button
            onClick={handleRunAudit}
            disabled={isAuditing}
            className="px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-zinc-950 font-black text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/15 transition active:scale-98 disabled:opacity-75 shrink-0 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none cursor-pointer"
          >
            {isAuditing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {isAuditing ? 'Auditing Footprint...' : 'Run Advisor Audit'}
          </button>
        </div>

        {/* Audit Progress Bar */}
        <AnimatePresence>
          {isAuditing && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-5 space-y-2 overflow-hidden"
            >
              <div className="flex justify-between text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                <span>{auditStatus}</span>
                <span>{auditProgress}%</span>
              </div>
              <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-400"
                  animate={{ width: `${auditProgress}%` }}
                  transition={{ duration: 0.3 }}
                ></motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* 2. AI Carbon Insights Section */}
      <div className="space-y-3">
        <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
          <BarChart3 className="h-4.5 w-4.5 text-emerald-500" />
          AI Ecological Insights
        </h3>

        <motion.div 
          variants={coachContainer}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          
          {/* Card 1: Emissions Trend */}
          <motion.div 
            variants={coachCard}
            whileHover={{ y: -4, scale: 1.01, boxShadow: "0 10px 30px -10px rgba(0,0,0,0.05)" }}
            className="p-5 rounded-3xl border border-zinc-150 bg-white dark:border-zinc-800/80 dark:bg-zinc-950/40 shadow-sm flex flex-col justify-between hover:border-zinc-200 dark:hover:border-zinc-800 transition relative overflow-hidden group"
          >
            <div className="absolute -inset-px bg-gradient-to-tr from-emerald-500/0 to-emerald-500/0 group-hover:from-emerald-500/4 group-hover:to-teal-500/4 rounded-3xl transition duration-500 -z-10" />
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400">Weekly Trend</span>
              {trend.percent > 0 ? (
                <div className="h-7 w-7 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center">
                  <TrendingUp className="h-4 w-4" />
                </div>
              ) : (
                <div className="h-7 w-7 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                  <TrendingDown className="h-4 w-4" />
                </div>
              )}
            </div>
            
            <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 leading-snug">
              {trend.percent !== 0 ? (
                <span>Your weekly carbon emissions {trend.increased ? 'increased' : 'decreased'} by <strong className={trend.increased ? 'text-rose-500' : 'text-emerald-500'}><AnimatedCounter value={Math.abs(trend.percent)} decimals={1} />%</strong>.</span>
              ) : (
                <span>Your weekly carbon emissions remained stable against baseline.</span>
              )}
            </h4>
            
            <p className="text-[11px] text-zinc-400 mt-2">
              {trend.increased 
                ? 'Try substituting vehicle travels with metro transit to bring emissions back down.' 
                : 'Excellent job maintaining a green commute cycle this week! Keep it up.'}
            </p>
          </motion.div>

          {/* Card 2: Contributor analysis */}
          <motion.div 
            variants={coachCard}
            whileHover={{ y: -4, scale: 1.01, boxShadow: "0 10px 30px -10px rgba(0,0,0,0.05)" }}
            className="p-5 rounded-3xl border border-zinc-150 bg-white dark:border-zinc-800/80 dark:bg-zinc-950/40 shadow-sm flex flex-col justify-between hover:border-zinc-200 dark:hover:border-zinc-800 transition relative overflow-hidden group"
          >
            <div className="absolute -inset-px bg-gradient-to-tr from-blue-500/0 to-blue-500/0 group-hover:from-blue-500/4 group-hover:to-cyan-500/4 rounded-3xl transition duration-500 -z-10" />
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400">Major Contributor</span>
              <div className="h-7 w-7 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
                <AlertTriangle className="h-4 w-4" />
              </div>
            </div>

            <div>
              <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 leading-snug">
                {vehiclePct > 0 ? (
                  <span>Vehicle travel contributes <strong className="text-blue-500"><AnimatedCounter value={vehiclePct} />%</strong> of your carbon footprint.</span>
                ) : (
                  <span>Grid electricity represents your largest carbon contributor.</span>
                )}
              </h4>
              
              {/* Mini horizontal bar graph */}
              <div className="mt-3.5 space-y-1.5">
                <div className="flex justify-between text-[9px] font-bold text-zinc-400 uppercase">
                  <span>Transit / Gas Refills</span>
                  <span>{vehiclePct.toFixed(0)}%</span>
                </div>
                <div className="h-1.5 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${vehiclePct}%` }}
                    transition={{ duration: 1.0, ease: "easeOut", delay: 0.2 }}
                    className="h-full bg-blue-500"
                  ></motion.div>
                </div>
              </div>
            </div>
            
            <p className="text-[11px] text-zinc-400 mt-3.5">
              Refilling fuel litres is the heaviest single source. Aim to log short walks for quick errands.
            </p>
          </motion.div>

          {/* Card 3: Switch recommendation */}
          <motion.div 
            variants={coachCard}
            whileHover={{ y: -4, scale: 1.01, boxShadow: "0 10px 30px -10px rgba(0,0,0,0.05)" }}
            className="p-5 rounded-3xl border border-zinc-150 bg-white dark:border-zinc-800/80 dark:bg-zinc-950/40 shadow-sm flex flex-col justify-between hover:border-zinc-200 dark:hover:border-zinc-800 transition relative overflow-hidden group"
          >
            <div className="absolute -inset-px bg-gradient-to-tr from-emerald-500/0 to-emerald-500/0 group-hover:from-emerald-500/4 group-hover:to-teal-500/4 rounded-3xl transition duration-500 -z-10" />
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400">Greener Transit Opportunity</span>
              <div className="h-7 w-7 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <Compass className="h-4 w-4" />
              </div>
            </div>

            <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 leading-snug">
              Using public transport twice per week could reduce emissions by <strong className="text-emerald-500">25%</strong>.
            </h4>
            
            <p className="text-[11px] text-zinc-400 mt-2">
              Metro systems release up to 6x less carbon per km than solo car rides. It is your fastest path to an Eco Champion score.
            </p>
            
            <div className="mt-3 flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
              <span>Alternative routes detected</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </div>
          </motion.div>

        </motion.div>
      </div>

      {/* 3. Potential Savings & Impact Dial */}
      <motion.div 
        variants={coachContainer}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
      >
        
        {/* Savings HUD Card */}
        <motion.div 
          variants={coachCard}
          className="lg:col-span-2 p-6 rounded-3xl border border-zinc-150 bg-white dark:border-zinc-800/80 dark:bg-zinc-950/40 shadow-sm flex flex-col justify-between"
        >
          <div>
            <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-emerald-500" />
              Weekly Potential Impact Simulation
            </h3>
            <p className="text-xs text-zinc-400 mt-1">Estimations based on completing your action items this week.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-6">
            
            {/* CO2 reduction */}
            <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 space-y-1">
              <Leaf className="h-5 w-5 text-emerald-500 mb-1" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">CO₂ Reduction</span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-emerald-500">
                  -<AnimatedCounter value={potentialCO2Saved} decimals={1} />
                </span>
                <span className="text-xs font-bold text-emerald-500/80">kg</span>
              </div>
              <p className="text-[9px] text-zinc-450 dark:text-zinc-400 mt-1">Equivalent to planting 1 tree</p>
            </div>

            {/* Cost savings */}
            <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/10 space-y-1">
              <DollarSign className="h-5 w-5 text-blue-500 mb-1" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Cost Savings</span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-blue-500">
                  $<AnimatedCounter value={potentialCostSavings} decimals={1} />
                </span>
                <span className="text-xs font-bold text-blue-500/80">USD</span>
              </div>
              <p className="text-[9px] text-zinc-450 dark:text-zinc-400 mt-1">Reduced gas refills & utilities</p>
            </div>

            {/* Score boost */}
            <div className="p-4 rounded-2xl bg-yellow-500/5 border border-yellow-500/10 space-y-1">
              <Flame className="h-5 w-5 text-yellow-500 mb-1" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Score Boost</span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-yellow-500">
                  +<AnimatedCounter value={potentialScoreBoost} />
                </span>
                <span className="text-xs font-bold text-yellow-500/80">Points</span>
              </div>
              <p className="text-[9px] text-zinc-450 dark:text-zinc-400 mt-1">Raises sustainability index</p>
            </div>

          </div>
        </motion.div>

        {/* Weekly Action Plan */}
        <motion.div 
          variants={coachCard}
          className="p-6 rounded-3xl border border-zinc-150 bg-white dark:border-zinc-800/80 dark:bg-zinc-950/40 shadow-sm flex flex-col justify-between"
        >
          <div>
            <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
              <CheckSquare className="h-5 w-5 text-emerald-500" />
              Weekly Action Plan
            </h3>
            <p className="text-xs text-zinc-400 mt-1">Check off habits to earn bonus points.</p>
          </div>

          <div className="mt-4 space-y-3 flex-1 flex flex-col justify-center">
            {actionItems.map((item) => {
              const isChecked = !!completedActions[item.id];
              return (
                <motion.button
                  whileHover={{ scale: 1.015 }}
                  whileTap={{ scale: 0.985 }}
                  key={item.id}
                  onClick={() => toggleActionItem(item.id, item.points)}
                  aria-pressed={isChecked}
                  className={`w-full p-3.5 rounded-xl border text-left flex items-start gap-3 transition cursor-pointer focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none ${
                    isChecked 
                      ? 'border-emerald-500/20 bg-emerald-500/5 opacity-80' 
                      : 'border-zinc-150 hover:border-zinc-250 bg-zinc-50/50 dark:border-zinc-850 dark:bg-zinc-950/10'
                  }`}
                >
                  <div className={`mt-0.5 shrink-0 h-4.5 w-4.5 rounded-md border flex items-center justify-center transition-colors ${
                    isChecked 
                      ? 'bg-emerald-500 border-emerald-500 text-zinc-950' 
                      : 'border-zinc-350 dark:border-zinc-700'
                  }`}>
                    {isChecked && <CheckCircle className="h-4.5 w-4.5 text-zinc-950 fill-current" />}
                  </div>
                  <div>
                    <span className={`block text-xs font-semibold ${isChecked ? 'line-through text-zinc-400' : 'text-zinc-750 dark:text-zinc-350'}`}>
                      {item.text}
                    </span>
                    <span className="block text-[9px] font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                      +{item.points} pts bonus
                    </span>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </motion.div>

      </motion.div>

      {/* 5. Collapsible AI Chat Terminal */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="border border-zinc-150 bg-white dark:border-zinc-800/80 dark:bg-zinc-950/40 rounded-3xl overflow-hidden shadow-sm"
      >
        
        {/* Accordion trigger header */}
        <button
          onClick={() => setChatOpen(!chatOpen)}
          aria-expanded={chatOpen}
          aria-controls="ai-coach-chat-panel"
          id="ai-coach-chat-trigger"
          className="w-full bg-zinc-50 dark:bg-zinc-900/20 px-6 py-4.5 flex items-center justify-between hover:bg-zinc-100/40 dark:hover:bg-zinc-900/40 transition cursor-pointer focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
        >
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/15 shadow-inner">
              <BrainCircuit className="h-5 w-5" />
            </div>
            <div className="text-left">
              <h3 className="font-extrabold text-sm text-zinc-800 dark:text-zinc-200">💬 Expand AI Advisor Chat Console</h3>
              <span className="text-[10px] text-zinc-450 dark:text-zinc-400">Ask customized carbon questions, route savings, or carbon facts.</span>
            </div>
          </div>
          <motion.div animate={{ rotate: chatOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown className="h-5 w-5 text-zinc-400" />
          </motion.div>
        </button>

        <AnimatePresence initial={false}>
          {chatOpen && (
            <motion.div 
              id="ai-coach-chat-panel"
              role="region"
              aria-labelledby="ai-coach-chat-trigger"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 384, opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col border-t border-zinc-150 dark:border-zinc-800/80 overflow-hidden"
            >
              {/* Scrollable messages container */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-zinc-50/20">
                {messages.map((msg) => {
                  const isCoach = msg.sender === 'coach';
                  return (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.25 }}
                      key={msg.id}
                      className={`flex items-start gap-2.5 max-w-[85%] ${isCoach ? 'mr-auto' : 'ml-auto flex-row-reverse'}`}
                    >
                      <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold border ${
                        isCoach 
                          ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' 
                          : 'bg-zinc-100 text-zinc-650 border-zinc-200 dark:bg-zinc-850 dark:text-zinc-400 dark:border-zinc-800'
                      }`}>
                        {isCoach ? <BrainCircuit className="h-4 w-4" /> : <User className="h-4 w-4" />}
                      </div>

                      <div className={`rounded-2xl px-4 py-2.5 border text-xs relative group ${
                        isCoach 
                          ? 'bg-white border-zinc-100 dark:bg-zinc-900/30 dark:border-zinc-900 text-zinc-800 dark:text-zinc-200' 
                          : 'bg-emerald-500 border-emerald-600 text-zinc-950 font-bold'
                      }`}>
                        {isCoach ? (
                          <div className="space-y-1">{renderMessageContent(msg.text)}</div>
                        ) : (
                          <p className="text-zinc-950 font-semibold">{msg.text}</p>
                        )}
                        <span className={`block text-[8px] mt-1 font-bold uppercase tracking-wider text-right ${isCoach ? 'text-zinc-450' : 'text-emerald-950/70'}`}>
                          {msg.timestamp.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}

                {chatLoading && (
                  <div className="flex items-start gap-2.5 mr-auto">
                    <div className="h-8 w-8 rounded-lg bg-emerald-500/15 text-emerald-500 flex items-center justify-center shrink-0 animate-pulse">
                      <BrainCircuit className="h-4 w-4" />
                    </div>
                    <div className="rounded-2xl px-4 py-2.5 bg-white border border-zinc-100 dark:bg-zinc-900/30 dark:border-zinc-900 text-zinc-400 flex items-center gap-1.5 shadow-sm">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-[bounce_1s_infinite_100ms]"></span>
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-[bounce_1s_infinite_200ms]"></span>
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-[bounce_1s_infinite_300ms]"></span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat actions bar */}
              <div className="p-3.5 border-t border-zinc-150 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/20 flex gap-2">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  disabled={chatLoading}
                  placeholder="Ask Advisor: e.g. How do phantom electricity loads occur?"
                  className="flex-1 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-xs text-zinc-800 placeholder-zinc-400 focus:border-emerald-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-100 transition"
                />
                <button
                  onClick={() => handleSendMessage(inputText)}
                  disabled={!inputText.trim() || chatLoading}
                  className="h-10 px-4 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-500 text-zinc-950 font-black text-xs flex items-center justify-center gap-1 hover:from-emerald-400 hover:to-teal-400 transition cursor-pointer focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
                >
                  <Send className="h-3.5 w-3.5 fill-current" />
                  Ask
                </button>
                <button
                  onClick={handleClearChat}
                  className="h-10 w-10 rounded-xl border border-zinc-200 hover:border-red-500/20 hover:bg-red-500/5 text-zinc-400 hover:text-red-500 flex items-center justify-center transition cursor-pointer focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none"
                  title="Clear History"
                  aria-label="Clear Chat History"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

    </div>
  );
};
export default AICoachView;
