# 🌍 EcoBuddy AI — Production-Ready Sustainability Platform

EcoBuddy AI is a mobile-first Progressive Web Application (PWA) designed to help students, daily commuters, and professionals track, calculate, and reduce their daily carbon footprint. Powered by **Google Gemini API** for personalized ecological recommendations, and backed by a **Supabase** real-time database, EcoBuddy AI turns carbon accounting into an interactive, gamified journey.

---

## 🚀 Key Features

1. **User Authentication:** Sign up, sign in, password reset, and dynamic sandbox developer mode for zero-config evaluation.
2. **Interactive Dashboard:** View carbon scores, weekly totals, progress trackers, and beautiful Recharts-powered analytics.
3. **Smart Travel Tracker:** Real-time location tracking using the HTML5 Geolocation API. Calculates transit mileage, estimates fuel, and logs travel emissions. Includes a developer routing simulator.
4. **Fuel Log Tracker:** Input vehicle mileage and gas refills (petrol/diesel) to automatically record CO₂ emissions.
5. **Grid Electricity Tracker:** Log energy consumption (kWh) manually, or snap a photo of your electric bill to analyze usage via simulated **AI OCR Scanning**.
6. **Eco Challenges & Rewards:** Activate challenges (e.g. *No-Car Day*, *Carry Reusable Bottle*) to build sustainability streaks, earn points, unlock medals, and trigger interactive canvas-confetti.
7. **AI Sustainability Coach:** Instant chat with **EcoBuddy Coach** powered by Gemini. Analyzes active records to output custom green habits.
8. **Weekly Audit Reports:** Compile your weekly emissions into a printable, professional Markdown summary with eco highlights and AI roadmap suggestions.

---

## 🛠️ Tech Stack & Architecture

- **Framework:** Next.js 15 (App Router, Server Actions, API Routes)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4 & Vanilla CSS custom properties
- **Database / Auth:** Supabase (Postgres with Row-Level Security)
- **AI Integration:** Google Gemini SDK (`@google/generative-ai`)
- **Analytics:** Recharts Responsive Charts
- **PWA:** Service Worker offline cache registration & dynamic PWA manifest

---

## 📂 Folder Structure

```text
EcoBuddy AI/
├── public/
│   ├── sw.js                 # PWA service worker (offline cache & assets shell)
│   ├── icon-192.png          # PWA android icon
│   └── icon-512.png          # PWA play store icon
├── schema.sql                # Complete Supabase PostgreSQL initialization script
├── src/
│   ├── app/
│   │   ├── api/ai/
│   │   │   ├── coach/route.ts# Gemini AI Coach chat API endpoint
│   │   │   └── report/route.ts# Gemini AI report generation API endpoint
│   │   ├── globals.css       # Tailwind CSS tokens & custom light/dark theme rules
│   │   ├── layout.tsx        # Layout wrapper (PWA registration and viewport setups)
│   │   ├── manifest.ts       # Type-safe dynamic PWA manifest
│   │   └── page.tsx          # Root client container (tab switcher & database sync)
│   ├── components/
│   │   ├── AuthScreen.tsx    # Auth forms (Supabase and Sandbox fallback)
│   │   ├── BottomNav.tsx     # Mobile-first navigation controller
│   │   ├── Header.tsx        # Top navbar containing user profile stats & dark mode
│   │   ├── DashboardView.tsx # Analytics cards and Recharts trend graphs
│   │   ├── TravelTracker.tsx # GPS navigation tracker and routing simulator
│   │   ├── LoggersView.tsx   # Fuel logger & Electricity bill OCR scanner
│   │   ├── ChallengesView.tsx# Active challenges checklist & earned badge collections
│   │   ├── WeeklyReportView.tsx# Weekly report audit view & print configurations
│   │   ├── ProfileView.tsx   # Custom goal planner and profile manager
│   │   ├── Icons.tsx         # Dynamic Lucide icon lookup mapping
│   │   └── PWARegistration.tsx# Service worker registration script
│   └── lib/
│       ├── calculations.ts   # Reusable carbon emission formulas
│       ├── db.ts             # Supabase client / LocalStorage sync interface
│       ├── gemini.ts         # Gemini coach client bindings & heuristics fallback
│       ├── supabaseClient.ts # Supabase client initializer
│       └── types.ts          # Core database TypeScript interfaces
├── package.json
└── tsconfig.json
```

---

## ⚙️ Setup Instructions

### 1. Prerequisites
Make sure you have **Node.js** (v18+) and **npm** installed.

### 2. Installation
Clone or navigate to the repository directory and install the packages:
```bash
npm install
```

### 3. Setup Environment Variables
Create a `.env.local` file in the root directory and add your credentials:
```env
# Google Gemini API Key
NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key_here

# Supabase Credentials (optional, app falls back to LocalStorage sandbox automatically)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

### 4. Supabase Database Setup (Optional)
If you wish to hook up the cloud database:
1. Go to your [Supabase Console](https://supabase.com) and create a new project.
2. Navigate to the **SQL Editor** tab.
3. Copy the contents of the `schema.sql` file at the root of this project and paste it into the editor.
4. Run the script. This creates all tables (Profiles, Trips, Fuel, Electricity, Scores, Challenges, Achievements, Weekly Reports) and configures triggers and Row-Level Security policies.
5. In your project settings, enable Email Auth or disable "Confirm Email" for quick developer testing.

### 5. Running the Application
Launch the local development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

- To test the PWA, access the site on a mobile browser or run standard audits using Chrome DevTools Lighthouse.
- If no database credentials are provided, the app will run in **Developer Sandbox Mode**, storing your trips, fuel refuels, and challenges in `localStorage` with full CRUD support, pre-populating mock stats so the charts display mock records instantly.

---

## 📈 Success Metrics

This app is ready for competition, hackathon, and portfolio review:
- **Responsive Web App:** Seamless on mobile, tablet, and desktop views.
- **Micro-Animations:** Fluid tab animations, scanner line loops, and victory confetti.
- **Accessibility:** Accessible color palettes, high-contrast layouts, and semantic HTML elements.
- **Robustness:** Zero-config launch capability. Handles missing keys gracefully, falling back to a client-side AI heuristic engine.
