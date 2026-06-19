-- EcoBuddy AI Database Schema
-- Run this in your Supabase SQL Editor to initialize the database tables, triggers, and security policies.

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles Table (Extends Supabase Auth users)
CREATE TABLE public.profiles (
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

-- RLS policies for Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own profile." ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile." ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Trigger to automatically create a profile record when a new user signs up in auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Trips Table
CREATE TABLE public.trips (
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

-- RLS for Trips
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD their own trips" ON public.trips FOR ALL USING (auth.uid() = user_id);

-- 3. Fuel Records Table
CREATE TABLE public.fuel_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    litres NUMERIC(10,2) NOT NULL,
    fuel_type VARCHAR(50) NOT NULL,
    vehicle_mileage NUMERIC(10,2) NOT NULL,
    co2_emissions_kg NUMERIC(10,2) NOT NULL,
    purchase_date TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- RLS for Fuel Records
ALTER TABLE public.fuel_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD their own fuel records" ON public.fuel_records FOR ALL USING (auth.uid() = user_id);

-- 4. Electricity Records Table
CREATE TABLE public.electricity_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    units_kwh NUMERIC(10,2) NOT NULL,
    co2_emissions_kg NUMERIC(10,2) NOT NULL,
    bill_month VARCHAR(7) NOT NULL, -- Format: YYYY-MM
    bill_image_url TEXT,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- RLS for Electricity Records
ALTER TABLE public.electricity_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD their own electricity records" ON public.electricity_records FOR ALL USING (auth.uid() = user_id);

-- 5. Carbon Scores Table (Historical record of daily scores)
CREATE TABLE public.carbon_scores (
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

-- RLS for Carbon Scores
ALTER TABLE public.carbon_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own carbon scores" ON public.carbon_scores FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert/update their own carbon scores" ON public.carbon_scores FOR ALL USING (auth.uid() = user_id);

-- 6. Challenges Table (Static system-wide data)
CREATE TABLE public.challenges (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    points_reward INTEGER NOT NULL,
    icon VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    duration_days INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL
);

-- Insert sample challenges
INSERT INTO public.challenges (title, description, points_reward, icon, category, duration_days) VALUES
('No-Car Day', 'Avoid using a car or cab for an entire day. Choose walking, cycling, or public transport instead.', 50, 'car-off', 'transport', 1),
('Public Transport Week', 'Use buses, metros, or trains for all your commutes this week.', 200, 'bus', 'transport', 7),
('Save Electricity Challenge', 'Keep your daily electricity units below 5 kWh for 3 days by turning off standby appliances.', 100, 'zap', 'energy', 3),
('Carry Reusable Bottle', 'Opt out of single-use plastic bottles for an entire week.', 75, 'droplets', 'lifestyle', 7),
('Eco Commuter', 'Log 3 trips using a bicycle or walking.', 120, 'bike', 'transport', 5);

-- RLS for Challenges (Anyone can read, Admin write)
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view challenges" ON public.challenges FOR SELECT TO authenticated, anon USING (true);

-- 7. User Challenges Table (User participation)
CREATE TABLE public.user_challenges (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    challenge_id UUID REFERENCES public.challenges(id) ON DELETE CASCADE NOT NULL,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'failed')) NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- RLS for User Challenges
ALTER TABLE public.user_challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view and update their own challenge statuses" ON public.user_challenges FOR ALL USING (auth.uid() = user_id);

-- 8. Achievements Table (Static badges)
CREATE TABLE public.achievements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    badge_url VARCHAR(100) NOT NULL,
    points_required INTEGER NOT NULL
);

INSERT INTO public.achievements (title, description, badge_url, points_required) VALUES
('Eco Starter', 'Earn your first 100 points by joining EcoBuddy AI.', 'sprout', 100),
('Green Warrior', 'Complete your first eco challenge and earn 250 points.', 'shield', 250),
('Transit Champion', 'Record 10 low-emission public transit trips and reach 500 points.', 'bus', 500),
('Carbon Zero Hero', 'Accumulate 1,000 points through consistent green tracking.', 'award', 1000);

-- RLS for Achievements
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view achievements" ON public.achievements FOR SELECT TO authenticated, anon USING (true);

-- 9. User Achievements Table
CREATE TABLE public.user_achievements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    achievement_id UUID REFERENCES public.achievements(id) ON DELETE CASCADE NOT NULL,
    awarded_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(user_id, achievement_id)
);

-- RLS for User Achievements
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their achievements" ON public.user_achievements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can award achievements" ON public.user_achievements FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 10. Weekly Reports Table
CREATE TABLE public.weekly_reports (
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

-- RLS for Weekly Reports
ALTER TABLE public.weekly_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own weekly reports" ON public.weekly_reports FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own weekly reports" ON public.weekly_reports FOR INSERT WITH CHECK (auth.uid() = user_id);
