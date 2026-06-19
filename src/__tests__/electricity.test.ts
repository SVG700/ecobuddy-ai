import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../lib/db';
import { calculateElectricityEmissions } from '../lib/calculations';

describe('Electricity Grid Logging Integration Tests', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('correctly calculates electricity grid emissions factor', () => {
    // Grid factor: 0.85 kg CO2 / kWh
    expect(calculateElectricityEmissions(100)).toBe(85.0);
    expect(calculateElectricityEmissions(0)).toBe(0);
  });

  it('logs electricity grid units successfully in database', async () => {
    const record = await db.addElectricityRecord(120.5, '2026-06');
    
    expect(record).toBeDefined();
    expect(record.id).toBeDefined();
    expect(record.units_kwh).toBe(120.5);
    expect(record.co2_emissions_kg).toBe(102.42); // 120.5 * 0.85 = 102.425 -> 102.42 due to JS rounding

    // Verify retrieval
    const records = await db.getElectricityRecords();
    expect(records).toHaveLength(1);
    expect(records[0].id).toBe(record.id);
  });
});
