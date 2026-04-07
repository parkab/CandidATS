/** @jest-environment node */

import { prisma } from '@/lib/prisma';
import { getSupabaseUserFromRequest } from '@/lib/supabase';
import { POST } from './route';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    job: {
      create: jest.fn(),
    },
  },
}));

jest.mock('@/lib/supabase', () => ({
  getSupabaseUserFromRequest: jest.fn(),
}));

const mockedCreate = jest.mocked(prisma.job.create);
const mockedGetSupabaseUserFromRequest = jest.mocked(
  getSupabaseUserFromRequest,
);

function buildRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/api/jobs', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      cookie: 'sb-access-token=test-token',
    },
    body: JSON.stringify(body),
  });
}

describe('POST /api/jobs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 503 when auth service throws', async () => {
    mockedGetSupabaseUserFromRequest.mockRejectedValue(new Error('boom'));

    const response = await POST(buildRequest({}));

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error: 'Authentication service unavailable',
    });
    expect(mockedCreate).not.toHaveBeenCalled();
  });

  it('returns 401 when the session is missing', async () => {
    mockedGetSupabaseUserFromRequest.mockResolvedValue({
      data: null,
      error: { message: 'Unauthorized' },
    } as never);

    const response = await POST(buildRequest({}));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'Unauthorized' });
    expect(mockedCreate).not.toHaveBeenCalled();
  });

  it('returns 400 for an invalid body', async () => {
    mockedGetSupabaseUserFromRequest.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    } as never);

    const response = await POST(
      new Request('http://localhost/api/jobs', {
        method: 'POST',
        headers: {
          cookie: 'sb-access-token=test-token',
        },
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'Invalid request body' });
    expect(mockedCreate).not.toHaveBeenCalled();
  });

  it('creates a job using the authenticated user id even if the payload includes a userId', async () => {
    mockedGetSupabaseUserFromRequest.mockResolvedValue({
      data: { user: { id: 'session-user-id' } },
      error: null,
    } as never);

    mockedCreate.mockResolvedValue({
      id: 'job-1',
      user_id: 'session-user-id',
      title: 'Software Engineer',
      company_name: 'Acme',
      location: 'Remote',
      pipeline_stage: 'Applied',
      last_activity_date: new Date('2026-04-01T00:00:00.000Z'),
      deadline: null,
      priority_flag: true,
      job_description: 'Build things',
      compensation_notes: '$180k',
      application_date: new Date('2026-04-02T00:00:00.000Z'),
      recruiter_contact_notes: 'Recruiter notes',
      custom_notes: 'Other notes',
      created_at: new Date('2026-04-02T00:00:00.000Z'),
      updated_at: new Date('2026-04-02T00:00:00.000Z'),
    } as never);

    const response = await POST(
      buildRequest({
        userId: 'client-user-id',
        title: 'Software Engineer',
        company: 'Acme',
        location: 'Remote',
        stage: 'Applied',
        lastActivityDate: '2026-04-01',
        deadline: '',
        priority: true,
        jobDescription: 'Build things',
        compensation: '$180k',
        applicationDate: '2026-04-02',
        recruiterNotes: 'Recruiter notes',
        otherNotes: 'Other notes',
      }),
    );

    expect(response.status).toBe(201);
    expect(mockedCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        user_id: 'session-user-id',
        title: 'Software Engineer',
        company_name: 'Acme',
        location: 'Remote',
        pipeline_stage: 'Applied',
        priority_flag: true,
        job_description: 'Build things',
        compensation_notes: '$180k',
        recruiter_contact_notes: 'Recruiter notes',
        custom_notes: 'Other notes',
      }),
    });

    const responseBody = await response.json();
    expect(responseBody.user_id).toBe('session-user-id');
  });

  it('rejects an invalid stage value', async () => {
    mockedGetSupabaseUserFromRequest.mockResolvedValue({
      data: { user: { id: 'session-user-id' } },
      error: null,
    } as never);

    const response = await POST(
      buildRequest({
        title: 'Software Engineer',
        company: 'Acme',
        location: 'Remote',
        stage: 'Unknown',
        lastActivityDate: '2026-04-01',
        deadline: '',
        priority: false,
        jobDescription: 'Build things',
        compensation: '',
        applicationDate: '2026-04-02',
        recruiterNotes: '',
        otherNotes: 'Other notes',
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'Invalid stage value' });
    expect(mockedCreate).not.toHaveBeenCalled();
  });

  it('stores nullable optional fields as null when omitted', async () => {
    mockedGetSupabaseUserFromRequest.mockResolvedValue({
      data: { user: { id: 'session-user-id' } },
      error: null,
    } as never);

    mockedCreate.mockResolvedValue({
      id: 'job-2',
      user_id: 'session-user-id',
    } as never);

    const response = await POST(
      buildRequest({
        title: 'Software Engineer',
        company: 'Acme',
        location: 'Remote',
        stage: 'Applied',
        lastActivityDate: '2026-04-01',
        deadline: '',
        priority: false,
      }),
    );

    expect(response.status).toBe(201);
    expect(mockedCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        job_description: null,
        application_date: null,
        custom_notes: null,
      }),
    });
  });

  it('returns 400 for invalid deadline date', async () => {
    mockedGetSupabaseUserFromRequest.mockResolvedValue({
      data: { user: { id: 'session-user-id' } },
      error: null,
    } as never);

    const response = await POST(
      buildRequest({
        title: 'Software Engineer',
        company: 'Acme',
        location: 'Remote',
        stage: 'Applied',
        lastActivityDate: '2026-04-01',
        deadline: 'not-a-date',
        priority: false,
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'Invalid deadline date' });
    expect(mockedCreate).not.toHaveBeenCalled();
  });
});
