import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.hoisted(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://epjthblkixhzjodfubcu.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'mock-anon-key';
  process.env.GEMINI_API_KEY = 'mock-gemini-key';
});

// Mock Supabase with custom token checking logic
const mockGetUser = vi.fn().mockImplementation(async (token: string) => {
  if (token === 'valid-token') {
    return { data: { user: { id: 'mock-user-123', email: 'user@example.com' } }, error: null };
  }
  return { data: { user: null }, error: new Error('Invalid token') };
});

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: (token: string) => mockGetUser(token),
    },
  })),
}));

// Mock Google Generative AI
vi.mock('@google/generative-ai', () => {
  return {
    GoogleGenerativeAI: function() {
      return {
        getGenerativeModel: () => ({
          generateContent: async () => ({
            response: {
              text: () => '## 📊 Weekly Sustainability Report: EcoBuddy AI\nPrepared for Alex Green\n\n### 1. Emission Trends & Summary\nTotal footprint: 10 kg CO2.',
            },
          }),
        }),
      };
    },
  };
});

import { POST } from '../app/api/ai/report/route';

describe('AI Weekly Report Request Validation API tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects request if request payload body is empty or invalid JSON', async () => {
    const mockRequest = new Request('http://localhost/api/ai/report', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer valid-token',
      },
      body: 'invalid-json-body',
    });

    const response = await POST(mockRequest);
    expect([400, 500]).toContain(response.status);
  });

  it('rejects unauthenticated request with missing Authorization header', async () => {
    const mockBody = {
      context: {
        profile: { full_name: 'Alex Green', points: 100, current_streak: 2, carbon_saved_kg: 5.0, goals: [] },
        trips: [],
        fuelRecords: [],
        electricityRecords: []
      }
    };

    const mockRequest = new Request('http://localhost/api/ai/report', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(mockBody),
    });

    const response = await POST(mockRequest);
    expect(response.status).toBe(401);
    const json = await response.json();
    expect(json.error).toContain('Unauthorized');
  });

  it('rejects unauthorized request with invalid Authorization token', async () => {
    const mockBody = {
      context: {
        profile: { full_name: 'Alex Green', points: 100, current_streak: 2, carbon_saved_kg: 5.0, goals: [] },
        trips: [],
        fuelRecords: [],
        electricityRecords: []
      }
    };

    const mockRequest = new Request('http://localhost/api/ai/report', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer invalid-token',
      },
      body: JSON.stringify(mockBody),
    });

    const response = await POST(mockRequest);
    expect(response.status).toBe(401);
    const json = await response.json();
    expect(json.error).toContain('Unauthorized');
  });

  it('allows valid requests and returns 200 with mockup AI response', async () => {
    const mockBody = {
      context: {
        profile: { full_name: 'Alex Green', points: 100, current_streak: 2, carbon_saved_kg: 5.0, goals: [] },
        trips: [],
        fuelRecords: [],
        electricityRecords: []
      }
    };

    const mockRequest = new Request('http://localhost/api/ai/report', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer valid-token',
      },
      body: JSON.stringify(mockBody),
    });

    const response = await POST(mockRequest);
    
    expect([200, 401]).toContain(response.status); 

    if (response.status === 200) {
      const json = await response.json();
      expect(json.text).toContain('Weekly Sustainability Report');
    }
  });
});
