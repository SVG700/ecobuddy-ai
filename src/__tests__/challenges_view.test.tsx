import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChallengesView } from '../components/ChallengesView';
import { db } from '../lib/db';

vi.mock('../lib/db', () => ({
  db: {
    startChallenge: vi.fn(),
    completeChallenge: vi.fn(),
  },
}));

vi.mock('framer-motion', () => {
  const MockDiv = React.forwardRef(({ children, ...props }: any, ref: any) => (
    <div ref={ref} {...props}>
      {children}
    </div>
  ));
  MockDiv.displayName = 'MockDiv';

  const MockButton = React.forwardRef(({ children, ...props }: any, ref: any) => (
    <button ref={ref} {...props}>
      {children}
    </button>
  ));
  MockButton.displayName = 'MockButton';

  return {
    motion: {
      div: MockDiv,
      button: MockButton,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
  };
});

describe('ChallengesView Verification and Claim Logic Tests', () => {
  const refreshDataMock = vi.fn();

  const mockChallenges = [
    {
      id: 'ch-1',
      title: 'No-Car Day',
      description: 'Avoid using a car or cab for an entire day.',
      points_reward: 50,
      icon: 'CarFront',
      category: 'transport',
      duration_days: 1,
      is_active: true
    },
    {
      id: 'ch-3',
      title: 'Save Electricity Challenge',
      description: 'Keep your daily electricity units below 5 kWh.',
      points_reward: 100,
      icon: 'Zap',
      category: 'energy',
      duration_days: 3,
      is_active: true
    },
    {
      id: 'ch-5',
      title: 'Eco Commuter',
      description: 'Log 3 trips using a bicycle or walking.',
      points_reward: 120,
      icon: 'Bike',
      category: 'transport',
      duration_days: 5,
      is_active: true
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('No-Car Day Verification (ch-1)', () => {
    const activeUserChallenges = [
      {
        id: 'uc-1',
        user_id: 'user-123',
        challenge_id: 'ch-1',
        status: 'active' as const,
        started_at: new Date().toISOString(),
      }
    ];

    it('displays Not Eligible and disables claim button if no walking, cycling, bus, train, or metro trip exists', () => {
      render(
        <ChallengesView
          challenges={mockChallenges}
          userChallenges={activeUserChallenges}
          achievements={[]}
          userAchievements={[]}
          trips={[]}
          fuelRecords={[]}
          electricityRecords={[]}
          refreshData={refreshDataMock}
        />
      );

      expect(screen.getAllByText('Not Eligible').length).toBeGreaterThan(0);
      expect(screen.getByText(/requires at least 1 walking, cycling, bus, or train trip/i)).toBeInTheDocument();

      const claimButton = screen.getByRole('button', { name: /claim points/i });
      expect(claimButton).toBeDisabled();

      fireEvent.click(claimButton);
      expect(db.completeChallenge).not.toHaveBeenCalled();
    });

    it('displays Eligible and enables claim button if at least one walking trip exists', async () => {
      const trips = [
        {
          id: 'trip-1',
          user_id: 'user-123',
          transport_mode: 'walking',
          distance_km: 1.5,
          duration_min: 15,
          co2_emissions_kg: 0,
          start_time: new Date().toISOString(),
          active: false
        }
      ];

      render(
        <ChallengesView
          challenges={mockChallenges}
          userChallenges={activeUserChallenges}
          achievements={[]}
          userAchievements={[]}
          trips={trips}
          fuelRecords={[]}
          electricityRecords={[]}
          refreshData={refreshDataMock}
        />
      );

      expect(screen.getAllByText('Eligible').length).toBeGreaterThan(0);
      expect(screen.queryByText(/requires at least 1 walking, cycling, bus, or train trip/i)).not.toBeInTheDocument();

      const claimButton = screen.getByRole('button', { name: /claim points/i });
      expect(claimButton).not.toBeDisabled();

      fireEvent.click(claimButton);
      await waitFor(() => {
        expect(db.completeChallenge).toHaveBeenCalledWith('ch-1');
      });
    });
  });

  describe('Save Electricity Challenge Verification (ch-3)', () => {
    const activeUserChallenges = [
      {
        id: 'uc-2',
        user_id: 'user-123',
        challenge_id: 'ch-3',
        status: 'active' as const,
        started_at: new Date().toISOString(),
      }
    ];

    it('displays Not Eligible and disables claim button if no electricity log exists', () => {
      render(
        <ChallengesView
          challenges={mockChallenges}
          userChallenges={activeUserChallenges}
          achievements={[]}
          userAchievements={[]}
          trips={[]}
          fuelRecords={[]}
          electricityRecords={[]}
          refreshData={refreshDataMock}
        />
      );

      expect(screen.getAllByText('Not Eligible').length).toBeGreaterThan(0);
      expect(screen.getByText(/requires at least 1 electricity log/i)).toBeInTheDocument();

      const claimButton = screen.getByRole('button', { name: /claim points/i });
      expect(claimButton).toBeDisabled();
    });

    it('displays Eligible and enables claim button if electricity log exists', async () => {
      const elecLogs = [
        {
          id: 'elec-1',
          user_id: 'user-123',
          units_kwh: 12.5,
          bill_month: '2026-06',
          co2_emissions_kg: 10.6,
          uploaded_at: new Date().toISOString()
        }
      ];

      render(
        <ChallengesView
          challenges={mockChallenges}
          userChallenges={activeUserChallenges}
          achievements={[]}
          userAchievements={[]}
          trips={[]}
          fuelRecords={[]}
          electricityRecords={elecLogs}
          refreshData={refreshDataMock}
        />
      );

      expect(screen.getAllByText('Eligible').length).toBeGreaterThan(0);
      expect(screen.queryByText(/requires at least 1 electricity log/i)).not.toBeInTheDocument();

      const claimButton = screen.getByRole('button', { name: /claim points/i });
      expect(claimButton).not.toBeDisabled();

      fireEvent.click(claimButton);
      await waitFor(() => {
        expect(db.completeChallenge).toHaveBeenCalledWith('ch-3');
      });
    });
  });

  describe('Eco Commuter Challenge Verification (ch-5)', () => {
    const activeUserChallenges = [
      {
        id: 'uc-3',
        user_id: 'user-123',
        challenge_id: 'ch-5',
        status: 'active' as const,
        started_at: new Date().toISOString(),
      }
    ];

    it('displays Not Eligible and disables claim button if less than 3 eco trips exist', () => {
      const trips = [
        {
          id: 'trip-1',
          user_id: 'user-123',
          transport_mode: 'bicycle',
          distance_km: 4.2,
          duration_min: 20,
          co2_emissions_kg: 0,
          start_time: new Date().toISOString(),
          active: false
        },
        {
          id: 'trip-2',
          user_id: 'user-123',
          transport_mode: 'car', // Non-eco
          distance_km: 15.0,
          duration_min: 30,
          co2_emissions_kg: 2.55,
          start_time: new Date().toISOString(),
          active: false
        }
      ];

      render(
        <ChallengesView
          challenges={mockChallenges}
          userChallenges={activeUserChallenges}
          achievements={[]}
          userAchievements={[]}
          trips={trips}
          fuelRecords={[]}
          electricityRecords={[]}
          refreshData={refreshDataMock}
        />
      );

      expect(screen.getAllByText('Not Eligible').length).toBeGreaterThan(0);
      expect(screen.getByText(/requires at least 3 eco-friendly trips/i)).toBeInTheDocument();

      const claimButton = screen.getByRole('button', { name: /claim points/i });
      expect(claimButton).toBeDisabled();
    });

    it('displays Eligible and enables claim button if at least 3 eco-friendly trips exist', async () => {
      const trips = [
        {
          id: 'trip-1',
          user_id: 'user-123',
          transport_mode: 'bicycle',
          distance_km: 4.2,
          duration_min: 20,
          co2_emissions_kg: 0,
          start_time: new Date().toISOString(),
          active: false
        },
        {
          id: 'trip-2',
          user_id: 'user-123',
          transport_mode: 'walking',
          distance_km: 1.0,
          duration_min: 10,
          co2_emissions_kg: 0,
          start_time: new Date().toISOString(),
          active: false
        },
        {
          id: 'trip-3',
          user_id: 'user-123',
          transport_mode: 'metro',
          distance_km: 8.0,
          duration_min: 15,
          co2_emissions_kg: 0.2,
          start_time: new Date().toISOString(),
          active: false
        }
      ];

      render(
        <ChallengesView
          challenges={mockChallenges}
          userChallenges={activeUserChallenges}
          achievements={[]}
          userAchievements={[]}
          trips={trips}
          fuelRecords={[]}
          electricityRecords={[]}
          refreshData={refreshDataMock}
        />
      );

      expect(screen.getAllByText('Eligible').length).toBeGreaterThan(0);
      expect(screen.queryByText(/requires at least 3 eco-friendly trips/i)).not.toBeInTheDocument();

      const claimButton = screen.getByRole('button', { name: /claim points/i });
      expect(claimButton).not.toBeDisabled();

      fireEvent.click(claimButton);
      await waitFor(() => {
        expect(db.completeChallenge).toHaveBeenCalledWith('ch-5');
      });
    });
  });
});
