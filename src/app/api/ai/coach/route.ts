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

    const { prompt, context } = body;

    if (typeof prompt !== 'string' || !prompt.trim()) {
      return NextResponse.json(
        { error: 'Missing or invalid parameter: prompt' },
        { status: 400 }
      );
    }

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
    const fullName = typeof context.profile.full_name === 'string' ? context.profile.full_name : 'Eco Buddy';
    const points = typeof context.profile.points === 'number' ? context.profile.points : 0;
    const currentStreak = typeof context.profile.current_streak === 'number' ? context.profile.current_streak : 0;
    const carbonSaved = typeof context.profile.carbon_saved_kg === 'number' ? context.profile.carbon_saved_kg : 0;
    const goals = Array.isArray(context.profile.goals) ? context.profile.goals : [];
    const userChallenges = Array.isArray(context.userChallenges) ? context.userChallenges : [];

    const ai = new GoogleGenerativeAI(apiKey);
    // Use gemini-1.5-flash which is widely supported and super fast
    const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const systemInstruction = `You are "EcoBuddy AI Coach", a friendly, motivating, and expert sustainability coach.
Your job is to analyze the user's carbon footprint data and help them track, understand, and reduce their emissions.
Be encouraging, practical, and highly specific to their data. Do not use generic advice if their data provides details.

Here is the user's current context:
- Name: ${fullName}
- Points: ${points}
- Current Streak: ${currentStreak} days
- Carbon Saved: ${carbonSaved} kg CO2
- Goals: ${JSON.stringify(goals)}
- Trips Logged: ${JSON.stringify(trips)}
- Fuel Records: ${JSON.stringify(fuelRecords)}
- Electricity Records: ${JSON.stringify(electricityRecords)}
- In-Progress/Completed Challenges: ${JSON.stringify(userChallenges)}

Safety & Data Integrity Rules:
1. For challenges, always refer to the challenge titles (e.g. 'No-Car Day') provided in the userChallenges context. Never show or mention UUIDs like 'db7e1da0-...' to the user.
2. If data is unavailable or missing (e.g. no trips, fuel records, or electricity records), explicitly state that it is unavailable. Do not invent values or hallucinate activities.

Respond to the user's message: "${prompt}"
Keep your response concise (under 250 words) and format it beautifully with clean Markdown (headings, lists, bold text).`;

    const result = await model.generateContent(systemInstruction);
    const text = result.response.text();

    return NextResponse.json({ text });
  } catch (error: unknown) {
    console.error('Error calling Gemini API:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
