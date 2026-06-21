import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LoggersView } from '../components/LoggersView';
import { db } from '../lib/db';

vi.mock('../lib/db', () => ({
  db: {
    addFuelRecord: vi.fn(),
    addElectricityRecord: vi.fn(),
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

describe('LoggersView Validation Tests', () => {
  const refreshDataMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- Fuel Litres Validation ---
  describe('Fuel Litres Input', () => {
    it('allows a valid decimal value', async () => {
      render(
        <LoggersView
          fuelRecords={[]}
          electricityRecords={[]}
          refreshData={refreshDataMock}
        />
      );

      const litresInput = screen.getByLabelText(/litres purchased/i);
      const mileageInput = screen.getByLabelText(/vehicle mileage/i);
      const submitBtn = screen.getByRole('button', { name: /add fuel log/i });

      // Enter valid values
      fireEvent.change(litresInput, { target: { value: '35.75' } });
      fireEvent.change(mileageInput, { target: { value: '14.2' } });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(db.addFuelRecord).toHaveBeenCalledWith(35.75, 'petrol', 14.2);
      });
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('rejects a negative value', async () => {
      render(
        <LoggersView
          fuelRecords={[]}
          electricityRecords={[]}
          refreshData={refreshDataMock}
        />
      );

      const litresInput = screen.getByLabelText(/litres purchased/i);
      const submitBtn = screen.getByRole('button', { name: /add fuel log/i });

      // Enter negative litres
      fireEvent.change(litresInput, { target: { value: '-12.5' } });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(db.addFuelRecord).not.toHaveBeenCalled();
      });
      const errorMsg = screen.getByRole('alert');
      expect(errorMsg).toHaveTextContent(/fuel litres must be greater than 0/i);
    });

    it('rejects a zero value', async () => {
      render(
        <LoggersView
          fuelRecords={[]}
          electricityRecords={[]}
          refreshData={refreshDataMock}
        />
      );

      const litresInput = screen.getByLabelText(/litres purchased/i);
      const submitBtn = screen.getByRole('button', { name: /add fuel log/i });

      // Enter zero litres
      fireEvent.change(litresInput, { target: { value: '0' } });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(db.addFuelRecord).not.toHaveBeenCalled();
      });
      const errorMsg = screen.getByRole('alert');
      expect(errorMsg).toHaveTextContent(/fuel litres must be greater than 0/i);
    });
  });

  // --- Vehicle Mileage Validation ---
  describe('Vehicle Mileage Input', () => {
    it('rejects a negative value', async () => {
      render(
        <LoggersView
          fuelRecords={[]}
          electricityRecords={[]}
          refreshData={refreshDataMock}
        />
      );

      const litresInput = screen.getByLabelText(/litres purchased/i);
      const mileageInput = screen.getByLabelText(/vehicle mileage/i);
      const submitBtn = screen.getByRole('button', { name: /add fuel log/i });

      // Enter negative mileage
      fireEvent.change(litresInput, { target: { value: '35.5' } });
      fireEvent.change(mileageInput, { target: { value: '-1.5' } });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(db.addFuelRecord).not.toHaveBeenCalled();
      });
      const errorMsg = screen.getByRole('alert');
      expect(errorMsg).toHaveTextContent(/vehicle mileage must be greater than 0/i);
    });

    it('rejects a zero value', async () => {
      render(
        <LoggersView
          fuelRecords={[]}
          electricityRecords={[]}
          refreshData={refreshDataMock}
        />
      );

      const litresInput = screen.getByLabelText(/litres purchased/i);
      const mileageInput = screen.getByLabelText(/vehicle mileage/i);
      const submitBtn = screen.getByRole('button', { name: /add fuel log/i });

      // Enter zero mileage
      fireEvent.change(litresInput, { target: { value: '35.5' } });
      fireEvent.change(mileageInput, { target: { value: '0' } });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(db.addFuelRecord).not.toHaveBeenCalled();
      });
      const errorMsg = screen.getByRole('alert');
      expect(errorMsg).toHaveTextContent(/vehicle mileage must be greater than 0/i);
    });
  });

  // --- Electricity Units Validation ---
  describe('Electricity Units Input', () => {
    beforeEach(() => {
      // Need to switch to Electricity tab first
      render(
        <LoggersView
          fuelRecords={[]}
          electricityRecords={[]}
          refreshData={refreshDataMock}
        />
      );
      const electricityTabButton = screen.getByRole('button', { name: /grid electricity/i });
      fireEvent.click(electricityTabButton);
    });

    it('allows a valid decimal value', async () => {
      const unitsInput = screen.getByLabelText(/units consumed/i);
      const submitBtn = screen.getByRole('button', { name: /add bill log/i });

      // Enter valid decimal units
      fireEvent.change(unitsInput, { target: { value: '150.75' } });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(db.addElectricityRecord).toHaveBeenCalledWith(
          150.75,
          expect.any(String),
          undefined
        );
      });
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('rejects a negative value', async () => {
      const unitsInput = screen.getByLabelText(/units consumed/i);
      const submitBtn = screen.getByRole('button', { name: /add bill log/i });

      // Enter negative units
      fireEvent.change(unitsInput, { target: { value: '-5.2' } });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(db.addElectricityRecord).not.toHaveBeenCalled();
      });
      const errorMsg = screen.getByRole('alert');
      expect(errorMsg).toHaveTextContent(/electricity units must be greater than 0/i);
    });

    it('rejects a zero value', async () => {
      const unitsInput = screen.getByLabelText(/units consumed/i);
      const submitBtn = screen.getByRole('button', { name: /add bill log/i });

      // Enter zero units
      fireEvent.change(unitsInput, { target: { value: '0' } });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(db.addElectricityRecord).not.toHaveBeenCalled();
      });
      const errorMsg = screen.getByRole('alert');
      expect(errorMsg).toHaveTextContent(/electricity units must be greater than 0/i);
    });
  });
});
