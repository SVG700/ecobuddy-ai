import { describe, it, expect } from 'vitest';
import { 
  calculateTripEmissions, 
  calculateFuelEmissions, 
  calculateElectricityEmissions, 
  calculateCarbonScore,
  estimateFuelConsumption,
  calculateWhatIfSavings
} from '../lib/calculations';

describe('Carbon Calculations & Dashboard Metrics', () => {
  describe('Travel & Trip Carbon Footprint', () => {
    it('handles normal transport modes correctly', () => {
      // Car: 0.170 kg CO2 / km
      expect(calculateTripEmissions('car', 25)).toBe(4.25);
      // Train: 0.041 kg CO2 / km
      expect(calculateTripEmissions('train', 100)).toBe(4.1);
      // Motorcycle (bike): 0.113 kg CO2 / km
      expect(calculateTripEmissions('bike', 10)).toBe(1.13);
    });

    it('estimates correct fuel consumption', () => {
      // car / cab -> distance * 0.08
      expect(estimateFuelConsumption('car', 150)).toBe(12);
      expect(estimateFuelConsumption('cab', 200)).toBe(16);
      // bike -> distance * 0.035
      expect(estimateFuelConsumption('bike', 100)).toBe(3.5);
    });
  });

  describe('Utility Resource Logging Calculations', () => {
    it('calculates fuel emissions correctly', () => {
      // Petrol: 2.31 kg CO2 / L
      expect(calculateFuelEmissions(50, 'petrol')).toBe(115.5);
      // Diesel: 2.68 kg CO2 / L
      expect(calculateFuelEmissions(10, 'diesel')).toBe(26.8);
    });

    it('calculates electricity grid emissions correctly', () => {
      // Grid: 0.85 kg CO2 / kWh
      expect(calculateElectricityEmissions(250)).toBe(212.5);
    });
  });

  describe('Carbon Score & Dashboard Performance Metrics', () => {
    it('evaluates dynamic dashboard carbon score correctly', () => {
      // Baseline is 15.0 kg CO2.
      // 0 emissions -> score 100
      expect(calculateCarbonScore(0, 0, 0)).toBe(100);
      
      // Daily average matches baseline -> score 70
      expect(calculateCarbonScore(15, 0, 0)).toBe(70);

      // Super high emissions -> floors at 0
      expect(calculateCarbonScore(100, 200, 50)).toBe(0);
    });
  });

  describe('What-If Scenario Simulation Calculations', () => {
    it('calculates expected carbon savings and cost savings', () => {
      const results = calculateWhatIfSavings(5, 20, 50, 200, 65);
      
      // Transit savings: transitDays (5) * 15 * 0.129 = 9.675 -> 9.68
      expect(results.transitSavings).toBeCloseTo(9.68, 2);
      
      // Electricity savings: weeklyElecAvg (200) * (20 / 100) = 40
      expect(results.elecSavings).toBe(40);

      // Active mobility savings: activeKm (50) * 0.170 = 8.5
      expect(results.activeSavings).toBe(8.5);

      // Gas Cost Saved: (simTransitDays * 15 + simActiveKm) * 0.12 = (75 + 50) * 0.12 = 15.00
      expect(results.gasCostSaved).toBe(15.00);
    });
  });
});
