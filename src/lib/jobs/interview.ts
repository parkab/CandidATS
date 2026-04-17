import { prisma } from '@/lib/prisma';

/**
 * Creates an interview event for a job
 * @param jobId - The job ID
 * @param roundType - The type of interview round (e.g., "Phone Screen", "Technical", "Behavioral")
 * @param scheduledAt - When the interview is scheduled
 * @param notes - Optional notes about the interview
 */
export async function createInterview(
  jobId: string,
  roundType: string,
  scheduledAt: Date,
  notes?: string | null,
) {
  return prisma.interview.create({
    data: {
      job_id: jobId,
      round_type: roundType,
      scheduled_at: scheduledAt,
      notes: notes ?? null,
    },
  });
}

/**
 * Updates an existing interview
 * @param interviewId - The interview ID
 * @param roundType - The type of interview round
 * @param scheduledAt - When the interview is scheduled
 * @param notes - Optional notes about the interview
 */
export async function updateInterview(
  interviewId: string,
  roundType: string,
  scheduledAt: Date,
  notes?: string | null,
) {
  return prisma.interview.update({
    where: { id: interviewId },
    data: {
      round_type: roundType,
      scheduled_at: scheduledAt,
      notes: notes ?? null,
    },
  });
}

/**
 * Deletes an interview by ID
 */
export async function deleteInterview(interviewId: string) {
  return prisma.interview.delete({
    where: { id: interviewId },
  });
}

/**
 * Gets all interviews for a job, ordered by scheduled date
 */
export async function getJobInterviews(jobId: string) {
  return prisma.interview.findMany({
    where: { job_id: jobId },
    orderBy: { scheduled_at: 'asc' },
  });
}
