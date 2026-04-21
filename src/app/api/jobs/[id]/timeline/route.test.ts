/** @jest-environment node */

import { prisma } from '@/lib/prisma';
import { getSupabaseUserFromRequest } from '@/lib/supabase';
import { GET, POST } from './route';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    job: {
      findUnique: jest.fn(),
    },
    timelineEvent: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
  },
}));

jest.mock('@/lib/supabase', () => ({
  getSupabaseUserFromRequest: jest.fn(),
}));

const mockedFindUnique = jest.mocked(prisma.job.findUnique);
const mockedFindMany = jest.mocked(prisma.timelineEvent.findMany);
const mockedCreate = jest.mocked(prisma.timelineEvent.create);
const mockedGetSupabaseUserFromRequest = jest.mocked(
  getSupabaseUserFromRequest,
);

function buildRequest(body?: Record<string, unknown>): Request {
  return new Request('http://localhost/api/jobs/job-1/timeline', {
    method: body ? 'POST' : 'GET',
    headers: {
      'content-type': 'application/json',
      cookie: 'sb-access-token=test-token',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe('Timeline API Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/jobs/[id]/timeline', () => {
    it('returns 401 when the session is missing', async () => {
      mockedGetSupabaseUserFromRequest.mockResolvedValue({
        data: null,
        error: { message: 'Unauthorized' },
      } as never);

      const response = await GET(buildRequest(), {
        params: Promise.resolve({ id: 'job-1' }),
      });

      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ error: 'Unauthorized' });
      expect(mockedFindMany).not.toHaveBeenCalled();
    });

    it('returns 400 for an invalid job id', async () => {
      mockedGetSupabaseUserFromRequest.mockResolvedValue({
        data: { user: { id: 'session-user-id' } },
        error: null,
      } as never);

      const response = await GET(buildRequest(), {
        params: Promise.resolve({ id: '' }),
      });

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        error: 'Job id is required',
      });
      expect(mockedFindMany).not.toHaveBeenCalled();
    });

    it('returns 404 when the job does not belong to the authenticated user', async () => {
      mockedGetSupabaseUserFromRequest.mockResolvedValue({
        data: { user: { id: 'session-user-id' } },
        error: null,
      } as never);

      mockedFindUnique.mockResolvedValue(null as never);

      const response = await GET(buildRequest(), {
        params: Promise.resolve({ id: 'job-1' }),
      });

      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({
        error: 'Job not found or access denied',
      });
      expect(mockedFindMany).not.toHaveBeenCalled();
    });

    it('returns 404 when job belongs to a different user', async () => {
      mockedGetSupabaseUserFromRequest.mockResolvedValue({
        data: { user: { id: 'session-user-id' } },
        error: null,
      } as never);

      mockedFindUnique.mockResolvedValue({
        id: 'job-1',
        user_id: 'other-user-id',
      } as never);

      const response = await GET(buildRequest(), {
        params: Promise.resolve({ id: 'job-1' }),
      });

      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({
        error: 'Job not found or access denied',
      });
      expect(mockedFindMany).not.toHaveBeenCalled();
    });

    it('returns timeline events ordered by occurred_at descending', async () => {
      mockedGetSupabaseUserFromRequest.mockResolvedValue({
        data: { user: { id: 'session-user-id' } },
        error: null,
      } as never);

      mockedFindUnique.mockResolvedValue({
        id: 'job-1',
        user_id: 'session-user-id',
      } as never);

      const timelineEvents = [
        {
          id: 'event-1',
          job_id: 'job-1',
          event_type: 'stage_changed',
          notes: 'Moved to interview',
          occurred_at: new Date('2026-04-03T00:00:00.000Z'),
        },
        {
          id: 'event-2',
          job_id: 'job-1',
          event_type: 'job_created',
          notes: null,
          occurred_at: new Date('2026-04-01T00:00:00.000Z'),
        },
      ];

      mockedFindMany.mockResolvedValue(timelineEvents as never);

      const response = await GET(buildRequest(), {
        params: Promise.resolve({ id: 'job-1' }),
      });

      expect(response.status).toBe(200);
      expect(mockedFindMany).toHaveBeenCalledWith({
        where: { job_id: 'job-1' },
        orderBy: { occurred_at: 'desc' },
      });

      const responseBody = await response.json();
      expect(responseBody).toHaveLength(2);
      expect(responseBody[0].id).toBe('event-1');
      expect(responseBody[0].event_type).toBe('stage_changed');
      expect(responseBody[1].id).toBe('event-2');
      expect(responseBody[1].event_type).toBe('job_created');
    });

    it('returns empty array when job has no timeline events', async () => {
      mockedGetSupabaseUserFromRequest.mockResolvedValue({
        data: { user: { id: 'session-user-id' } },
        error: null,
      } as never);

      mockedFindUnique.mockResolvedValue({
        id: 'job-1',
        user_id: 'session-user-id',
      } as never);

      mockedFindMany.mockResolvedValue([] as never);

      const response = await GET(buildRequest(), {
        params: Promise.resolve({ id: 'job-1' }),
      });

      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(responseBody).toEqual([]);
    });
  });

  describe('POST /api/jobs/[id]/timeline', () => {
    it('returns 401 when the session is missing', async () => {
      mockedGetSupabaseUserFromRequest.mockResolvedValue({
        data: null,
        error: { message: 'Unauthorized' },
      } as never);

      const response = await POST(buildRequest({ event_type: 'test_event' }), {
        params: Promise.resolve({ id: 'job-1' }),
      });

      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ error: 'Unauthorized' });
      expect(mockedCreate).not.toHaveBeenCalled();
    });

    it('returns 400 for an invalid job id', async () => {
      mockedGetSupabaseUserFromRequest.mockResolvedValue({
        data: { user: { id: 'session-user-id' } },
        error: null,
      } as never);

      const response = await POST(buildRequest({ event_type: 'test_event' }), {
        params: Promise.resolve({ id: '' }),
      });

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        error: 'Job id is required',
      });
      expect(mockedCreate).not.toHaveBeenCalled();
    });

    it('returns 400 for invalid request body', async () => {
      mockedGetSupabaseUserFromRequest.mockResolvedValue({
        data: { user: { id: 'session-user-id' } },
        error: null,
      } as never);

      const response = await POST(
        new Request('http://localhost/api/jobs/job-1/timeline', {
          method: 'POST',
          headers: {
            cookie: 'sb-access-token=test-token',
          },
        }),
        {
          params: Promise.resolve({ id: 'job-1' }),
        },
      );

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: 'Invalid request body' });
      expect(mockedCreate).not.toHaveBeenCalled();
    });

    it('returns 400 when event_type is missing', async () => {
      mockedGetSupabaseUserFromRequest.mockResolvedValue({
        data: { user: { id: 'session-user-id' } },
        error: null,
      } as never);

      const response = await POST(buildRequest({ notes: 'Some notes' }), {
        params: Promise.resolve({ id: 'job-1' }),
      });

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        error: 'event_type is required',
      });
      expect(mockedCreate).not.toHaveBeenCalled();
    });

    it('returns 400 when event_type is empty', async () => {
      mockedGetSupabaseUserFromRequest.mockResolvedValue({
        data: { user: { id: 'session-user-id' } },
        error: null,
      } as never);

      const response = await POST(buildRequest({ event_type: '   ' }), {
        params: Promise.resolve({ id: 'job-1' }),
      });

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        error: 'event_type is required',
      });
      expect(mockedCreate).not.toHaveBeenCalled();
    });

    it('returns 404 when the job does not belong to the authenticated user', async () => {
      mockedGetSupabaseUserFromRequest.mockResolvedValue({
        data: { user: { id: 'session-user-id' } },
        error: null,
      } as never);

      mockedFindUnique.mockResolvedValue(null as never);

      const response = await POST(
        buildRequest({ event_type: 'test_event', notes: 'Test notes' }),
        {
          params: Promise.resolve({ id: 'job-1' }),
        },
      );

      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({
        error: 'Job not found or access denied',
      });
      expect(mockedCreate).not.toHaveBeenCalled();
    });

    it('returns 404 when job belongs to a different user', async () => {
      mockedGetSupabaseUserFromRequest.mockResolvedValue({
        data: { user: { id: 'session-user-id' } },
        error: null,
      } as never);

      mockedFindUnique.mockResolvedValue({
        id: 'job-1',
        user_id: 'other-user-id',
      } as never);

      const response = await POST(buildRequest({ event_type: 'test_event' }), {
        params: Promise.resolve({ id: 'job-1' }),
      });

      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({
        error: 'Job not found or access denied',
      });
      expect(mockedCreate).not.toHaveBeenCalled();
    });

    it('creates timeline event with required fields and defaults occurred_at to current time', async () => {
      mockedGetSupabaseUserFromRequest.mockResolvedValue({
        data: { user: { id: 'session-user-id' } },
        error: null,
      } as never);

      mockedFindUnique.mockResolvedValue({
        id: 'job-1',
        user_id: 'session-user-id',
      } as never);

      const createdEvent = {
        id: 'event-1',
        job_id: 'job-1',
        event_type: 'interview_scheduled',
        notes: null,
        occurred_at: new Date('2026-04-03T10:00:00.000Z'),
      };

      mockedCreate.mockResolvedValue(createdEvent as never);

      const response = await POST(
        buildRequest({ event_type: 'interview_scheduled' }),
        {
          params: Promise.resolve({ id: 'job-1' }),
        },
      );

      expect(response.status).toBe(201);
      expect(mockedCreate).toHaveBeenCalledWith({
        data: {
          job_id: 'job-1',
          event_type: 'interview_scheduled',
          notes: null,
          occurred_at: expect.any(Date),
        },
      });

      const responseBody = await response.json();
      expect(responseBody.id).toBe('event-1');
      expect(responseBody.job_id).toBe('job-1');
      expect(responseBody.event_type).toBe('interview_scheduled');
      expect(responseBody.notes).toBeNull();
    });

    it('creates timeline event with optional notes and custom occurred_at', async () => {
      mockedGetSupabaseUserFromRequest.mockResolvedValue({
        data: { user: { id: 'session-user-id' } },
        error: null,
      } as never);

      mockedFindUnique.mockResolvedValue({
        id: 'job-1',
        user_id: 'session-user-id',
      } as never);

      const customDate = new Date('2026-04-02T15:30:00.000Z');
      const createdEvent = {
        id: 'event-1',
        job_id: 'job-1',
        event_type: 'stage_changed',
        notes: 'Moved from Applied to Interview',
        occurred_at: customDate,
      };

      mockedCreate.mockResolvedValue(createdEvent as never);

      const response = await POST(
        buildRequest({
          event_type: 'stage_changed',
          notes: 'Moved from Applied to Interview',
          occurred_at: customDate.toISOString(),
        }),
        {
          params: Promise.resolve({ id: 'job-1' }),
        },
      );

      expect(response.status).toBe(201);
      expect(mockedCreate).toHaveBeenCalledWith({
        data: {
          job_id: 'job-1',
          event_type: 'stage_changed',
          notes: 'Moved from Applied to Interview',
          occurred_at: customDate,
        },
      });

      const responseBody = await response.json();
      expect(responseBody.id).toBe('event-1');
      expect(responseBody.event_type).toBe('stage_changed');
      expect(responseBody.notes).toBe('Moved from Applied to Interview');
    });

    it('stores notes as null when omitted', async () => {
      mockedGetSupabaseUserFromRequest.mockResolvedValue({
        data: { user: { id: 'session-user-id' } },
        error: null,
      } as never);

      mockedFindUnique.mockResolvedValue({
        id: 'job-1',
        user_id: 'session-user-id',
      } as never);

      const createdEvent = {
        id: 'event-1',
        job_id: 'job-1',
        event_type: 'job_created',
        notes: null,
        occurred_at: new Date('2026-04-01T00:00:00.000Z'),
      };

      mockedCreate.mockResolvedValue(createdEvent as never);

      const response = await POST(buildRequest({ event_type: 'job_created' }), {
        params: Promise.resolve({ id: 'job-1' }),
      });

      expect(response.status).toBe(201);
      expect(mockedCreate).toHaveBeenCalledWith({
        data: {
          job_id: 'job-1',
          event_type: 'job_created',
          notes: null,
          occurred_at: expect.any(Date),
        },
      });

      const responseBody = await response.json();
      expect(responseBody.id).toBe('event-1');
      expect(responseBody.notes).toBeNull();
    });

    it('stores notes as null when empty string', async () => {
      mockedGetSupabaseUserFromRequest.mockResolvedValue({
        data: { user: { id: 'session-user-id' } },
        error: null,
      } as never);

      mockedFindUnique.mockResolvedValue({
        id: 'job-1',
        user_id: 'session-user-id',
      } as never);

      const createdEvent = {
        id: 'event-1',
        job_id: 'job-1',
        event_type: 'interview_scheduled',
        notes: null,
        occurred_at: new Date('2026-04-03T10:00:00.000Z'),
      };

      mockedCreate.mockResolvedValue(createdEvent as never);

      const response = await POST(
        buildRequest({ event_type: 'interview_scheduled', notes: '   ' }),
        {
          params: Promise.resolve({ id: 'job-1' }),
        },
      );

      expect(response.status).toBe(201);
      expect(mockedCreate).toHaveBeenCalledWith({
        data: {
          job_id: 'job-1',
          event_type: 'interview_scheduled',
          notes: null,
          occurred_at: expect.any(Date),
        },
      });

      const responseBody = await response.json();
      expect(responseBody.id).toBe('event-1');
      expect(responseBody.notes).toBeNull();
    });

    it('defaults to current time when occurred_at is invalid', async () => {
      mockedGetSupabaseUserFromRequest.mockResolvedValue({
        data: { user: { id: 'session-user-id' } },
        error: null,
      } as never);

      mockedFindUnique.mockResolvedValue({
        id: 'job-1',
        user_id: 'session-user-id',
      } as never);

      const createdEvent = {
        id: 'event-1',
        job_id: 'job-1',
        event_type: 'test_event',
        notes: null,
        occurred_at: new Date('2026-04-03T10:00:00.000Z'),
      };

      mockedCreate.mockResolvedValue(createdEvent as never);

      const response = await POST(
        buildRequest({
          event_type: 'test_event',
          occurred_at: 'not-a-date',
        }),
        {
          params: Promise.resolve({ id: 'job-1' }),
        },
      );

      expect(response.status).toBe(201);
      expect(mockedCreate).toHaveBeenCalledWith({
        data: {
          job_id: 'job-1',
          event_type: 'test_event',
          notes: null,
          occurred_at: expect.any(Date),
        },
      });

      const responseBody = await response.json();
      expect(responseBody.id).toBe('event-1');
      expect(responseBody.event_type).toBe('test_event');
    });
  });
});
