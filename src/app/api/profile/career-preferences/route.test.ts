/** @jest-environment node */

import { prisma } from '@/lib/prisma';
import { getSupabaseUserFromRequest } from '@/lib/supabase';
import { GET, PATCH } from './route';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    careerPreferences: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
  },
}));

jest.mock('@/lib/supabase', () => ({
  getSupabaseUserFromRequest: jest.fn(),
}));

const mockedFindUnique = jest.mocked(prisma.careerPreferences.findUnique);
const mockedUpsert = jest.mocked(prisma.careerPreferences.upsert);
const mockedAuth = jest.mocked(getSupabaseUserFromRequest);

const authedUser = { data: { user: { id: 'session-user-id' } }, error: null };
const unauthedUser = { data: null, error: { message: 'Unauthorized' } };

function buildRequest(method: string, body?: Record<string, unknown>) {
  return new Request('http://localhost/api/profile/career-preferences', {
    method,
    headers: {
      'content-type': 'application/json',
      cookie: 'sb-access-token=test-token',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe('GET /api/profile/career-preferences', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockedAuth.mockResolvedValue(unauthedUser as never);
    const response = await GET(buildRequest('GET'));
    expect(response.status).toBe(401);
    expect(mockedFindUnique).not.toHaveBeenCalled();
  });

  it('returns null when no record exists for the user', async () => {
    mockedAuth.mockResolvedValue(authedUser as never);
    mockedFindUnique.mockResolvedValue(null);
    const response = await GET(buildRequest('GET'));
    expect(response.status).toBe(200);
    expect(await response.json()).toBeNull();
  });

  it('returns the record scoped to the session user', async () => {
    mockedAuth.mockResolvedValue(authedUser as never);
    const record = {
      id: 'cp-1',
      userId: 'session-user-id',
      targetRoles: 'Engineer',
      workMode: 'Remote',
    };
    mockedFindUnique.mockResolvedValue(record as never);
    const response = await GET(buildRequest('GET'));
    expect(response.status).toBe(200);
    expect(mockedFindUnique).toHaveBeenCalledWith({
      where: { userId: 'session-user-id' },
    });
    const body = await response.json();
    expect(body.targetRoles).toBe('Engineer');
  });
});

describe('PATCH /api/profile/career-preferences', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockedAuth.mockResolvedValue(unauthedUser as never);
    const response = await PATCH(
      buildRequest('PATCH', { targetRoles: 'Engineer' }),
    );
    expect(response.status).toBe(401);
    expect(mockedUpsert).not.toHaveBeenCalled();
  });

  it('returns 400 for an empty payload', async () => {
    mockedAuth.mockResolvedValue(authedUser as never);
    const response = await PATCH(buildRequest('PATCH', {}));
    expect(response.status).toBe(400);
    expect(mockedUpsert).not.toHaveBeenCalled();
  });

  it('returns 400 for an invalid workMode', async () => {
    mockedAuth.mockResolvedValue(authedUser as never);
    const response = await PATCH(
      buildRequest('PATCH', { workMode: 'InvalidMode' }),
    );
    expect(response.status).toBe(400);
    expect(mockedUpsert).not.toHaveBeenCalled();
  });

  it('upserts using session userId and returns 200', async () => {
    mockedAuth.mockResolvedValue(authedUser as never);
    const record = {
      id: 'cp-1',
      userId: 'session-user-id',
      targetRoles: 'Engineer',
      workMode: 'Remote',
    };
    mockedUpsert.mockResolvedValue(record as never);

    const response = await PATCH(
      buildRequest('PATCH', { targetRoles: 'Engineer', workMode: 'Remote' }),
    );
    expect(response.status).toBe(200);
    expect(mockedUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'session-user-id' },
        update: expect.objectContaining({ targetRoles: 'Engineer' }),
        create: expect.objectContaining({ userId: 'session-user-id' }),
      }),
    );
  });

  it('ignores any userId in the request body and uses the session userId', async () => {
    mockedAuth.mockResolvedValue(authedUser as never);
    mockedUpsert.mockResolvedValue({
      id: 'cp-1',
      userId: 'session-user-id',
    } as never);

    await PATCH(
      buildRequest('PATCH', { targetRoles: 'Engineer', userId: 'attacker-id' }),
    );
    expect(mockedUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'session-user-id' },
        create: expect.objectContaining({ userId: 'session-user-id' }),
      }),
    );
  });
});
