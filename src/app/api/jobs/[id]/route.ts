import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { APPLICATION_STATUS_COLOR } from '@/lib/jobs/status';
import { getSupabaseUserFromRequest } from '@/lib/supabase';

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
