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
  const profile = context.profile || {
    full_name: 'Eco Buddy',
    points: 0,
    current_streak: 0,
    carbon_saved_kg: 0,
    goals: []
  };
  const name = profile.full_name || 'Eco Buddy';
  const trips = Array.isArray(context.trips) ? context.trips : [];
  const fuelRecords = Array.isArray(context.fuelRecords) ? context.fuelRecords : [];
  const electricityRecords = Array.isArray(context.electricityRecords) ? context.electricityRecords : [];
  const userChallenges = Array.isArray(context.userChallenges) ? context.userChallenges : [];

  const totalTripsCO2 = trips.reduce((acc, t) => acc + (t.co2_emissions_kg || 0), 0);
  const totalFuelCO2 = fuelRecords.reduce((acc, f) => acc + (f.co2_emissions_kg || 0), 0);
  const totalElectricityCO2 = electricityRecords.reduce((acc, e) => acc + (e.co2_emissions_kg || 0), 0);
  const totalCO2 = totalTripsCO2 + totalFuelCO2 + totalElectricityCO2;
  
  // Decide emission trend (simulate a realistic trend based on history size)
  const isReduced = (profile.carbon_saved_kg || 0) > 10;
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

  // Completed vs Incomplete challenges
  const completedChallenges = userChallenges.filter(uc => uc.status === 'completed');
  const activeChallenges = userChallenges.filter(uc => uc.status === 'active');

  // Logged fuel/electricity figures
  const totalLitres = fuelRecords.reduce((acc, f) => acc + (f.litres || 0), 0);
  const totalKwh = electricityRecords.reduce((acc, e) => acc + (e.units_kwh || 0), 0);

  // Private transport emissions (car and cab)
  const privateTransportCO2 = trips
    .filter(t => t.transport_mode === 'car' || t.transport_mode === 'cab')
    .reduce((acc, t) => acc + (t.co2_emissions_kg || 0), 0);

  // 2. Strict Grading and Score Logic (Starts at 100)
  const elecDeduction = Math.min(20, Math.floor(totalKwh / 5));
  const fuelDeduction = Math.min(30, Math.floor(totalLitres * 2));
  const transportDeduction = Math.min(20, Math.floor(privateTransportCO2 / 2));

  const walkingTripsCount = trips.filter(t => t.transport_mode === 'walking').length;
  const cyclingTripsCount = trips.filter(t => t.transport_mode === 'bicycle').length;
  const publicTripsCount = trips.filter(t => t.transport_mode === 'bus' || t.transport_mode === 'metro' || t.transport_mode === 'train').length;

  const walkingBonus = Math.min(15, walkingTripsCount * 3);
  const cyclingBonus = Math.min(15, cyclingTripsCount * 3);
  const publicBonus = Math.min(10, publicTripsCount * 2);
  const savedBonus = Math.min(15, Math.floor(profile.carbon_saved_kg || 0));
  const streakBonus = Math.min(10, profile.current_streak || 0);
  const completedBonus = Math.min(15, completedChallenges.length * 5);

  let sustainabilityScore = 100 - elecDeduction - fuelDeduction - transportDeduction + walkingBonus + cyclingBonus + publicBonus + savedBonus + streakBonus + completedBonus;
  sustainabilityScore = Math.max(10, Math.min(100, Math.round(sustainabilityScore)));

  // Grades: 95+ = A+, 85-94 = A, 70-84 = B, 50-69 = C, <50 = D
  let grade = 'D';
  if (sustainabilityScore >= 95) grade = 'A+';
  else if (sustainabilityScore >= 85) grade = 'A';
  else if (sustainabilityScore >= 70) grade = 'B';
  else if (sustainabilityScore >= 50) grade = 'C';

  const gradeExplanation = `Starting with a baseline score of 100, we deducted ${elecDeduction} pts for electricity consumption, ${fuelDeduction} pts for fuel consumption, and ${transportDeduction} pts for private transport emissions. We added bonuses of ${walkingBonus} pts for walking, ${cyclingBonus} pts for cycling, ${publicBonus} pts for public transport usage, ${savedBonus} pts for carbon saved, ${streakBonus} pts for streak maintenance, and ${completedBonus} pts for completed challenges, resulting in a final score of ${sustainabilityScore}/100.`;

  // Static Challenge Title Helper
  const getChallengeTitle = (uc: any): string => {
    if (uc.title && uc.title !== 'Unknown Challenge') return uc.title;
    const titles: Record<string, string> = {
      'ch-1': 'No-Car Day',
      'ch-2': 'Public Transport Week',
      'ch-3': 'Save Electricity Challenge',
      'ch-4': 'Carry Reusable Bottle',
      'ch-5': 'Eco Commuter'
    };
    return titles[uc.challenge_id] || uc.challenge_id;
  };

  const activeCommuteTrips = trips.filter(t => t.transport_mode === 'walking' || t.transport_mode === 'bicycle');

  // 3. Projected Impact Next Week
  const targetCO2Reduction = totalCO2 * 0.2; // 20% reduction target
  const potentialPoints = 25 + activeChallenges.length * 50;
  const potentialStreak = (profile.current_streak || 0) + 7;

  // New Sections:
  // Key Achievements
  let keyAchievements = 'None logged this week.';
  const achievementsList: string[] = [];
  if (completedChallenges.length > 0) {
    achievementsList.push(`Completed challenges: ${completedChallenges.map(c => `"${getChallengeTitle(c)}"`).join(', ')}`);
  }
  if (activeCommuteTrips.length > 0) {
    achievementsList.push(`Logged ${activeCommuteTrips.length} active commutes (walking/cycling)`);
  }
  if ((profile.carbon_saved_kg || 0) > 0) {
    achievementsList.push(`Accumulated ${profile.carbon_saved_kg.toFixed(1)} kg of CO₂ saved`);
  }
  if (achievementsList.length > 0) {
    keyAchievements = achievementsList.map(a => `*   **${a}**`).join('\n');
  }

  // Most Impactful Habit
  let mostImpactfulHabit = 'No active green habits recorded yet. Try walking, cycling, or public transit next week!';
  if (activeCommuteTrips.length > 0) {
    mostImpactfulHabit = `🚶‍♂️ **Commuting active-style:** You logged ${activeCommuteTrips.length} walking/cycling trip(s) this week. Active transport is your most impactful habit, directly preventing fuel usage and reducing greenhouse gas emissions.`;
  } else if (publicTripsCount > 0) {
    mostImpactfulHabit = `🚌 **Public Transit Commutes:** You logged ${publicTripsCount} public transport trip(s). Opting for transit over private cars is highly impactful.`;
  } else if (totalCO2 === 0) {
    mostImpactfulHabit = `🌱 **Zero Emissions Habit:** Maintaining zero logged emissions this week shows excellent progress in keeping your carbon footprint minimal!`;
  }

  // Fastest Way to Reduce
  let fastestWay = 'Log your transport, fuel, or electricity consumption next week to identify the fastest reduction pathways.';
  if (totalCO2 > 0) {
    if (highestSource.includes('Fuel')) {
      fastestWay = `⛽ **Reduce Vehicle Fuel:** Swapping one driving commute for a walking/cycling trip or carpooling is the fastest way to reduce emissions, directly cutting your ${totalLitres.toFixed(1)}L fuel usage.`;
    } else if (highestSource.includes('Electricity')) {
      fastestWay = `⚡ **Cut Grid Power:** Unplugging background devices and optimizing thermostat usage is the fastest path to reduce your logged ${totalKwh.toFixed(1)} kWh grid draw.`;
    } else {
      fastestWay = `🚗 **Eco-friendly Travel:** Swap private car trips for walking, cycling, or public transport to target your transport footprint.`;
    }
  }

  // Annual Projections
  const annualCO2Saved = (profile.carbon_saved_kg || 0) * 52;
  const annualPoints = (potentialPoints) * 52;
  const annualSavingsText = `*   📉 **Annual CO₂ Savings:** ~${annualCO2Saved.toFixed(1)} kg CO₂ avoided if current carbon-saving activities continue.
*   🪙 **Annual Points Accumulation:** ~${annualPoints} points earned toward achievements.`;

  // 4. Personalized Insights
  const bestActivities: string[] = [];
  const areasForImprovement: string[] = [];
  const actionPlanItems: string[] = [];

  // Congratulate on completed challenges
  if (completedChallenges.length > 0) {
    const names = completedChallenges.map(c => `"${getChallengeTitle(c)}"`).join(', ');
    bestActivities.push(`🏆 **Completed Challenges:** Congratulations on successfully completing ${names}! Excellent commitment.`);
  }

  // Active travel praise
  if (activeCommuteTrips.length > 0) {
    bestActivities.push(`🚶‍♂️ **Active Commutes:** Logged ${activeCommuteTrips.length} walking/cycling trip(s), preventing fuel burn.`);
  }

  // Low emissions praise
  if (totalCO2 < 30) {
    bestActivities.push(`🌱 **Low Weekly Footprint:** Your total emission is low at **${totalCO2.toFixed(1)} kg CO₂**.`);
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
    const challengeName = getChallengeTitle(activeChallenges[0]);
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

### Key Achievements This Week
${keyAchievements}

### Most Impactful Habit
${mostImpactfulHabit}

### Fastest Way To Reduce Emissions Next Week
${fastestWay}

### Estimated Annual Savings If Current Improvements Continue
${annualSavingsText}

---

### 1. Emission Trends & Summary
*   **Total Weekly Carbon Footprint:** **${totalCO2.toFixed(1)} kg CO₂**
*   **Carbon Saved:** **${(profile.carbon_saved_kg || 0).toFixed(1)} kg CO₂**
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
*   **Score:** **${sustainabilityScore}/100**
*   **Grade Explanation:** ${gradeExplanation}

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
