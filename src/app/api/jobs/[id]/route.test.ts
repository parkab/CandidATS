/** @jest-environment node */

import { prisma } from '@/lib/prisma';
import { getSupabaseUserFromRequest } from '@/lib/supabase';
import { PATCH } from './route';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    job: {
      updateMany: jest.fn(),
      findFirst: jest.fn(),
    },
  },
}));

jest.mock('@/lib/supabase', () => ({
  getSupabaseUserFromRequest: jest.fn(),
}));

const mockedUpdateMany = jest.mocked(prisma.job.updateMany);
const mockedFindFirst = jest.mocked(prisma.job.findFirst);
const mockedGetSupabaseUserFromRequest = jest.mocked(
  getSupabaseUserFromRequest,
);

function buildRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/api/jobs/job-1', {
    method: 'PATCH',
    headers: {
      'content-type': 'application/json',
      cookie: 'sb-access-token=test-token',
    },
    body: JSON.stringify(body),
  });
}

describe('PATCH /api/jobs/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when the session is missing', async () => {
    mockedGetSupabaseUserFromRequest.mockResolvedValue({
      data: null,
      error: { message: 'Unauthorized' },
    } as never);

    const response = await PATCH(buildRequest({}), {
      params: Promise.resolve({ id: 'job-1' }),
    });

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'Unauthorized' });
    expect(mockedUpdateMany).not.toHaveBeenCalled();
  });

  it('returns 400 for an invalid request body', async () => {
    mockedGetSupabaseUserFromRequest.mockResolvedValue({
      data: { user: { id: 'session-user-id' } },
      error: null,
    } as never);

    const response = await PATCH(
      new Request('http://localhost/api/jobs/job-1', {
        method: 'PATCH',
        headers: {
          cookie: 'sb-access-token=test-token',
        },
      }),
      { params: Promise.resolve({ id: 'job-1' }) },
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'Invalid request body' });
    expect(mockedUpdateMany).not.toHaveBeenCalled();
  });

  it('updates only the authenticated user job and ignores a client-supplied userId', async () => {
    mockedGetSupabaseUserFromRequest.mockResolvedValue({
      data: { user: { id: 'session-user-id' } },
      error: null,
    } as never);

    mockedUpdateMany.mockResolvedValue({ count: 1 } as never);
    mockedFindFirst.mockResolvedValue({
      id: 'job-1',
      user_id: 'session-user-id',
      title: 'Software Engineer',
      company_name: 'Acme',
      location: 'Remote',
      pipeline_stage: 'Interview',
      last_activity_date: new Date('2026-04-01T00:00:00.000Z'),
      deadline: null,
      priority_flag: false,
      job_description: 'Build things',
      compensation_notes: '$180k',
      application_date: new Date('2026-04-02T00:00:00.000Z'),
      recruiter_contact_notes: null,
      custom_notes: 'Updated notes',
    } as never);

    const response = await PATCH(
      buildRequest({
        userId: 'client-user-id',
        title: 'Software Engineer',
        company: 'Acme',
        location: 'Remote',
        stage: 'Interview',
        lastActivityDate: '2026-04-01',
        deadline: '',
        priority: false,
        jobDescription: 'Build things',
        compensation: '$180k',
        applicationDate: '2026-04-02',
        recruiterNotes: '',
        otherNotes: 'Updated notes',
      }),
      { params: Promise.resolve({ id: 'job-1' }) },
    );

    expect(response.status).toBe(200);
    expect(mockedUpdateMany).toHaveBeenCalledWith({
      where: {
        id: 'job-1',
        user_id: 'session-user-id',
      },
      data: expect.objectContaining({
        title: 'Software Engineer',
        company_name: 'Acme',
        location: 'Remote',
        pipeline_stage: 'Interview',
        priority_flag: false,
        job_description: 'Build things',
        compensation_notes: '$180k',
        custom_notes: 'Updated notes',
      }),
    });
    expect(mockedFindFirst).toHaveBeenCalledWith({
      where: {
        id: 'job-1',
        user_id: 'session-user-id',
      },
    });

    const responseBody = await response.json();
    expect(responseBody.user_id).toBe('session-user-id');
  });

  it('returns 404 when the job does not belong to the authenticated user', async () => {
    mockedGetSupabaseUserFromRequest.mockResolvedValue({
      data: { user: { id: 'session-user-id' } },
      error: null,
    } as never);

    mockedUpdateMany.mockResolvedValue({ count: 0 } as never);

    const response = await PATCH(
      buildRequest({
        title: 'Software Engineer',
        company: 'Acme',
        location: 'Remote',
        stage: 'Applied',
        lastActivityDate: '2026-04-01',
        deadline: '',
        priority: false,
        jobDescription: 'Build things',
        compensation: '',
        applicationDate: '2026-04-02',
        recruiterNotes: '',
        otherNotes: 'Other notes',
      }),
      { params: Promise.resolve({ id: 'job-1' }) },
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      error: 'Job not found or access denied',
    });
    expect(mockedFindFirst).not.toHaveBeenCalled();
  });
});
