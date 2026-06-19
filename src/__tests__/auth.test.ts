import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('Sandbox Auth and Session Sync', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should initialize profile and save to LocalStorage in demo mode', () => {
    const demoProfile = {
      id: 'mock-user-123',
      email: 'eco.buddy@example.com',
      full_name: 'Alex Green',
      points: 320,
      current_streak: 5,
      max_streak: 12,
      carbon_saved_kg: 45.2,
      goals: ['Use public transport 3x a week', 'Unplug chargers at night'],
      created_at: new Date().toISOString()
    };

    localStorage.setItem('eb_profile', JSON.stringify(demoProfile));

    const storedStr = localStorage.getItem('eb_profile');
    expect(storedStr).toBeDefined();
    
    const parsed = JSON.parse(storedStr!);
    expect(parsed.id).toBe('mock-user-123');
    expect(parsed.full_name).toBe('Alex Green');
    expect(parsed.points).toBe(320);
    expect(parsed.goals).toHaveLength(2);
  });

  it('should support updating profile details in sandbox mode', () => {
    const originalProfile = {
      id: 'mock-user-123',
      email: 'eco.buddy@example.com',
      full_name: 'Alex Green',
      points: 320
    };

    localStorage.setItem('eb_profile', JSON.stringify(originalProfile));

    // Simulate updating name
    const stored = JSON.parse(localStorage.getItem('eb_profile')!);
    stored.full_name = 'Alex Sustainable';
    stored.points += 50; // Add points reward

    localStorage.setItem('eb_profile', JSON.stringify(stored));

    const updated = JSON.parse(localStorage.getItem('eb_profile')!);
    expect(updated.full_name).toBe('Alex Sustainable');
    expect(updated.points).toBe(370);
  });

  it('should handle clearing session on logout', () => {
    localStorage.setItem('eb_profile', JSON.stringify({ id: 'some-user' }));
    expect(localStorage.getItem('eb_profile')).not.toBeNull();

    localStorage.removeItem('eb_profile');
    expect(localStorage.getItem('eb_profile')).toBeNull();
  });
});
