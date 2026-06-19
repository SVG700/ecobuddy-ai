import { describe, it, expect } from 'vitest';
import { 
  calculateTripEmissions, 
  calculateFuelEmissions, 
  calculateElectricityEmissions, 
  calculateCarbonScore, 
  estimateFuelConsumption,
  calculateWhatIfSavings
} from '../lib/calculations';

describe('Carbon Calculation Utilities', () => {
  describe('calculateTripEmissions', () => {
    it('should return 0 emissions for zero-emission travel modes', () => {
      expect(calculateTripEmissions('walking', 10)).toBe(0);
      expect(calculateTripEmissions('bicycle', 15.5)).toBe(0);
    });

    it('should calculate correct emissions for fossil-fuel modes', () => {
      // Car emission factor: 0.170
      expect(calculateTripEmissions('car', 10)).toBe(1.7);
      // Bus emission factor: 0.089
      expect(calculateTripEmissions('bus', 5)).toBe(0.44);
      // Cab emission factor: 0.180
      expect(calculateTripEmissions('cab', 20)).toBe(3.6);
    });

    it('should handle zero distance', () => {
      expect(calculateTripEmissions('car', 0)).toBe(0);
    });
  });

  describe('calculateFuelEmissions', () => {
    it('should calculate correct emissions for petrol', () => {
      // petrol factor: 2.31
      expect(calculateFuelEmissions(10, 'petrol')).toBe(23.1);
    });

    it('should calculate correct emissions for diesel', () => {
      // diesel factor: 2.68
      expect(calculateFuelEmissions(5, 'diesel')).toBe(13.4);
    });

    it('should handle zero litres', () => {
      expect(calculateFuelEmissions(0, 'petrol')).toBe(0);
    });
  });

  describe('calculateElectricityEmissions', () => {
    it('should calculate correct emissions for units in kWh', () => {
      // grid factor: 0.85
      expect(calculateElectricityEmissions(100)).toBe(85.0);
    });

    it('should handle zero electricity consumption', () => {
      expect(calculateElectricityEmissions(0)).toBe(0);
    });
  });

  describe('calculateCarbonScore', () => {
    it('should return 100 if there are zero total emissions', () => {
      expect(calculateCarbonScore(0, 0, 0)).toBe(100);
    });

    it('should return 70 if total emissions equal the daily baseline (15 kg)', () => {
      // baseline = 15. ratio = 15/15 = 1. score = 100 - (1 * 30) = 70.
      expect(calculateCarbonScore(15, 0, 0)).toBe(70);
    });

    it('should decay linearly and floor at 0 for extremely high emissions', () => {
      // total = 60. ratio = 60/15 = 4. score = 100 - (4 * 30) = -20 -> capped at 0.
      expect(calculateCarbonScore(30, 20, 10)).toBe(0);
    });
  });

  describe('estimateFuelConsumption', () => {
    it('should estimate correct fuel consumption for cars and cabs', () => {
      // car/cab: distance * 0.08
      expect(estimateFuelConsumption('car', 100)).toBe(8);
      expect(estimateFuelConsumption('cab', 50)).toBe(4);
    });

    it('should estimate correct fuel consumption for motorbikes', () => {
      // bike: distance * 0.035
      expect(estimateFuelConsumption('bike', 100)).toBe(3.5);
    });

    it('should return 0 fuel consumption for train/bus/walking/bicycle', () => {
      expect(estimateFuelConsumption('train', 100)).toBe(0);
      expect(estimateFuelConsumption('walking', 10)).toBe(0);
      expect(estimateFuelConsumption('bicycle', 20)).toBe(0);
    });
  });

  describe('calculateWhatIfSavings', () => {
    it('should calculate correct savings based on What-If parameters', () => {
      const results = calculateWhatIfSavings(
        3,   // simTransitDays
        10,  // simElecPct (10%)
        20,  // simActiveKm
        150, // weeklyElecAvg
        70   // currentScore
      );

      // transitSavings = 3 * 15 * 0.129 = 5.805 -> 5.8 (rounds down in JS toFixed(2))
      expect(results.transitSavings).toBe(5.8);
      
      // elecSavings = 150 * (10 / 100) = 15.00
      expect(results.elecSavings).toBe(15.00);

      // activeSavings = 20 * 0.170 = 3.40
      expect(results.activeSavings).toBe(3.40);

      // totalWeeklyReduction = 5.8 + 15 + 3.4 = 24.2
      expect(results.totalWeeklyReduction).toBe(24.2);

      // annualReduction = 24.2 * 52 = 1258.4
      expect(results.annualReduction).toBe(1258.4);

      // gasCostSaved = ((3 * 15) + 20) * 0.12 = 65 * 0.12 = 7.80
      expect(results.gasCostSaved).toBe(7.80);

      // elecCostSaved = (15 / 0.85) * 0.18 = 17.647 -> 3.18
      expect(results.elecCostSaved).toBe(3.18);

      // scoreBoost = min(30, round(24.2 * 1.1)) = min(30, 27) = 27
      expect(results.scoreBoost).toBe(27);
    });
  });
});
