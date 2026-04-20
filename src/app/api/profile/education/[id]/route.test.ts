/** @jest-environment node */

import { prisma } from '@/lib/prisma';
import { getSupabaseUserFromRequest } from '@/lib/supabase';
import { PATCH, DELETE } from './route';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    education: {
      updateMany: jest.fn(),
      findFirst: jest.fn(),
      deleteMany: jest.fn(),
    },
  },
}));

jest.mock('@/lib/supabase', () => ({
  getSupabaseUserFromRequest: jest.fn(),
}));

const mockedUpdateMany = jest.mocked(prisma.education.updateMany);
const mockedFindFirst = jest.mocked(prisma.education.findFirst);
const mockedDeleteMany = jest.mocked(prisma.education.deleteMany);
const mockedAuth = jest.mocked(getSupabaseUserFromRequest);

const authedUser = { data: { user: { id: 'session-user-id' } }, error: null };
const unauthedUser = { data: null, error: { message: 'Unauthorized' } };
const context = { params: Promise.resolve({ id: 'edu-1' }) };

function buildRequest(method: string, body?: Record<string, unknown>) {
  return new Request('http://localhost/api/profile/education/edu-1', {
    method,
    headers: { 'content-type': 'application/json', cookie: 'sb-access-token=test-token' },
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe('PATCH /api/profile/education/[id]', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockedAuth.mockResolvedValue(unauthedUser as never);
    const response = await PATCH(buildRequest('PATCH', { institution: 'New' }), context);
    expect(response.status).toBe(401);
    expect(mockedUpdateMany).not.toHaveBeenCalled();
  });

  it('returns 400 for an invalid payload', async () => {
    mockedAuth.mockResolvedValue(authedUser as never);
    const response = await PATCH(buildRequest('PATCH', { institution: '' }), context);
    expect(response.status).toBe(400);
    expect(mockedUpdateMany).not.toHaveBeenCalled();
  });

  it('returns 404 when the record does not belong to the session user', async () => {
    mockedAuth.mockResolvedValue(authedUser as never);
    mockedUpdateMany.mockResolvedValue({ count: 0 } as never);

    const response = await PATCH(buildRequest('PATCH', { institution: 'NJIT' }), context);
    expect(response.status).toBe(404);
    expect(mockedFindFirst).not.toHaveBeenCalled();
  });

  it('updates using session userId — not any id from the request body', async () => {
    mockedAuth.mockResolvedValue(authedUser as never);
    mockedUpdateMany.mockResolvedValue({ count: 1 } as never);
    mockedFindFirst.mockResolvedValue({ id: 'edu-1', userId: 'session-user-id', institution: 'NJIT' } as never);

    const response = await PATCH(buildRequest('PATCH', { institution: 'NJIT' }), context);
    expect(response.status).toBe(200);
    expect(mockedUpdateMany).toHaveBeenCalledWith({
      where: { id: 'edu-1', userId: 'session-user-id' },
      data: expect.objectContaining({ institution: 'NJIT' }),
    });
  });
});

describe('DELETE /api/profile/education/[id]', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockedAuth.mockResolvedValue(unauthedUser as never);
    const response = await DELETE(buildRequest('DELETE'), context);
    expect(response.status).toBe(401);
    expect(mockedDeleteMany).not.toHaveBeenCalled();
  });

  it('returns 404 when the record does not belong to the session user', async () => {
    mockedAuth.mockResolvedValue(authedUser as never);
    mockedDeleteMany.mockResolvedValue({ count: 0 } as never);

    const response = await DELETE(buildRequest('DELETE'), context);
    expect(response.status).toBe(404);
  });

  it('deletes only the session user education and returns success', async () => {
    mockedAuth.mockResolvedValue(authedUser as never);
    mockedDeleteMany.mockResolvedValue({ count: 1 } as never);

    const response = await DELETE(buildRequest('DELETE'), context);
    expect(response.status).toBe(200);
    expect(mockedDeleteMany).toHaveBeenCalledWith({
      where: { id: 'edu-1', userId: 'session-user-id' },
    });
    expect(await response.json()).toEqual({ success: true });
  });
});
