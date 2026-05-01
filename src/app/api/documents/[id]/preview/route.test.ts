/** @jest-environment node */

import { getSession } from '@/lib/auth/session';
import { compileLatex } from '@/lib/latex/compile';
import { prisma } from '@/lib/prisma';
import { POST } from './route';

jest.mock('@/lib/auth/session', () => ({ getSession: jest.fn() }));
jest.mock('@/lib/prisma', () => ({
  prisma: { document: { findFirst: jest.fn() } },
}));
jest.mock('@/lib/latex/compile', () => ({ compileLatex: jest.fn() }));

const mockedGetSession = jest.mocked(getSession);
const mockedDocFindFirst = jest.mocked(prisma.document.findFirst);
const mockedCompile = jest.mocked(compileLatex);

const CONTEXT = { params: Promise.resolve({ id: 'doc-1' }) };

function buildRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/api/documents/doc-1/preview', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const SESSION = { userId: 'user-1', email: 'a@b.com' };
const RESUME_DATA = {
  header: { name: 'Jane', phone: '555', email: 'j@j.com' },
  education: [],
  experience: [],
  projects: [],
  skills: {},
};

beforeEach(() => {
  jest.clearAllMocks();
  mockedGetSession.mockResolvedValue(SESSION);
  mockedDocFindFirst.mockResolvedValue({ id: 'doc-1' } as never);
  mockedCompile.mockResolvedValue(Buffer.from('%PDF fake'));
});

describe('POST /api/documents/[id]/preview', () => {
  it('returns PDF bytes for a valid resume', async () => {
    const res = await POST(
      buildRequest({ templateName: 'jakes-resume', structuredData: RESUME_DATA }),
      CONTEXT,
    );
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('application/pdf');
  });

  it('returns 401 when not authenticated', async () => {
    mockedGetSession.mockResolvedValue(null);
    const res = await POST(
      buildRequest({ templateName: 'jakes-resume', structuredData: RESUME_DATA }),
      CONTEXT,
    );
    expect(res.status).toBe(401);
  });

  it('returns 400 for an unsupported template name', async () => {
    const res = await POST(
      buildRequest({ templateName: 'unknown-template', structuredData: RESUME_DATA }),
      CONTEXT,
    );
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/templateName/);
  });
});
