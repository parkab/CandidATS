import { prisma } from '@/lib/prisma';

/**
 * Creates a follow-up task for a job.
 * @param jobId - The job ID
 * @param title - The title/description of the follow-up
 * @param dueDate - Optional due date for the follow-up
 * @param completed - Optional completion status (defaults to false)
 */
export async function createFollowUpTask(
  jobId: string,
  title: string,
  dueDate?: Date | null,
  completed?: boolean,
) {
  return prisma.followUpTask.create({
    data: {
      job_id: jobId,
      title,
      due_date: dueDate ?? null,
      completed: completed ?? false,
    },
  });
}

/**
 * Updates a follow-up task.
 * @param taskId - The follow-up task ID
 * @param title - Optional title to update
 * @param dueDate - Optional due date to update
 * @param completed - Optional completion status to update
 */
export async function updateFollowUpTask(
  taskId: string,
  title?: string,
  dueDate?: Date | null,
  completed?: boolean,
) {
  const updateData: Record<string, unknown> = {};

  if (title !== undefined) {
    updateData.title = title;
  }

  if (dueDate !== undefined) {
    updateData.due_date = dueDate;
  }

  if (completed !== undefined) {
    updateData.completed = completed;
  }

  return prisma.followUpTask.update({
    where: { id: taskId },
    data: updateData,
  });
}

/**
 * Retrieves all follow-up tasks for a job.
 * @param jobId - The job ID
 */
export async function getFollowUpTasks(jobId: string) {
  return prisma.followUpTask.findMany({
    where: { job_id: jobId },
    orderBy: { created_at: 'desc' },
  });
}

/**
 * Deletes a follow-up task.
 * @param taskId - The follow-up task ID
 */
export async function deleteFollowUpTask(taskId: string) {
  return prisma.followUpTask.delete({
    where: { id: taskId },
  });
}

/**
 * Marks a follow-up task as completed.
 * @param taskId - The follow-up task ID
 */
export async function markFollowUpTaskCompleted(taskId: string) {
  return updateFollowUpTask(taskId, undefined, undefined, true);
}

/**
 * Marks a follow-up task as incomplete.
 * @param taskId - The follow-up task ID
 */
export async function markFollowUpTaskIncomplete(taskId: string) {
  return updateFollowUpTask(taskId, undefined, undefined, false);
}
