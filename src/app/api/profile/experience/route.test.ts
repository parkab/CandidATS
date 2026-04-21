/** @jest-environment node */

import { prisma } from '@/lib/prisma';
import { getSupabaseUserFromRequest } from '@/lib/supabase';
import { GET, POST } from './route';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    experience: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  },
}));

jest.mock('@/lib/supabase', () => ({
  getSupabaseUserFromRequest: jest.fn(),
}));

const mockedFindMany = jest.mocked(prisma.experience.findMany);
const mockedFindFirst = jest.mocked(prisma.experience.findFirst);
const mockedCreate = jest.mocked(prisma.experience.create);
const mockedAuth = jest.mocked(getSupabaseUserFromRequest);

const authedUser = { data: { user: { id: 'session-user-id' } }, error: null };
const unauthedUser = { data: null, error: { message: 'Unauthorized' } };

function buildRequest(method: string, body?: Record<string, unknown>) {
  return new Request('http://localhost/api/profile/experience', {
    method,
    headers: {
      'content-type': 'application/json',
      cookie: 'sb-access-token=test-token',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

const validCreateBody = {
  type: 'employment',
  title: 'Software Engineer',
  organization: 'Acme Corp',
  startDate: '2023-01-15',
};

describe('GET /api/profile/experience', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockedAuth.mockResolvedValue(unauthedUser as never);
    const response = await GET(buildRequest('GET'));
    expect(response.status).toBe(401);
    expect(mockedFindMany).not.toHaveBeenCalled();
  });

  it('returns experiences scoped to the authenticated user ordered by sortOrder', async () => {
    mockedAuth.mockResolvedValue(authedUser as never);
    const mockList = [
      { id: 'exp-1', userId: 'session-user-id', sortOrder: 0, title: 'First' },
      { id: 'exp-2', userId: 'session-user-id', sortOrder: 1, title: 'Second' },
    ];
    mockedFindMany.mockResolvedValue(mockList as never);

    const response = await GET(buildRequest('GET'));
    expect(response.status).toBe(200);
    expect(mockedFindMany).toHaveBeenCalledWith({
      where: { userId: 'session-user-id' },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
    const body = await response.json();
    expect(body).toHaveLength(2);
  });
});

describe('POST /api/profile/experience', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedFindFirst.mockResolvedValue(null as never);
  });

  it('returns 401 when unauthenticated', async () => {
    mockedAuth.mockResolvedValue(unauthedUser as never);
    const response = await POST(buildRequest('POST', validCreateBody));
    expect(response.status).toBe(401);
    expect(mockedCreate).not.toHaveBeenCalled();
  });

  it('returns 400 for an invalid payload', async () => {
    mockedAuth.mockResolvedValue(authedUser as never);
    const response = await POST(
      buildRequest('POST', { type: 'employment', title: '' }),
    );
    expect(response.status).toBe(400);
    expect(mockedCreate).not.toHaveBeenCalled();
  });

  it('creates an experience with server-computed sortOrder and returns 201', async () => {
    mockedAuth.mockResolvedValue(authedUser as never);
    mockedFindFirst.mockResolvedValue({ sortOrder: 2 } as never);
    const created = {
      id: 'exp-new',
      userId: 'session-user-id',
      sortOrder: 3,
      ...validCreateBody,
    };
    mockedCreate.mockResolvedValue(created as never);

    const response = await POST(buildRequest('POST', validCreateBody));
    expect(response.status).toBe(201);
    expect(mockedCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'session-user-id',
        title: 'Software Engineer',
        sortOrder: 3,
      }),
    });
  });

  it('ignores any userId in the request body and uses the session userId', async () => {
    mockedAuth.mockResolvedValue(authedUser as never);
    mockedCreate.mockResolvedValue({
      id: 'exp-new',
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
