/** @jest-environment node */

import { getSession } from '@/lib/auth/session';
import { generateWithGemini } from '@/lib/ai/gemini';
import { prisma } from '@/lib/prisma';
import { POST } from './route';

jest.mock('@/lib/auth/session', () => ({ getSession: jest.fn() }));
jest.mock('@/lib/ai/gemini', () => ({ generateWithGemini: jest.fn() }));
jest.mock('@/lib/prisma', () => ({
  prisma: { document: { findFirst: jest.fn() } },
}));

const mockedGetSession = jest.mocked(getSession);
const mockedGemini = jest.mocked(generateWithGemini);
const mockedDocFind = jest.mocked(prisma.document.findFirst);

const SESSION = { userId: 'user-1', email: 'a@b.com' };

const RESUME_DATA = {
  header: { name: 'Jane', phone: '555', email: 'j@j.com' },
  education: [],
  experience: [],
  projects: [],
  skills: {},
};

const COVER_LETTER_DATA = {
  header: { name: 'Jane', phone: '555', email: 'j@j.com' },
  date: 'May 1, 2026',
  company: 'Acme',
  senderName: 'Jane',
  paragraphs: ['Opening.', 'Body.', 'Closing.'],
};

function buildRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/api/ai/rewrite', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }) as never;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedGetSession.mockResolvedValue(SESSION);
  mockedDocFind.mockResolvedValue({ id: 'doc-1' } as never);
});

describe('POST /api/ai/rewrite', () => {
  it('returns rewritten resume data for jakes-resume template', async () => {
    mockedGemini.mockResolvedValue(JSON.stringify(RESUME_DATA));
    const res = await POST(
      buildRequest({
        documentId: 'doc-1',
        templateName: 'jakes-resume',
        structuredData: RESUME_DATA,
        detailLevel: 4,
        professionalismLevel: 3,
      }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { structuredData: unknown };
    expect(body.structuredData).toBeDefined();
  });

  it('returns rewritten cover letter data for jakes-cover-letter template', async () => {
    mockedGemini.mockResolvedValue(JSON.stringify(COVER_LETTER_DATA));
    const res = await POST(
      buildRequest({
        documentId: 'doc-1',
        templateName: 'jakes-cover-letter',
        structuredData: COVER_LETTER_DATA,
        detailLevel: 2,
        professionalismLevel: 5,
      }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { structuredData: unknown };
    expect(body.structuredData).toBeDefined();
  });

  it('returns 502 when Gemini returns malformed JSON', async () => {
    mockedGemini.mockResolvedValue('not valid json at all');
    const res = await POST(
      buildRequest({
        documentId: 'doc-1',
        templateName: 'jakes-resume',
        structuredData: RESUME_DATA,
      }),
    );
    expect(res.status).toBe(502);
  });

  it('returns 401 when not authenticated', async () => {
    mockedGetSession.mockResolvedValue(null);
    const res = await POST(
      buildRequest({
        documentId: 'doc-1',
        templateName: 'jakes-resume',
        structuredData: RESUME_DATA,
      }),
    );
    expect(res.status).toBe(401);
  });

  it('returns 404 when document does not belong to the user', async () => {
    mockedDocFind.mockResolvedValue(null);
    mockedGemini.mockResolvedValue(JSON.stringify(RESUME_DATA));
    const res = await POST(
      buildRequest({
        documentId: 'doc-other',
        templateName: 'jakes-resume',
        structuredData: RESUME_DATA,
      }),
    );
    expect(res.status).toBe(404);
  });
});
