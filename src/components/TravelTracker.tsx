'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Navigation, CheckCircle2, Play, Square, Route, Flame, 
  MapPin, Clock, Gauge, Compass, History, Footprints,
  Bike as BikeIcon, Car, Bus, Train, ChevronRight
} from 'lucide-react';
import { TransportMode, Trip } from '../lib/types';
import { db } from '../lib/db';
import { calculateTripEmissions, estimateFuelConsumption, TRANSPORT_EMISSION_FACTORS } from '../lib/calculations';

interface TravelTrackerProps {
  trips: Trip[];
  refreshData: () => void;
}

export const TravelTracker: React.FC<TravelTrackerProps> = ({ trips, refreshData }) => {
  const [activeTrip, setActiveTrip] = useState<Trip | null>(() => trips.find(t => t.active) || null);
  const [selectedMode, setSelectedMode] = useState<TransportMode>('car');
  const [error, setError] = useState<string | null>(null);
  
  // Live stats
  const [liveDistance, setLiveDistance] = useState(() => {
    if (typeof window === 'undefined') return 0;
    const savedDist = localStorage.getItem('eb_active_trip_distance');
    if (savedDist) return Number(savedDist);
    const active = trips.find(t => t.active);
    return active ? Number(active.distance_km || 0) : 0;
  });
  const [liveDuration, setLiveDuration] = useState(() => {
    const active = trips.find(t => t.active);
    if (active) {
      const start = new Date(active.start_time).getTime();
      return Math.max(0, Math.floor((Date.now() - start) / 1000));
    }
    return 0;
  }); // in seconds
  
  // Geolocation tracking refs
  const watchIdRef = useRef<number | null>(null);
  const lastCoordsRef = useRef<{ lat: number; lng: number } | null>(null);
  const stoppedTripIdsRef = useRef<Set<string>>(new Set());
  
  // Simulation interval ref
  const simulationRef = useRef<NodeJS.Timeout | null>(null);
  const [isSimulated, setIsSimulated] = useState(true); // default to simulation for desktop developers
  
  // Timer interval ref
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Save live distance to localStorage to survive page refreshes
  useEffect(() => {
    if (activeTrip) {
      localStorage.setItem('eb_active_trip_distance', liveDistance.toString());
    }
  }, [liveDistance, activeTrip]);

  const stopTrackingResources = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (simulationRef.current !== null) {
      clearInterval(simulationRef.current);
      simulationRef.current = null;
    }
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopTrackingResources();
    };
  }, []);

  // Restore active trip on mount or database sync
  useEffect(() => {
    console.log('[DEBUG] useEffect activeTrip:', activeTrip?.id, 'trips.length:', trips.length, 'trips active:', trips.map(t => t.active));
    if (activeTrip && activeTrip.id.startsWith('temp-')) {
      console.log('[DEBUG] useEffect early return on temp id');
      return;
    }
    const active = trips.find(t => t.active);
    if (active && !stoppedTripIdsRef.current.has(active.id)) {
      if (!activeTrip || activeTrip.id !== active.id) {
        console.log('[DEBUG] useEffect setting activeTrip to:', active.id);
        setActiveTrip(active);
        stopTrackingResources();
        const start = new Date(active.start_time).getTime();
        const elapsedSecs = Math.max(0, Math.floor((Date.now() - start) / 1000));
        setLiveDuration(elapsedSecs);
        setLiveDistance(Number(active.distance_km || 0));
      }
      
      if (!timerRef.current) {
        timerRef.current = setInterval(() => {
          setLiveDuration(prev => prev + 1);
        }, 1000);
      }
      
      if (isSimulated && !simulationRef.current) {
        let speed = 0.011;
        if (active.transport_mode === 'walking') speed = 0.0013;
        else if (active.transport_mode === 'bicycle') speed = 0.0035;

        simulationRef.current = setInterval(() => {
          setLiveDistance(prev => Number((prev + speed * (0.8 + Math.random() * 0.4)).toFixed(3)));
        }, 1000);
      }
    } else {
      if (activeTrip) {
        const matchingTripInProps = trips.find(t => t.id === activeTrip.id);
        const shouldClear = matchingTripInProps 
          ? !matchingTripInProps.active 
          : (trips.length > 0 && !activeTrip.id.startsWith('temp-'));

        if (shouldClear) {
          setActiveTrip(null);
          stopTrackingResources();
        }
      }
    }
  }, [trips, isSimulated, activeTrip]);

  const startTrip = async () => {
    setError(null);
    const start_time = new Date().toISOString();
    const tempTripId = `temp-${Date.now()}`;
    const tempTrip: Trip = {
      id: tempTripId,
      user_id: 'optimistic-user',
      transport_mode: selectedMode,
      distance_km: 0,
      duration_min: 0,
      co2_emissions_kg: 0,
      start_time,
      active: true
    };

    // Transition UI immediately
    console.log('[DEBUG] startTrip setting optimistic activeTrip:', tempTrip.id);
    setActiveTrip(tempTrip);
    setLiveDistance(0);
    setLiveDuration(0);
    lastCoordsRef.current = null;

    // Start elapsed timer
    timerRef.current = setInterval(() => {
      setLiveDuration(prev => prev + 1);
    }, 1000);

    if (isSimulated) {
      let speed = 0.011;
      if (selectedMode === 'walking') speed = 0.0013;
      else if (selectedMode === 'bicycle') speed = 0.0035;

      simulationRef.current = setInterval(() => {
        setLiveDistance(prev => Number((prev + speed * (0.8 + Math.random() * 0.4)).toFixed(3)));
      }, 1000);
    } else {
      if (!navigator.geolocation) {
        setIsSimulated(true);
        setError('GPS unavailable. Switched to simulated travel mode.');
        
        let speed = 0.011;
        if (selectedMode === 'walking') speed = 0.0013;
        else if (selectedMode === 'bicycle') speed = 0.0035;

        if (simulationRef.current !== null) {
          clearInterval(simulationRef.current);
        }
        simulationRef.current = setInterval(() => {
          setLiveDistance(prev => Number((prev + speed * (0.8 + Math.random() * 0.4)).toFixed(3)));
        }, 1000);
      } else {
        const options = {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        };

        watchIdRef.current = navigator.geolocation.watchPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            if (lastCoordsRef.current) {
              const dist = getHaversineDistance(
                lastCoordsRef.current.lat,
                lastCoordsRef.current.lng,
                latitude,
                longitude
              );
              setLiveDistance(prev => Number((prev + dist).toFixed(3)));
            }
            lastCoordsRef.current = { lat: latitude, lng: longitude };
          },
          (err) => {
            console.error('GPS tracking error:', err);
            if (
              err.code === err.PERMISSION_DENIED ||
              err.code === err.POSITION_UNAVAILABLE ||
              err.code === err.TIMEOUT
            ) {
              setIsSimulated(true);
              setError('GPS unavailable. Switched to simulated travel mode.');
              
              if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current);
                watchIdRef.current = null;
              }

              let speed = 0.011;
              if (selectedMode === 'walking') speed = 0.0013;
              else if (selectedMode === 'bicycle') speed = 0.0035;

              if (simulationRef.current !== null) {
                clearInterval(simulationRef.current);
              }
              simulationRef.current = setInterval(() => {
                setLiveDistance(prev => Number((prev + speed * (0.8 + Math.random() * 0.4)).toFixed(3)));
              }, 1000);
            } else {
              setError('Could not acquire GPS signal. Try using simulation mode.');
            }
          },
          options
        );
      }
    }

    try {
      const realTrip = await db.startTrip(selectedMode);
      console.log('[DEBUG] startTrip database resolved, setting activeTrip to:', realTrip.id);
      setActiveTrip(prev => {
        if (prev && prev.id === tempTripId) {
          return { ...realTrip };
        }
        return prev;
      });
      refreshData();
    } catch (err: any) {
      console.error('Failed to start trip:', err);
      console.log('[DEBUG] startTrip database failed, rolling back activeTrip to null');
      setActiveTrip(null);
      stopTrackingResources();
      setError(err?.message || 'Failed to start commute on database. Please check your connection and try again.');
    }
  };

  const stopTrip = async () => {
    if (!activeTrip) return;
    
    const tripId = activeTrip.id;
    stoppedTripIdsRef.current.add(tripId);
    stopTrackingResources();
    const durationMin = Math.max(1, Math.round(liveDuration / 60));
    
    setActiveTrip(null);
    localStorage.removeItem('eb_active_trip_distance');
    
    try {
      await db.stopTrip(tripId, liveDistance, durationMin);
      setLiveDistance(0);
      setLiveDuration(0);
      refreshData();
    } catch (err: any) {
      console.error('Failed to stop trip:', err);
      setError(err?.message || 'Failed to stop and log commute on database.');
      setLiveDistance(0);
      setLiveDuration(0);
    }
  };

  // Haversine formula to compute distance in km between two GPS coordinates
  const getHaversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // radius of Earth in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const formatTime = (secs: number): string => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  const modes = [
    { id: 'walking', label: 'Walking', icon: Footprints, color: 'text-emerald-500 bg-emerald-500/10' },
    { id: 'bicycle', label: 'Bicycle', icon: BikeIcon, color: 'text-emerald-500 bg-emerald-500/10' },
    { id: 'bus', label: 'Bus', icon: Bus, color: 'text-teal-500 bg-teal-500/10' },
    { id: 'metro', label: 'Metro', icon: Navigation, color: 'text-teal-500 bg-teal-500/10' },
    { id: 'train', label: 'Train', icon: Train, color: 'text-teal-500 bg-teal-500/10' },
    { id: 'bike', label: 'Motorbike', icon: BikeIcon, color: 'text-blue-500 bg-blue-500/10' },
    { id: 'car', label: 'Car', icon: Car, color: 'text-blue-500 bg-blue-500/10' },
    { id: 'cab', label: 'Cab', icon: Car, color: 'text-rose-500 bg-rose-500/10' },
  ] as const;

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
          <button 
            type="button"
            onClick={() => setError(null)} 
            className="text-[10px] font-bold uppercase text-rose-500 hover:text-rose-600 tracking-wider focus:outline-none cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}
      
      {/* Active Trip HUD / Start Section */}
      <div className="p-6 rounded-3xl border border-zinc-150 bg-white dark:border-zinc-800/80 dark:bg-zinc-950/40 shadow-sm overflow-hidden">
        <AnimatePresence mode="wait">
          {activeTrip ? (
            /* ACTIVE TRIP INTERFACE */
            <motion.div
              key="active-trip"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-4">
                <div className="flex items-center gap-2.5">
                  <span className="relative flex h-3.5 w-3.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
                  </span>
                  <span className="font-extrabold text-sm uppercase tracking-wider text-emerald-500">
                    Tracking active {activeTrip.transport_mode} trip
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-zinc-400">
                  <span>Mode:</span>
                  <span className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 font-bold uppercase text-zinc-600 dark:text-zinc-300">
                    {isSimulated ? 'Simulated' : 'GPS Live'}
                  </span>
                </div>
              </div>

              {/* Grid display of metrics */}
              <div className="grid grid-cols-3 gap-4 text-center">
                
                {/* Odometer */}
                <div className="p-3 bg-zinc-50 dark:bg-zinc-900/40 rounded-2xl border border-zinc-100 dark:border-zinc-900">
                  <Gauge className="mx-auto h-5 w-5 text-zinc-400 mb-1" />
                  <span className="block text-2xl font-black text-zinc-800 dark:text-zinc-100">
                    {liveDistance.toFixed(2)}
                  </span>
                  <span className="text-[10px] font-bold text-zinc-400 uppercase">Distance (km)</span>
                </div>

                {/* Time */}
                <div className="p-3 bg-zinc-50 dark:bg-zinc-900/40 rounded-2xl border border-zinc-100 dark:border-zinc-900">
                  <Clock className="mx-auto h-5 w-5 text-zinc-400 mb-1" />
                  <span className="block text-2xl font-black text-zinc-800 dark:text-zinc-100">
                    {formatTime(liveDuration)}
                  </span>
                  <span className="text-[10px] font-bold text-zinc-400 uppercase">Duration</span>
                </div>

                {/* Carbon Emissions */}
                <div className="p-3 bg-zinc-50 dark:bg-zinc-900/40 rounded-2xl border border-zinc-100 dark:border-zinc-900">
                  <Compass className="mx-auto h-5 w-5 text-zinc-400 mb-1" />
                  <span className="block text-2xl font-black text-emerald-500">
                    {calculateTripEmissions(activeTrip.transport_mode, liveDistance).toFixed(2)}
                  </span>
                  <span className="text-[10px] font-bold text-zinc-400 uppercase">CO₂ (kg)</span>
                </div>

              </div>

              {/* Real-time stats visualization helper */}
              <div className="text-xs text-center text-zinc-500 dark:text-zinc-400 bg-emerald-500/5 py-2.5 rounded-xl border border-emerald-500/10">
                {activeTrip.transport_mode === 'walking' || activeTrip.transport_mode === 'bicycle' ? (
                  <span>🎉 Zero emission commute! You are saving <strong>{(liveDistance * 0.170).toFixed(2)} kg CO₂</strong> vs driving a car!</span>
                ) : (
                  <span>Emitting approximately <strong>{TRANSPORT_EMISSION_FACTORS[activeTrip.transport_mode]} kg CO₂</strong> per kilometer.</span>
                )}
              </div>

              {/* Stop Button */}
              <button
                onClick={stopTrip}
                disabled={activeTrip.id.startsWith('temp-')}
                className="w-full py-4 bg-rose-500 hover:bg-rose-600 disabled:opacity-50 font-extrabold text-zinc-950 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-rose-500/10 transition active:scale-98 focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:outline-none cursor-pointer"
              >
                <Square className="h-5 w-5 fill-current" />
                {activeTrip.id.startsWith('temp-') ? 'Connecting to Database...' : 'Stop and Log Trip'}
              </button>
            </motion.div>
          ) : (
            /* SETUP & START INTERFACE */
            <motion.div
              key="trip-setup"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="space-y-6"
            >
              <div>
                <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-200">Start a Sustainability Trip</h3>
                <p className="text-xs text-zinc-400 mt-1">Select your mode of transportation to track your route in real-time.</p>
              </div>

              {/* Toggle GPS vs Sim */}
              <div className="flex bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setIsSimulated(true)}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none cursor-pointer ${isSimulated ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-100' : 'text-zinc-400 hover:text-zinc-650'}`}
                >
                  🖥️ Simulate Ride
                </button>
                <button
                  type="button"
                  onClick={() => setIsSimulated(false)}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none cursor-pointer ${!isSimulated ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-100' : 'text-zinc-400 hover:text-zinc-650'}`}
                >
                  🛰️ Live GPS Tracker
                </button>
              </div>

              {/* Modes Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {modes.map((mode) => {
                  const Icon = mode.icon;
                  const isSelected = selectedMode === mode.id;
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setSelectedMode(mode.id)}
                      aria-pressed={isSelected}
                      className={`flex flex-col items-center p-3.5 rounded-xl border text-center transition focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none cursor-pointer ${
                        isSelected 
                          ? 'border-emerald-500 bg-emerald-500/5 text-emerald-500 font-bold scale-102 shadow-sm shadow-emerald-500/5' 
                          : 'border-zinc-150 dark:border-zinc-800 hover:border-zinc-200 dark:hover:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-900/20'
                      }`}
                    >
                      <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${mode.color} ${isSelected ? 'scale-105 transition-transform' : ''}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="text-xs text-zinc-800 dark:text-zinc-300 mt-2 font-semibold">{mode.label}</span>
                      <span className="text-[9px] text-zinc-400 mt-0.5 font-bold uppercase">
                        {TRANSPORT_EMISSION_FACTORS[mode.id] === 0 ? 'Zero' : `${TRANSPORT_EMISSION_FACTORS[mode.id]} kg/km`}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Start Button */}
              <button
                onClick={startTrip}
                className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 font-extrabold text-zinc-950 rounded-2xl flex items-center justify-center gap-2 shadow-md shadow-emerald-500/10 transition active:scale-98 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none cursor-pointer"
              >
                <Play className="h-5 w-5 fill-current" />
                Start Commute ({selectedMode})
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Trip History Log */}
      <div className="p-6 rounded-3xl border border-zinc-150 bg-white dark:border-zinc-800/80 dark:bg-zinc-950/40 shadow-sm">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-zinc-100 dark:border-zinc-800">
          <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
            <History className="h-4.5 w-4.5 text-zinc-400" />
            Trip Logs
          </h3>
          <span className="text-xs font-bold text-zinc-400">{trips.length} logged</span>
        </div>

        {trips.length === 0 ? (
          <div className="text-center py-8">
            <Route className="mx-auto h-8 w-8 text-zinc-300 dark:text-zinc-700 stroke-[1.5] mb-2" />
            <p className="text-xs text-zinc-400 font-medium">No trips tracked yet. Log your first ride!</p>
          </div>
        ) : (
          <div 
            className="divide-y divide-zinc-100 dark:divide-zinc-800/50 max-h-80 overflow-y-auto pr-1 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none rounded-xl"
            tabIndex={0}
            aria-label="Trip logs scroll list"
          >
            {trips.map((trip) => {
              const date = new Date(trip.start_time).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              });
              const isEco = trip.transport_mode === 'walking' || trip.transport_mode === 'bicycle' || trip.transport_mode === 'metro' || trip.transport_mode === 'bus' || trip.transport_mode === 'train';

              return (
                <div key={trip.id} className="py-3 flex items-center justify-between gap-3 text-xs first:pt-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${isEco ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-500'}`}>
                      <Navigation className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="font-bold text-zinc-800 dark:text-zinc-200 capitalize">{trip.transport_mode}</span>
                      <span className="block text-[10px] text-zinc-400 dark:text-zinc-500 font-semibold">{date}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <span className="font-bold text-zinc-700 dark:text-zinc-300">{trip.distance_km.toFixed(1)} km</span>
                      <span className="block text-[10px] text-zinc-400 font-semibold">{trip.duration_min} min</span>
                    </div>
                    <div className="text-right min-w-[60px]">
                      <span className={`font-extrabold ${isEco ? 'text-emerald-500' : 'text-zinc-600 dark:text-zinc-400'}`}>
                        {trip.co2_emissions_kg.toFixed(2)}
                      </span>
                      <span className="block text-[9px] text-zinc-400 font-bold uppercase">kg CO₂</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};
export default TravelTracker;
