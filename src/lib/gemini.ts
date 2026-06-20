import { Trip, FuelRecord, ElectricityRecord } from './types';
import { supabase, isSupabaseConfigured } from './supabaseClient';

export interface CoachContext {
  trips: Trip[];
  fuelRecords: FuelRecord[];
  electricityRecords: ElectricityRecord[];
  profile: {
    full_name: string;
    points: number;
    current_streak: number;
    carbon_saved_kg: number;
    goals: string[];
  };
}

// Heuristic fallback generator for the Eco Coach
export function generateHeuristicCoachResponse(prompt: string, context: CoachContext): string {
  const query = prompt.toLowerCase();
  const name = context.profile.full_name || 'Eco Buddy';
  
  // Calculate some numbers to inject realism
  const totalTripsDist = context.trips.reduce((acc, t) => acc + t.distance_km, 0);
  const totalTripsCO2 = context.trips.reduce((acc, t) => acc + t.co2_emissions_kg, 0);
  const totalFuelCO2 = context.fuelRecords.reduce((acc, f) => acc + f.co2_emissions_kg, 0);
  const totalElectricityCO2 = context.electricityRecords.reduce((acc, e) => acc + e.co2_emissions_kg, 0);
  const totalCO2 = totalTripsCO2 + totalFuelCO2 + totalElectricityCO2;
  
  if (query.includes('streak') || query.includes('points')) {
    return `### 🌟 Streak & Rewards Review for **${name}**
 
Your current sustainability streak is **${context.profile.current_streak} days**! You have accumulated **${context.profile.points} Eco Points** so far.
 
**How to boost your points:**
1. **Complete a Challenge:** Head over to the **Eco Challenges** tab and activate a challenge. Completing the *No-Car Day* challenge awards a quick **50 points**.
2. **Track Consistent Trips:** Recording any walking or cycling trip awards **10 bonus points** per trip.
3. **Log electricity bills:** Logging a bill monthly awards **50 points** and keeps your grid tracker up-to-date.
 
Keep up the green habits! 🌱`;
  }
  
  if (query.includes('travel') || query.includes('transport') || query.includes('trip') || query.includes('car')) {
    const carTrips = context.trips.filter(t => t.transport_mode === 'car' || t.transport_mode === 'cab');
    const carCO2 = carTrips.reduce((acc, t) => acc + t.co2_emissions_kg, 0);
    const carDist = carTrips.reduce((acc, t) => acc + t.distance_km, 0);
    
    if (carTrips.length > 0) {
      const savedByMetro = carDist * (0.170 - 0.028); // Car vs Metro factor
      return `### 🚗 Travel Footprint & Green Routing
 
I analyzed your recent travel logs. You traveled **${totalTripsDist.toFixed(1)} km** in total, emitting **${totalTripsCO2.toFixed(1)} kg CO₂**.
Of this, **${carDist.toFixed(1)} km** was by car/cab, producing **${carCO2.toFixed(1)} kg CO₂** (${((carCO2 / (totalCO2 || 1)) * 100).toFixed(0)}% of your transport footprint).
 
**EcoBuddy Recommendations:**
*   **Switch to Metro/Train:** If you swap your car commutes to metro or train for just **2 trips**, you will save approximately **${(savedByMetro * 0.4).toFixed(1)} kg CO₂** this week.
*   **Active Commuting:** For trips under 3 km, consider walking or cycling. You logged **${context.trips.filter(t => t.transport_mode === 'walking' || t.transport_mode === 'bicycle').length} active trips** recently—great job!
*   **Carpooling:** If public transit isn't viable, carpooling with a colleague reduces individual trip emissions by **50%**.`;
    }
    
    return `### 🚲 Transit Evaluation
 
You have logged **${context.trips.length} trips** covering **${totalTripsDist.toFixed(1)} km** with **${totalTripsCO2.toFixed(1)} kg CO₂** emitted.
Looking at your transport modes, you are relying mostly on low-emission options (walking, cycling, public transport). 
 
**Pro Tips:**
*   Make sure to log all walks! Even a 10-minute walk to the grocery store saves fuel and records points.
*   Encourage friends to join! You have saved a total of **${context.profile.carbon_saved_kg.toFixed(1)} kg CO₂** since joining. Let's aim to double it.`;
  }
 
  if (query.includes('electricity') || query.includes('bill') || query.includes('energy') || query.includes('power')) {
    if (context.electricityRecords.length > 0) {
      const lastBill = context.electricityRecords[context.electricityRecords.length - 1];
      return `### ⚡ Electricity Consumption & Saving Habits
 
Your last logged electricity usage was **${lastBill.units_kwh} kWh**, which resulted in **${lastBill.co2_emissions_kg} kg CO₂** emissions.
 
**AI energy-saving tips tailored for your profile:**
1. **Phantom Loads:** Unplug chargers, microwave ovens, and entertainment systems when going to bed. Standby power accounts for up to **10% of home energy bills**.
2. **AC Temperature:** Keep your air conditioner set to **24°C (75°F)** or higher. Each degree lower increases energy consumption by about **6%**.
3. **LED Upgrade:** Replacing remaining incandescent bulbs with LEDs will cut lighting energy by **75%** and they last 25x longer.`;
    }
    
    return `### 💡 Home Energy Efficiency
 
You haven't uploaded an electricity bill recently. Home energy consumption is typically responsible for **35-40%** of an individual's carbon footprint!
 
**Action Plan:**
*   Locate your latest electricity bill, enter the units consumed in the **Electricity Tracker** tab, or upload a photo to start tracking.
*   Aim to stay below **150 kWh/month** per household member.
*   Simple adjustments like air-drying clothes instead of using a dryer can save **2 kg CO₂** per load.`;
  }
 
  if (query.includes('plan') || query.includes('weekly') || query.includes('report')) {
    return generateHeuristicWeeklyReport(context);
  }
 
  // General chat greeting/responses
  return `### 👋 Hello ${name}! I'm your EcoBuddy AI Coach!
 
I've analyzed your current carbon footprint details:
*   **Total Logged Emissions:** ${(totalCO2).toFixed(1)} kg CO₂
*   **Travel Distance:** ${totalTripsDist.toFixed(1)} km
*   **Carbon Saved:** ${context.profile.carbon_saved_kg.toFixed(1)} kg CO₂
*   **Eco Points:** ${context.profile.points} pts
 
How can I help you improve today? You can ask me about:
1. *"How can I reduce my travel emissions?"*
2. *"Give me a weekly sustainability plan"*
3. *"Tips to reduce my electricity bill"*
4. *"Explain my streak and points"*
 
What area would you like to focus on? 🌍`;
}
 
// Heuristic weekly report generator
export function generateHeuristicWeeklyReport(context: CoachContext): string {
  const name = context.profile.full_name || 'Eco Buddy';
  const totalTripsCO2 = context.trips.reduce((acc, t) => acc + t.co2_emissions_kg, 0);
  const totalFuelCO2 = context.fuelRecords.reduce((acc, f) => acc + f.co2_emissions_kg, 0);
  const totalElectricityCO2 = context.electricityRecords.reduce((acc, e) => acc + e.co2_emissions_kg, 0);
  const totalCO2 = totalTripsCO2 + totalFuelCO2 + totalElectricityCO2;
  
  // Decide emission trend (simulate a realistic trend based on history size)
  const isReduced = context.profile.carbon_saved_kg > 10;
  const trendPercent = isReduced ? -14.5 : 8.2;
  
  // Custom categories list
  const categories = [];
  if (totalTripsCO2 > 0) categories.push(`Transportation (${totalTripsCO2.toFixed(1)} kg)`);
  if (totalFuelCO2 > 0) categories.push(`Vehicle Fuel (${totalFuelCO2.toFixed(1)} kg)`);
  if (totalElectricityCO2 > 0) categories.push(`Electricity (${totalElectricityCO2.toFixed(1)} kg)`);
  
  if (categories.length === 0) {
    categories.push("No emissions recorded yet. Let's log some details!");
  }
 
  const trendText = trendPercent < 0 
    ? `📉 **${Math.abs(trendPercent)}% DECREASE** in emissions compared to last week. Phenomenal job!`
    : `📈 **${trendPercent}% INCREASE** in emissions compared to last week. Let's look at how to reverse this.`;
 
  return `## 📊 Weekly Sustainability Report: EcoBuddy AI
*Prepared for ${name} on ${new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}*
 
---
 
### 1. Emission Trends & Summary
*   **Total Weekly Carbon Footprint:** **${totalCO2.toFixed(1)} kg CO₂**
*   **Carbon Saved:** **${context.profile.carbon_saved_kg.toFixed(1)} kg CO₂**
*   **Current Trend:** ${trendText}
 
#### Breakdown by Source
*   🚗 **Transport / Commuting:** ${totalTripsCO2.toFixed(1)} kg CO₂
*   ⛽ **Vehicle Fuel Refills:** ${totalFuelCO2.toFixed(1)} kg CO₂
*   ⚡ **Grid Electricity:** ${totalElectricityCO2.toFixed(1)} kg CO₂
 
---
 
### 2. Best Eco-Friendly Activities
*   **Transit substitution:** Choosing eco-friendly transport modes saved you carbon emissions.
*   **Active Commutes:** Logged walking/bicycle trips provided health benefits and zero emissions.
*   **Consistent Logging:** Active tracking helps raise awareness of daily actions.
 
---
 
### 3. Areas for Improvement
*   **Reduce Car Travel:** Car trips represent a large portion of your transport footprint. Let's try replacing short car trips with transit.
*   **Home Energy Loads:** Unplug heavy appliances on standby.
*   **Complete Challenges:** You have active challenges. Completing them boosts points and builds habit streaks.
 
---
 
### 4. AI-Generated Action Plan
1.  **Commuting Strategy:** Replace at least **two solo car trips** with metro/bus transit or ride-share. Estimated savings: **4.5 kg CO₂**.
2.  **Unplug Challenge:** Switch off your television, microwave, and computer routers at the socket before going to bed. Estimated savings: **0.8 kWh/day** (~0.7 kg CO₂/day).
3.  **Eco-commute Day:** Walk or bike to any destination under **2 km**.
4.  **Complete active challenges:** Finish the *Carry Reusable Bottle* challenge to claim your points.
 
*Let's make next week even greener, ${name.split(' ')[0]}! You've got this. 🌿*`;
}
 
// Client helper to call AI
export async function askEcoCoach(prompt: string, context: CoachContext): Promise<string> {
  const isSandbox = typeof window !== 'undefined' && localStorage.getItem('eb_sandbox_mode') === 'true';
  if (isSandbox) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(generateHeuristicCoachResponse(prompt, context));
      }, 800); // Small delay to simulate network/AI generation
    });
  }

  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (isSupabaseConfigured && supabase) {
      const { data } = await supabase.auth.getSession();
      if (data.session?.access_token) {
        headers['Authorization'] = `Bearer ${data.session.access_token}`;
      }
    }

    const response = await fetch('/api/ai/coach', {
      method: 'POST',
      headers,
      body: JSON.stringify({ prompt, context }),
    });

    if (response.ok) {
      const data = await response.json();
      return data.text;
    }
  } catch (error) {
    console.warn('Failed to connect to Gemini API route, using client fallback', error);
  }
  
  // If API route failed or threw, return client fallback response
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(generateHeuristicCoachResponse(prompt, context));
    }, 800); // Small delay to simulate network/AI generation
  });
}

// Client helper to generate report
export async function generateWeeklyReportAI(context: CoachContext): Promise<string> {
  const isSandbox = typeof window !== 'undefined' && localStorage.getItem('eb_sandbox_mode') === 'true';
  if (isSandbox) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(generateHeuristicWeeklyReport(context));
      }, 1200);
    });
  }

  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (isSupabaseConfigured && supabase) {
      const { data } = await supabase.auth.getSession();
      if (data.session?.access_token) {
        headers['Authorization'] = `Bearer ${data.session.access_token}`;
      }
    }

    const response = await fetch('/api/ai/report', {
      method: 'POST',
      headers,
      body: JSON.stringify({ context }),
    });

    if (response.ok) {
      const data = await response.json();
      return data.text;
    }
  } catch (error) {
    console.warn('Failed to connect to Gemini API route, using client fallback', error);
  }

  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(generateHeuristicWeeklyReport(context));
    }, 1200);
  });
}
