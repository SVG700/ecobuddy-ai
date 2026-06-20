import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TravelTracker } from '../components/TravelTracker';
import { db } from '../lib/db';

// Mock the database helper module
vi.mock('../lib/db', () => ({
  db: {
    startTrip: vi.fn(),
    stopTrip: vi.fn(),
  }
}));

// Mock framer-motion to bypass animations in test environment
vi.mock('framer-motion', () => {
  const MockDiv = React.forwardRef(({ children, ...props }: any, ref: any) => (
    <div ref={ref} {...props}>
      {children}
    </div>
  ));
  MockDiv.displayName = 'MockDiv';

  return {
    motion: {
      div: MockDiv,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
  };
});

describe('TravelTracker UI and Commute Flow integration tests', () => {
  const mockWatchPosition = vi.fn();
  const mockClearWatch = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('navigator', {
      geolocation: {
        watchPosition: mockWatchPosition,
        clearWatch: mockClearWatch,
      }
    });
    localStorage.clear();
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('immediately transitions UI state to tracking when Start Commute is clicked, and replaces with real trip data on success', async () => {
    let resolveStartTrip: any;
    const startTripPromise = new Promise((resolve) => {
      resolveStartTrip = resolve;
    });
    vi.mocked(db.startTrip).mockReturnValue(startTripPromise as any);
    
    const refreshDataMock = vi.fn();
    render(<TravelTracker trips={[]} refreshData={refreshDataMock} />);

    // Select Car mode
    const carButton = screen.getByText('Car');
    fireEvent.click(carButton);

    // Verify Start button exists and click it
    const startButton = screen.getByText(/Start Commute/i);
    await act(async () => {
      fireEvent.click(startButton);
    });

    // The UI should immediately transition to HUD mode (optimistic update)
    expect(screen.getByText(/Tracking active car trip/i)).toBeInTheDocument();
    
    // Should show the "Connecting to Database..." text on stop button while call is resolving
    expect(screen.getByText('Connecting to Database...')).toBeInTheDocument();

    const mockTrip = {
      id: 'real-trip-999',
      user_id: 'user-abc',
      transport_mode: 'car',
      distance_km: 0,
      duration_min: 0,
      co2_emissions_kg: 0,
      start_time: new Date().toISOString(),
      active: true
    };

    // Now resolve the promise
    await act(async () => {
      resolveStartTrip(mockTrip);
    });

    // Fast forward timer to allow the startTrip promise and state update to resolve
    await act(async () => {
      await vi.runOnlyPendingTimersAsync();
    });

    // Stop button should now be enabled and active since the ID resolved
    expect(screen.getByText('Stop and Log Trip')).toBeInTheDocument();
    expect(db.startTrip).toHaveBeenCalledWith('car');
  });

  it('displays user-facing error message and rolls back UI state if db.startTrip fails', async () => {
    let rejectStartTrip: any;
    const startTripPromise = new Promise((_, reject) => {
      rejectStartTrip = reject;
    });
    vi.mocked(db.startTrip).mockReturnValue(startTripPromise as any);

    render(<TravelTracker trips={[]} refreshData={vi.fn()} />);

    const startButton = screen.getByText(/Start Commute/i);
    await act(async () => {
      fireEvent.click(startButton);
    });

    // UI should optimistically transition first
    expect(screen.getByText(/Tracking active car/i)).toBeInTheDocument();

    // Now reject the promise
    await act(async () => {
      rejectStartTrip(new Error('Connection timed out'));
    });

    // Allow promise rejection to complete
    await act(async () => {
      await vi.runOnlyPendingTimersAsync();
    });

    // UI should roll back to setup screen and show error
    expect(screen.queryByText(/Tracking active car/i)).toBeNull();
    expect(screen.getByText(/Connection timed out/i)).toBeInTheDocument();
  });

  it('advances distance and duration live stats in simulated ride mode', async () => {
    let resolveStartTrip: any;
    const startTripPromise = new Promise((resolve) => {
      resolveStartTrip = resolve;
    });
    vi.mocked(db.startTrip).mockReturnValue(startTripPromise as any);

    render(<TravelTracker trips={[]} refreshData={vi.fn()} />);

    // Click start commute (defaults to simulate ride mode)
    const startButton = screen.getByText(/Start Commute/i);
    await act(async () => {
      fireEvent.click(startButton);
    });

    // Verify distance starts at 0.00
    const distanceVals = screen.getAllByText('0.00');
    expect(distanceVals.length).toBe(2);

    const mockTrip = {
      id: 'real-trip-123',
      user_id: 'user-123',
      transport_mode: 'car',
      distance_km: 0,
      duration_min: 0,
      co2_emissions_kg: 0,
      start_time: new Date().toISOString(),
      active: true
    };

    // Resolve the promise
    await act(async () => {
      resolveStartTrip(mockTrip);
    });

    // Advance fake timers by 3 seconds
    await act(async () => {
      vi.advanceTimersByTime(3000);
    });

    // Verify duration counter increments
    expect(screen.getByText('00:03')).toBeInTheDocument();

    // Verify distance is no longer 0
    expect(screen.queryAllByText('0.00').length).toBe(0);
  });

  it('restores tracked distance from local storage upon page refresh / remounting', async () => {
    // Seed local storage with a saved distance
    localStorage.setItem('eb_active_trip_distance', '8.76');

    const activeTrip = {
      id: 'trip-active-101',
      user_id: 'user-123',
      transport_mode: 'bicycle',
      distance_km: 0,
      duration_min: 0,
      co2_emissions_kg: 0,
      start_time: new Date().toISOString(),
      active: true
    };

    render(<TravelTracker trips={[activeTrip] as any} refreshData={vi.fn()} />);

    // Fast-forward timers/microtasks to let useEffect run and apply state updates
    await act(async () => {
      await vi.runOnlyPendingTimersAsync();
    });

    // Verify active trip HUD is rendered
    expect(screen.getByText(/Tracking active bicycle trip/i)).toBeInTheDocument();

    // Verify restored distance 8.76 is displayed
    expect(screen.getByText('8.76')).toBeInTheDocument();
  });

  it('stops and logs trip to the database on Stop Commute, clearing the active trip HUD', async () => {
    const activeTrip = {
      id: 'trip-active-101',
      user_id: 'user-123',
      transport_mode: 'bicycle',
      distance_km: 0,
      duration_min: 0,
      co2_emissions_kg: 0,
      start_time: new Date().toISOString(),
      active: true
    };
    
    vi.mocked(db.stopTrip).mockResolvedValue(activeTrip as any);
    const refreshDataMock = vi.fn();

    // Restore distance to mock travel state
    localStorage.setItem('eb_active_trip_distance', '12.4');

    const { rerender } = render(<TravelTracker trips={[activeTrip] as any} refreshData={refreshDataMock} />);

    // Fast-forward timers/microtasks to let useEffect run and apply state updates
    await act(async () => {
      await vi.runOnlyPendingTimersAsync();
    });

    const stopButton = screen.getByText('Stop and Log Trip');
    await act(async () => {
      fireEvent.click(stopButton);
    });

    // Rerender component with inactive trip prop as completed by parent state refresh
    const inactiveTrip = { ...activeTrip, active: false };
    rerender(<TravelTracker trips={[inactiveTrip] as any} refreshData={refreshDataMock} />);

    await act(async () => {
      await vi.runOnlyPendingTimersAsync();
    });

    // Verify stopTrip db helper called with current stats
    expect(db.stopTrip).toHaveBeenCalled();
    const stopCalls = vi.mocked(db.stopTrip).mock.calls;
    expect(stopCalls.length).toBe(1);
    expect(stopCalls[0][0]).toBe('trip-active-101');
    expect(stopCalls[0][1]).toBeGreaterThanOrEqual(12.4);
    expect(screen.queryByText(/Tracking active bicycle/i)).toBeNull();
    expect(refreshDataMock).toHaveBeenCalled();
    expect(localStorage.getItem('eb_active_trip_distance')).toBeNull();
  });
});
