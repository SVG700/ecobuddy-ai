'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard, Navigation, PlusSquare, 
  Trophy, BrainCircuit 
} from 'lucide-react';

export type TabType = 'dashboard' | 'travel' | 'loggers' | 'challenges' | 'coach' | 'profile' | 'weekly-report';

interface BottomNavProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, setActiveTab }) => {
  const navItems = [
    { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
    { id: 'travel', label: 'Transit', icon: Navigation },
    { id: 'loggers', label: 'Logs', icon: PlusSquare },
    { id: 'challenges', label: 'Play', icon: Trophy },
    { id: 'coach', label: 'Advisor', icon: BrainCircuit },
  ] as const;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-zinc-200 bg-white/90 pb-safe-bottom pt-2 px-2 shadow-[0_-4px_12px_rgba(0,0,0,0.04)] dark:border-zinc-800/80 dark:bg-zinc-950/90 backdrop-blur-lg md:relative md:border-t-0 md:bg-transparent md:shadow-none md:p-0 md:pt-4">
      <div className="mx-auto flex max-w-lg justify-around items-center md:flex-col md:gap-3 md:max-w-none md:items-start md:px-4">
        
        {/* Desktop Title Header in nav sidebar if we layout side-by-side */}
        <div className="hidden md:block mb-2">
          <p className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Menu</p>
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as TabType)}
              className={`relative flex flex-col items-center justify-center flex-1 py-2.5 px-3 rounded-2xl md:flex-row md:justify-start md:w-full md:gap-3.5 md:py-3 md:px-4 transition-all duration-200 z-10 ${
                isActive 
                  ? 'text-emerald-600 dark:text-emerald-400 font-bold scale-105 md:scale-100' 
                  : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeTabIndicator"
                  className="absolute inset-0 bg-emerald-500/10 dark:bg-emerald-500/10 rounded-2xl -z-10"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <Icon className={`h-5.5 w-5.5 transition-transform duration-200 ${isActive ? 'scale-110 md:scale-100 stroke-[2.25px]' : 'stroke-[1.75px]'}`} />
              <span className="text-[10px] mt-1 md:text-sm font-semibold tracking-wide md:mt-0">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
export default BottomNav;
