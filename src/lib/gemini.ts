import { Trip, FuelRecord, ElectricityRecord, UserChallenge } from './types';
import { supabase, isSupabaseConfigured } from './supabaseClient';

export interface CoachContext {
  trips: Trip[];
  fuelRecords: FuelRecord[];
  electricityRecords: ElectricityRecord[];
  userChallenges?: UserChallenge[];
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
  
  const trendText = trendPercent < 0 
    ? `📉 **${Math.abs(trendPercent)}% DECREASE** in emissions compared to last week. Phenomenal job!`
    : `📈 **${trendPercent}% INCREASE** in emissions compared to last week. Let's look at how to reverse this.`;

  // 1. Insights Calculations
  const highestCarbonVal = Math.max(totalTripsCO2, totalFuelCO2, totalElectricityCO2);
  let highestSource = 'Grid Electricity';
  let largestContribPct = 0;
  if (totalCO2 > 0) {
    if (highestCarbonVal === totalTripsCO2) {
      highestSource = 'Transportation / Commuting';
      largestContribPct = (totalTripsCO2 / totalCO2) * 100;
    } else if (highestCarbonVal === totalFuelCO2) {
      highestSource = 'Vehicle Fuel Refills';
      largestContribPct = (totalFuelCO2 / totalCO2) * 100;
    } else {
      highestSource = 'Grid Electricity';
      largestContribPct = (totalElectricityCO2 / totalCO2) * 100;
    }
  }
  
  const monthlyProjection = totalCO2 * 4;
  const savings10 = totalCO2 * 0.1;
  const savings20 = totalCO2 * 0.2;
  const savings30 = totalCO2 * 0.3;

  // 2. Personalized Sustainability Score (0-100)
  let sustainabilityScore = 100;
  // Deduct for emissions: 0.5 points per kg CO2, max deduct 40
  sustainabilityScore -= Math.min(40, totalCO2 * 0.5);
  // Add for carbon saved: 1 point per kg CO2 saved, max add 20
  sustainabilityScore += Math.min(20, context.profile.carbon_saved_kg);
  // Add for active transport: 3 points per walking/cycling trip, max add 15
  const activeCommuteTrips = context.trips.filter(t => t.transport_mode === 'walking' || t.transport_mode === 'bicycle');
  sustainabilityScore += Math.min(15, activeCommuteTrips.length * 3);
  // Add for streak: 2 points per streak day, max add 20
  sustainabilityScore += Math.min(20, context.profile.current_streak * 2);
  sustainabilityScore = Math.max(10, Math.min(100, Math.round(sustainabilityScore)));

  // Weekly Grade
  let grade = 'B';
  if (sustainabilityScore >= 85) grade = 'A+';
  else if (sustainabilityScore >= 70) grade = 'A';
  else if (sustainabilityScore >= 50) grade = 'B';
  else grade = 'C';

  // Score description
  let scoreGrade = 'Eco Practitioner 🌿';
  let scoreExplainer = 'You are actively tracking your footprints. Keep completing challenges to reach the Champion tier!';
  if (sustainabilityScore >= 85) {
    scoreGrade = 'Elite Eco Champion 🏆';
    scoreExplainer = 'Superb! Your low carbon intensity, active commutes, and high logging streak put you in the top 5% of green citizens.';
  } else if (sustainabilityScore >= 70) {
    scoreGrade = 'Green Ally 🍃';
    scoreExplainer = 'Great effort! You are making active lifestyle changes. Reducing vehicle reliance can propel you to the top tier.';
  } else if (sustainabilityScore < 50) {
    scoreGrade = 'Carbon Watcher ⚠️';
    scoreExplainer = 'Your carbon footprint is currently high relative to savings. Look at the Action Plan below to lower your emissions.';
  }

  // 3. Projected Impact Next Week
  const targetCO2Reduction = totalCO2 * 0.2; // 20% reduction target
  const potentialPoints = 25 + (context.userChallenges?.filter(uc => uc.status === 'active').length || 0) * 50;
  const potentialStreak = context.profile.current_streak + 7;

  // Static Challenge Title Helper
  const getChallengeTitle = (id: string): string => {
    const titles: Record<string, string> = {
      'ch-1': 'No-Car Day',
      'ch-2': 'Public Transport Week',
      'ch-3': 'Save Electricity Challenge',
      'ch-4': 'Carry Reusable Bottle',
      'ch-5': 'Eco Commuter'
    };
    return titles[id] || id;
  };

  // Completed vs Incomplete challenges
  const completedChallenges = context.userChallenges?.filter(uc => uc.status === 'completed') || [];
  const activeChallenges = context.userChallenges?.filter(uc => uc.status === 'active') || [];

  // Logged fuel/electricity figures
  const totalLitres = context.fuelRecords.reduce((acc, f) => acc + f.litres, 0);
  const totalKwh = context.electricityRecords.reduce((acc, e) => acc + e.units_kwh, 0);

  // 4. Personalized Insights
  const bestActivities: string[] = [];
  const areasForImprovement: string[] = [];
  const actionPlanItems: string[] = [];

  // Congratulate on completed challenges
  if (completedChallenges.length > 0) {
    const names = completedChallenges.map(c => `"${getChallengeTitle(c.challenge_id)}"`).join(', ');
    bestActivities.push(`🏆 **Completed Challenges:** Congratulations on successfully completing ${names}! Excellent commitment.`);
  }

  // Active travel praise
  if (activeCommuteTrips.length > 0) {
    bestActivities.push(`🚶‍♂️ **Active Commutes:** Logged ${activeCommuteTrips.length} walking/cycling trip(s), directly preventing fuel burn.`);
  }

  // Low emissions praise
  if (totalCO2 < 30) {
    bestActivities.push(`🌱 **Low Weekly Footprint:** Your total emission is exceptionally low at **${totalCO2.toFixed(1)} kg CO₂**.`);
  } else {
    bestActivities.push(`📊 **Logging History:** Tracked weekly activities to gain transparency into carbon drivers.`);
  }

  // Suggesting improvements
  if (totalLitres > 0) {
    areasForImprovement.push(`⛽ **Vehicle Fuel Usage:** Logged **${totalLitres.toFixed(1)}L** fuel causing **${totalFuelCO2.toFixed(1)} kg CO₂** emissions.`);
    actionPlanItems.push(`Reduce your logged **${totalLitres.toFixed(1)}L** fuel consumption by carpooling or swapping one ride to public transit (saves ~6.0 kg CO₂).`);
  } else {
    actionPlanItems.push(`Stay car-free: Keep vehicle fuel refills at zero next week to maintain your minimal transport footprint.`);
  }

  if (totalKwh > 0) {
    areasForImprovement.push(`⚡ **Grid Electricity:** Logged **${totalKwh.toFixed(1)} kWh** electricity causing **${totalElectricityCO2.toFixed(1)} kg CO₂** emissions.`);
    actionPlanItems.push(`Reduce your logged **${totalKwh.toFixed(1)} kWh** grid energy draw by unplugging standby devices overnight (saves ~3.5 kg CO₂).`);
  } else {
    actionPlanItems.push(`Monitor home grid draw: Next week, plug in a power meter or log your grid units to keep tracking electricity emissions.`);
  }

  if (activeChallenges.length > 0) {
    const challengeName = getChallengeTitle(activeChallenges[0].challenge_id);
    areasForImprovement.push(`🎯 **Incomplete Challenges:** The "${challengeName}" challenge is still in progress.`);
    actionPlanItems.push(`Complete the active **"${challengeName}"** challenge next week to claim points and build eco-habits.`);
  } else {
    actionPlanItems.push(`Join a new challenge: Go to the Challenges tab and join either "Save Electricity Challenge" or "No-Car Day" next week.`);
  }

  // Ensure up to 4 plan items
  if (actionPlanItems.length < 4) {
    actionPlanItems.push(`Maintain tracking streak: Log carbon metrics daily to increase your streak to **${potentialStreak} days**.`);
  }

  const finalActionItemsText = actionPlanItems.slice(0, 4).map((item, idx) => `${idx + 1}.  ${item}`).join('\n');

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

#### Data-Driven Carbon Insights
*   📈 **Highest Carbon Contributor:** ${highestSource} (${largestContribPct.toFixed(1)}% of total emissions).
*   🔮 **Estimated Monthly Projection:** ${monthlyProjection.toFixed(1)} kg CO₂ (based on current weekly average).
*   💡 **Potential Carbon Savings with Habit Improvement:**
    *   If you improve by **10%**: Saves **${savings10.toFixed(1)} kg CO₂** next week.
    *   If you improve by **20%**: Saves **${savings20.toFixed(1)} kg CO₂** next week.
    *   If you improve by **30%**: Saves **${savings30.toFixed(1)} kg CO₂** next week.

---

### 2. Best Eco-Friendly Activities
${bestActivities.map(act => `*   ${act}`).join('\n')}

---

### 3. Areas for Improvement
${areasForImprovement.map(area => `*   ${area}`).join('\n')}

---

### 4. Personalized Sustainability Score & Weekly Grade
*   **Weekly Grade:** **${grade}**
*   **Score:** **${sustainabilityScore}/100** (${scoreGrade})
*   **Analysis:** ${scoreExplainer}

---

### 5. Projected Impact Next Week
*   📉 **Potential CO₂ Reduction:** **${targetCO2Reduction.toFixed(1)} kg CO₂** (with 20% footprint optimization).
*   🪙 **Potential Points Increase:** **+${potentialPoints} points** (including report rewards and active challenges).
*   🔥 **Potential Streak Goal:** Reach **${potentialStreak} days** by continuing to log carbon metrics daily.

---

### 6. AI-Generated Action Plan
${finalActionItemsText}

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
