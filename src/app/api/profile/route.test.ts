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
    profile: {
      findFirst: jest.fn(),
      updateMany: jest.fn(),
      createMany: jest.fn(),
    },
  },
}));

jest.mock('@/lib/supabase', () => ({
  getSupabaseUserFromRequest: jest.fn(),
}));

const mockedUpdateMany = jest.mocked(prisma.user.updateMany);
const mockedFindUnique = jest.mocked(prisma.user.findUnique);
const mockedProfileFindFirst = jest.mocked(prisma.profile.findFirst);
const mockedProfileUpdateMany = jest.mocked(prisma.profile.updateMany);
const mockedProfileCreateMany = jest.mocked(prisma.profile.createMany);
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
    expect(mockedProfileFindFirst).not.toHaveBeenCalled();
    expect(mockedProfileUpdateMany).not.toHaveBeenCalled();
    expect(mockedProfileCreateMany).not.toHaveBeenCalled();
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
    expect(await response.json()).toEqual({ error: 'Invalid request.' });
    expect(mockedUpdateMany).not.toHaveBeenCalled();
    expect(mockedProfileFindFirst).not.toHaveBeenCalled();
    expect(mockedProfileUpdateMany).not.toHaveBeenCalled();
    expect(mockedProfileCreateMany).not.toHaveBeenCalled();
  });

  it('returns 400 when LinkedIn URL is invalid', async () => {
    mockedGetSupabaseUserFromRequest.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    } as never);

    const response = await PATCH(
      buildRequest({
        firstName: 'Jane',
        lastName: 'Doe',
        linkedIn: 'not-a-url',
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'Invalid request.' });
    expect(mockedUpdateMany).not.toHaveBeenCalled();
    expect(mockedProfileFindFirst).not.toHaveBeenCalled();
    expect(mockedProfileUpdateMany).not.toHaveBeenCalled();
    expect(mockedProfileCreateMany).not.toHaveBeenCalled();
  });

  it('updates profile for the authenticated user', async () => {
    mockedGetSupabaseUserFromRequest.mockResolvedValue({
      data: { user: { id: 'session-user-id' } },
      error: null,
    } as never);

    mockedUpdateMany.mockResolvedValue({ count: 1 } as never);
    mockedProfileFindFirst
      .mockResolvedValueOnce({
        id: 'profile-1',
      } as never)
      .mockResolvedValueOnce({
        phone: '(555) 123-4567',
        location: 'Boston, MA',
        linkedIn: 'https://www.linkedin.com/in/jane-doe',
        headline: 'Frontend Engineer',
        bio: 'Building delightful products',
      } as never);
    mockedProfileUpdateMany.mockResolvedValue({ count: 1 } as never);
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
        phone: '(555) 123-4567',
        location: 'Boston, MA',
        linkedIn: 'https://www.linkedin.com/in/jane-doe',
        headline: 'Frontend Engineer',
        bio: 'Building delightful products',
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
    expect(mockedProfileFindFirst).toHaveBeenNthCalledWith(1, {
      where: {
        userId: 'session-user-id',
      },
      select: {
        id: true,
      },
    });
    expect(mockedProfileUpdateMany).toHaveBeenCalledWith({
      where: {
        id: 'profile-1',
      },
      data: {
        phone: '(555) 123-4567',
        location: 'Boston, MA',
        linkedIn: 'https://www.linkedin.com/in/jane-doe',
        headline: 'Frontend Engineer',
        bio: 'Building delightful products',
      },
    });
    expect(mockedProfileCreateMany).not.toHaveBeenCalled();
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
    expect(mockedProfileFindFirst).toHaveBeenNthCalledWith(2, {
      where: {
        userId: 'session-user-id',
      },
      select: {
        phone: true,
        location: true,
        linkedIn: true,
        headline: true,
        bio: true,
      },
    });
  });

  it('creates profile when none exists', async () => {
    mockedGetSupabaseUserFromRequest.mockResolvedValue({
      data: { user: { id: 'session-user-id' } },
      error: null,
    } as never);

    mockedUpdateMany.mockResolvedValue({ count: 1 } as never);
    mockedProfileFindFirst
      .mockResolvedValueOnce(null as never)
      .mockResolvedValueOnce({
        phone: '(555) 123-4567',
        location: 'Boston, MA',
        linkedIn: 'https://www.linkedin.com/in/jane-doe',
        headline: 'Frontend Engineer',
        bio: 'Building delightful products',
      } as never);
    mockedProfileCreateMany.mockResolvedValue({ count: 1 } as never);
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
        phone: '(555) 123-4567',
        location: 'Boston, MA',
        linkedIn: 'https://www.linkedin.com/in/jane-doe',
        headline: 'Frontend Engineer',
        bio: 'Building delightful products',
      }),
    );

    expect(response.status).toBe(200);
    expect(mockedProfileUpdateMany).not.toHaveBeenCalled();
    expect(mockedProfileCreateMany).toHaveBeenCalledWith({
      data: [
        {
          userId: 'session-user-id',
          phone: '(555) 123-4567',
          location: 'Boston, MA',
          linkedIn: 'https://www.linkedin.com/in/jane-doe',
          headline: 'Frontend Engineer',
          bio: 'Building delightful products',
        },
      ],
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
    expect(await response.json()).toEqual({
      error: 'Unable to update profile.',
    });
    expect(mockedFindUnique).not.toHaveBeenCalled();
    expect(mockedProfileFindFirst).not.toHaveBeenCalled();
    expect(mockedProfileUpdateMany).not.toHaveBeenCalled();
    expect(mockedProfileCreateMany).not.toHaveBeenCalled();
  });
});
