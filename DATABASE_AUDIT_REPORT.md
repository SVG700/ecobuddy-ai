# EcoBuddy AI - Supabase Database Audit Report

This report presents a comprehensive database audit for the EcoBuddy AI application. The live application has encountered `PGRST205` and `404 Not Found` errors due to missing database tables in the Supabase schema cache.

---

## 🔍 Audit Summary

1. **Schema Deployment Status**: 🔴 **Failed (Not Deployed)**
   - The remote Supabase database (`epjthblkixhzjodfubcu.supabase.co`) does not have any of the required application tables. All API queries for tables are failing.
2. **Local Schema Validity**: 🟢 **Valid**
   - The local `schema.sql` contains all required table structures, initial static data, and RLS policies.
3. **Database Performance**: 🟡 **Needs Improvement**
   - The master `schema.sql` does not define indexes on foreign key columns, which will cause slow queries (sequential scans) as user logs grow.
4. **Achievements System**: 🔴 **Broken Dependency**
   - The client-side code only awards achievements locally in offline fallback mode. In Supabase mode, achievements are never persisted or checked because the client does not insert them and the database lacks triggers to automate this logic.
5. **Security (RLS)**: 🟡 **Needs Security Path Hardening**
   - Trigger functions using `SECURITY DEFINER` do not specify an explicit `search_path`, leaving them vulnerable to search path hijacking.

---

## 📋 Table Deployment Verification

A live REST API check was conducted on the Supabase project to verify the existence of each table. The results are as follows:

| Table | Status in Remote DB | Error Code | Root Cause |
| :--- | :--- | :--- | :--- |
| `profiles` | ❌ Missing | `PGRST205` | Table not deployed to Supabase |
| `trips` | ❌ Missing | `PGRST205` | Table not deployed to Supabase |
| `fuel_records` | ❌ Missing | `PGRST205` | Table not deployed to Supabase |
| `electricity_records` | ❌ Missing | `PGRST205` | Table not deployed to Supabase |
| `carbon_scores` | ❌ Missing | `PGRST205` | Table not deployed to Supabase |
| `challenges` | ❌ Missing | `PGRST205` | Table not deployed to Supabase |
| `user_challenges` | ❌ Missing | `PGRST205` | Table not deployed to Supabase |
| `achievements` | ❌ Missing | `PGRST205` | Table not deployed to Supabase |
| `user_achievements` | ❌ Missing | `PGRST205` | Table not deployed to Supabase |
| `weekly_reports` | ❌ Missing | `PGRST205` | Table not deployed to Supabase |

---

## 🛠️ Detailed Component Verification

### 1. Profile Creation After Signup
- **Current Flow**: Signup inserts a record into `auth.users`. The trigger `on_auth_user_created` calls `handle_new_user()`, which inserts a profile into `public.profiles`.
- **Audit Finding**: The trigger is not deployed. Once deployed, it will work correctly because the trigger uses `SECURITY DEFINER` to bypass Row Level Security restrictions for the newly created profile.
- **Hardening Recommendation**: Explicitly add `SET search_path = public` to the `handle_new_user` function to protect against search path hijacking.

### 2. Travel Tracker (`trips` table)
- **Current Flow**: `db.startTrip` inserts a trip record with a distance of 0. `db.stopTrip` updates the trip with distance, duration, emissions, and ends active state.
- **Audit Finding**: RLS policies for `trips` table allow full CRUD for the user. Once the table and RLS are deployed, it will work seamlessly.

### 3. Weekly Reports (`weekly_reports` table)
- **Current Flow**: `db.addWeeklyReport` saves AI-generated action plans to `weekly_reports`.
- **Audit Finding**: Currently, the RLS policies only allow `SELECT` and `INSERT`. If a user attempts to regenerate a weekly report (due to the `UNIQUE(user_id, week_start_date)` constraint), the insert will crash on conflict.
- **Hardening Recommendation**: Add `UPDATE` and `DELETE` policies for the user to make the report regeneration robust.

### 4. Fuel & Electricity Loggers (`fuel_records` & `electricity_records`)
- **Current Flow**: Add fuel and electricity consumption logs.
- **Audit Finding**: Table structure and CRUD RLS policies are fully compatible. Persisting data will work as soon as the tables are deployed.

---

## 🔗 Broken Dependencies & Gaps

### 🏆 Achievement Awarding System Gap
The frontend code `src/lib/db.ts` only awards achievements in the local-offline mode. In Supabase mode, the `checkAndAwardAchievements` helper is bypassed and there is no database-level trigger to check and write to `user_achievements`.
- **Solution**: We added a database trigger `on_profile_points_updated` that executes `check_and_award_achievements()`. Whenever the `points` column in `public.profiles` is updated, the database automatically checks the thresholds and awards achievements dynamically.

### ⚡ Performance Gap (Missing Indexes)
As users log trips, fuel, and electricity records, querying these tables will become slower due to table-scans.
- **Solution**: We added database indexes on all foreign key columns (`user_id`, `challenge_id`, `achievement_id`) in `database_setup.sql`.

### 🔄 Static Seeding ID Collisions
If static seeding data is inserted multiple times, it will result in primary key conflicts or duplicate rows.
- **Solution**: We assigned static UUIDs to all seeded challenges and achievements and configured them with `ON CONFLICT (id) DO UPDATE` to ensure idempotence.

---

## 🚀 Supabase Deployment Guide

To deploy the schema and resolve the application errors, follow the step-by-step instructions below.

### Step 1: Open Supabase SQL Editor
1. Go to the [Supabase Dashboard](https://supabase.com/dashboard).
2. Select your project: `epjthblkixhzjodfubcu`.
3. In the left navigation bar, click on **SQL Editor**.
4. Click on **New Query** to open a blank SQL sheet.

### Step 2: Copy and Execute `database_setup.sql`
1. Open the [database_setup.sql](file:///C:/Users/User/Desktop/Samhith%20V%20Gupta/My%20Apps/EcoBuddy%20AI/database_setup.sql) file.
2. Copy the entire contents of the file.
3. Paste the contents into the Supabase SQL Editor.
4. Click the **Run** button (or press `Ctrl + Enter` / `Cmd + Enter`).
5. Confirm that the status message says `Success. No rows returned` or shows successful inserts.

### Step 3: Verify Tables in the Dashboard
1. Go to the **Table Editor** on the left menu.
2. Verify that all 10 tables are present in the `public` schema.
3. Click on `challenges` and `achievements` to verify that they are populated with the static seed data.
