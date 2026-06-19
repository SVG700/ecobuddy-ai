import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { DashboardView } from '../components/DashboardView';

// Mock Recharts since SVG layout measurements fail in jsdom environment
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  AreaChart: ({ children }: any) => <div>{children}</div>,
  Area: () => <div />,
  BarChart: ({ children }: any) => <div>{children}</div>,
  Bar: () => <div />,
  PieChart: ({ children }: any) => <div>{children}</div>,
  Pie: () => <div />,
  LineChart: ({ children }: any) => <div>{children}</div>,
  Line: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  Tooltip: () => <div />,
  CartesianGrid: () => <div />,
  Cell: () => <div />,
  Legend: () => <div />,
}));

describe('DashboardView Component Tests', () => {
  const mockProfile = {
    id: 'user-123',
    email: 'eco.champion@example.com',
    full_name: 'Jane Green',
    points: 450,
    current_streak: 8,
    max_streak: 15,
    carbon_saved_kg: 58.4,
    goals: ['Cycle to work'],
  };

  const mockProps = {
    profile: mockProfile,
    trips: [
      { id: 'trip-1', transport_mode: 'car', distance_km: 10, co2_emissions_kg: 1.7, created_at: new Date().toISOString() }
    ],
    fuelRecords: [],
    electricityRecords: [],
    carbonScores: [
      { 
        id: 'score-1', 
        user_id: 'user-123',
        date: new Date().toISOString().split('T')[0],
        total_emissions_kg: 8.5, 
        transport_emissions: 2.5,
        fuel_emissions: 0,
        electricity_emissions: 6.0,
        score: 85 
      }
    ],
    userChallenges: [],
    setActiveTab: vi.fn(),
    refreshData: vi.fn().mockResolvedValue(undefined),
  };

  it('renders general profile metrics (points, streak, carbon saved)', () => {
    render(<DashboardView {...(mockProps as any)} />);

    // Check Jane's name
    expect(screen.getByText(/Jane/i)).toBeInTheDocument();
    
    // Check points
    expect(screen.getByText(/Points: 450/i)).toBeInTheDocument();

    // Check streak
    expect(screen.getByText(/Current Streak/i)).toBeInTheDocument();
    expect(screen.getAllByText("8").length).toBeGreaterThan(0);

    // Check carbon saved
    expect(screen.getByText(/You saved/i)).toBeInTheDocument();
    expect(screen.getAllByText(/58.4/i).length).toBeGreaterThan(0);
  });

  it('renders the What-If Lifestyle Simulator on the dashboard', () => {
    render(<DashboardView {...(mockProps as any)} />);

    // Verify the simulator header and descriptive text are in the document
    expect(screen.getByText('What-If Lifestyle Simulator')).toBeInTheDocument();
    expect(screen.getByText(/Simulate changes in your daily activities/i)).toBeInTheDocument();
  });
});
