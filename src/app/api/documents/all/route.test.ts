/** @jest-environment node */

import { getSession } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { GET } from './route';

jest.mock('@/lib/auth/session', () => ({ getSession: jest.fn() }));
jest.mock('@/lib/prisma', () => ({
  prisma: {
    document: { findMany: jest.fn() },
  },
}));

const mockedGetSession = jest.mocked(getSession);
const mockedDocumentFindMany = jest.mocked(prisma.document.findMany);

describe('GET /api/documents/all', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    mockedGetSession.mockResolvedValue(null);

    const response = await GET(
      new Request('http://localhost/api/documents/all') as never,
    );

    expect(response.status).toBe(401);
    expect(mockedDocumentFindMany).not.toHaveBeenCalled();
  });

  it('returns all user documents without job relation by default', async () => {
    mockedGetSession.mockResolvedValue({
      userId: 'user-1',
      email: 'user@example.com',
    });
    mockedDocumentFindMany.mockResolvedValue([
      {
        id: 'doc-1',
        user_id: 'user-1',
        job_id: 'job-1',
        title: 'Resume',
      },
    ] as never);

    const response = await GET(
      new Request('http://localhost/api/documents/all') as never,
    );

    expect(response.status).toBe(200);
    expect(mockedDocumentFindMany).toHaveBeenCalledWith({
      where: { user_id: 'user-1' },
      orderBy: { created_at: 'desc' },
      include: undefined,
    });

    const body = (await response.json()) as { documents: Array<{ id: string }> };
    expect(body.documents).toHaveLength(1);
    expect(body.documents[0]?.id).toBe('doc-1');
  });

  it('includes Job metadata when includeJob=true', async () => {
    mockedGetSession.mockResolvedValue({
      userId: 'user-1',
      email: 'user@example.com',
    });
    mockedDocumentFindMany.mockResolvedValue([] as never);

    const response = await GET(
      new Request('http://localhost/api/documents/all?includeJob=true') as never,
    );

    expect(response.status).toBe(200);
    expect(mockedDocumentFindMany).toHaveBeenCalledWith({
      where: { user_id: 'user-1' },
      orderBy: { created_at: 'desc' },
      include: {
        Job: {
          select: {
            id: true,
            title: true,
            company_name: true,
          },
        },
      },
    });
  });

  it('does not return another user\'s documents (ownership enforced)', async () => {
    mockedGetSession.mockResolvedValue({
      userId: 'user-2',
      email: 'other@example.com',
    });
    mockedDocumentFindMany.mockResolvedValue([] as never);

    const response = await GET(
      new Request('http://localhost/api/documents/all') as never,
    );

    expect(response.status).toBe(200);
    expect(mockedDocumentFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { user_id: 'user-2' } }),
    );
    const body = (await response.json()) as { documents: unknown[] };
    expect(body.documents).toHaveLength(0);
  });

  it('returns 500 when prisma query throws', async () => {
    mockedGetSession.mockResolvedValue({
      userId: 'user-1',
      email: 'user@example.com',
    });
    mockedDocumentFindMany.mockRejectedValue(new Error('db unavailable'));

    const response = await GET(
      new Request('http://localhost/api/documents/all') as never,
    );

    expect(response.status).toBe(500);
    const body = (await response.json()) as { error: string; details: string };
    expect(body.error).toBe('Failed to fetch documents');
    expect(body.details).toContain('db unavailable');
  });
});
