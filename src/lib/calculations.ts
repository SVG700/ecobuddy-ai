import { TransportMode, FuelType } from './types';

// Emission factors in kg CO2 per km
export const TRANSPORT_EMISSION_FACTORS: Record<TransportMode, number> = {
  walking: 0,
  bicycle: 0,
  bus: 0.089,   // Average bus emission per passenger km
  metro: 0.028, // Average metro transit per passenger km
  train: 0.041, // National rail average
  bike: 0.113,  // Average motorcycle/scooter
  car: 0.170,   // Average petrol medium car
  cab: 0.180,   // Cab travel (slightly higher than average car due to idling/empty miles)
};

// Fuel emission factors in kg CO2 per litre
export const FUEL_EMISSION_FACTORS: Record<FuelType, number> = {
  petrol: 2.31,
  diesel: 2.68,
};

// Electricity emission factor in kg CO2 per kWh
// This represents average grid intensity (varies by region, using 0.85 kg/kWh as a typical medium-high grid intensity)
export const ELECTRICITY_EMISSION_FACTOR = 0.85;

// Daily baseline emissions for a typical average citizen (in kg CO2)
// This is used to calculate the sustainability/carbon score
export const DAILY_BASELINE_CO2 = 15.0; 

export function calculateTripEmissions(mode: TransportMode, distanceKm: number): number {
  const factor = TRANSPORT_EMISSION_FACTORS[mode] || 0;
  return Number((distanceKm * factor).toFixed(2));
}

export function calculateFuelEmissions(litres: number, fuelType: FuelType): number {
  const factor = FUEL_EMISSION_FACTORS[fuelType] || 0;
  return Number((litres * factor).toFixed(2));
}

export function calculateElectricityEmissions(unitsKwh: number): number {
  return Number((unitsKwh * ELECTRICITY_EMISSION_FACTOR).toFixed(2));
}

/**
 * Calculates a carbon score from 0 to 100.
 * A score of 100 is excellent (very low carbon footprint or net positive).
 * A score of 0 is poor (footprint greatly exceeds baseline).
 */
export function calculateCarbonScore(
  transportEmissions: number,
  fuelEmissions: number,
  electricityEmissions: number
): number {
  const total = transportEmissions + fuelEmissions + electricityEmissions;
  if (total === 0) return 100; // No emissions recorded
  
  // Calculate relative performance compared to daily baseline.
  // We divide total emissions by daily baseline (scaling appropriately)
  // If user is at or below baseline, they get a decent score.
  const ratio = total / DAILY_BASELINE_CO2;
  
  // Exponential decay or linear scale
  // Let's use a scale: if ratio is 1 (equal to baseline), score is 70.
  // If ratio is 0, score is 100.
  // If ratio is 3 or more, score is 10.
  let score = 100 - (ratio * 30);
  if (score < 0) score = 0;
  
  return Math.round(score);
}

// Estimate fuel consumption based on transport mode and distance (for dashboard info)
export function estimateFuelConsumption(mode: TransportMode, distanceKm: number): number {
  // Litres per km estimate
  switch (mode) {
    case 'car':
    case 'cab':
      return Number((distanceKm * 0.08).toFixed(2)); // ~12.5 km/l (8L/100km)
    case 'bike':
      return Number((distanceKm * 0.035).toFixed(2)); // ~28.5 km/l (3.5L/100km)
    default:
      return 0;
  }
}

export interface WhatIfResults {
  transitSavings: number;
  elecSavings: number;
  activeSavings: number;
  totalWeeklyReduction: number;
  annualReduction: number;
  gasCostSaved: number;
  elecCostSaved: number;
  totalCostSaved: number;
  scoreBoost: number;
  treesPlanted: number;
  flightsAvoided: number;
}

export function calculateWhatIfSavings(
  simTransitDays: number,
  simElecPct: number,
  simActiveKm: number,
  weeklyElecAvg: number,
  currentScore: number
): WhatIfResults {
  const transitSavings = Number((simTransitDays * 15 * 0.129).toFixed(2));
  const elecSavings = Number((weeklyElecAvg * (simElecPct / 100)).toFixed(2));
  const activeSavings = Number((simActiveKm * 0.170).toFixed(2));
  const totalWeeklyReduction = Number((transitSavings + elecSavings + activeSavings).toFixed(2));
  const annualReduction = Number((totalWeeklyReduction * 52).toFixed(2));
  const gasCostSaved = Number((((simTransitDays * 15) + simActiveKm) * 0.12).toFixed(2));
  const elecCostSaved = Number(((elecSavings / 0.85) * 0.18).toFixed(2));
  const totalCostSaved = Number((gasCostSaved + elecCostSaved).toFixed(2));
  const scoreBoost = Math.min(100 - currentScore, Math.round(totalWeeklyReduction * 1.1));
  const treesPlanted = Number((annualReduction / 22).toFixed(2));
  const flightsAvoided = Number((annualReduction / 250).toFixed(2));

  return {
    transitSavings,
    elecSavings,
    activeSavings,
    totalWeeklyReduction,
    annualReduction,
    gasCostSaved,
    elecCostSaved,
    totalCostSaved,
    scoreBoost,
    treesPlanted,
    flightsAvoided
  };
}
