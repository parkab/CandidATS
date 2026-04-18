import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSupabaseUserFromRequest } from '@/lib/supabase';

type CreateTimelineEventBody = Record<string, unknown>;

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

function asOptionalDate(value: unknown): Date | null {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export async function GET(
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

  try {
    // Verify job ownership
    const job = await prisma.job.findUnique({
      where: { id: jobId },
    });

    if (!job || job.user_id !== sessionUserId) {
      return NextResponse.json(
        { error: 'Job not found or access denied' },
        { status: 404 },
      );
    }

    // Fetch timeline events ordered chronologically (most recent first)
    const timelineEvents = await prisma.timelineEvent.findMany({
      where: { job_id: jobId },
      orderBy: { occurred_at: 'desc' },
    });

    return NextResponse.json(timelineEvents, { status: 200 });
  } catch (error) {
    console.error('Failed to fetch timeline events', error);

    return NextResponse.json(
      {
        error:
          'Unable to fetch timeline events due to a server error. Please try again later.',
      },
      { status: 500 },
    );
  }
}

export async function POST(
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

  const body = (await request.json().catch(() => null)) as CreateTimelineEventBody | null;

  if (!body || typeof body !== 'object') {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 },
    );
  }

  const eventType = asRequiredString(body.event_type);
  const notes = asOptionalString(body.notes);
  const occurredAt = asOptionalDate(body.occurred_at);

  if (!eventType) {
    return NextResponse.json(
      { error: 'event_type is required' },
      { status: 400 },
    );
  }

  try {
    // Verify job ownership
    const job = await prisma.job.findUnique({
      where: { id: jobId },
    });

    if (!job || job.user_id !== sessionUserId) {
      return NextResponse.json(
        { error: 'Job not found or access denied' },
        { status: 404 },
      );
    }

    // Create timeline event
    const timelineEvent = await prisma.timelineEvent.create({
      data: {
        job_id: jobId,
        event_type: eventType,
        notes,
        occurred_at: occurredAt || new Date(),
      },
    });

    return NextResponse.json(timelineEvent, { status: 201 });
  } catch (error) {
    console.error('Failed to create timeline event', error);

    return NextResponse.json(
      {
        error:
          'Unable to create timeline event due to a server error. Please try again later.',
      },
      { status: 500 },
    );
  }
}
