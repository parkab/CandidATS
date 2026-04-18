import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { APPLICATION_STATUS_COLOR } from '@/lib/jobs/status';
import { getSupabaseUserFromRequest } from '@/lib/supabase';

type CreateJobBody = Record<string, unknown>;

function asRequiredString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asOptionalString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function asRequiredDate(value: unknown): Date | null {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function asOptionalDate(value: unknown): Date | undefined {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return undefined;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
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
        deadline: deadline ?? undefined,
        priority_flag: priority ?? undefined,
        job_description: jobDescription ?? undefined,
        compensation_notes: compensation ?? undefined,
        application_date: applicationDate ?? undefined,
        recruiter_contact_notes: recruiterNotes ?? undefined,
        custom_notes: otherNotes ?? undefined,
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

        const roundTypeValue = typeof roundType === 'string' ? roundType.trim() : '';

        // Use provided date or default to now if not provided or invalid
        let parsedDate = new Date();
        if (typeof scheduledDate === 'string' && scheduledDate.trim()) {
          const parsed = new Date(scheduledDate);
          if (!Number.isNaN(parsed.getTime())) {
            parsedDate = parsed;
          }
        }

        await prisma.interview.create({
          data: {
            job_id: createdJob.id,
            round_type: roundTypeValue || 'Interview',
            scheduled_at: parsedDate,
            notes: typeof notes === 'string' ? notes.trim() : null,
          },
        });
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
