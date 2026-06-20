-- EcoBuddy AI Database Setup Script
-- Run this in your Supabase SQL Editor to initialize the database tables, triggers, and security policies.

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================================================================
-- 1. Tables Creation
-- =========================================================================

-- Profiles Table (Extends Supabase Auth users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    points INTEGER DEFAULT 0 NOT NULL,
    current_streak INTEGER DEFAULT 0 NOT NULL,
    max_streak INTEGER DEFAULT 0 NOT NULL,
    carbon_saved_kg NUMERIC(10,2) DEFAULT 0.00 NOT NULL,
    goals TEXT[] DEFAULT '{}'::TEXT[] NOT NULL,
    last_active TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Trips Table
CREATE TABLE IF NOT EXISTS public.trips (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    transport_mode VARCHAR(50) NOT NULL,
    distance_km NUMERIC(10,2) NOT NULL,
    duration_min INTEGER NOT NULL,
    fuel_consumption_litres NUMERIC(10,2) DEFAULT 0.00,
    co2_emissions_kg NUMERIC(10,2) NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    start_lat NUMERIC(10,7),
    start_lng NUMERIC(10,7),
    end_lat NUMERIC(10,7),
    end_lng NUMERIC(10,7),
    active BOOLEAN DEFAULT false NOT NULL
);

-- Fuel Records Table
CREATE TABLE IF NOT EXISTS public.fuel_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    litres NUMERIC(10,2) NOT NULL,
    fuel_type VARCHAR(50) NOT NULL,
    vehicle_mileage NUMERIC(10,2) NOT NULL,
    co2_emissions_kg NUMERIC(10,2) NOT NULL,
    purchase_date TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Electricity Records Table
CREATE TABLE IF NOT EXISTS public.electricity_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    units_kwh NUMERIC(10,2) NOT NULL,
    co2_emissions_kg NUMERIC(10,2) NOT NULL,
    bill_month VARCHAR(7) NOT NULL, -- Format: YYYY-MM
    bill_image_url TEXT,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Carbon Scores Table (Historical record of daily scores)
CREATE TABLE IF NOT EXISTS public.carbon_scores (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    date DATE DEFAULT CURRENT_DATE NOT NULL,
    total_emissions_kg NUMERIC(10,2) DEFAULT 0.00 NOT NULL,
    transport_emissions NUMERIC(10,2) DEFAULT 0.00 NOT NULL,
    fuel_emissions NUMERIC(10,2) DEFAULT 0.00 NOT NULL,
    electricity_emissions NUMERIC(10,2) DEFAULT 0.00 NOT NULL,
    score INTEGER DEFAULT 100 NOT NULL,
    UNIQUE(user_id, date)
);

-- Challenges Table (Static system-wide data)
CREATE TABLE IF NOT EXISTS public.challenges (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    points_reward INTEGER NOT NULL,
    icon VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    duration_days INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL
);

-- User Challenges Table (User participation)
CREATE TABLE IF NOT EXISTS public.user_challenges (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    challenge_id UUID REFERENCES public.challenges(id) ON DELETE CASCADE NOT NULL,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'failed')) NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Achievements Table (Static badges)
CREATE TABLE IF NOT EXISTS public.achievements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    badge_url VARCHAR(100) NOT NULL,
    points_required INTEGER NOT NULL
);

-- User Achievements Table
CREATE TABLE IF NOT EXISTS public.user_achievements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    achievement_id UUID REFERENCES public.achievements(id) ON DELETE CASCADE NOT NULL,
    awarded_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(user_id, achievement_id)
);

-- Weekly Reports Table
CREATE TABLE IF NOT EXISTS public.weekly_reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    week_start_date DATE NOT NULL,
    total_emissions_kg NUMERIC(10,2) NOT NULL,
    trend_percentage NUMERIC(6,2) NOT NULL,
    best_activities TEXT[] NOT NULL,
    areas_for_improvement TEXT[] NOT NULL,
    ai_action_plan TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(user_id, week_start_date)
);

-- =========================================================================
-- 2. Performance Indexes (Foreign Keys & Queries Optimization)
-- =========================================================================
CREATE INDEX IF NOT EXISTS trips_user_id_idx ON public.trips(user_id);
CREATE INDEX IF NOT EXISTS fuel_records_user_id_idx ON public.fuel_records(user_id);
CREATE INDEX IF NOT EXISTS electricity_records_user_id_idx ON public.electricity_records(user_id);
CREATE INDEX IF NOT EXISTS carbon_scores_user_id_date_idx ON public.carbon_scores(user_id, date);
CREATE INDEX IF NOT EXISTS user_challenges_user_id_idx ON public.user_challenges(user_id);
CREATE INDEX IF NOT EXISTS user_challenges_challenge_id_idx ON public.user_challenges(challenge_id);
CREATE INDEX IF NOT EXISTS user_achievements_user_id_idx ON public.user_achievements(user_id);
CREATE INDEX IF NOT EXISTS user_achievements_achievement_id_idx ON public.user_achievements(achievement_id);
CREATE INDEX IF NOT EXISTS weekly_reports_user_id_idx ON public.weekly_reports(user_id);

-- =========================================================================
-- 3. Row Level Security (RLS) Policies
-- =========================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fuel_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.electricity_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carbon_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_reports ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Users can view their own profile." ON public.profiles 
    FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile." ON public.profiles 
    FOR UPDATE USING (auth.uid() = id);

-- Trips Policies
CREATE POLICY "Users can CRUD their own trips" ON public.trips 
    FOR ALL USING (auth.uid() = user_id);

-- Fuel Records Policies
CREATE POLICY "Users can CRUD their own fuel records" ON public.fuel_records 
    FOR ALL USING (auth.uid() = user_id);

-- Electricity Records Policies
CREATE POLICY "Users can CRUD their own electricity records" ON public.electricity_records 
    FOR ALL USING (auth.uid() = user_id);

-- Carbon Scores Policies
CREATE POLICY "Users can CRUD their own carbon scores" ON public.carbon_scores 
    FOR ALL USING (auth.uid() = user_id);

-- Challenges Policies (Read-only for all authenticated & anonymous users)
CREATE POLICY "Anyone can view challenges" ON public.challenges 
    FOR SELECT TO authenticated, anon USING (true);

-- User Challenges Policies
CREATE POLICY "Users can CRUD their own challenges" ON public.user_challenges 
    FOR ALL USING (auth.uid() = user_id);

-- Achievements Policies (Read-only for all authenticated & anonymous users)
CREATE POLICY "Anyone can view achievements" ON public.achievements 
    FOR SELECT TO authenticated, anon USING (true);

-- User Achievements Policies
CREATE POLICY "Users can view their own achievements" ON public.user_achievements 
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can award achievements" ON public.user_achievements 
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Weekly Reports Policies
CREATE POLICY "Users can CRUD their own weekly reports" ON public.weekly_reports 
    FOR ALL USING (auth.uid() = user_id);

-- =========================================================================
-- 4. Database Triggers and Functions
-- =========================================================================

-- Trigger to automatically create a profile record when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, avatar_url, points, current_streak, max_streak, carbon_saved_kg, goals)
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'full_name', 'Eco User'),
        new.raw_user_meta_data->>'avatar_url',
        100, -- Initial points bonus
        1,
        1,
        0.00,
        ARRAY['Use public transport', 'Reduce electricity bill by 10%']
    );
    RETURN NEW;
END;
$$;

-- Associate Trigger with auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger to automatically award achievements when user's points increase
CREATE OR REPLACE FUNCTION public.check_and_award_achievements()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    ach record;
BEGIN
    -- For each achievement in achievements table
    FOR ach IN SELECT id, points_required FROM public.achievements LOOP
        -- If the user's updated points cross the achievement threshold
        IF NEW.points >= ach.points_required THEN
            -- Check if user was already awarded this achievement
            IF NOT EXISTS (
                SELECT 1 FROM public.user_achievements 
                WHERE user_id = NEW.id AND achievement_id = ach.id
            ) THEN
                -- Insert the award record (conflicts are ignored)
                INSERT INTO public.user_achievements (user_id, achievement_id)
                VALUES (NEW.id, ach.id)
                ON CONFLICT (user_id, achievement_id) DO NOTHING;
            END IF;
        END IF;
    END LOOP;
    RETURN NEW;
END;
$$;

-- Associate Trigger with public.profiles
DROP TRIGGER IF EXISTS on_profile_points_updated ON public.profiles;
CREATE TRIGGER on_profile_points_updated
    AFTER UPDATE OF points ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.check_and_award_achievements();

-- =========================================================================
-- 5. Seed Static System Data
-- =========================================================================

-- Insert Static Challenges with hardcoded static UUIDs to prevent duplicates on multiple runs
INSERT INTO public.challenges (id, title, description, points_reward, icon, category, duration_days, is_active) VALUES
('d3b07384-d113-4956-a5cc-9c7ef7bb48e4', 'No-Car Day', 'Avoid using a car or cab for an entire day. Choose walking, cycling, or public transport instead.', 50, 'car-off', 'transport', 1, true),
('a1b07384-d113-4956-a5cc-9c7ef7bb48e4', 'Public Transport Week', 'Use buses, metros, or trains for all your commutes this week.', 200, 'bus', 'transport', 7, true),
('b2b07384-d113-4956-a5cc-9c7ef7bb48e4', 'Save Electricity Challenge', 'Keep your daily electricity units below 5 kWh for 3 days by turning off standby appliances.', 100, 'zap', 'energy', 3, true),
('c3b07384-d113-4956-a5cc-9c7ef7bb48e4', 'Carry Reusable Bottle', 'Opt out of single-use plastic bottles for an entire week.', 75, 'droplets', 'lifestyle', 7, true),
('e4b07384-d113-4956-a5cc-9c7ef7bb48e4', 'Eco Commuter', 'Log 3 trips using a bicycle or walking.', 120, 'bike', 'transport', 5, true)
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    points_reward = EXCLUDED.points_reward,
    icon = EXCLUDED.icon,
    category = EXCLUDED.category,
    duration_days = EXCLUDED.duration_days,
    is_active = EXCLUDED.is_active;

-- Insert Static Achievements with hardcoded static UUIDs to prevent duplicates on multiple runs
INSERT INTO public.achievements (id, title, description, badge_url, points_required) VALUES
('f5b07384-d113-4956-a5cc-9c7ef7bb48e4', 'Eco Starter', 'Earn your first 100 points by joining EcoBuddy AI.', 'sprout', 100),
('06b07384-d113-4956-a5cc-9c7ef7bb48e4', 'Green Warrior', 'Complete your first eco challenge and earn 250 points.', 'shield', 250),
('17b07384-d113-4956-a5cc-9c7ef7bb48e4', 'Transit Champion', 'Record 10 low-emission public transit trips and reach 500 points.', 'bus', 500),
('28b07384-d113-4956-a5cc-9c7ef7bb48e4', 'Carbon Zero Hero', 'Accumulate 1,000 points through consistent green tracking.', 'award', 1000)
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    badge_url = EXCLUDED.badge_url,
    points_required = EXCLUDED.points_required;
