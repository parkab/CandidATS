import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { APPLICATION_STATUS_COLOR } from '@/lib/jobs/status';
import { getSupabaseUserFromRequest } from '@/lib/supabase';
import {
  createInterviewScheduledEvent,
  createFollowUpCreatedEvent,
} from '@/lib/jobs/timeline';

type CreateJobBody = Record<string, unknown>;

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

export async function POST(request: Request) {
  let authResult: Awaited<ReturnType<typeof getSupabaseUserFromRequest>>;

  try {
    authResult = await getSupabaseUserFromRequest(request);
  } catch {
    return NextResponse.json(
      { error: 'Authentication service unavailable' },
      { status: 503 },
    );
  }

  const { data, error } = authResult;

  if (error || !data.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = data.user.id;

  const body = (await request.json().catch(() => null)) as CreateJobBody | null;

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
  const prepNotes = asOptionalString(body.prepNotes);
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
    const createdJob = await prisma.job.create({
      data: {
        user_id: userId,
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
        interview_prep_notes: prepNotes,
        custom_notes: otherNotes,
      },
    });

    // Handle timeline events from form data
    if (Array.isArray(body.timeline)) {
      for (const timelineItem of body.timeline as Array<
        Record<string, unknown>
      >) {
        const itemTitle = timelineItem.title;
        const itemDate = timelineItem.date;
        const itemNotes = timelineItem.notes;

        if (typeof itemTitle !== 'string' || !itemTitle.trim()) {
          continue; // Skip items without a title
        }

        // Use provided date or default to now if not provided or invalid
        let parsedDate = new Date();
        if (typeof itemDate === 'string' && itemDate.trim()) {
          const parsed = new Date(itemDate);
          if (!Number.isNaN(parsed.getTime())) {
            parsedDate = parsed;
          }
        }

        await prisma.timelineEvent.create({
          data: {
            job_id: createdJob.id,
            event_type: itemTitle.trim(),
            notes: typeof itemNotes === 'string' ? itemNotes.trim() : null,
            occurred_at: parsedDate,
          },
        });
      }
    }

    // Handle interviews from form data
    if (Array.isArray(body.interviews)) {
      for (const interviewItem of body.interviews as Array<
        Record<string, unknown>
      >) {
        const roundType = interviewItem.title;
        const scheduledDate = interviewItem.date;
        const notes = interviewItem.notes;

        // Require either round type or notes
        if (!roundType && !notes) {
          continue; // Skip items without round type or notes
        }

        const roundTypeValue =
          typeof roundType === 'string' ? roundType.trim() : '';

        // Use provided date or default to now if not provided or invalid
        let parsedDate = new Date();
        if (typeof scheduledDate === 'string' && scheduledDate.trim()) {
          const parsed = new Date(scheduledDate);
          if (!Number.isNaN(parsed.getTime())) {
            parsedDate = parsed;
          }
        }

        const createdInterview = await prisma.interview.create({
          data: {
            job_id: createdJob.id,
            round_type: roundTypeValue || 'Interview',
            scheduled_at: parsedDate,
            notes: typeof notes === 'string' ? notes.trim() : null,
          },
        });

        // Create timeline event for the new interview
        await createInterviewScheduledEvent(
          createdJob.id,
          createdInterview.id,
          roundTypeValue || 'Interview',
          parsedDate,
          typeof notes === 'string' ? notes.trim() : null,
        );
      }
    }

    // Handle follow-up tasks from form data
    if (Array.isArray(body.followUps)) {
      for (const followUpItem of body.followUps as Array<
        Record<string, unknown>
      >) {
        const title = followUpItem.title;
        const dueDate = followUpItem.date;
        const notes = followUpItem.notes;

        // Require title for follow-up tasks
        if (!title) {
          continue; // Skip items without a title
        }

        const titleValue = typeof title === 'string' ? title.trim() : '';
        // Require a non-empty string title for follow-up tasks
        if (titleValue.length === 0) {
          continue; // Skip items without a valid title
        }
        // Use provided date or default to null if not provided or invalid
        let parsedDate: Date | null = null;
        if (typeof dueDate === 'string' && dueDate.trim()) {
          const parsed = new Date(dueDate);
          if (!Number.isNaN(parsed.getTime())) {
            parsedDate = parsed;
          }
        }

        const notesValue = typeof notes === 'string' ? notes.trim() : null;

        const createdFollowUp = await prisma.followUpTask.create({
          data: {
            job_id: createdJob.id,
            title: titleValue,
            due_date: parsedDate,
            completed: false,
            notes: notesValue,
          },
        });

        // Create timeline event for the new follow-up
        await createFollowUpCreatedEvent(
          createdJob.id,
          createdFollowUp.id,
          titleValue,
          parsedDate,
        );
      }
    }

    return NextResponse.json(createdJob, { status: 201 });
  } catch (error) {
    console.error('Failed to create job:', error);

    return NextResponse.json(
      { error: 'Unable to create job right now.' },
      { status: 500 },
    );
  }
}
