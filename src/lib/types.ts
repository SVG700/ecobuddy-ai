export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  points: number;
  current_streak: number;
  max_streak: number;
  carbon_saved_kg: number;
  last_active?: string;
  goals: string[];
  created_at: string;
}

export type TransportMode =
  | 'walking'
  | 'bicycle'
  | 'bus'
  | 'metro'
  | 'train'
  | 'bike'
  | 'car'
  | 'cab';

export interface Trip {
  id: string;
  user_id: string;
  transport_mode: TransportMode;
  distance_km: number;
  duration_min: number;
  fuel_consumption_litres?: number;
  co2_emissions_kg: number;
  start_time: string;
  end_time?: string;
  start_lat?: number;
  start_lng?: number;
  end_lat?: number;
  end_lng?: number;
  active: boolean;
}

export type FuelType = 'petrol' | 'diesel';

export interface FuelRecord {
  id: string;
  user_id: string;
  litres: number;
  fuel_type: FuelType;
  vehicle_mileage: number; // km per litre
  co2_emissions_kg: number;
  purchase_date: string;
}

export interface ElectricityRecord {
  id: string;
  user_id: string;
  units_kwh: number;
  co2_emissions_kg: number;
  bill_month: string; // e.g. "2026-06"
  bill_image_url?: string;
  uploaded_at: string;
}

export interface CarbonScore {
  id: string;
  user_id: string;
  date: string; // "YYYY-MM-DD"
  total_emissions_kg: number;
  transport_emissions: number;
  fuel_emissions: number;
  electricity_emissions: number;
  score: number; // 0-100 score, higher is better (more eco-friendly)
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  points_reward: number;
  icon: string; // Lucide icon name
  category: 'transport' | 'energy' | 'lifestyle' | 'waste';
  duration_days: number;
  is_active: boolean;
}

export interface UserChallenge {
  id: string;
  user_id: string;
  challenge_id: string;
  status: 'active' | 'completed' | 'failed';
  started_at: string;
  completed_at?: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  badge_url: string; // e.g. "leaf", "shield", "zap"
  points_required: number;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  awarded_at: string;
}

export interface WeeklyReport {
  id: string;
  user_id: string;
  week_start_date: string; // "YYYY-MM-DD"
  total_emissions_kg: number;
  trend_percentage: number; // e.g. -12 for 12% reduction
  best_activities: string[];
  areas_for_improvement: string[];
  ai_action_plan: string; // MD formatted text from Gemini
  created_at: string;
}
