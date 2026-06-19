# EcoBuddy AI - Testing Strategy and Documentation

This document outlines the testing strategy, coverage matrix, and execution steps for EcoBuddy AI to ensure robust, competition-ready testing compliance.

---

## 🎯 Test Strategy Overview

We use **Vitest** coupled with **React Testing Library** for faster, zero-config compilation and high-fidelity testing of React components and custom hooks.

The test strategy spans three testing tiers:
1. **Unit Tests**: Verifying mathematical correctness of carbon calculations (travel, fuel, electricity) and helper functions.
2. **Integration Tests**: Verifying end-to-end user flows on the client side (e.g. database schema logging storage via `localStorage`/Supabase client) and API routes (e.g. rate limiters and payload schemas for AI Coach).
3. **Component (UI) Tests**: Rendering UI blocks under a simulated DOM (`jsdom`) to verify page layouts, interactive state changes, form controls, and validation errors.

---

## 📊 Coverage Matrix

Our test suites target the following code areas:

| Module | Test File | Type | Coverage Areas |
| :--- | :--- | :--- | :--- |
| **Authentication** | [auth.test.ts](file:///C:/Users/User/Desktop/Samhith%20V%20Gupta/My%20Apps/EcoBuddy%20AI/src/__tests__/auth.test.ts) | Unit | Session initialization, sandbox localStorage sync, and logout. |
| **Auth Screen UI** | [auth_screen.test.tsx](file:///C:/Users/User/Desktop/Samhith%20V%20Gupta/My%20Apps/EcoBuddy%20AI/src/__tests__/auth_screen.test.tsx) | Component | Rendering states (Login, Sign Up, Forgot Password), transitions, and error mappings. |
| **Calculations** | [calculations.test.ts](file:///C:/Users/User/Desktop/Samhith%20V%20Gupta/My%20Apps/EcoBuddy%20AI/src/__tests__/calculations.test.ts) | Unit | Core math checks, what-if savings projections, and fuel estimation. |
| **Carbon Scores** | [carbon.test.ts](file:///C:/Users/User/Desktop/Samhith%20V%20Gupta/My%20Apps/EcoBuddy%20AI/src/__tests__/carbon.test.ts) | Unit | Daily score calculations, what-if metrics, and boundaries evaluation. |
| **Travel Tracking** | [travel.test.ts](file:///C:/Users/User/Desktop/Samhith%20V%20Gupta/My%20Apps/EcoBuddy%20AI/src/__tests__/travel.test.ts) | Integration | Distance logs storage, mode-specific emissions, and retrieval operations. |
| **Fuel Logging** | [fuel.test.ts](file:///C:/Users/User/Desktop/Samhith%20V%20Gupta/My%20Apps/EcoBuddy%20AI/src/__tests__/fuel.test.ts) | Integration | Fuel quantity logging, type-specific factors (petrol vs diesel), and bounds validation. |
| **Electricity Logging**| [electricity.test.ts](file:///C:/Users/User/Desktop/Samhith%20V%20Gupta/My%20Apps/EcoBuddy%20AI/src/__tests__/electricity.test.ts) | Integration | Electricity logging integration, grid emissions factors, and boundary inputs. |
| **Dashboard Metrics**| [dashboard_metrics.test.tsx](file:///C:/Users/User/Desktop/Samhith%20V%20Gupta/My%20Apps/EcoBuddy%20AI/src/__tests__/dashboard_metrics.test.tsx)| Component | Metrics dashboard rendering (points, streak, saved carbon) and simulation drawer triggers. |
| **AI Coach API** | [ai_coach.test.ts](file:///C:/Users/User/Desktop/Samhith%20V%20Gupta/My%20Apps/EcoBuddy%20AI/src/__tests__/ai_coach.test.ts) | Integration | Rate limiting validation, payload context verification, and server configuration fallbacks. |

---

## ⚡ Handling Edge Cases & Boundaries

The automated test suites explicitly target standard boundary states and validation constraints:
1. **Invalid Log Inputs**: Fuel litres, electricity units, and trip distances are verified to throw exceptions at the database tier on negative numbers.
2. **Missing Env Variables**: AI Coach API gracefully fails with custom code exceptions if the API key is not configured.
3. **Mock Fallback Modes**: Auth screen detects missing cloud credentials, transitioning to local-offline mode seamlessly to ensure the app continues to operate.
4. **Recharts Graph Mocking**: High-fidelity charts are mocked out under `jsdom` to avoid layout calculations throwing canvas rendering errors.

---

## 🛠️ Execution Instructions

### Run All Tests
Execute the Vitest test runner:
```bash
npm run test
```

---

## 📋 Manual Testing Checklist

Use this checklist for regression testing of the authentication and logging states in a browser:

### 👤 Authentication Page
- [ ] Verify page loads with premium dark radial background and glowing title branding.
- [ ] Confirm "Launch Instant Demo Mode (No Setup)" button is completely absent.
- [ ] Switch to **Sign Up** mode and submit: Verify name, email, and password controls validation.
- [ ] Switch to **Forgot Password** mode: Submit an email to trigger reset emails.
- [ ] Submit invalid credentials: Check that the error message says `"Invalid email or password"` instead of a raw API gateway trace.

### 🚗 Travel Logger
- [ ] Start a travel tracker simulation: Input distance, choose walking/bicycle, and confirm emissions show as `0 kg CO2`.
- [ ] Choose fossil-fuel mode (e.g. Car) and verify emissions scale appropriately.
- [ ] Confirm the new travel log appears inside the Travel logs history table.

### 🔌 Resources & Utilities Logger
- [ ] Enter a fuel log (e.g., Petrol): Ensure emissions calculate dynamically based on litres.
- [ ] Enter grid units (kWh): Check that grid footprint correctly aggregates in the dashboard calculations.
- [ ] Enter negative numeric parameters: Confirm inputs are rejected.
