import { prisma } from '@/lib/prisma';

/**
 * Helper function to format notes with an ID marker for tracking
 * Format: [type:id] notes
 */
function formatNotesWithId(type: string, id: string, content: string): string {
  return `[${type}:${id}] ${content}`;
}

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
 * Creates a timeline event when an interview is scheduled.
 * @param jobId - The job ID
 * @param interviewId - The interview ID (stored in notes for reference)
 * @param roundType - The type/round of interview
 * @param scheduledDate - The scheduled date of the interview
 * @param notes - Optional additional notes
 */
export async function createInterviewScheduledEvent(
  jobId: string,
  interviewId: string,
  roundType?: string | null,
  scheduledDate?: Date,
  notes?: string | null,
) {
  const roundTypeText = roundType || 'Interview';
  const eventNotes = notes ? `${roundTypeText}: ${notes}` : roundTypeText;
  const formattedNotes = formatNotesWithId('interview', interviewId, eventNotes);

  return createTimelineEvent(
    jobId,
    'interview_scheduled',
    formattedNotes,
    scheduledDate,
  );
}

/**
 * Updates the timeline event for an interview.
 * @param jobId - The job ID
 * @param interviewId - The interview ID
 * @param roundType - The type/round of interview
 * @param scheduledDate - The scheduled date
 * @param notes - Optional notes
 */
export async function updateInterviewTimelineEvent(
  jobId: string,
  interviewId: string,
  roundType?: string | null,
  scheduledDate?: Date,
  notes?: string | null,
) {
  const roundTypeText = roundType || 'Interview';
  const eventNotes = notes ? `${roundTypeText}: ${notes}` : roundTypeText;
  const formattedNotes = formatNotesWithId('interview', interviewId, eventNotes);

  // Find the existing timeline event for this interview
  const existingEvent = await prisma.timelineEvent.findFirst({
    where: {
      job_id: jobId,
      notes: {
        startsWith: `[interview:${interviewId}]`,
      },
    },
  });

  if (existingEvent) {
    return prisma.timelineEvent.update({
      where: { id: existingEvent.id },
      data: {
        event_type: 'interview_scheduled',
        notes: formattedNotes,
        occurred_at: scheduledDate,
      },
    });
  }

  // If no existing event found, create a new one
  return createInterviewScheduledEvent(
    jobId,
    interviewId,
    roundType,
    scheduledDate,
    notes,
  );
}

/**
 * Deletes the timeline event for a deleted interview.
 * @param jobId - The job ID
 * @param interviewId - The interview ID
 */
export async function deleteInterviewTimelineEvent(
  jobId: string,
  interviewId: string,
) {
  return prisma.timelineEvent.deleteMany({
    where: {
      job_id: jobId,
      notes: {
        startsWith: `[interview:${interviewId}]`,
      },
    },
  });
}

/**
 * Creates a timeline event when an interview is deleted.
 * @param jobId - The job ID
 * @param roundType - The type/round of interview that was deleted
 */
export async function createInterviewDeletedEvent(
  jobId: string,
  roundType?: string | null,
) {
  const roundTypeText = roundType || 'Interview';
  const notes = `${roundTypeText} removed`;

  return createTimelineEvent(jobId, 'note_added', notes);
}

/**
 * Creates a timeline event when a follow-up task is created.
 * @param jobId - The job ID
 * @param followUpId - The follow-up task ID
 * @param title - The title of the follow-up task
 * @param dueDate - The due date of the follow-up task
 */
export async function createFollowUpCreatedEvent(
  jobId: string,
  followUpId: string,
  title?: string | null,
  dueDate?: Date | null,
) {
  const taskTitle = title || 'Follow-up';
  const eventNotes = `${taskTitle}`;
  const formattedNotes = formatNotesWithId('followup', followUpId, eventNotes);

  return createTimelineEvent(jobId, 'follow_up_created', formattedNotes, dueDate ?? undefined);
}

/**
 * Updates the timeline event for a follow-up.
 * @param jobId - The job ID
 * @param followUpId - The follow-up task ID
 * @param title - The title of the follow-up task
 * @param dueDate - The due date of the follow-up task
 */
export async function updateFollowUpTimelineEvent(
  jobId: string,
  followUpId: string,
  title?: string | null,
  dueDate?: Date | null,
) {
  const taskTitle = title || 'Follow-up';
  const eventNotes = `${taskTitle}`;
  const formattedNotes = formatNotesWithId('followup', followUpId, eventNotes);

  // Find the existing timeline event for this follow-up
  const existingEvent = await prisma.timelineEvent.findFirst({
    where: {
      job_id: jobId,
      notes: {
        startsWith: `[followup:${followUpId}]`,
      },
    },
  });

  if (existingEvent) {
    return prisma.timelineEvent.update({
      where: { id: existingEvent.id },
      data: {
        event_type: 'follow_up_created',
        notes: formattedNotes,
        occurred_at: dueDate ?? undefined,
      },
    });
  }

  // If no existing event found, create a new one
  return createFollowUpCreatedEvent(jobId, followUpId, title, dueDate);
}

/**
 * Creates a timeline event when a follow-up task is marked as completed.
 * @param jobId - The job ID
 * @param followUpId - The follow-up task ID
 * @param title - The title of the follow-up task
 */
export async function createFollowUpCompletedEvent(
  jobId: string,
  followUpId: string,
  title?: string | null,
) {
  const taskTitle = title || 'Follow-up';
  const eventNotes = `${taskTitle}`;
  const formattedNotes = formatNotesWithId('followup', followUpId, eventNotes);

  return createTimelineEvent(jobId, 'follow_up_completed', formattedNotes);
}

/**
 * Creates a timeline event when a follow-up task is deleted.
 * @param jobId - The job ID
 * @param title - The title of the follow-up task that was deleted
 */
export async function createFollowUpDeletedEvent(
  jobId: string,
  title?: string | null,
) {
  const taskTitle = title || 'Follow-up';
  const notes = `Follow-up removed: ${taskTitle}`;

  return createTimelineEvent(jobId, 'note_added', notes);
}

/**
 * Deletes the timeline event for a deleted follow-up.
 * @param jobId - The job ID
 * @param followUpId - The follow-up task ID
 */
export async function deleteFollowUpTimelineEvent(
  jobId: string,
  followUpId: string,
) {
  return prisma.timelineEvent.deleteMany({
    where: {
      job_id: jobId,
      notes: {
        startsWith: `[followup:${followUpId}]`,
      },
    },
  });
}
