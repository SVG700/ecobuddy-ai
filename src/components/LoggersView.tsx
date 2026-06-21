'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Fuel, Zap, Calendar, History, Trash2, Camera, Upload, 
  Sparkles, Check, AlertCircle, RefreshCw, BarChart2,
  TrendingUp, TrendingDown, HelpCircle, ArrowRight
} from 'lucide-react';
import { FuelRecord, ElectricityRecord, FuelType } from '../lib/types';
import { db } from '../lib/db';
import { FUEL_EMISSION_FACTORS, ELECTRICITY_EMISSION_FACTOR } from '../lib/calculations';
import Image from 'next/image';

interface LoggersViewProps {
  fuelRecords: FuelRecord[];
  electricityRecords: ElectricityRecord[];
  refreshData: () => void;
}

export const LoggersView: React.FC<LoggersViewProps> = ({
  fuelRecords,
  electricityRecords,
  refreshData
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'fuel' | 'electricity'>('fuel');
  
  // Fuel inputs
  const [fuelLitres, setFuelLitres] = useState('');
  const [fuelType, setFuelType] = useState<FuelType>('petrol');
  const [vehicleMileage, setVehicleMileage] = useState('14'); // default 14 km/L
  const [fuelLoading, setFuelLoading] = useState(false);
  const [fuelPreviewUrl, setFuelPreviewUrl] = useState<string | null>(null);
  const [fuelError, setFuelError] = useState<string | null>(null);
  
  // Fuel Scanner states
  const [fuelScanning, setFuelScanning] = useState(false);
  const [fuelScanInsights, setFuelScanInsights] = useState<{
    co2: number;
    insight: string;
    rec: string;
    diffLitres: number;
    isIncrease: boolean;
  } | null>(null);

  // Electricity inputs
  const [elecUnits, setElecUnits] = useState('');
  const [billMonth, setBillMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
  });
  const [billPreviewUrl, setBillPreviewUrl] = useState<string | null>(null);
  const [elecLoading, setElecLoading] = useState(false);
  const [elecError, setElecError] = useState<string | null>(null);
  
  // Electricity Scanner states
  const [elecScanning, setElecScanning] = useState(false);
  const [elecScanInsights, setElecScanInsights] = useState<{
    pctChange: number;
    insight: string;
    rec: string;
    diffUnits: number;
    isIncrease: boolean;
  } | null>(null);

  // === FUEL RECEIPT SCANNER ===
  const handleFuelReceiptSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setFuelPreviewUrl(reader.result as string);
      startFuelScanSimulation(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const startFuelScanSimulation = (preview: string) => {
    setFuelScanning(true);
    setFuelScanInsights(null);

    setTimeout(() => {
      setFuelScanning(false);
      
      // Extract simulated litres
      const scannedLitres = Math.floor(22 + Math.random() * 14);
      setFuelLitres(scannedLitres.toString());

      // Compare vs last fuel refill
      const prevLitres = fuelRecords[0]?.litres || 25;
      const diff = scannedLitres - prevLitres;
      const co2 = scannedLitres * FUEL_EMISSION_FACTORS[fuelType];

      setFuelScanInsights({
        co2,
        insight: `Your fuel usage suggests approximately ${co2.toFixed(0)} kg CO₂ emissions for this refill.`,
        rec: diff > 0 
          ? "Emissions exceeded your previous log. Consider carpooling on Thursdays to save ~15 kg CO₂."
          : "Refuel volume dropped! Keep substituting short drives with active cycle commutes.",
        diffLitres: Math.abs(diff),
        isIncrease: diff > 0
      });
    }, 2800);
  };

  // Handle Fuel submit
  const handleFuelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFuelError(null);
    if (!fuelLitres) {
      setFuelError('Fuel litres is required.');
      return;
    }
    if (!vehicleMileage) {
      setFuelError('Vehicle mileage is required.');
      return;
    }

    const litres = parseFloat(fuelLitres);
    const mileage = parseFloat(vehicleMileage);

    if (isNaN(litres) || litres <= 0) {
      setFuelError('Fuel litres must be greater than 0.');
      return;
    }

    if (isNaN(mileage) || mileage <= 0) {
      setFuelError('Vehicle mileage must be greater than 0.');
      return;
    }

    setFuelLoading(true);
    try {
      await db.addFuelRecord(
        litres,
        fuelType,
        mileage
      );
      setFuelLitres('');
      setFuelPreviewUrl(null);
      setFuelScanInsights(null);
      refreshData();
    } catch (error) {
      console.error('Error logging fuel:', error);
      setFuelError('Failed to log fuel record.');
    } finally {
      setFuelLoading(false);
    }
  };

  // === ELECTRICITY BILL SCANNER ===
  const handleBillSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setBillPreviewUrl(reader.result as string);
      startElecScanSimulation(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const startElecScanSimulation = (preview: string) => {
    setElecScanning(true);
    setElecScanInsights(null);
    
    setTimeout(() => {
      setElecScanning(false);
      
      const scannedKwh = Math.floor(130 + Math.random() * 60);
      setElecUnits(scannedKwh.toString());

      // Compare vs last monthly bill
      const prevKwh = electricityRecords[0]?.units_kwh || 150;
      const diff = scannedKwh - prevKwh;
      const pct = (diff / prevKwh) * 100;

      setElecScanInsights({
        pctChange: pct,
        insight: `Your consumption ${diff >= 0 ? 'increased' : 'decreased'} by ${Math.abs(pct).toFixed(0)}% compared to last month.`,
        rec: diff >= 0
          ? "Consumption spiked. Unplug television and router at night to save up to 10 kWh."
          : "Grid draw decreased! Swapping remaining bulbs to LED will lower utilities further.",
        diffUnits: Math.abs(diff),
        isIncrease: diff >= 0
      });
    }, 2800);
  };

  // Handle Electricity submit
  const handleElecSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setElecError(null);
    if (!elecUnits) {
      setElecError('Electricity units is required.');
      return;
    }
    if (!billMonth) {
      setElecError('Billing month is required.');
      return;
    }

    const units = parseFloat(elecUnits);
    if (isNaN(units) || units <= 0) {
      setElecError('Electricity units must be greater than 0.');
      return;
    }

    setElecLoading(true);
    try {
      await db.addElectricityRecord(
        units,
        billMonth,
        billPreviewUrl || undefined
      );
      setElecUnits('');
      setBillPreviewUrl(null);
      setElecScanInsights(null);
      refreshData();
    } catch (error) {
      console.error('Error logging electricity:', error);
      setElecError('Failed to log electricity record.');
    } finally {
      setElecLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-20 md:pb-6 relative">
      
      {/* Decorative ambient SaaS glow */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-emerald-500/5 dark:bg-emerald-500/5 rounded-full blur-3xl -z-10 pointer-events-none" />
      
      {/* Subtab Toggle header */}
      <div className="flex bg-zinc-100 dark:bg-zinc-900 p-1 rounded-2xl border border-zinc-200/40 dark:border-zinc-800/60 shadow-sm max-w-md relative">
        <button
          onClick={() => {
            setActiveSubTab('fuel');
            setFuelError(null);
            setElecError(null);
          }}
          className={`relative flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold rounded-xl transition cursor-pointer z-10 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none ${
            activeSubTab === 'fuel' 
              ? 'text-emerald-600 dark:text-emerald-400 font-bold' 
              : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'
          }`}
        >
          {activeSubTab === 'fuel' && (
            <motion.div
              layoutId="activeSubTabIndicator"
              className="absolute inset-0 bg-white shadow-md dark:bg-zinc-800 rounded-xl -z-10"
              transition={{ type: "spring", stiffness: 350, damping: 25 }}
            />
          )}
          <Fuel className="h-4 w-4" />
          Vehicle Fuel
        </button>
        <button
          onClick={() => {
            setActiveSubTab('electricity');
            setFuelError(null);
            setElecError(null);
          }}
          className={`relative flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold rounded-xl transition cursor-pointer z-10 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none ${
            activeSubTab === 'electricity' 
              ? 'text-emerald-600 dark:text-emerald-400 font-bold' 
              : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'
          }`}
        >
          {activeSubTab === 'electricity' && (
            <motion.div
              layoutId="activeSubTabIndicator"
              className="absolute inset-0 bg-white shadow-md dark:bg-zinc-800 rounded-xl -z-10"
              transition={{ type: "spring", stiffness: 350, damping: 25 }}
            />
          )}
          <Zap className="h-4 w-4" />
          Grid Electricity
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeSubTab === 'fuel' ? (
          /* ==================== VEHICLE FUEL TAB ==================== */
          <motion.div 
            key="fuel"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            
            {/* Fuel Input Form */}
            <div className="lg:col-span-1 p-6 rounded-3xl border border-zinc-150 bg-white dark:border-zinc-800/80 dark:bg-zinc-950/40 shadow-sm relative overflow-hidden">
              
              {/* Holographic scanner overlay for Fuel */}
              <AnimatePresence>
                {fuelScanning && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    role="status"
                    aria-live="polite"
                    className="absolute inset-0 z-20 bg-zinc-955/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center"
                  >
                    <div className="relative h-20 w-32 border-2 border-blue-500/30 rounded-lg overflow-hidden flex items-center justify-center">
                      <div className="absolute inset-0 bg-blue-500/10 animate-pulse"></div>
                      <div className="absolute left-0 right-0 h-1 bg-blue-400 shadow-[0_0_8px_#3b82f6] animate-[scan_1.5s_ease-in-out_infinite]"></div>
                      <Camera className="h-8 w-8 text-blue-400" />
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-blue-400 font-bold text-sm">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      EcoBuddy Fuel Scanner...
                    </div>
                    <p className="text-[10px] text-zinc-400 mt-1.5 max-w-[180px]">Extracting refill volume in litres from fuel receipt.</p>
                  </motion.div>
                )}
              </AnimatePresence>

              <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-200 mb-4 flex items-center gap-2">
                <Fuel className="h-5 w-5 text-blue-500" />
                Log Fuel Refill
              </h3>
              
              <form onSubmit={handleFuelSubmit} noValidate className="space-y-4">
                
                {/* Receipt Upload area */}
                <div>
                  <label htmlFor="fuel-receipt-upload" className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1">Upload Receipt (AI Scanner)</label>
                  <div className="relative border-2 border-dashed border-zinc-200/75 hover:border-blue-500/40 dark:border-zinc-800/60 dark:hover:border-blue-500/30 rounded-2xl p-4 flex flex-col items-center justify-center bg-zinc-50/50 dark:bg-zinc-900/10 text-center cursor-pointer transition focus-within:ring-2 focus-within:ring-blue-500 focus-within:outline-none">
                    <input
                      id="fuel-receipt-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleFuelReceiptSelect}
                      className="absolute inset-0 opacity-0 cursor-pointer z-10"
                    />
                    {fuelPreviewUrl ? (
                      <div className="space-y-2">
                        <Image 
                          src={fuelPreviewUrl} 
                          alt="Receipt preview" 
                          width={64}
                          height={64}
                          unoptimized
                          className="h-16 w-auto mx-auto rounded-lg object-cover border border-zinc-200 dark:border-zinc-800" 
                        />
                        <span className="block text-[10px] font-bold text-blue-500 flex items-center justify-center gap-1">
                          <Check className="h-3 w-3" /> Receipt uploaded successfully
                        </span>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <Upload className="mx-auto h-6 w-6 text-zinc-400" />
                        <span className="block text-xs font-bold text-zinc-650 dark:text-zinc-450">Take Photo or Upload receipt</span>
                        <span className="block text-[9px] text-zinc-500">AI reads fuel litres automatically</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Scanned Insights overlay */}
                <AnimatePresence>
                  {fuelScanInsights && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      role="region"
                      aria-live="polite"
                      aria-label="Fuel Scanner Insights"
                      className="p-4 bg-blue-500/5 rounded-2xl border border-blue-500/10 space-y-2 overflow-hidden"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-blue-500 flex items-center gap-1">
                          <Sparkles className="h-3.5 w-3.5 fill-current" /> AI Scanner Insights
                        </span>
                        <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                          fuelScanInsights.isIncrease 
                            ? 'bg-rose-500/10 text-rose-500 border-rose-500/15' 
                            : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/15'
                        }`}>
                          {fuelScanInsights.isIncrease ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                          <span>{fuelScanInsights.diffLitres.toFixed(0)}L {fuelScanInsights.isIncrease ? 'more' : 'less'}</span>
                        </span>
                      </div>
                      <p className="text-xs text-zinc-800 dark:text-zinc-200 font-bold leading-snug">{fuelScanInsights.insight}</p>
                      <p className="text-[10px] text-zinc-600 dark:text-zinc-400 leading-relaxed border-t border-blue-500/10 pt-2">{fuelScanInsights.rec}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div role="group" aria-labelledby="fuel-type-label">
                  <span id="fuel-type-label" className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1">Fuel Type</span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFuelType('petrol')}
                      className={`py-2 px-3 text-xs font-bold rounded-xl border text-center transition cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none ${
                        fuelType === 'petrol' 
                          ? 'border-blue-500 bg-blue-500/5 text-blue-500' 
                          : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-900/20'
                      }`}
                    >
                      Petrol ({FUEL_EMISSION_FACTORS.petrol} kg/L)
                    </button>
                    <button
                      type="button"
                      onClick={() => setFuelType('diesel')}
                      className={`py-2 px-3 text-xs font-bold rounded-xl border text-center transition cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none ${
                        fuelType === 'diesel' 
                          ? 'border-blue-500 bg-blue-500/5 text-blue-500' 
                          : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-900/20'
                      }`}
                    >
                      Diesel ({FUEL_EMISSION_FACTORS.diesel} kg/L)
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="fuel-litres-input" className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1">Litres Purchased</label>
                  <div className="relative">
                    <input
                      id="fuel-litres-input"
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      value={fuelLitres}
                      onChange={(e) => {
                        setFuelLitres(e.target.value);
                        if (fuelError) setFuelError(null);
                      }}
                      placeholder="e.g. 35.5"
                      className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-800 placeholder-zinc-450 focus:border-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-100 dark:placeholder-zinc-650 transition"
                    />
                    <span className="absolute right-4 top-3 text-xs font-bold text-zinc-450">Litres</span>
                  </div>
                </div>

                <div>
                  <label htmlFor="fuel-mileage-input" className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1">Vehicle Mileage (Fuel Efficiency)</label>
                  <div className="relative">
                    <input
                      id="fuel-mileage-input"
                      type="number"
                      step="0.1"
                      min="1"
                      required
                      value={vehicleMileage}
                      onChange={(e) => {
                        setVehicleMileage(e.target.value);
                        if (fuelError) setFuelError(null);
                      }}
                      placeholder="e.g. 14.5"
                      className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-800 placeholder-zinc-450 focus:border-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-100 dark:placeholder-zinc-650 transition"
                    />
                    <span className="absolute right-4 top-3 text-xs font-bold text-zinc-450">km/L</span>
                  </div>
                </div>

                {fuelError && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl flex items-center gap-2 text-xs font-semibold" role="alert">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{fuelError}</span>
                  </div>
                )}

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={fuelLoading}
                  className="w-full py-3 bg-blue-500 hover:bg-blue-600 font-extrabold text-zinc-950 rounded-xl transition shadow-md shadow-blue-500/10 disabled:opacity-50 cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
                >
                  {fuelLoading ? 'Adding...' : 'Add Fuel Log'}
                </motion.button>

              </form>
            </div>

            {/* Fuel History Table */}
            <div className="lg:col-span-2 p-6 rounded-3xl border border-zinc-150 bg-white dark:border-zinc-800/80 dark:bg-zinc-950/40 shadow-sm">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-zinc-100 dark:border-zinc-800">
                <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
                  <History className="h-4.5 w-4.5 text-zinc-400" />
                  Refill History
                </h3>
                <span className="text-xs font-bold text-zinc-400">{fuelRecords.length} Refills</span>
              </div>

              {fuelRecords.length === 0 ? (
                <div className="text-center py-12 text-zinc-500">
                  <BarChart2 className="mx-auto h-8 w-8 text-zinc-300 dark:text-zinc-700 stroke-[1.5] mb-2" />
                  <p className="text-xs font-medium">No fuel logs found. Enter your first purchase!</p>
                </div>
              ) : (
                <div 
                  className="divide-y divide-zinc-100 dark:divide-zinc-800/50 max-h-80 overflow-y-auto pr-1 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none rounded-xl"
                  tabIndex={0}
                  aria-label="Fuel refill log list"
                >
                  {fuelRecords.map((rec) => {
                    const date = new Date(rec.purchase_date).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    });
                    return (
                      <motion.div 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        key={rec.id} 
                        className="py-3.5 flex items-center justify-between gap-3 text-xs first:pt-0 last:pb-0"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                            <Fuel className="h-4.5 w-4.5" />
                          </div>
                          <div>
                            <span className="font-bold text-zinc-800 dark:text-zinc-200">{rec.litres}L ({rec.fuel_type})</span>
                            <span className="block text-[10px] text-zinc-400 dark:text-zinc-500 font-semibold">{date}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <span className="font-bold text-zinc-700 dark:text-zinc-300">Mileage: {rec.vehicle_mileage} km/L</span>
                            <span className="block text-[10px] text-zinc-400 font-semibold">Total: {Math.round(rec.litres * rec.vehicle_mileage)} km</span>
                          </div>
                          <div className="text-right min-w-[65px]">
                            <span className="font-extrabold text-blue-500">
                              {rec.co2_emissions_kg.toFixed(1)}
                            </span>
                            <span className="block text-[9px] text-zinc-400 font-bold uppercase">kg CO₂</span>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

          </motion.div>
        ) : (
          /* ==================== GRID ELECTRICITY TAB ==================== */
          <motion.div 
            key="electricity"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            
            {/* Bill Input & OCR scanner Form */}
            <div className="lg:col-span-1 p-6 rounded-3xl border border-zinc-150 bg-white dark:border-zinc-800/80 dark:bg-zinc-950/40 shadow-sm relative overflow-hidden">
              
              {/* Holographic scanning effect overlay */}
              <AnimatePresence>
                {elecScanning && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    role="status"
                    aria-live="polite"
                    className="absolute inset-0 z-20 bg-zinc-955/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center"
                  >
                    <div className="relative h-20 w-32 border-2 border-emerald-500/30 rounded-lg overflow-hidden flex items-center justify-center">
                      <div className="absolute inset-0 bg-emerald-500/10 animate-pulse"></div>
                      <div className="absolute left-0 right-0 h-1 bg-emerald-400 shadow-[0_0_8px_#10b981] animate-[scan_1.5s_ease-in-out_infinite]"></div>
                      <Camera className="h-8 w-8 text-emerald-400" />
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-emerald-400 font-bold text-sm">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      EcoBuddy grid Scanner...
                    </div>
                    <p className="text-[10px] text-zinc-400 mt-1.5 max-w-[180px]">Extracting monthly units and billing cycle dates.</p>
                  </motion.div>
                )}
              </AnimatePresence>

              <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-200 mb-4 flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-500" />
                Log electricity Bill
              </h3>

              <form onSubmit={handleElecSubmit} noValidate className="space-y-4">
                
                {/* Photo Upload area */}
                <div>
                  <label htmlFor="elec-bill-upload" className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1">Upload Bill Photo (AI Scanner)</label>
                  <div className="relative border-2 border-dashed border-zinc-200/70 hover:border-emerald-500/40 dark:border-zinc-800/60 dark:hover:border-emerald-500/30 rounded-2xl p-4 flex flex-col items-center justify-center bg-zinc-50/50 dark:bg-zinc-900/10 text-center cursor-pointer transition focus-within:ring-2 focus-within:ring-emerald-500 focus-within:outline-none">
                    <input
                      id="elec-bill-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleBillSelect}
                      className="absolute inset-0 opacity-0 cursor-pointer z-10"
                    />
                    {billPreviewUrl ? (
                      <div className="space-y-2">
                        <Image 
                          src={billPreviewUrl} 
                          alt="Bill preview" 
                          width={64}
                          height={64}
                          unoptimized
                          className="h-16 w-auto mx-auto rounded-lg object-cover border border-zinc-200 dark:border-zinc-800" 
                        />
                        <span className="block text-[10px] font-bold text-emerald-500 flex items-center justify-center gap-1">
                          <Check className="h-3 w-3" /> Bill uploaded successfully
                        </span>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <Upload className="mx-auto h-6 w-6 text-zinc-400" />
                        <span className="block text-xs font-bold text-zinc-650 dark:text-zinc-450">Take Photo or Upload image</span>
                        <span className="block text-[9px] text-zinc-500">AI reads units automatically</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Scanned Insights overlay */}
                <AnimatePresence>
                  {elecScanInsights && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      role="region"
                      aria-live="polite"
                      aria-label="Electricity Scanner Insights"
                      className="p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10 space-y-2 overflow-hidden"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-500 flex items-center gap-1">
                          <Sparkles className="h-3.5 w-3.5 fill-current" /> AI Scanner Insights
                        </span>
                        <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                          elecScanInsights.isIncrease 
                            ? 'bg-rose-500/10 text-rose-500 border-rose-500/15' 
                            : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/15'
                        }`}>
                          {elecScanInsights.isIncrease ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                          <span>{elecScanInsights.diffUnits.toFixed(0)} kWh {elecScanInsights.isIncrease ? 'more' : 'less'}</span>
                        </span>
                      </div>
                      <p className="text-xs text-zinc-800 dark:text-zinc-200 font-bold leading-snug">{elecScanInsights.insight}</p>
                      <p className="text-[10px] text-zinc-600 dark:text-zinc-400 leading-relaxed border-t border-emerald-500/10 pt-2">{elecScanInsights.rec}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div>
                  <label htmlFor="elec-month-input" className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1">Billing Month</label>
                  <input
                    id="elec-month-input"
                    type="month"
                    required
                    value={billMonth}
                    onChange={(e) => setBillMonth(e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-800 focus:border-yellow-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-100 transition"
                  />
                </div>

                <div>
                  <label htmlFor="elec-units-input" className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1">Units Consumed (kWh)</label>
                  <div className="relative">
                    <input
                      id="elec-units-input"
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      value={elecUnits}
                      onChange={(e) => {
                        setElecUnits(e.target.value);
                        if (elecError) setElecError(null);
                      }}
                      placeholder="e.g. 150.5"
                      className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-800 placeholder-zinc-450 focus:border-yellow-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-100 dark:placeholder-zinc-650 transition"
                    />
                    <span className="absolute right-4 top-3 text-xs font-bold text-zinc-450">kWh</span>
                  </div>
                </div>

                {elecError && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl flex items-center gap-2 text-xs font-semibold" role="alert">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{elecError}</span>
                  </div>
                )}

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={elecLoading}
                  className="w-full py-3 bg-yellow-500 hover:bg-yellow-600 font-extrabold text-zinc-950 rounded-xl transition shadow-md shadow-yellow-500/10 disabled:opacity-50 cursor-pointer focus-visible:ring-2 focus-visible:ring-yellow-500 focus-visible:outline-none"
                >
                  {elecLoading ? 'Adding...' : 'Add Bill Log'}
                </motion.button>

              </form>
            </div>

            {/* Electricity History Table */}
            <div className="lg:col-span-2 p-6 rounded-3xl border border-zinc-150 bg-white dark:border-zinc-800/80 dark:bg-zinc-950/40 shadow-sm">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-zinc-100 dark:border-zinc-800">
                <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
                  <History className="h-4.5 w-4.5 text-zinc-400" />
                  Billing History
                </h3>
                <span className="text-xs font-bold text-zinc-400">{electricityRecords.length} Bills</span>
              </div>

              {electricityRecords.length === 0 ? (
                <div className="text-center py-12 text-zinc-500">
                  <BarChart2 className="mx-auto h-8 w-8 text-zinc-300 dark:text-zinc-700 stroke-[1.5] mb-2" />
                  <p className="text-xs font-medium">No electricity logs found. Enter a bill to start tracking!</p>
                </div>
              ) : (
                <div 
                  className="divide-y divide-zinc-100 dark:divide-zinc-800/50 max-h-80 overflow-y-auto pr-1 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none rounded-xl"
                  tabIndex={0}
                  aria-label="Electricity billing history log list"
                >
                  {electricityRecords.map((rec) => {
                    const uploadDate = new Date(rec.uploaded_at).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric'
                    });
                    return (
                      <motion.div 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        key={rec.id} 
                        className="py-3.5 flex items-center justify-between gap-3 text-xs first:pt-0 last:pb-0"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-xl bg-yellow-500/10 text-yellow-500 flex items-center justify-center">
                            <Zap className="h-4.5 w-4.5" />
                          </div>
                          <div>
                            <span className="font-bold text-zinc-800 dark:text-zinc-200">{rec.units_kwh} kWh (Grid)</span>
                            <span className="block text-[10px] text-zinc-400 dark:text-zinc-500 font-semibold">Bill month: {rec.bill_month}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <span className="font-bold text-zinc-700 dark:text-zinc-300">Logged {uploadDate}</span>
                            {rec.bill_image_url && <span className="block text-[9px] text-emerald-500 font-semibold">📸 Bill Photo Attached</span>}
                          </div>
                          <div className="text-right min-w-[65px]">
                            <span className="font-extrabold text-yellow-500">
                              {rec.co2_emissions_kg.toFixed(1)}
                            </span>
                            <span className="block text-[9px] text-zinc-400 font-bold uppercase">kg CO₂</span>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

          </motion.div>
        )}
      </AnimatePresence>

      {/* CSS Animation Keyframes for scanner laser line */}
      <style jsx global>{`
        @keyframes scan {
          0% { top: 0%; }
          50% { top: 100%; }
          100% { top: 0%; }
        }
      `}</style>

    </div>
  );
};

export default LoggersView;
