/** @jest-environment node */

import { prisma } from '@/lib/prisma';
import { getSupabaseUserFromRequest } from '@/lib/supabase';
import { GET, POST } from './route';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    education: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
  },
}));

jest.mock('@/lib/supabase', () => ({
  getSupabaseUserFromRequest: jest.fn(),
}));

const mockedFindMany = jest.mocked(prisma.education.findMany);
const mockedCreate = jest.mocked(prisma.education.create);
const mockedAuth = jest.mocked(getSupabaseUserFromRequest);

const authedUser = { data: { user: { id: 'session-user-id' } }, error: null };
const unauthedUser = { data: null, error: { message: 'Unauthorized' } };

function buildRequest(method: string, body?: Record<string, unknown>) {
  return new Request('http://localhost/api/profile/education', {
    method,
    headers: {
      'content-type': 'application/json',
      cookie: 'sb-access-token=test-token',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

const validCreateBody = {
  institution: 'NJIT',
  degree: 'Bachelor of Science',
  fieldOfStudy: 'Computer Science',
  startDate: '2020-09-01',
};

describe('GET /api/profile/education', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockedAuth.mockResolvedValue(unauthedUser as never);
    const response = await GET(buildRequest('GET'));
    expect(response.status).toBe(401);
    expect(mockedFindMany).not.toHaveBeenCalled();
  });

  it('returns education scoped to the authenticated user ordered by startDate desc', async () => {
    mockedAuth.mockResolvedValue(authedUser as never);
    const mockList = [
      {
        id: 'edu-1',
        userId: 'session-user-id',
        institution: 'NJIT',
        startDate: new Date('2022-09-01'),
      },
      {
        id: 'edu-2',
        userId: 'session-user-id',
        institution: 'Community College',
        startDate: new Date('2020-09-01'),
      },
    ];
    mockedFindMany.mockResolvedValue(mockList as never);

    const response = await GET(buildRequest('GET'));
    expect(response.status).toBe(200);
    expect(mockedFindMany).toHaveBeenCalledWith({
      where: { userId: 'session-user-id' },
      orderBy: [{ startDate: 'desc' }, { id: 'asc' }],
    });
    const body = await response.json();
    expect(body).toHaveLength(2);
  });
});

describe('POST /api/profile/education', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockedAuth.mockResolvedValue(unauthedUser as never);
    const response = await POST(buildRequest('POST', validCreateBody));
    expect(response.status).toBe(401);
    expect(mockedCreate).not.toHaveBeenCalled();
  });

  it('returns 400 for an invalid payload', async () => {
    mockedAuth.mockResolvedValue(authedUser as never);
    const response = await POST(buildRequest('POST', { institution: 'NJIT' }));
    expect(response.status).toBe(400);
    expect(mockedCreate).not.toHaveBeenCalled();
  });

  it('creates an education record scoped to the session user and returns 201', async () => {
    mockedAuth.mockResolvedValue(authedUser as never);
    const created = {
      id: 'edu-new',
      userId: 'session-user-id',
      ...validCreateBody,
    };
    mockedCreate.mockResolvedValue(created as never);

    const response = await POST(buildRequest('POST', validCreateBody));
    expect(response.status).toBe(201);
    expect(mockedCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'session-user-id',
        institution: 'NJIT',
      }),
    });
  });

  it('ignores any userId in the request body and uses the session userId', async () => {
    mockedAuth.mockResolvedValue(authedUser as never);
    mockedCreate.mockResolvedValue({
      id: 'edu-new',
      userId: 'session-user-id',
    } as never);

    await POST(
      buildRequest('POST', { ...validCreateBody, userId: 'attacker-id' }),
    );
    expect(mockedCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ userId: 'session-user-id' }),
    });
  });
});
