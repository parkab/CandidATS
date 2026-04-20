/** @jest-environment jsdom */

jest.mock('@/lib/supabase', () => ({
  supabase: {},
  supabaseAdmin: {},
}));

import { POST } from '@/app/api/ai/edit-content/route';
import { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { generateWithGemini } from '@/lib/ai/gemini';

// Mock NextRequest to avoid Web API issues
jest.mock('next/server', () => ({
  NextRequest: class MockNextRequest {
    url: string;
    method: string;
    headers: Headers;
    body: string;

    constructor(input: string | URL, init?: RequestInit) {
      this.url = input.toString();
      this.method = init?.method || 'GET';
      this.headers = new Headers(init?.headers);
      this.body = (init?.body as string) || '';
    }

    async json() {
      return JSON.parse(this.body || '{}');
    }
  },
  NextResponse: {
    json: (data: unknown, options?: { status?: number }) => ({
      status: options?.status || 200,
      json: async () => data,
    }),
  },
}));

jest.mock('@/lib/auth/session');
jest.mock('@/lib/ai/gemini');

const mockGetSession = getSession as jest.MockedFunction<typeof getSession>;
const mockGenerateWithGemini = generateWithGemini as jest.MockedFunction<
  typeof generateWithGemini
>;

describe('/api/ai/edit-content', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when no session is present', async () => {
    mockGetSession.mockResolvedValueOnce(null);

    const request = new NextRequest(
      'http://localhost:3000/api/ai/edit-content',
      {
        method: 'POST',
        body: JSON.stringify({
          content: 'Sample content',
          action: 'rewrite',
        }),
      },
    );

    const response = await POST(request);
    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 400 when content is missing', async () => {
    mockGetSession.mockResolvedValueOnce({
      userId: 'user-123',
      email: 'test@example.com',
    });

    const request = new NextRequest(
      'http://localhost:3000/api/ai/edit-content',
      {
        method: 'POST',
        body: JSON.stringify({
          action: 'rewrite',
        }),
      },
    );

    const response = await POST(request);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('Content and action are required');
  });

  it('returns 400 when action is missing', async () => {
    mockGetSession.mockResolvedValueOnce({
      userId: 'user-123',
      email: 'test@example.com',
    });

    const request = new NextRequest(
      'http://localhost:3000/api/ai/edit-content',
      {
        method: 'POST',
        body: JSON.stringify({
          content: 'Sample content',
        }),
      },
    );

    const response = await POST(request);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('Content and action are required');
  });

  it('returns 400 for invalid action', async () => {
    mockGetSession.mockResolvedValueOnce({
      userId: 'user-123',
      email: 'test@example.com',
    });

    const request = new NextRequest(
      'http://localhost:3000/api/ai/edit-content',
      {
        method: 'POST',
        body: JSON.stringify({
          content: 'Sample content',
          action: 'invalid-action',
        }),
      },
    );

    const response = await POST(request);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('Invalid action');
  });

  it('successfully processes rewrite action', async () => {
    const originalContent = 'Original content text';
    const editedContent = 'Rewritten content text';

    mockGetSession.mockResolvedValueOnce({
      userId: 'user-123',
      email: 'test@example.com',
    });
    mockGenerateWithGemini.mockResolvedValueOnce(editedContent);

    const request = new NextRequest(
      'http://localhost:3000/api/ai/edit-content',
      {
        method: 'POST',
        body: JSON.stringify({
          content: originalContent,
          action: 'rewrite',
        }),
      },
    );

    const response = await POST(request);
    expect(response.status).toBe(200);
    const data = await response.json();

    expect(data.original).toBe(originalContent);
    expect(data.edited).toBe(editedContent);
    expect(data.action).toBe('rewrite');
  });

  it('successfully processes concise action', async () => {
    const originalContent =
      'This is a long piece of content that can be made shorter';
    const editedContent = 'Shorter version of content';

    mockGetSession.mockResolvedValueOnce({
      userId: 'user-123',
      email: 'test@example.com',
    });
    mockGenerateWithGemini.mockResolvedValueOnce(editedContent);

    const request = new NextRequest(
      'http://localhost:3000/api/ai/edit-content',
      {
        method: 'POST',
        body: JSON.stringify({
          content: originalContent,
          action: 'concise',
        }),
      },
    );

    const response = await POST(request);
    expect(response.status).toBe(200);
    const data = await response.json();

    expect(data.action).toBe('concise');
    expect(mockGenerateWithGemini).toHaveBeenCalled();
  });

  it('successfully processes detail action', async () => {
    const originalContent = 'Brief content';
    const editedContent = 'Extended and detailed version with more information';

    mockGetSession.mockResolvedValueOnce({
      userId: 'user-123',
      email: 'test@example.com',
    });
    mockGenerateWithGemini.mockResolvedValueOnce(editedContent);

    const request = new NextRequest(
      'http://localhost:3000/api/ai/edit-content',
      {
        method: 'POST',
        body: JSON.stringify({
          content: originalContent,
          action: 'detail',
        }),
      },
    );

    const response = await POST(request);
    expect(response.status).toBe(200);
    const data = await response.json();

    expect(data.action).toBe('detail');
  });

  it('successfully processes tone action', async () => {
    const originalContent = 'Regular content';
    const editedContent = 'More professional and confident content';

    mockGetSession.mockResolvedValueOnce({
      userId: 'user-123',
      email: 'test@example.com',
    });
    mockGenerateWithGemini.mockResolvedValueOnce(editedContent);

    const request = new NextRequest(
      'http://localhost:3000/api/ai/edit-content',
      {
        method: 'POST',
        body: JSON.stringify({
          content: originalContent,
          action: 'tone',
        }),
      },
    );

    const response = await POST(request);
    expect(response.status).toBe(200);
    const data = await response.json();

    expect(data.action).toBe('tone');
  });

  it('includes context in the request when provided', async () => {
    const originalContent = 'Content to edit';
    const editedContent = 'Edited content';
    const context = 'Job: Software Engineer at Google';

    mockGetSession.mockResolvedValueOnce({
      userId: 'user-123',
      email: 'test@example.com',
    });
    mockGenerateWithGemini.mockResolvedValueOnce(editedContent);

    const request = new NextRequest(
      'http://localhost:3000/api/ai/edit-content',
      {
        method: 'POST',
        body: JSON.stringify({
          content: originalContent,
          action: 'rewrite',
          context,
        }),
      },
    );

    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(mockGenerateWithGemini).toHaveBeenCalled();

    const callArgs = mockGenerateWithGemini.mock.calls[0][0];
    expect(callArgs).toContain(context);
  });

  it('returns 500 and includes error details when Gemini API fails', async () => {
    const errorMessage = 'API rate limit exceeded';

    mockGetSession.mockResolvedValueOnce({
      userId: 'user-123',
      email: 'test@example.com',
    });
    mockGenerateWithGemini.mockRejectedValueOnce(new Error(errorMessage));

    const request = new NextRequest(
      'http://localhost:3000/api/ai/edit-content',
      {
        method: 'POST',
        body: JSON.stringify({
          content: 'Content',
          action: 'rewrite',
        }),
      },
    );

    const response = await POST(request);
    expect(response.status).toBe(500);
    const data = await response.json();

    expect(data.error).toBe('Failed to edit content');
    expect(data.details).toBe(errorMessage);
  });

  it('generates appropriate prompt for rewrite action', async () => {
    mockGetSession.mockResolvedValueOnce({
      userId: 'user-123',
      email: 'test@example.com',
    });
    mockGenerateWithGemini.mockResolvedValueOnce('rewritten');

    const request = new NextRequest(
      'http://localhost:3000/api/ai/edit-content',
      {
        method: 'POST',
        body: JSON.stringify({
          content: 'Original text',
          action: 'rewrite',
        }),
      },
    );

    await POST(request);

    const prompt = mockGenerateWithGemini.mock.calls[0][0];
    expect(prompt).toContain('rewrite');
    expect(prompt).toContain('Original text');
    expect(prompt).toContain('fresh language');
  });

  it('generates appropriate prompt for concise action', async () => {
    mockGetSession.mockResolvedValueOnce({
      userId: 'user-123',
      email: 'test@example.com',
    });
    mockGenerateWithGemini.mockResolvedValueOnce('concise');

    const request = new NextRequest(
      'http://localhost:3000/api/ai/edit-content',
      {
        method: 'POST',
        body: JSON.stringify({
          content: 'Long content',
          action: 'concise',
        }),
      },
    );

    await POST(request);

    const prompt = mockGenerateWithGemini.mock.calls[0][0];
    expect(prompt).toContain('more concise');
    expect(prompt).toContain('20-30%');
    expect(prompt).toContain('Long content');
  });

  it('generates appropriate prompt for detail action', async () => {
    mockGetSession.mockResolvedValueOnce({
      userId: 'user-123',
      email: 'test@example.com',
    });
    mockGenerateWithGemini.mockResolvedValueOnce('detailed');

    const request = new NextRequest(
      'http://localhost:3000/api/ai/edit-content',
      {
        method: 'POST',
        body: JSON.stringify({
          content: 'Brief',
          action: 'detail',
        }),
      },
    );

    await POST(request);

    const prompt = mockGenerateWithGemini.mock.calls[0][0];
    expect(prompt).toContain('expand');
    expect(prompt).toContain('more details');
    expect(prompt).toContain('Brief');
  });

  it('generates appropriate prompt for tone action', async () => {
    mockGetSession.mockResolvedValueOnce({
      userId: 'user-123',
      email: 'test@example.com',
    });
    mockGenerateWithGemini.mockResolvedValueOnce('adjusted');

    const request = new NextRequest(
      'http://localhost:3000/api/ai/edit-content',
      {
        method: 'POST',
        body: JSON.stringify({
          content: 'Content',
          action: 'tone',
        }),
      },
    );

    await POST(request);

    const prompt = mockGenerateWithGemini.mock.calls[0][0];
    expect(prompt).toContain('professional');
    expect(prompt).toContain('confident');
    expect(prompt).toContain('Content');
  });
});
