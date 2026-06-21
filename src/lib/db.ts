import { supabase, isSupabaseConfigured } from './supabaseClient';
import { 
  UserProfile, Trip, FuelRecord, ElectricityRecord, 
  CarbonScore, Challenge, UserChallenge, Achievement, 
  UserAchievement, WeeklyReport, TransportMode, FuelType 
} from './types';
import { 
  calculateTripEmissions, calculateFuelEmissions, 
  calculateElectricityEmissions, calculateCarbonScore 
} from './calculations';

const isSandboxMode = () => {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('eb_sandbox_mode') === 'true';
};

const shouldUseSupabase = () => {
  return !!(isSupabaseConfigured && supabase && !isSandboxMode());
};

// Static challenges (same as SQL schema)
const DEFAULT_CHALLENGES: Challenge[] = [
  {
    id: 'ch-1',
    title: 'No-Car Day',
    description: 'Avoid using a car or cab for an entire day. Choose walking, cycling, or public transport instead.',
    points_reward: 50,
    icon: 'CarFront',
    category: 'transport',
    duration_days: 1,
    is_active: true
  },
  {
    id: 'ch-2',
    title: 'Public Transport Week',
    description: 'Use buses, metros, or trains for all your commutes this week.',
    points_reward: 200,
    icon: 'Bus',
    category: 'transport',
    duration_days: 7,
    is_active: true
  },
  {
    id: 'ch-3',
    title: 'Save Electricity Challenge',
    description: 'Keep your daily electricity units below 5 kWh for 3 days by turning off standby appliances.',
    points_reward: 100,
    icon: 'Zap',
    category: 'energy',
    duration_days: 3,
    is_active: true
  },
  {
    id: 'ch-4',
    title: 'Carry Reusable Bottle',
    description: 'Opt out of single-use plastic bottles for an entire week.',
    points_reward: 75,
    icon: 'CupSoda',
    category: 'lifestyle',
    duration_days: 7,
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

// Static achievements (same as SQL schema)
const DEFAULT_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'ac-1',
    title: 'Eco Starter',
    description: 'Earn your first 100 points by joining EcoBuddy AI.',
    badge_url: 'Sprout',
    points_required: 100
  },
  {
    id: 'ac-2',
    title: 'Green Warrior',
    description: 'Complete your first eco challenge and earn 250 points.',
    badge_url: 'ShieldCheck',
    points_required: 250
  },
  {
    id: 'ac-3',
    title: 'Transit Champion',
    description: 'Record 10 low-emission public transit trips and reach 500 points.',
    badge_url: 'Bus',
    points_required: 500
  },
  {
    id: 'ac-4',
    title: 'Carbon Zero Hero',
    description: 'Accumulate 1,000 points through consistent green tracking.',
    badge_url: 'Award',
    points_required: 1000
  }
];

// Pre-populated demo data for LocalStorage fallback
const getInitialMockData = () => {
  const now = new Date();
  
  const profile: UserProfile = {
    id: 'mock-user-123',
    email: 'eco.buddy@example.com',
    full_name: 'Alex Green',
    points: 320,
    current_streak: 5,
    max_streak: 12,
    carbon_saved_kg: 45.2,
    goals: ['Use public transport 3x a week', 'Unplug chargers at night', 'Walk to nearby stores'],
    created_at: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
  };

  // Generate past trips for charts
  const trips: Trip[] = [
    {
      id: 'trip-1',
      user_id: profile.id,
      transport_mode: 'metro',
      distance_km: 12.5,
      duration_min: 25,
      co2_emissions_kg: calculateTripEmissions('metro', 12.5),
      start_time: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString(),
      active: false
    },
    {
      id: 'trip-2',
      user_id: profile.id,
      transport_mode: 'walking',
      distance_km: 2.2,
      duration_min: 22,
      co2_emissions_kg: 0,
      start_time: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      active: false
    },
    {
      id: 'trip-3',
      user_id: profile.id,
      transport_mode: 'car',
      distance_km: 18.0,
      duration_min: 40,
      co2_emissions_kg: calculateTripEmissions('car', 18.0),
      start_time: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      active: false
    },
    {
      id: 'trip-4',
      user_id: profile.id,
      transport_mode: 'bus',
      distance_km: 6.4,
      duration_min: 20,
      co2_emissions_kg: calculateTripEmissions('bus', 6.4),
      start_time: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      active: false
    },
    {
      id: 'trip-5',
      user_id: profile.id,
      transport_mode: 'bicycle',
      distance_km: 4.5,
      duration_min: 18,
      co2_emissions_kg: 0,
      start_time: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      active: false
    },
    {
      id: 'trip-6',
      user_id: profile.id,
      transport_mode: 'cab',
      distance_km: 9.0,
      duration_min: 15,
      co2_emissions_kg: calculateTripEmissions('cab', 9.0),
      start_time: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      active: false
    },
    {
      id: 'trip-7',
      user_id: profile.id,
      transport_mode: 'walking',
      distance_km: 1.8,
      duration_min: 18,
      co2_emissions_kg: 0,
      start_time: now.toISOString(),
      active: false
    }
  ];

  // Fuel Records
  const fuelRecords: FuelRecord[] = [
    {
      id: 'fuel-1',
      user_id: profile.id,
      litres: 25,
      fuel_type: 'petrol',
      vehicle_mileage: 14,
      co2_emissions_kg: calculateFuelEmissions(25, 'petrol'),
      purchase_date: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'fuel-2',
      user_id: profile.id,
      litres: 30,
      fuel_type: 'petrol',
      vehicle_mileage: 14,
      co2_emissions_kg: calculateFuelEmissions(30, 'petrol'),
      purchase_date: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString()
    }
  ];

  // Electricity Records
  const electricityRecords: ElectricityRecord[] = [
    {
      id: 'elec-1',
      user_id: profile.id,
      units_kwh: 165,
      co2_emissions_kg: calculateElectricityEmissions(165),
      bill_month: '2026-04',
      uploaded_at: new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'elec-2',
      user_id: profile.id,
      units_kwh: 145,
      co2_emissions_kg: calculateElectricityEmissions(145),
      bill_month: '2026-05',
      uploaded_at: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000).toISOString()
    }
  ];

  // User Challenges
  const userChallenges: UserChallenge[] = [
    {
      id: 'uc-1',
      user_id: profile.id,
      challenge_id: 'ch-1',
      status: 'completed',
      started_at: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000).toISOString(),
      completed_at: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'uc-2',
      user_id: profile.id,
      challenge_id: 'ch-4',
      status: 'active',
      started_at: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString()
    }
  ];

  // User Achievements
  const userAchievements: UserAchievement[] = [
    {
      id: 'ua-1',
      user_id: profile.id,
      achievement_id: 'ac-1',
      awarded_at: new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'ua-2',
      user_id: profile.id,
      achievement_id: 'ac-2',
      awarded_at: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
    }
  ];

  // Generate carbon scores for the last 7 days
  const carbonScores: CarbonScore[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = d.toISOString().split('T')[0];
    
    // Find trips on this day
    const dayTrips = trips.filter(t => t.start_time.startsWith(dateStr));
    const transportEmissions = dayTrips.reduce((acc, t) => acc + t.co2_emissions_kg, 0);
    
    // Distribute fuel emissions (simulate 3 kg/day on average + purchase spikes)
    const dayFuel = fuelRecords.find(f => f.purchase_date.startsWith(dateStr));
    const fuelEmissions = dayFuel ? dayFuel.co2_emissions_kg : (i === 3 ? 10.0 : 0);
    
    // Distribute electricity (approx 4 kWh/day -> 3.4 kg CO2)
    const electricityEmissions = 3.4;
    
    carbonScores.push({
      id: `cs-${i}`,
      user_id: profile.id,
      date: dateStr,
      total_emissions_kg: Number((transportEmissions + fuelEmissions + electricityEmissions).toFixed(2)),
      transport_emissions: Number(transportEmissions.toFixed(2)),
      fuel_emissions: Number(fuelEmissions.toFixed(2)),
      electricity_emissions: Number(electricityEmissions.toFixed(2)),
      score: calculateCarbonScore(transportEmissions, fuelEmissions, electricityEmissions)
    });
  }

  // Weekly reports
  const weeklyReports: WeeklyReport[] = [
    {
      id: 'wr-1',
      user_id: profile.id,
      week_start_date: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      total_emissions_kg: 68.4,
      trend_percentage: -5.2,
      best_activities: ['Logged 3 walking trips instead of cab', 'Used public metro for work commutes'],
      areas_for_improvement: ['AC usage was high during weekend', 'Long car trip registered on Wednesday'],
      ai_action_plan: `### AI Eco Plan - Week of June 8
1. **Ditch the Car:** Shift Wednesday commute to metro (saves ~3.2 kg CO2).
2. **Unplug Standby:** Power down appliances on standby (saves ~0.8 kg CO2).
3. **Keep Hydrated (Green):** Carry a reusable bottle (completes challenge).`,
      created_at: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
    }
  ];

  return {
    profile,
    trips,
    fuelRecords,
    electricityRecords,
    userChallenges,
    userAchievements,
    carbonScores,
    weeklyReports
  };
};

// Local storage management helpers
const getLocal = <T>(key: string, defaultValue: T): T => {
  if (typeof window === 'undefined') return defaultValue;
  const val = localStorage.getItem(key);
  return val ? (JSON.parse(val) as T) : defaultValue;
};

const setLocal = <T>(key: string, value: T): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(key, JSON.stringify(value));
  }
};

export const db = {
  initializeDemoSession(): UserProfile {
    const mock = getInitialMockData();
    setLocal('eb_profile', mock.profile);
    setLocal('eb_trips', mock.trips);
    setLocal('eb_fuel', mock.fuelRecords);
    setLocal('eb_electricity', mock.electricityRecords);
    setLocal('eb_user_challenges', mock.userChallenges);
    setLocal('eb_user_achievements', mock.userAchievements);
    setLocal('eb_carbon_scores', mock.carbonScores);
    setLocal('eb_weekly_reports', mock.weeklyReports);
    return mock.profile;
  },

  clearLocalSession(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('eb_profile');
    localStorage.removeItem('eb_trips');
    localStorage.removeItem('eb_fuel');
    localStorage.removeItem('eb_electricity');
    localStorage.removeItem('eb_user_challenges');
    localStorage.removeItem('eb_user_achievements');
    localStorage.removeItem('eb_carbon_scores');
    localStorage.removeItem('eb_weekly_reports');
    localStorage.removeItem('eb_sandbox_mode');
  },

  // --- USER AUTHENTICATION & PROFILES ---
  async getProfile(): Promise<UserProfile> {
    if (shouldUseSupabase() && supabase) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (error) throw error;
      return data;
    } else {
      const profile = getLocal<UserProfile | null>('eb_profile', null);
      if (!profile) throw new Error('Not authenticated');
      return profile;
    }
  },

  async updateProfile(updates: Partial<UserProfile>): Promise<UserProfile> {
    if (shouldUseSupabase() && supabase) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } else {
      const profile = getLocal<UserProfile | null>('eb_profile', null);
      if (!profile) throw new Error('No profile found');
      
      const updated = { ...profile, ...updates };
      setLocal('eb_profile', updated);
      
      // Award achievement check
      this.checkAndAwardAchievements(updated.points);
      
      return updated;
    }
  },

  // --- TRIPS (TRAVEL TRACKING) ---
  async getTrips(): Promise<Trip[]> {
    if (shouldUseSupabase() && supabase) {
      const { data, error } = await supabase
        .from('trips')
        .select('*')
        .order('start_time', { ascending: false });
      
      if (error) throw error;
      return data;
    } else {
      return getLocal<Trip[]>('eb_trips', []);
    }
  },

  async startTrip(mode: TransportMode): Promise<Trip> {
    const nowStr = new Date().toISOString();
    if (shouldUseSupabase() && supabase) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('trips')
        .insert({
          user_id: user.id,
          transport_mode: mode,
          distance_km: 0,
          duration_min: 0,
          co2_emissions_kg: 0,
          start_time: nowStr,
          active: true
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } else {
      const profile = getLocal<UserProfile | null>('eb_profile', null);
      const trips = getLocal<Trip[]>('eb_trips', []);
      
      const newTrip: Trip = {
        id: `trip-${Date.now()}`,
        user_id: profile?.id || 'mock-user',
        transport_mode: mode,
        distance_km: 0,
        duration_min: 0,
        co2_emissions_kg: 0,
        start_time: nowStr,
        active: true
      };

      trips.unshift(newTrip);
      setLocal('eb_trips', trips);
      return newTrip;
    }
  },

  async stopTrip(tripId: string, distanceKm: number, durationMin: number): Promise<Trip> {
    if (shouldUseSupabase() && supabase) {
      // Fetch trip to get transport mode
      const { data: currentTrip, error: fetchErr } = await supabase
        .from('trips')
        .select('transport_mode')
        .eq('id', tripId)
        .single();

      if (fetchErr) throw fetchErr;

      const co2 = calculateTripEmissions(currentTrip.transport_mode as TransportMode, distanceKm);
      const nowStr = new Date().toISOString();

      const { data, error } = await supabase
        .from('trips')
        .update({
          distance_km: distanceKm,
          duration_min: durationMin,
          co2_emissions_kg: co2,
          end_time: nowStr,
          active: false
        })
        .eq('id', tripId)
        .select()
        .single();

      if (error) throw error;

      // Update daily carbon score & profile points/carbon saved
      await this.updateDailyScoreAndCarbonSaved(co2, distanceKm, currentTrip.transport_mode as TransportMode);

      return data;
    } else {
      const trips = getLocal<Trip[]>('eb_trips', []);
      const index = trips.findIndex((t: Trip) => t.id === tripId);
      if (index === -1) throw new Error('Trip not found');

      const trip = trips[index];
      const co2 = calculateTripEmissions(trip.transport_mode, distanceKm);
      const nowStr = new Date().toISOString();

      const updatedTrip = {
        ...trip,
        distance_km: distanceKm,
        duration_min: durationMin,
        co2_emissions_kg: co2,
        end_time: nowStr,
        active: false
      };

      trips[index] = updatedTrip;
      setLocal('eb_trips', trips);

      // Update daily carbon score & profile points
      await this.updateDailyScoreAndCarbonSaved(co2, distanceKm, trip.transport_mode);

      return updatedTrip;
    }
  },

  // --- FUEL RECORDS ---
  async getFuelRecords(): Promise<FuelRecord[]> {
    if (shouldUseSupabase() && supabase) {
      const { data, error } = await supabase
        .from('fuel_records')
        .select('*')
        .order('purchase_date', { ascending: false });
      
      if (error) throw error;
      return data;
    } else {
      return getLocal<FuelRecord[]>('eb_fuel', []);
    }
  },

  async addFuelRecord(litres: number, fuelType: FuelType, mileage: number): Promise<FuelRecord> {
    const co2 = calculateFuelEmissions(litres, fuelType);
    const nowStr = new Date().toISOString();

    if (shouldUseSupabase() && supabase) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('fuel_records')
        .insert({
          user_id: user.id,
          litres,
          fuel_type: fuelType,
          vehicle_mileage: mileage,
          co2_emissions_kg: co2,
          purchase_date: nowStr
        })
        .select()
        .single();

      if (error) throw error;

      // Update carbon score
      await this.updateDailyScoreAndCarbonSaved(co2, 0, 'car'); // fuel is car emissions
      return data;
    } else {
      const profile = getLocal<UserProfile | null>('eb_profile', null);
      const fuelRecords = getLocal<FuelRecord[]>('eb_fuel', []);

      const newRecord: FuelRecord = {
        id: `fuel-${Date.now()}`,
        user_id: profile?.id || 'mock-user',
        litres,
        fuel_type: fuelType,
        vehicle_mileage: mileage,
        co2_emissions_kg: co2,
        purchase_date: nowStr
      };

      fuelRecords.unshift(newRecord);
      setLocal('eb_fuel', fuelRecords);

      await this.updateDailyScoreAndCarbonSaved(co2, 0, 'car');
      return newRecord;
    }
  },

  // --- ELECTRICITY CONSUMPTION ---
  async getElectricityRecords(): Promise<ElectricityRecord[]> {
    if (shouldUseSupabase() && supabase) {
      const { data, error } = await supabase
        .from('electricity_records')
        .select('*')
        .order('uploaded_at', { ascending: false });
      
      if (error) throw error;
      return data;
    } else {
      return getLocal<ElectricityRecord[]>('eb_electricity', []);
    }
  },

  async addElectricityRecord(unitsKwh: number, billMonth: string, billImageUrl?: string): Promise<ElectricityRecord> {
    const co2 = calculateElectricityEmissions(unitsKwh);
    const nowStr = new Date().toISOString();

    if (shouldUseSupabase() && supabase) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('electricity_records')
        .insert({
          user_id: user.id,
          units_kwh: unitsKwh,
          co2_emissions_kg: co2,
          bill_month: billMonth,
          bill_image_url: billImageUrl,
          uploaded_at: nowStr
        })
        .select()
        .single();

      if (error) throw error;

      // Update score
      await this.updateDailyScoreAndCarbonSaved(co2, 0, 'walking'); // walking triggers dummy grid update
      return data;
    } else {
      const profile = getLocal<UserProfile | null>('eb_profile', null);
      const electricityRecords = getLocal<ElectricityRecord[]>('eb_electricity', []);

      const newRecord: ElectricityRecord = {
        id: `elec-${Date.now()}`,
        user_id: profile?.id || 'mock-user',
        units_kwh: unitsKwh,
        co2_emissions_kg: co2,
        bill_month: billMonth,
        bill_image_url: billImageUrl,
        uploaded_at: nowStr
      };

      electricityRecords.unshift(newRecord);
      setLocal('eb_electricity', electricityRecords);

      // Add 50 points reward for logging bill
      if (profile) {
        const updatedProfile = { ...profile, points: profile.points + 50 };
        setLocal('eb_profile', updatedProfile);
      }

      await this.updateDailyScoreAndCarbonSaved(co2, 0, 'walking');
      return newRecord;
    }
  },

  // --- CHALLENGES ---
  async getChallenges(): Promise<Challenge[]> {
    if (shouldUseSupabase() && supabase) {
      const { data, error } = await supabase
        .from('challenges')
        .select('*');
      
      if (error) throw error;
      return data;
    } else {
      return DEFAULT_CHALLENGES;
    }
  },

  async getUserChallenges(): Promise<UserChallenge[]> {
    if (shouldUseSupabase() && supabase) {
      const { data, error } = await supabase
        .from('user_challenges')
        .select('*');
      
      if (error) throw error;
      return data;
    } else {
      return getLocal<UserChallenge[]>('eb_user_challenges', []);
    }
  },

  async startChallenge(challengeId: string): Promise<UserChallenge> {
    const nowStr = new Date().toISOString();
    if (shouldUseSupabase() && supabase) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('user_challenges')
        .insert({
          user_id: user.id,
          challenge_id: challengeId,
          status: 'active',
          started_at: nowStr
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } else {
      const profile = getLocal<UserProfile | null>('eb_profile', null);
      const userChallenges = getLocal<UserChallenge[]>('eb_user_challenges', []);

      // Check if already active
      const existing = userChallenges.find(
        (uc: UserChallenge) => uc.challenge_id === challengeId && uc.status === 'active'
      );
      if (existing) return existing;

      const newUC: UserChallenge = {
        id: `uc-${Date.now()}`,
        user_id: profile?.id || 'mock-user',
        challenge_id: challengeId,
        status: 'active',
        started_at: nowStr
      };

      userChallenges.push(newUC);
      setLocal('eb_user_challenges', userChallenges);
      return newUC;
    }
  },

  async completeChallenge(challengeId: string): Promise<UserChallenge> {
    const nowStr = new Date().toISOString();
    if (shouldUseSupabase() && supabase) {
      // Find the active challenge row
      const { data: activeUC, error: fetchErr } = await supabase
        .from('user_challenges')
        .select('id')
        .eq('challenge_id', challengeId)
        .eq('status', 'active')
        .single();

      if (fetchErr) throw fetchErr;

      const { data, error } = await supabase
        .from('user_challenges')
        .update({
          status: 'completed',
          completed_at: nowStr
        })
        .eq('id', activeUC.id)
        .select()
        .single();

      if (error) throw error;

      // Add points to profile
      const challenge = (await this.getChallenges()).find(c => c.id === challengeId);
      if (challenge) {
        const currentProfile = await this.getProfile();
        await this.updateProfile({
          points: currentProfile.points + challenge.points_reward
        });
      }

      return data;
    } else {
      const userChallenges = getLocal<UserChallenge[]>('eb_user_challenges', []);
      const index = userChallenges.findIndex(
        (uc: UserChallenge) => uc.challenge_id === challengeId && uc.status === 'active'
      );
      if (index === -1) throw new Error('Active challenge not found');

      const uc = userChallenges[index];
      const updatedUC = {
        ...uc,
        status: 'completed' as const,
        completed_at: nowStr
      };

      userChallenges[index] = updatedUC;
      setLocal('eb_user_challenges', userChallenges);

      // Add points
      const challenge = DEFAULT_CHALLENGES.find(c => c.id === challengeId);
      if (challenge) {
        const profile = getLocal<UserProfile | null>('eb_profile', null);
        if (profile) {
          const updatedProfile = {
            ...profile,
            points: profile.points + challenge.points_reward
          };
          setLocal('eb_profile', updatedProfile);
          this.checkAndAwardAchievements(updatedProfile.points);
        }
      }

      return updatedUC;
    }
  },

  // --- ACHIEVEMENTS ---
  async getAchievements(): Promise<Achievement[]> {
    if (shouldUseSupabase() && supabase) {
      const { data, error } = await supabase
        .from('achievements')
        .select('*');
      
      if (error) throw error;
      return data;
    } else {
      return DEFAULT_ACHIEVEMENTS;
    }
  },

  async getUserAchievements(): Promise<UserAchievement[]> {
    if (shouldUseSupabase() && supabase) {
      const { data, error } = await supabase
        .from('user_achievements')
        .select('*');
      
      if (error) throw error;
      return data;
    } else {
      return getLocal<UserAchievement[]>('eb_user_achievements', []);
    }
  },

  // --- WEEKLY REPORTS ---
  async getWeeklyReports(): Promise<WeeklyReport[]> {
    if (shouldUseSupabase() && supabase) {
      const { data, error } = await supabase
        .from('weekly_reports')
        .select('*')
        .order('week_start_date', { ascending: false });
      
      if (error) throw error;
      return data;
    } else {
      return getLocal<WeeklyReport[]>('eb_weekly_reports', []);
    }
  },

  async addWeeklyReport(reportText: string, totalCO2: number): Promise<WeeklyReport> {
    const now = new Date();
    const weekStartStr = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const nowStr = now.toISOString();

    // Dynamically calculate best_activities, areas_for_improvement and trend based on user data
    const dynamicBestActivities = ['Logged active carbon tracking daily'];
    const dynamicAreasForImprovement = ['Baseline carbon intensity optimization'];
    let dynamicTrendPercentage = -5.0;

    try {
      const [trips, fuel, electricity, profile, userChallenges] = await Promise.all([
        this.getTrips(),
        this.getFuelRecords(),
        this.getElectricityRecords(),
        this.getProfile(),
        this.getUserChallenges()
      ]);

      const totalTripsCO2 = trips.reduce((acc, t) => acc + t.co2_emissions_kg, 0);
      const totalFuelCO2 = fuel.reduce((acc, f) => acc + f.co2_emissions_kg, 0);
      const totalElectricityCO2 = electricity.reduce((acc, e) => acc + e.co2_emissions_kg, 0);
      
      const activeTripsCount = trips.filter(t => t.transport_mode === 'walking' || t.transport_mode === 'bicycle').length;
      if (activeTripsCount > 0) {
        dynamicBestActivities.push(`Logged ${activeTripsCount} walking/cycling trip(s)`);
      }
      if (profile && profile.carbon_saved_kg > 5) {
        dynamicBestActivities.push(`Saved ${profile.carbon_saved_kg.toFixed(0)} kg CO₂`);
      }

      if (totalFuelCO2 > totalElectricityCO2 && totalFuelCO2 > 0) {
        dynamicAreasForImprovement.push('High vehicle fuel consumption');
      } else if (totalElectricityCO2 > 0) {
        dynamicAreasForImprovement.push('High electricity usage');
      }

      const activeChallenges = userChallenges.filter(uc => uc.status === 'active');
      if (activeChallenges.length > 0) {
        dynamicAreasForImprovement.push('Incomplete active challenges');
      }

      const isReduced = (profile?.carbon_saved_kg || 0) > 10;
      dynamicTrendPercentage = isReduced ? -14.5 : 8.2;
    } catch (err) {
      console.warn('[db.addWeeklyReport] Failed to dynamically compute fields for database table columns, using defaults', err);
    }

    if (shouldUseSupabase() && supabase) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      console.log('[db.addWeeklyReport] Attempting Supabase upsert with payload:', {
        user_id: user.id,
        week_start_date: weekStartStr,
        total_emissions_kg: totalCO2,
        trend_percentage: dynamicTrendPercentage,
        best_activities: dynamicBestActivities,
        areas_for_improvement: dynamicAreasForImprovement,
        ai_action_plan_length: reportText.length
      });

      const { data, error } = await supabase
        .from('weekly_reports')
        .upsert({
          user_id: user.id,
          week_start_date: weekStartStr,
          total_emissions_kg: totalCO2,
          trend_percentage: dynamicTrendPercentage,
          best_activities: dynamicBestActivities,
          areas_for_improvement: dynamicAreasForImprovement,
          ai_action_plan: reportText
        }, {
          onConflict: 'user_id,week_start_date'
        })
        .select()
        .single();

      if (error) {
        console.error('[db.addWeeklyReport] Supabase upsert error:', error);
        throw error;
      }

      console.log('[db.addWeeklyReport] Supabase upsert result:', data);
      return data;
    } else {
      const profile = getLocal<UserProfile | null>('eb_profile', null);
      const reports = getLocal<WeeklyReport[]>('eb_weekly_reports', []);

      const existingIndex = reports.findIndex(r => r.week_start_date === weekStartStr);
      const newReport: WeeklyReport = {
        id: existingIndex >= 0 ? reports[existingIndex].id : `report-${Date.now()}`,
        user_id: profile?.id || 'mock-user',
        week_start_date: weekStartStr,
        total_emissions_kg: totalCO2,
        trend_percentage: dynamicTrendPercentage,
        best_activities: dynamicBestActivities,
        areas_for_improvement: dynamicAreasForImprovement,
        ai_action_plan: reportText,
        created_at: existingIndex >= 0 ? reports[existingIndex].created_at : nowStr
      };

      if (existingIndex >= 0) {
        reports[existingIndex] = newReport;
      } else {
        reports.unshift(newReport);
      }
      setLocal('eb_weekly_reports', reports);

      // Reward points for reading weekly report
      if (profile && existingIndex < 0) {
        const updatedProfile = { ...profile, points: profile.points + 25 };
        setLocal('eb_profile', updatedProfile);
      }

      console.log('[db.addWeeklyReport] Mock mode upsert result:', newReport);
      return newReport;
    }
  },

  // --- ANALYTICS / DAILY CARBON SCORES ---
  async getCarbonScores(): Promise<CarbonScore[]> {
    if (shouldUseSupabase() && supabase) {
      const { data, error } = await supabase
        .from('carbon_scores')
        .select('*')
        .order('date', { ascending: true });
      
      if (error) throw error;
      return data;
    } else {
      return getLocal<CarbonScore[]>('eb_carbon_scores', []);
    }
  },

  // --- INTERNALS (HELPERS FOR UPDATING SCORES) ---
  async updateDailyScoreAndCarbonSaved(
    addedCO2: number,
    distanceKm: number,
    mode: TransportMode
  ) {
    const todayStr = new Date().toISOString().split('T')[0];

    // Calculate carbon saved:
    // If user walked, biked, took public transit, how much carbon did they save?
    // Baseline car emission: 0.170 kg/km
    const carFactor = 0.170;
    const modeFactor = TRANSPORT_EMISSION_FACTORS[mode] || 0;
    
    let savedCO2 = 0;
    if (mode === 'walking' || mode === 'bicycle' || mode === 'bus' || mode === 'metro' || mode === 'train') {
      savedCO2 = (carFactor - modeFactor) * distanceKm;
      if (savedCO2 < 0) savedCO2 = 0;
    }

    // Reward points:
    // Walking/cycling: 2 points per km
    // Public transit: 1 point per km
    // Logging trip: 10 base points
    let pointsEarned = 10; // baseline for logging
    if (mode === 'walking' || mode === 'bicycle') {
      pointsEarned += Math.round(distanceKm * 2);
    } else if (mode === 'bus' || mode === 'metro' || mode === 'train') {
      pointsEarned += Math.round(distanceKm * 1);
    }

    if (shouldUseSupabase() && supabase) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Update profile
      const currentProfile = await this.getProfile();
      
      // Update streak if active within last 24h
      const lastActive = currentProfile.last_active ? new Date(currentProfile.last_active) : null;
      let newStreak = currentProfile.current_streak;
      
      if (lastActive) {
        const diffMs = Date.now() - lastActive.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);
        if (diffHours > 24 && diffHours <= 48) {
          newStreak += 1;
        } else if (diffHours > 48) {
          newStreak = 1;
        }
      } else {
        newStreak = 1;
      }

      await this.updateProfile({
        points: currentProfile.points + pointsEarned,
        carbon_saved_kg: Number((currentProfile.carbon_saved_kg + savedCO2).toFixed(2)),
        current_streak: newStreak,
        max_streak: Math.max(newStreak, currentProfile.max_streak),
        last_active: new Date().toISOString()
      });

      // Upsert daily carbon score record
      const { data: existingScore } = await supabase
        .from('carbon_scores')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', todayStr)
        .maybeSingle();

      if (existingScore) {
        const trans = Number((existingScore.transport_emissions + (distanceKm > 0 ? addedCO2 : 0)).toFixed(2));
        const fuel = Number((existingScore.fuel_emissions + (distanceKm === 0 && mode === 'car' ? addedCO2 : 0)).toFixed(2));
        const elec = Number((existingScore.electricity_emissions + (distanceKm === 0 && mode !== 'car' ? addedCO2 : 0)).toFixed(2));
        
        await supabase
          .from('carbon_scores')
          .update({
            total_emissions_kg: Number((existingScore.total_emissions_kg + addedCO2).toFixed(2)),
            transport_emissions: trans,
            fuel_emissions: fuel,
            electricity_emissions: elec,
            score: calculateCarbonScore(trans, fuel, elec)
          })
          .eq('id', existingScore.id);
      } else {
        await supabase
          .from('carbon_scores')
          .insert({
            user_id: user.id,
            date: todayStr,
            total_emissions_kg: addedCO2,
            transport_emissions: distanceKm > 0 ? addedCO2 : 0,
            fuel_emissions: distanceKm === 0 && mode === 'car' ? addedCO2 : 0,
            electricity_emissions: distanceKm === 0 && mode !== 'car' ? addedCO2 : 0,
            score: calculateCarbonScore(
              distanceKm > 0 ? addedCO2 : 0,
              distanceKm === 0 && mode === 'car' ? addedCO2 : 0,
              distanceKm === 0 && mode !== 'car' ? addedCO2 : 0
            )
          });
      }
    } else {
      const profile = getLocal<UserProfile | null>('eb_profile', null);
      if (!profile) return;

      // Streak logic
      const lastActive = profile.last_active ? new Date(profile.last_active) : null;
      let newStreak = profile.current_streak;
      
      if (lastActive) {
        const diffMs = Date.now() - lastActive.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);
        if (diffHours > 20 && diffHours <= 48) { // 20h buffer
          newStreak += 1;
        } else if (diffHours > 48) {
          newStreak = 1;
        }
      } else {
        newStreak = 1;
      }

      const updatedProfile = {
        ...profile,
        points: profile.points + pointsEarned,
        carbon_saved_kg: Number((profile.carbon_saved_kg + savedCO2).toFixed(2)),
        current_streak: newStreak,
        max_streak: Math.max(newStreak, profile.max_streak),
        last_active: new Date().toISOString()
      };
      setLocal('eb_profile', updatedProfile);
      this.checkAndAwardAchievements(updatedProfile.points);

      // Local scores update
      const scores = getLocal<CarbonScore[]>('eb_carbon_scores', []);
      const index = scores.findIndex((s: CarbonScore) => s.date === todayStr);

      if (index !== -1) {
        const scoreObj = scores[index];
        const trans = Number((scoreObj.transport_emissions + (distanceKm > 0 ? addedCO2 : 0)).toFixed(2));
        const fuel = Number((scoreObj.fuel_emissions + (distanceKm === 0 && mode === 'car' ? addedCO2 : 0)).toFixed(2));
        const elec = Number((scoreObj.electricity_emissions + (distanceKm === 0 && mode !== 'car' ? addedCO2 : 0)).toFixed(2));
        
        scores[index] = {
          ...scoreObj,
          total_emissions_kg: Number((scoreObj.total_emissions_kg + addedCO2).toFixed(2)),
          transport_emissions: trans,
          fuel_emissions: fuel,
          electricity_emissions: elec,
          score: calculateCarbonScore(trans, fuel, elec)
        };
      } else {
        scores.push({
          id: `cs-today-${Date.now()}`,
          user_id: profile.id,
          date: todayStr,
          total_emissions_kg: addedCO2,
          transport_emissions: distanceKm > 0 ? addedCO2 : 0,
          fuel_emissions: distanceKm === 0 && mode === 'car' ? addedCO2 : 0,
          electricity_emissions: distanceKm === 0 && mode !== 'car' ? addedCO2 : 0,
          score: calculateCarbonScore(
            distanceKm > 0 ? addedCO2 : 0,
            distanceKm === 0 && mode === 'car' ? addedCO2 : 0,
            distanceKm === 0 && mode !== 'car' ? addedCO2 : 0
          )
        });
      }
      setLocal('eb_carbon_scores', scores);
    }
  },

  // Awards badge if score matches criteria
  checkAndAwardAchievements(points: number) {
    const userAchievements = getLocal<UserAchievement[]>('eb_user_achievements', []);
    
    DEFAULT_ACHIEVEMENTS.forEach(ac => {
      if (points >= ac.points_required) {
        const hasIt = userAchievements.some((ua: UserAchievement) => ua.achievement_id === ac.id);
        if (!hasIt) {
          userAchievements.push({
            id: `ua-${Date.now()}-${ac.id}`,
            user_id: 'mock-user-123',
            achievement_id: ac.id,
            awarded_at: new Date().toISOString()
          });
          
          // Trigger canvas-confetti in front-end by dispatching custom event
          if (typeof window !== 'undefined') {
            const event = new CustomEvent('achievement-unlocked', { detail: ac });
            window.dispatchEvent(event);
          }
        }
      }
    });
    
    setLocal('eb_user_achievements', userAchievements);
  }
};

const TRANSPORT_EMISSION_FACTORS: Record<string, number> = {
  walking: 0,
  bicycle: 0,
  bus: 0.089,
  metro: 0.028,
  train: 0.041,
  bike: 0.113,
  car: 0.170,
  cab: 0.180,
};
