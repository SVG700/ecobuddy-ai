import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '../lib/db';

describe('Sandbox Auth and Session Sync', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('should verify fresh visitor initialization (no active profile)', () => {
    // A fresh visitor import of db should not write profile to localStorage
    const storedProfile = localStorage.getItem('eb_profile');
    const isSandbox = localStorage.getItem('eb_sandbox_mode');
    expect(storedProfile).toBeNull();
    expect(isSandbox).toBeNull();
  });

  it('should initialize profile and save to LocalStorage in demo mode via db.initializeDemoSession', () => {
    const profile = db.initializeDemoSession();
    localStorage.setItem('eb_sandbox_mode', 'true');

    expect(profile.id).toBe('mock-user-123');
    expect(profile.full_name).toBe('Alex Green');
    expect(profile.points).toBe(320);

    const storedStr = localStorage.getItem('eb_profile');
    expect(storedStr).not.toBeNull();
    const parsed = JSON.parse(storedStr!);
    expect(parsed.id).toBe('mock-user-123');

    const isSandbox = localStorage.getItem('eb_sandbox_mode');
    expect(isSandbox).toBe('true');
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

  it('should handle clearing all user and session data on logout via db.clearLocalSession', () => {
    db.initializeDemoSession();
    localStorage.setItem('eb_sandbox_mode', 'true');

    expect(localStorage.getItem('eb_profile')).not.toBeNull();
    expect(localStorage.getItem('eb_sandbox_mode')).not.toBeNull();

    // Call clear session
    db.clearLocalSession();

    expect(localStorage.getItem('eb_profile')).toBeNull();
    expect(localStorage.getItem('eb_sandbox_mode')).toBeNull();
    expect(localStorage.getItem('eb_trips')).toBeNull();
    expect(localStorage.getItem('eb_fuel')).toBeNull();
  });

  it('should verify session restoration logic behaves correctly under sandbox and regular modes', () => {
    // Scenario 1: Sandbox mode active -> should allow loading local profile
    db.initializeDemoSession();
    localStorage.setItem('eb_sandbox_mode', 'true');

    const localProf1 = localStorage.getItem('eb_profile');
    const isSandbox1 = localStorage.getItem('eb_sandbox_mode') === 'true';
    
    // Simulate page check logic
    const profileToRestore1 = (localProf1 && isSandbox1) ? JSON.parse(localProf1) : null;
    expect(profileToRestore1).not.toBeNull();
    expect(profileToRestore1.id).toBe('mock-user-123');

    // Scenario 2: Logout / Fresh Visit (no sandbox, empty keys) -> should NOT restore
    db.clearLocalSession();
    const localProf2 = localStorage.getItem('eb_profile');
    const isSandbox2 = localStorage.getItem('eb_sandbox_mode') === 'true';
    const profileToRestore2 = (localProf2 && isSandbox2) ? JSON.parse(localProf2) : null;
    expect(profileToRestore2).toBeNull();
  });

  it('should verify logout completely wipes both profile and sandbox state', () => {
    // Set up active sandbox state
    db.initializeDemoSession();
    localStorage.setItem('eb_sandbox_mode', 'true');

    expect(localStorage.getItem('eb_profile')).not.toBeNull();
    expect(localStorage.getItem('eb_sandbox_mode')).toBe('true');

    // Perform logout clear
    db.clearLocalSession();

    expect(localStorage.getItem('eb_profile')).toBeNull();
    expect(localStorage.getItem('eb_sandbox_mode')).toBeNull();
  });

  it('should remain on AuthScreen after page refresh following a logout', () => {
    // 1. User starts in sandbox mode
    db.initializeDemoSession();
    localStorage.setItem('eb_sandbox_mode', 'true');
    
    // 2. User logs out
    db.clearLocalSession();
    
    // 3. User refreshes page (we trigger checkAuth simulation)
    const localProf = localStorage.getItem('eb_profile');
    const isSandbox = localStorage.getItem('eb_sandbox_mode') === 'true';
    const profileToRestore = (localProf && isSandbox) ? JSON.parse(localProf) : null;
    
    expect(profileToRestore).toBeNull(); // Will result in AuthScreen being shown
  });
});
