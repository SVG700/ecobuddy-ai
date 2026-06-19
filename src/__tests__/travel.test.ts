import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../lib/db';
import { calculateTripEmissions } from '../lib/calculations';

describe('Travel Tracking Integration Tests', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('correctly calculates trip emissions based on transport modes', () => {
    const modes = [
      { mode: 'walking', distance: 5, expected: 0 },
      { mode: 'bicycle', distance: 10, expected: 0 },
      { mode: 'car', distance: 10, expected: 1.7 }, // 10 * 0.170
      { mode: 'bus', distance: 20, expected: 1.78 }, // 20 * 0.089
      { mode: 'train', distance: 50, expected: 2.05 }, // 50 * 0.041
      { mode: 'cab', distance: 15, expected: 2.7 }, // 15 * 0.180
    ];

    modes.forEach(({ mode, distance, expected }) => {
      const emissions = calculateTripEmissions(mode as any, distance);
      expect(emissions).toBeCloseTo(expected, 2);
    });
  });

  it('handles storing and retrieving trip logs in the database', async () => {
    // Start trip
    const trip = await db.startTrip('car');
    expect(trip).toBeDefined();
    expect(trip.id).toBeDefined();
    expect(trip.transport_mode).toBe('car');
    expect(trip.active).toBe(true);

    // Stop trip
    const completedTrip = await db.stopTrip(trip.id, 12.5, 25);
    expect(completedTrip).toBeDefined();
    expect(completedTrip.id).toBe(trip.id);
    expect(completedTrip.distance_km).toBe(12.5);
    expect(completedTrip.duration_min).toBe(25);
    expect(completedTrip.co2_emissions_kg).toBe(2.13); // 12.5 * 0.170 = 2.125 -> 2.13
    expect(completedTrip.active).toBe(false);

    // Verify retrieval
    const trips = await db.getTrips();
    expect(trips).toHaveLength(1);
    expect(trips[0].id).toBe(trip.id);
  });
});
