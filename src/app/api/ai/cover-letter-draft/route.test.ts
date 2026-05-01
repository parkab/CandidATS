/** @jest-environment node */

import { getSession } from '@/lib/auth/session';
import { generateWithGemini } from '@/lib/ai/gemini';
import { prisma } from '@/lib/prisma';
import { POST } from './route';

jest.mock('@/lib/auth/session', () => ({ getSession: jest.fn() }));
jest.mock('@/lib/prisma', () => ({
  prisma: {
    job: { findFirst: jest.fn() },
    user: { findUnique: jest.fn() },
  },
}));
jest.mock('@/lib/ai/gemini', () => ({ generateWithGemini: jest.fn() }));

const mockedGetSession = jest.mocked(getSession);
const mockedJobFind = jest.mocked(prisma.job.findFirst);
const mockedUserFind = jest.mocked(prisma.user.findUnique);
const mockedGemini = jest.mocked(generateWithGemini);

const SESSION = { userId: 'user-1', email: 'a@b.com' };

const MOCK_JOB = {
  id: 'job-1',
  user_id: 'user-1',
  title: 'Product Manager',
  company_name: 'TechCo',
  location: 'Remote',
  job_description: 'Lead product strategy',
};

const MOCK_USER = {
  id: 'user-1',
  firstName: 'Jane',
  lastName: 'Doe',
  email: 'jane@example.com',
  Profile: { phone: '555-1234', location: 'NYC', linkedIn: null, bio: null },
  Experience: [],
  Skill: [],
};

const VALID_CL_JSON = JSON.stringify({
  header: { name: 'Jane Doe', phone: '555-1234', email: 'jane@example.com' },
  date: 'April 30, 2026',
  recipientName: 'Hiring Manager',
  company: 'TechCo',
  role: 'Product Manager',
  paragraphs: ['Opening paragraph.', 'Body paragraph.', 'Closing paragraph.'],
  senderName: 'Jane Doe',
});

function buildRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/api/ai/cover-letter-draft', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }) as never;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedGetSession.mockResolvedValue(SESSION);
  mockedJobFind.mockResolvedValue(MOCK_JOB as never);
  mockedUserFind.mockResolvedValue(MOCK_USER as never);
  mockedGemini.mockResolvedValue(VALID_CL_JSON);
});

describe('POST /api/ai/cover-letter-draft', () => {
  it('returns templateName and structuredData when Gemini returns valid JSON', async () => {
    const res = await POST(buildRequest({ jobId: 'job-1' }));
    expect(res.status).toBe(200);
    const body = await res.json() as { templateName: string; structuredData: unknown };
    expect(body.templateName).toBe('jakes-cover-letter');
    expect(body.structuredData).toMatchObject({ company: 'TechCo' });
  });

  it('returns 401 when not authenticated', async () => {
    mockedGetSession.mockResolvedValue(null);
    const res = await POST(buildRequest({ jobId: 'job-1' }));
    expect(res.status).toBe(401);
  });

  it('returns 502 when Gemini returns malformed JSON', async () => {
    mockedGemini.mockResolvedValue('Here is your cover letter: Dear Hiring Manager...');
    const res = await POST(buildRequest({ jobId: 'job-1' }));
    expect(res.status).toBe(502);
  });
});
