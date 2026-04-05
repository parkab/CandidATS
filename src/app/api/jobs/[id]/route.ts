import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { APPLICATION_STATUS_COLOR } from '@/lib/jobs/status';

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
  const { id } = await context.params;
  const jobId = asRequiredString(id);

  if (!jobId) {
    return NextResponse.json({ error: 'Job id is required' }, { status: 400 });
  }

  const body = (await request.json().catch(() => null)) as UpdateJobBody | null;

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const userId = asRequiredString(body.userId);
  const title = asRequiredString(body.title);
  const company = asRequiredString(body.company);
  const location = asRequiredString(body.location);
  const stage = asRequiredString(body.stage);
  const lastActivityDate = asRequiredDate(body.lastActivityDate);
  const deadline = asOptionalDate(body.deadline);
  const priority = typeof body.priority === 'boolean' ? body.priority : null;
  const jobDescription = asRequiredString(body.jobDescription);
  const compensation = asOptionalString(body.compensation);
  const applicationDate = asRequiredDate(body.applicationDate);
  const recruiterNotes = asOptionalString(body.recruiterNotes);
  const otherNotes = asRequiredString(body.otherNotes);

  if (
    !userId ||
    !title ||
    !company ||
    !location ||
    !stage ||
    !lastActivityDate ||
    !jobDescription ||
    !applicationDate ||
    !otherNotes
  ) {
    return NextResponse.json(
      { error: 'Missing one or more required fields' },
      { status: 400 },
    );
  }

  if (!(stage in APPLICATION_STATUS_COLOR)) {
    return NextResponse.json({ error: 'Invalid stage value' }, { status: 400 });
  }

  if (body.deadline && !deadline) {
    return NextResponse.json({ error: 'Invalid deadline date' }, { status: 400 });
  }

  try {
    const updatedJob = await prisma.job.update({
      where: { id: jobId },
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
        custom_notes: otherNotes,
      },
    });

    return NextResponse.json(updatedJob, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: 'Unable to update job. Verify Job ID and try again.' },
      { status: 400 },
    );
  }
}