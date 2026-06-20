import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WeeklyReportView } from '../components/WeeklyReportView';
import { db } from '../lib/db';
import { generateWeeklyReportAI } from '../lib/gemini';

// Mock the external dependency modules
vi.mock('../lib/db', () => ({
  db: {
    addWeeklyReport: vi.fn(),
  },
}));

vi.mock('../lib/gemini', () => ({
  generateWeeklyReportAI: vi.fn(),
}));

// Mock window.print and window.alert
const originalAlert = window.alert;
beforeEach(() => {
  vi.clearAllMocks();
  window.alert = vi.fn();
});

afterAll(() => {
  window.alert = originalAlert;
});

describe('WeeklyReportView Component tests', () => {
  const mockProfile = {
    id: 'user-123',
    email: 'test@example.com',
    full_name: 'Alex Green',
    points: 100,
    current_streak: 3,
    max_streak: 5,
    carbon_saved_kg: 10,
    goals: [],
  };

  const reports = [
    {
      id: 'rep-existing-old',
      user_id: 'user-123',
      week_start_date: '2026-06-01',
      total_emissions_kg: 15.0,
      trend_percentage: -5.0,
      best_activities: [],
      areas_for_improvement: [],
      ai_action_plan: 'Old Action Plan Text',
      created_at: new Date().toISOString(),
    }
  ];

  it('generates a new report if none exists for the current week start date', async () => {
    // Current date calculation inside handleGenerateReport:
    // const weekStartStr = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const now = new Date();
    const currentWeekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // mock Gemini and db functions
    vi.mocked(generateWeeklyReportAI).mockResolvedValue('## New Action Plan text generated');
    vi.mocked(db.addWeeklyReport).mockResolvedValue({
      id: 'rep-new-current',
      user_id: 'user-123',
      week_start_date: currentWeekStart,
      total_emissions_kg: 0,
      trend_percentage: -8.0,
      best_activities: [],
      areas_for_improvement: [],
      ai_action_plan: '## New Action Plan text generated',
      created_at: new Date().toISOString(),
    });

    render(
      <WeeklyReportView
        reports={reports}
        trips={[]}
        fuelRecords={[]}
        electricityRecords={[]}
        profile={mockProfile}
        refreshData={vi.fn()}
      />
    );

    const button = screen.getByRole('button', { name: /Compile Weekly Report/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(generateWeeklyReportAI).toHaveBeenCalledTimes(1);
      expect(db.addWeeklyReport).toHaveBeenCalledTimes(1);
    });
  });

  it('re-uses the existing report and avoids calling Gemini or database if report exists for week start date', async () => {
    const now = new Date();
    const currentWeekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Add report for current week to mock props
    const existingReportsWithCurrent = [
      {
        id: 'rep-existing-current',
        user_id: 'user-123',
        week_start_date: currentWeekStart,
        total_emissions_kg: 10.0,
        trend_percentage: -2.0,
        best_activities: [],
        areas_for_improvement: [],
        ai_action_plan: 'Existing Weekly Plan Content',
        created_at: new Date().toISOString(),
      },
      ...reports
    ];

    render(
      <WeeklyReportView
        reports={existingReportsWithCurrent}
        trips={[]}
        fuelRecords={[]}
        electricityRecords={[]}
        profile={mockProfile}
        refreshData={vi.fn()}
      />
    );

    const button = screen.getByRole('button', { name: /Compile Weekly Report/i });
    fireEvent.click(button);

    // Wait a brief moment to ensure no asynchronous calls are triggered
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(generateWeeklyReportAI).not.toHaveBeenCalled();
    expect(db.addWeeklyReport).not.toHaveBeenCalled();
  });

  it('handles database errors by alerting the actual database error message', async () => {
    vi.mocked(generateWeeklyReportAI).mockResolvedValue('## Action Plan');
    vi.mocked(db.addWeeklyReport).mockRejectedValue(new Error('Unique constraint violation or mock DB failure'));

    render(
      <WeeklyReportView
        reports={reports}
        trips={[]}
        fuelRecords={[]}
        electricityRecords={[]}
        profile={mockProfile}
        refreshData={vi.fn()}
      />
    );

    const button = screen.getByRole('button', { name: /Compile Weekly Report/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith(
        expect.stringContaining('Could not compile weekly report: Unique constraint violation or mock DB failure')
      );
    });
  });
});
