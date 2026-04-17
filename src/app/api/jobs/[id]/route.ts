import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { APPLICATION_STATUS_COLOR } from '@/lib/jobs/status';
import { getSupabaseUserFromRequest } from '@/lib/supabase';
import { createStageChangeEvent } from '@/lib/jobs/timeline';

type UpdateJobBody = Record<string, unknown>;

function asRequiredString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asOptionalString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asRequiredDate(value: unknown): Date | null {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function asOptionalDate(value: unknown): Date | null {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { data, error } = await getSupabaseUserFromRequest(request);

  if (error || !data.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sessionUserId = data.user.id;

  const { id } = await context.params;
  const jobId = asRequiredString(id);

  if (!jobId) {
    return NextResponse.json({ error: 'Job id is required' }, { status: 400 });
  }

  const body = (await request.json().catch(() => null)) as UpdateJobBody | null;

  if (!body || typeof body !== 'object') {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 },
    );
  }

  const title = asRequiredString(body.title);
  const company = asRequiredString(body.company);
  const location = asRequiredString(body.location);
  const stage = asRequiredString(body.stage);
  const lastActivityDate = asRequiredDate(body.lastActivityDate);
  const deadline = asOptionalDate(body.deadline);
  const priority = typeof body.priority === 'boolean' ? body.priority : null;
  const jobDescription = asOptionalString(body.jobDescription);
  const compensation = asOptionalString(body.compensation);
  const applicationDate = asOptionalDate(body.applicationDate);
  const recruiterNotes = asOptionalString(body.recruiterNotes);
  const otherNotes = asOptionalString(body.otherNotes);

  if (!title || !company || !location || !stage || !lastActivityDate) {
    return NextResponse.json(
      { error: 'Missing one or more required fields' },
      { status: 400 },
    );
  }

  if (!(stage in APPLICATION_STATUS_COLOR)) {
    return NextResponse.json({ error: 'Invalid stage value' }, { status: 400 });
  }

  if (body.deadline && !deadline) {
    return NextResponse.json(
      { error: 'Invalid deadline date' },
      { status: 400 },
    );
  }

  if (body.applicationDate && !applicationDate) {
    return NextResponse.json(
      { error: 'Invalid application date' },
      { status: 400 },
    );
  }

  try {
    const currentJob = await prisma.job.findFirst({
      where: {
        id: jobId,
        user_id: sessionUserId,
      },
    });

    if (!currentJob) {
      return NextResponse.json(
        { error: 'Job not found or access denied' },
        { status: 404 },
      );
    }

    const updateResult = await prisma.job.updateMany({
      where: {
        id: jobId,
        user_id: sessionUserId,
      },
      data: {
        title,
        company_name: company,
        location,
        pipeline_stage: stage,
        last_activity_date: lastActivityDate,
        deadline,
        priority_flag: priority,
        job_description: jobDescription,
        compensation_notes: compensation,
        application_date: applicationDate,
        recruiter_contact_notes: recruiterNotes,
        custom_notes: otherNotes,
      },
    });

    if (updateResult.count === 0) {
      return NextResponse.json(
        { error: 'Job not found or access denied' },
        { status: 404 },
      );
    }

    if (Array.isArray(body.timeline)) {
      const existingEvents = await prisma.timelineEvent.findMany({
        where: { job_id: jobId },
      });

      const existingEventIds = new Set(existingEvents.map((event) => event.id));
      const incomingEventIds = new Set<string>();

      for (const timelineItem of body.timeline as Array<
        Record<string, unknown>
      >) {
        const itemId = timelineItem.id;
        const itemTitle = timelineItem.title;
        const itemDate = timelineItem.date;
        const itemNotes = timelineItem.notes;

        // Validate: require either title or notes
        if (!itemTitle && !itemNotes) {
          continue; // Skip items without title or notes
        }

        const titleValue = typeof itemTitle === 'string' ? itemTitle.trim() : '';

        let parsedDate = new Date();
        if (typeof itemDate === 'string' && itemDate.trim()) {
          const parsed = new Date(itemDate);
          if (!Number.isNaN(parsed.getTime())) {
            parsedDate = parsed;
          }
        }

        if (itemId && typeof itemId === 'string' && existingEventIds.has(itemId)) {
          incomingEventIds.add(itemId);
          await prisma.timelineEvent.update({
            where: { id: itemId },
            data: {
              event_type: titleValue || 'Event',
              notes: typeof itemNotes === 'string' ? itemNotes.trim() : null,
              occurred_at: parsedDate,
            },
          });
        } else {
          // Create new event - use client-provided ID if valid, otherwise let Prisma generate
          const eventId = itemId && typeof itemId === 'string' && !existingEventIds.has(itemId) ? itemId : undefined;
          if (eventId) {
            incomingEventIds.add(eventId);
          }
          const createdEvent = await prisma.timelineEvent.create({
            data: {
              id: eventId,
              job_id: jobId,
              event_type: titleValue || 'Event',
              notes: typeof itemNotes === 'string' ? itemNotes.trim() : null,
              occurred_at: parsedDate,
            },
          });
          // Track the actual created ID for deletion tracking
          if (!eventId) {
            incomingEventIds.add(createdEvent.id);
          }
        }
      }

      const eventsToDelete = Array.from(existingEventIds).filter(
        (id) => !incomingEventIds.has(id),
      );
      for (const eventId of eventsToDelete) {
        await prisma.timelineEvent.delete({
          where: { id: eventId },
        });
      }
    }

    // Handle interviews similar to timeline events
    if (Array.isArray(body.interviews)) {
      const existingInterviews = await prisma.interview.findMany({
        where: { job_id: jobId },
      });

      const existingInterviewIds = new Set(existingInterviews.map((interview) => interview.id));
      const incomingInterviewIds = new Set<string>();

      for (const interviewItem of body.interviews as Array<
        Record<string, unknown>
      >) {
        const itemId = interviewItem.id;
        const roundType = interviewItem.title;
        const scheduledDate = interviewItem.date;
        const notes = interviewItem.notes;

        // Validate: require either round type or notes
        if (!roundType && !notes) {
          continue; // Skip items without round type or notes
        }

        const roundTypeValue = typeof roundType === 'string' ? roundType.trim() : '';

        let parsedDate = new Date();
        if (typeof scheduledDate === 'string' && scheduledDate.trim()) {
          const parsed = new Date(scheduledDate);
          if (!Number.isNaN(parsed.getTime())) {
            parsedDate = parsed;
          }
        }

        if (itemId && typeof itemId === 'string' && existingInterviewIds.has(itemId)) {
          incomingInterviewIds.add(itemId);
          await prisma.interview.update({
            where: { id: itemId },
            data: {
              round_type: roundTypeValue || 'Interview',
              scheduled_at: parsedDate,
              notes: typeof notes === 'string' ? notes.trim() : null,
            },
          });
        } else {
          // Create new interview
          const interviewId = itemId && typeof itemId === 'string' && !existingInterviewIds.has(itemId) ? itemId : undefined;
          if (interviewId) {
            incomingInterviewIds.add(interviewId);
          }
          const createdInterview = await prisma.interview.create({
            data: {
              id: interviewId,
              job_id: jobId,
              round_type: roundTypeValue || 'Interview',
              scheduled_at: parsedDate,
              notes: typeof notes === 'string' ? notes.trim() : null,
            },
          });
          // Track the actual created ID for deletion tracking
          if (!interviewId) {
            incomingInterviewIds.add(createdInterview.id);
          }
        }
      }

      const interviewsToDelete = Array.from(existingInterviewIds).filter(
        (id) => !incomingInterviewIds.has(id),
      );
      for (const interviewId of interviewsToDelete) {
        await prisma.interview.delete({
          where: { id: interviewId },
        });
      }
    }

    // Create stage change event AFTER timeline sync to avoid race conditions
    if (currentJob.pipeline_stage !== stage) {
      await createStageChangeEvent(jobId, currentJob.pipeline_stage, stage);
    }

    const updatedJob = await prisma.job.findFirst({
      where: {
        id: jobId,
        user_id: sessionUserId,
      },
    });

    if (!updatedJob) {
      return NextResponse.json(
        { error: 'Unable to load updated job.' },
        { status: 500 },
      );
    }

    return NextResponse.json(updatedJob, { status: 200 });
  } catch (error) {
    console.error('Failed to update job', error);

    return NextResponse.json(
      {
        error:
          'Unable to update job due to a server error. Please try again later.',
      },
      { status: 500 },
    );
  }
}
