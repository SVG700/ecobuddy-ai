import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';

const apiKey = process.env.GEMINI_API_KEY;

// Memory-based rate limiting store
const rateLimitMap = new Map<string, { count: number; lastReset: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS = 5; // 5 requests per minute

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);
  if (!record) {
    rateLimitMap.set(ip, { count: 1, lastReset: now });
    return true;
  }

  if (now - record.lastReset > RATE_LIMIT_WINDOW) {
    rateLimitMap.set(ip, { count: 1, lastReset: now });
    return true;
  }

  if (record.count >= MAX_REQUESTS) {
    return false;
  }

  record.count += 1;
  return true;
}

export async function POST(request: Request) {
  try {
    // 1. IP Rate Limiting
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1';
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again in a minute.' },
        { status: 429 }
      );
    }

    // 2. Supabase Auth Verification (if configured)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    const isSupabaseConfigured = !!supabaseUrl && !!supabaseAnonKey;

    if (isSupabaseConfigured) {
      const authHeader = request.headers.get('Authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json(
          { error: 'Unauthorized: Missing session token' },
          { status: 401 }
        );
      }
      const token = authHeader.split(' ')[1];
      const supabaseServer = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        }
      });
      const { data: { user }, error } = await supabaseServer.auth.getUser(token);
      if (error || !user) {
        return NextResponse.json(
          { error: 'Unauthorized: Invalid session token' },
          { status: 401 }
        );
      }
    }

    // 3. API Key check
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Gemini API Key not configured' },
        { status: 400 }
      );
    }

    let body: any;
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      );
    }

    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Payload must be a non-null object' },
        { status: 400 }
      );
    }

    const { context } = body;

    if (!context || typeof context !== 'object') {
      return NextResponse.json(
        { error: 'Missing or invalid parameter: context' },
        { status: 400 }
      );
    }

    if (!context.profile || typeof context.profile !== 'object') {
      return NextResponse.json(
        { error: 'Missing or invalid parameter: context.profile' },
        { status: 400 }
      );
    }

    const trips = Array.isArray(context.trips) ? context.trips : [];
    const fuelRecords = Array.isArray(context.fuelRecords) ? context.fuelRecords : [];
    const electricityRecords = Array.isArray(context.electricityRecords) ? context.electricityRecords : [];
    const userChallenges = Array.isArray(context.userChallenges) ? context.userChallenges : [];
    const fullName = typeof context.profile.full_name === 'string' ? context.profile.full_name : 'Eco Buddy';
    const points = typeof context.profile.points === 'number' ? context.profile.points : 0;
    const currentStreak = typeof context.profile.current_streak === 'number' ? context.profile.current_streak : 0;
    const carbonSaved = typeof context.profile.carbon_saved_kg === 'number' ? context.profile.carbon_saved_kg : 0;
    const goals = Array.isArray(context.profile.goals) ? context.profile.goals : [];

    const ai = new GoogleGenerativeAI(apiKey);
    const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `Generate a Weekly Sustainability Report.
Here is the user's data context:
- Name: ${fullName}
- Points: ${points}
- Current Streak: ${currentStreak} days
- Carbon Saved: ${carbonSaved} kg CO2
- Goals: ${JSON.stringify(goals)}
- Trips Logged: ${JSON.stringify(trips)}
- Fuel Records: ${JSON.stringify(fuelRecords)}
- Electricity Records: ${JSON.stringify(electricityRecords)}
- In-Progress/Completed Challenges: ${JSON.stringify(userChallenges)}

Safety & Reliability Rules:
1. If any data (trips, fuel logs, electricity logs, challenges) is unavailable or empty, explicitly state that it is unavailable. Do NOT invent values or hallucinate activities.
2. For challenges, always refer to the challenge titles (e.g. 'No-Car Day') provided in the userChallenges context. Never show or mention UUIDs like 'db7e1da0-...' to the user. Gemini should never receive or mention only challenge UUIDs. Update all report sections to reference challenge names instead of IDs.

Report Personalization Requirements:
- Include exact challenge names.
- Include exact transport modes used (e.g., walking, bicycle, metro, bus, train, car, bike).
- Include exact fuel type (e.g., petrol, diesel) and fuel volume (in Litres) if logged.
- Include exact electricity consumption (in kWh) if logged.
- Mention top 3 user behaviors from actual logs (e.g., frequency of eco commutes, fuel fill-up trends, streak consistency).
- Mention challenge progress percentages if applicable.
- Avoid generic sustainability advice. Every recommendation must reference real user activity.

Weekly Grade Calculation Logic:
- Score starts at 100.
- Deductions:
  - High electricity usage (deduct 1 point for every 5 kWh logged, up to a max of 20 points).
  - High fuel consumption (deduct 2 points for every Litre logged, up to a max of 30 points).
  - High transport emissions (deduct 1 point for every 2 kg of CO2 emitted from private transport/car, up to a max of 20 points).
- Bonuses:
  - Walking trips (+3 points per trip, up to a max of 15 points).
  - Cycling trips (+3 points per trip, up to a max of 15 points).
  - Public transport trips (bus, metro, train) (+2 points per trip, up to a max of 10 points).
  - Carbon saved (+1 point for every kg of carbon saved, up to a max of 15 points).
  - Streak maintenance (+1 point per streak day, up to a max of 10 points).
  - Completed challenges (+5 points per completed challenge, up to a max of 15 points).
- Clamp final score between 10 and 100.
- Weekly Grade Bounds:
  - 95+ = A+
  - 85-94 = A
  - 70-84 = B
  - 50-69 = C
  - Below 50 = D

Format your response EXACTLY with the following sections in Markdown (maintain total report length under 700 words):
## 📊 Weekly Sustainability Report: EcoBuddy AI
*Prepared for ${fullName} on [Current Date]*

---

### Key Achievements This Week
[Summarize user's key green accomplishments this week referencing exact challenge titles, active transport logs, and carbon saved. If none, state that they are unavailable.]

### Most Impactful Habit
[Detail the single most positive recurring habit from their logs (e.g. daily walking, zero fuel consumption, etc.) and calculate its carbon offset impact. If none, state that they are unavailable.]

### Fastest Way To Reduce Emissions Next Week
[Identify the highest emission source from their logs and recommend one immediate, highly specific reduction tip. If no logs, state that they are unavailable.]

### Estimated Annual Savings If Current Improvements Continue
[Compute and state estimated annual carbon reduction (kg CO2) and potential points/financial savings if current habits are maintained. If none, state that they are unavailable.]

---

### 1. Emission Trends & Summary
[Provide total emissions in kg CO2 and carbon saved in kg CO2. Include a realistic trend percentage based on user activity compared to baseline. Break down emissions by source (transport, fuel, electricity) with bullet points.
Under a sub-heading "#### Data-Driven Carbon Insights", output:
- **Highest Carbon Contributor:** [Identify which source had the highest emissions and its percentage of the total]
- **Estimated Monthly Projection:** [Calculate total weekly emission * 4] kg CO2
- **Potential Carbon Savings with Habit Improvement:**
  - If you improve by **10%**: Saves [weekly * 0.1] kg CO2 next week.
  - If you improve by **20%**: Saves [weekly * 0.2] kg CO2 next week.
  - If you improve by **30%**: Saves [weekly * 0.3] kg CO2 next week.]

---

### 2. Best Eco-Friendly Activities
[Identify 2-3 green activities they did well from the logged data. Congratulate them. Reference specific logged trips, low electricity, or fuel refills by their exact amounts or modes. Praise them by name for specific completed challenges.]

---

### 3. Areas for Improvement
[Highlight where they emitted the most CO2 and detail why using actual figures. Critically analyze their transport, fuel, or electricity data. Reference their incomplete challenges by their specific names, explaining how finishing them will help.]

---

### 4. Personalized Sustainability Score & Weekly Grade
*   **Weekly Grade:** **[A+, A, B, C, or D]**
*   **Score:** **[Output the final numeric score out of 100 based on the Weekly Grade Calculation Logic above]/100**
*   **Grade Explanation:** [Provide a detailed explanation of the grade and score calculation, listing specific deductions and bonuses applied.]

---

### 5. Projected Impact Next Week
*   📉 **Potential CO₂ Reduction:** [Output expected CO2 saved if they execute the action plan, e.g., 20% of their footprint] kg CO₂
*   🪙 **Potential Points Increase:** [Estimate points they can gain next week, including +25 for compiling/reading reports, plus points from completing their active/in-progress challenges] points
*   🔥 **Potential Streak Goal:** Reach [current_streak + 7] days by logging green activities daily next week.

---

### 6. AI-Generated Action Plan
[Provide a list of 3-4 numbered actionable items tailored to their real behavior.
- Reference specific values, e.g., "Reduce your logged 20L petrol consumption...".
- Reference specific incomplete/active challenge names, e.g., "Complete the in-progress 'Save Electricity Challenge'...".
Include realistic estimated CO2 savings in kg for each action item.]

Make it inspiring, highly personalized, and direct. Keep the length under 700 words.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    return NextResponse.json({ text });
  } catch (error: unknown) {
    console.error('Error generating report with Gemini API:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
