import { prisma } from '@/lib/prisma';

/**
 * Creates a timeline event for a job.
 * @param jobId - The job ID
 * @param eventType - The type of event (e.g., 'stage_changed', 'interview_scheduled')
 * @param notes - Optional notes about the event
 * @param occurredAt - Optional date when the event occurred (defaults to now)
 */
export async function createTimelineEvent(
  jobId: string,
  eventType: string,
  notes?: string | null,
  occurredAt?: Date,
) {
  return prisma.timelineEvent.create({
    data: {
      job_id: jobId,
      event_type: eventType,
      notes: notes ?? null,
      occurred_at: occurredAt ?? new Date(),
    },
  });
}

/**
 * Creates a 'stage_changed' timeline event when a job's pipeline stage changes.
 * @param jobId - The job ID
 * @param oldStage - The previous pipeline stage
 * @param newStage - The new pipeline stage
 */
export async function createStageChangeEvent(
  jobId: string,
  oldStage: string | null,
  newStage: string | null,
  occurredAt?: Date,
) {
  if (oldStage === newStage) {
    return null; // No change, don't create an event
  }

  const notes =
    oldStage && newStage
      ? `Changed from ${oldStage} to ${newStage}`
      : newStage
        ? `Changed to ${newStage}`
        : 'Stage changed';

  return createTimelineEvent(jobId, 'stage_changed', notes, occurredAt);
}

/**
 * Persists a dedicated history row for a job stage transition.
 * @param jobId - The job ID
 * @param oldStage - The previous pipeline stage
 * @param newStage - The new pipeline stage
 * @param changedAt - Optional timestamp for the transition (defaults to now)
 */
export async function createStageTransitionHistory(
  jobId: string,
  oldStage: string | null,
  newStage: string | null,
  changedAt?: Date,
) {
  if (oldStage === newStage) {
    return null;
  }

  return prisma.pipelineStageHistory.create({
    data: {
      job_id: jobId,
      from_stage: oldStage,
      to_stage: newStage,
      changed_at: changedAt ?? new Date(),
    },
  });
}

/**
 * Creates a timeline event when a job is archived or restored.
 * @param jobId - The job ID
 * @param archived - Whether the job is now archived
 * @param occurredAt - Optional timestamp for the event (defaults to now)
 */
export async function createArchiveStateEvent(
  jobId: string,
  archived: boolean,
  occurredAt?: Date,
) {
  const eventType = archived ? 'job_archived' : 'job_restored';
  const notes = archived ? 'Job archived' : 'Job restored';

  return createTimelineEvent(jobId, eventType, notes, occurredAt);
}

/**
 * Syncs timeline events for an interview.
 * Creates, updates, or deletes a timeline event based on interview changes.
 * @param jobId - The job ID
 * @param interviewId - The interview ID
 * @param roundType - The round type (e.g., 'Phone Screen', 'Technical', 'Final')
 * @param scheduledAt - The scheduled date
 * @param notes - Optional notes about the interview
 */
export async function syncInterviewTimeline(
  jobId: string,
  interviewId: string,
  roundType: string,
  scheduledAt: Date,
  notes?: string | null,
) {
  // Check if timeline event already exists for this interview
  const existingEvent = await prisma.timelineEvent.findFirst({
    where: {
      job_id: jobId,
      source_type: 'interview',
      source_id: interviewId,
    },
  });

  const eventNotes = notes
    ? `${roundType}: ${notes}`
    : `${roundType} interview scheduled`;

  if (existingEvent) {
    // Update existing timeline event
    return prisma.timelineEvent.update({
      where: { id: existingEvent.id },
      data: {
        event_type: 'interview_scheduled',
        notes: eventNotes,
        occurred_at: scheduledAt,
      },
    });
  } else {
    // Create new timeline event
    return prisma.timelineEvent.create({
      data: {
        job_id: jobId,
        source_type: 'interview',
        source_id: interviewId,
        event_type: 'interview_scheduled',
        notes: eventNotes,
        occurred_at: scheduledAt,
      },
    });
  }
}

/**
 * Deletes timeline event for an interview.
 * @param jobId - The job ID
 * @param interviewId - The interview ID
 */
export async function deleteInterviewTimeline(
  jobId: string,
  interviewId: string,
) {
  return prisma.timelineEvent.deleteMany({
    where: {
      job_id: jobId,
      source_type: 'interview',
      source_id: interviewId,
    },
  });
}

/**
 * Syncs timeline events for a follow-up task.
 * Creates, updates, or deletes a timeline event based on follow-up changes.
 * @param jobId - The job ID
 * @param followUpId - The follow-up task ID
 * @param title - The follow-up title
 * @param dueDate - The due date
 * @param notes - Optional notes about the follow-up
 */
export async function syncFollowUpTimeline(
  jobId: string,
  followUpId: string,
  title: string,
  dueDate?: Date | null,
  notes?: string | null,
) {
  // Check if timeline event already exists for this follow-up
  const existingEvent = await prisma.timelineEvent.findFirst({
    where: {
      job_id: jobId,
      source_type: 'followup',
      source_id: followUpId,
    },
  });

  const eventNotes = notes ? `${title}: ${notes}` : `Follow-up: ${title}`;
  const occurredAt = dueDate ?? new Date();

  if (existingEvent) {
    // Update existing timeline event
    return prisma.timelineEvent.update({
      where: { id: existingEvent.id },
      data: {
        event_type: 'followup_task',
        notes: eventNotes,
        occurred_at: occurredAt,
      },
    });
  } else {
    // Create new timeline event
    return prisma.timelineEvent.create({
      data: {
        job_id: jobId,
        source_type: 'followup',
        source_id: followUpId,
        event_type: 'followup_task',
        notes: eventNotes,
        occurred_at: occurredAt,
      },
    });
  }
}

/**
 * Deletes timeline event for a follow-up task.
 * @param jobId - The job ID
 * @param followUpId - The follow-up task ID
 */
export async function deleteFollowUpTimeline(
  jobId: string,
  followUpId: string,
) {
  return prisma.timelineEvent.deleteMany({
    where: {
      job_id: jobId,
      source_type: 'followup',
      source_id: followUpId,
    },
  });
}
