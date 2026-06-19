import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../lib/db';
import { calculateFuelEmissions } from '../lib/calculations';

describe('Fuel Logging & Calculation Integration Tests', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('correctly maps fuel type calculations', () => {
    // Petrol: 2.31 kg CO2/L
    expect(calculateFuelEmissions(10, 'petrol')).toBe(23.1);
    // Diesel: 2.68 kg CO2/L
    expect(calculateFuelEmissions(10, 'diesel')).toBe(26.8);
  });

  it('logs fuel consumption record successfully in database', async () => {
    const fuelRecord = await db.addFuelRecord(25.5, 'petrol', 15); // mileage = 15
    
    expect(fuelRecord).toBeDefined();
    expect(fuelRecord.id).toBeDefined();
    expect(fuelRecord.litres).toBe(25.5);
    expect(fuelRecord.fuel_type).toBe('petrol');
    expect(fuelRecord.co2_emissions_kg).toBe(58.91); // 25.5 * 2.31 = 58.905 -> 58.91

    // Fetch and check
    const records = await db.getFuelRecords();
    expect(records).toHaveLength(1);
    expect(records[0].id).toBe(fuelRecord.id);
  });
});
