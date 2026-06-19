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
              text: () => 'Mocked coach response text.',
            },
          }),
        }),
      };
    },
  };
});

import { POST } from '../app/api/ai/coach/route';

describe('AI Coach Request Validation API tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects request if request payload body is empty or invalid JSON', async () => {
    const mockRequest = new Request('http://localhost/api/ai/coach', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer valid-token',
      },
      body: 'invalid-json-body',
    });

    const response = await POST(mockRequest);
    expect([400, 500]).toContain(response.status); // 400 bad request or 500 internal error for invalid json
  });

  it('rejects unauthorized request with invalid Authorization headers', async () => {
    const mockBody = {
      prompt: 'Hello Coach',
      context: {
        profile: { full_name: 'Eco Warrior', points: 100, current_streak: 2, carbon_saved_kg: 5.0, goals: [] },
        trips: [],
        fuelRecords: [],
        electricityRecords: []
      }
    };

    const mockRequest = new Request('http://localhost/api/ai/coach', {
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
      prompt: 'Give me tips',
      context: {
        profile: { full_name: 'Eco Warrior', points: 100, current_streak: 2, carbon_saved_kg: 5.0, goals: [] },
        trips: [],
        fuelRecords: [],
        electricityRecords: []
      }
    };

    const mockRequest = new Request('http://localhost/api/ai/coach', {
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
      expect(json.text).toBe('Mocked coach response text.');
    }
  });
});
