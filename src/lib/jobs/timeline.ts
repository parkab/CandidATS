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

  return createTimelineEvent(jobId, 'stage_changed', notes);
}
