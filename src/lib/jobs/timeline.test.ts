import { prisma } from '@/lib/prisma';
import {
  createTimelineEvent,
  createStageChangeEvent,
  createArchiveStateEvent,
  createStageTransitionHistory,
} from './timeline';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    timelineEvent: {
      create: jest.fn(),
    },
    pipelineStageHistory: {
      create: jest.fn(),
    },
  },
}));

const mockedCreate = jest.mocked(prisma.timelineEvent.create);
const mockedPipelineStageHistoryCreate = jest.mocked(
  prisma.pipelineStageHistory.create,
);

describe('Timeline helper functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createTimelineEvent', () => {
    it('creates a timeline event with all fields', async () => {
      const now = new Date('2026-04-03T10:00:00Z');
      const createdEvent = {
        id: 'event-1',
        job_id: 'job-1',
        event_type: 'interview_scheduled',
        notes: 'Phone interview',
        occurred_at: now,
      };

      mockedCreate.mockResolvedValue(createdEvent as never);

      const result = await createTimelineEvent(
        'job-1',
        'interview_scheduled',
        'Phone interview',
        now,
      );

      expect(mockedCreate).toHaveBeenCalledWith({
        data: {
          job_id: 'job-1',
          event_type: 'interview_scheduled',
          notes: 'Phone interview',
          occurred_at: now,
        },
      });
      expect(result).toEqual(createdEvent);
    });

    it('creates a timeline event without notes (defaults to null)', async () => {
      const now = new Date('2026-04-03T10:00:00Z');
      const createdEvent = {
        id: 'event-1',
        job_id: 'job-1',
        event_type: 'job_created',
        notes: null,
        occurred_at: now,
      };

      mockedCreate.mockResolvedValue(createdEvent as never);

      const result = await createTimelineEvent(
        'job-1',
        'job_created',
        undefined,
        now,
      );

      expect(mockedCreate).toHaveBeenCalledWith({
        data: {
          job_id: 'job-1',
          event_type: 'job_created',
          notes: null,
          occurred_at: now,
        },
      });
      expect(result).toEqual(createdEvent);
    });

    it('creates a timeline event without occurred_at (uses current time)', async () => {
      const createdEvent = {
        id: 'event-1',
        job_id: 'job-1',
        event_type: 'note_added',
        notes: 'Added note',
        occurred_at: new Date(),
      };

      mockedCreate.mockResolvedValue(createdEvent as never);

      const result = await createTimelineEvent(
        'job-1',
        'note_added',
        'Added note',
      );

      expect(mockedCreate).toHaveBeenCalledWith({
        data: {
          job_id: 'job-1',
          event_type: 'note_added',
          notes: 'Added note',
          occurred_at: expect.any(Date),
        },
      });
      expect(result).toEqual(createdEvent);
    });

    it('creates a timeline event with null notes explicitly', async () => {
      const now = new Date('2026-04-03T10:00:00Z');
      const createdEvent = {
        id: 'event-1',
        job_id: 'job-1',
        event_type: 'stage_changed',
        notes: null,
        occurred_at: now,
      };

      mockedCreate.mockResolvedValue(createdEvent as never);

      const result = await createTimelineEvent(
        'job-1',
        'stage_changed',
        null,
        now,
      );

      expect(mockedCreate).toHaveBeenCalledWith({
        data: {
          job_id: 'job-1',
          event_type: 'stage_changed',
          notes: null,
          occurred_at: now,
        },
      });
      expect(result).toEqual(createdEvent);
    });
  });

  describe('createStageChangeEvent', () => {
    it('creates a stage_changed event when stage changes from one to another', async () => {
      const createdEvent = {
        id: 'event-1',
        job_id: 'job-1',
        event_type: 'stage_changed',
        notes: 'Changed from Applied to Interview',
        occurred_at: new Date(),
      };

      mockedCreate.mockResolvedValue(createdEvent as never);

      const result = await createStageChangeEvent(
        'job-1',
        'Applied',
        'Interview',
      );

      expect(mockedCreate).toHaveBeenCalledWith({
        data: {
          job_id: 'job-1',
          event_type: 'stage_changed',
          notes: 'Changed from Applied to Interview',
          occurred_at: expect.any(Date),
        },
      });
      expect(result).toEqual(createdEvent);
    });

    it('creates a stage_changed event when changing from null to a stage', async () => {
      const createdEvent = {
        id: 'event-1',
        job_id: 'job-1',
        event_type: 'stage_changed',
        notes: 'Changed to Applied',
        occurred_at: new Date(),
      };

      mockedCreate.mockResolvedValue(createdEvent as never);

      const result = await createStageChangeEvent('job-1', null, 'Applied');

      expect(mockedCreate).toHaveBeenCalledWith({
        data: {
          job_id: 'job-1',
          event_type: 'stage_changed',
          notes: 'Changed to Applied',
          occurred_at: expect.any(Date),
        },
      });
      expect(result).toEqual(createdEvent);
    });

    it('returns null when stage does not change', async () => {
      const result = await createStageChangeEvent(
        'job-1',
        'Interview',
        'Interview',
      );

      expect(mockedCreate).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it('returns null when both old and new stages are null', async () => {
      const result = await createStageChangeEvent('job-1', null, null);

      expect(mockedCreate).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it('creates a stage_changed event with generic message when changing from a stage to null', async () => {
      const createdEvent = {
        id: 'event-1',
        job_id: 'job-1',
        event_type: 'stage_changed',
        notes: 'Stage changed',
        occurred_at: new Date(),
      };

      mockedCreate.mockResolvedValue(createdEvent as never);

      const result = await createStageChangeEvent('job-1', 'Interview', null);

      expect(mockedCreate).toHaveBeenCalledWith({
        data: {
          job_id: 'job-1',
          event_type: 'stage_changed',
          notes: 'Stage changed',
          occurred_at: expect.any(Date),
        },
      });
      expect(result).toEqual(createdEvent);
    });

    it('uses provided occurredAt when supplied', async () => {
      const occurredAt = new Date('2026-04-03T14:30:00.000Z');
      const createdEvent = {
        id: 'event-1',
        job_id: 'job-1',
        event_type: 'stage_changed',
        notes: 'Changed from Applied to Interview',
        occurred_at: occurredAt,
      };

      mockedCreate.mockResolvedValue(createdEvent as never);

      const result = await createStageChangeEvent(
        'job-1',
        'Applied',
        'Interview',
        occurredAt,
      );

      expect(mockedCreate).toHaveBeenCalledWith({
        data: {
          job_id: 'job-1',
          event_type: 'stage_changed',
          notes: 'Changed from Applied to Interview',
          occurred_at: occurredAt,
        },
      });
      expect(result).toEqual(createdEvent);
    });
  });

  describe('createStageTransitionHistory', () => {
    it('creates a stage transition history row when stage changes', async () => {
      const changedAt = new Date('2026-04-05T09:00:00.000Z');
      const createdHistory = {
        id: 'history-1',
        job_id: 'job-1',
        from_stage: 'Applied',
        to_stage: 'Interview',
        changed_at: changedAt,
      };

      mockedPipelineStageHistoryCreate.mockResolvedValue(
        createdHistory as never,
      );

      const result = await createStageTransitionHistory(
        'job-1',
        'Applied',
        'Interview',
        changedAt,
      );

      expect(mockedPipelineStageHistoryCreate).toHaveBeenCalledWith({
        data: {
          job_id: 'job-1',
          from_stage: 'Applied',
          to_stage: 'Interview',
          changed_at: changedAt,
        },
      });
      expect(result).toEqual(createdHistory);
    });

    it('returns null when stage does not change', async () => {
      const result = await createStageTransitionHistory(
        'job-1',
        'Interview',
        'Interview',
      );

      expect(mockedPipelineStageHistoryCreate).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });
  });

  describe('createArchiveStateEvent', () => {
    it('creates a job_archived timeline event', async () => {
      const occurredAt = new Date('2026-04-05T10:00:00.000Z');
      const createdEvent = {
        id: 'event-archive-1',
        job_id: 'job-1',
        event_type: 'job_archived',
        notes: 'Job archived',
        occurred_at: occurredAt,
      };

      mockedCreate.mockResolvedValue(createdEvent as never);

      const result = await createArchiveStateEvent('job-1', true, occurredAt);

      expect(mockedCreate).toHaveBeenCalledWith({
        data: {
          job_id: 'job-1',
          event_type: 'job_archived',
          notes: 'Job archived',
          occurred_at: occurredAt,
        },
      });
      expect(result).toEqual(createdEvent);
    });

    it('creates a job_restored timeline event', async () => {
      const occurredAt = new Date('2026-04-05T11:00:00.000Z');
      const createdEvent = {
        id: 'event-restore-1',
        job_id: 'job-1',
        event_type: 'job_restored',
        notes: 'Job restored',
        occurred_at: occurredAt,
      };

      mockedCreate.mockResolvedValue(createdEvent as never);

      const result = await createArchiveStateEvent('job-1', false, occurredAt);

      expect(mockedCreate).toHaveBeenCalledWith({
        data: {
          job_id: 'job-1',
          event_type: 'job_restored',
          notes: 'Job restored',
          occurred_at: occurredAt,
        },
      });
      expect(result).toEqual(createdEvent);
    });
  });
});
