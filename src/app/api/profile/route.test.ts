/** @jest-environment node */

import { prisma } from '@/lib/prisma';
import { getSupabaseUserFromRequest } from '@/lib/supabase';
import { PATCH } from './route';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      updateMany: jest.fn(),
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('@/lib/supabase', () => ({
  getSupabaseUserFromRequest: jest.fn(),
}));

const mockedUpdateMany = jest.mocked(prisma.user.updateMany);
const mockedFindUnique = jest.mocked(prisma.user.findUnique);
const mockedGetSupabaseUserFromRequest = jest.mocked(
  getSupabaseUserFromRequest,
);

function buildRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/api/profile', {
    method: 'PATCH',
    headers: {
      'content-type': 'application/json',
      cookie: 'sb-access-token=test-token',
    },
    body: JSON.stringify(body),
  });
}

describe('PATCH /api/profile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when request is unauthorized', async () => {
    mockedGetSupabaseUserFromRequest.mockResolvedValue({
      data: null,
      error: { message: 'Unauthorized' },
    } as never);

    const response = await PATCH(buildRequest({}));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'Unauthorized' });
    expect(mockedUpdateMany).not.toHaveBeenCalled();
  });

  it('returns 400 when payload is invalid', async () => {
    mockedGetSupabaseUserFromRequest.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    } as never);

    const response = await PATCH(
      buildRequest({ firstName: '', lastName: 'Doe' }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: 'First name and last name are required',
    });
    expect(mockedUpdateMany).not.toHaveBeenCalled();
  });

  it('updates profile for the authenticated user', async () => {
    mockedGetSupabaseUserFromRequest.mockResolvedValue({
      data: { user: { id: 'session-user-id' } },
      error: null,
    } as never);

    mockedUpdateMany.mockResolvedValue({ count: 1 } as never);
    mockedFindUnique.mockResolvedValue({
      id: 'session-user-id',
      email: 'candidate@example.com',
      firstName: 'Jane',
      lastName: 'Doe',
      updatedAt: new Date('2026-04-05T08:00:00.000Z'),
    } as never);

    const response = await PATCH(
      buildRequest({
        firstName: 'Jane',
        lastName: 'Doe',
      }),
    );

    expect(response.status).toBe(200);
    expect(mockedUpdateMany).toHaveBeenCalledWith({
      where: {
        id: 'session-user-id',
      },
      data: expect.objectContaining({
        firstName: 'Jane',
        lastName: 'Doe',
      }),
    });
    expect(mockedFindUnique).toHaveBeenCalledWith({
      where: {
        id: 'session-user-id',
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        updatedAt: true,
      },
    });
  });

  it('returns 404 when profile does not exist', async () => {
    mockedGetSupabaseUserFromRequest.mockResolvedValue({
      data: { user: { id: 'session-user-id' } },
      error: null,
    } as never);

    mockedUpdateMany.mockResolvedValue({ count: 0 } as never);

    const response = await PATCH(
      buildRequest({
        firstName: 'Jane',
        lastName: 'Doe',
      }),
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: 'Profile not found' });
    expect(mockedFindUnique).not.toHaveBeenCalled();
  });
});
