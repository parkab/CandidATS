import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSupabaseUserFromRequest } from '@/lib/supabase';
import { extractIdMarker } from '@/lib/utils/timelineNotes';

function asRequiredString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string; eventId: string }> },
) {
  const { data, error } = await getSupabaseUserFromRequest(request);

  if (error || !data.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sessionUserId = data.user.id;
  const { id, eventId } = await context.params;
  const jobId = asRequiredString(id);
  const timelineEventId = asRequiredString(eventId);

  if (!jobId || !timelineEventId) {
    return NextResponse.json(
      { error: 'Job id and event id are required' },
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

    // Find the timeline event
    const timelineEvent = await prisma.timelineEvent.findUnique({
      where: { id: timelineEventId },
    });

    if (!timelineEvent || timelineEvent.job_id !== jobId) {
      return NextResponse.json(
        { error: 'Timeline event not found or does not belong to this job' },
        { status: 404 },
      );
    }

    // Check if this is an auto-generated event (has ID marker)
    const idMarker = extractIdMarker(timelineEvent.notes);
    if (idMarker) {
      // Auto-generated events cannot be deleted directly
      return NextResponse.json(
        { error: 'Cannot delete auto-generated timeline events. Delete the source interview or follow-up instead.' },
        { status: 403 },
      );
    }

    // Delete the timeline event
    await prisma.timelineEvent.delete({
      where: { id: timelineEventId },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Failed to delete timeline event', error);

    return NextResponse.json(
      {
        error:
          'Unable to delete timeline event due to a server error. Please try again later.',
      },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string; eventId: string }> },
) {
  const { data, error } = await getSupabaseUserFromRequest(request);

  if (error || !data.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sessionUserId = data.user.id;
  const { id, eventId } = await context.params;
  const jobId = asRequiredString(id);
  const timelineEventId = asRequiredString(eventId);

  if (!jobId || !timelineEventId) {
    return NextResponse.json(
      { error: 'Job id and event id are required' },
      { status: 400 },
    );
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;

  if (!body || typeof body !== 'object') {
    return NextResponse.json(
      { error: 'Invalid request body' },
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

    // Find the timeline event
    const timelineEvent = await prisma.timelineEvent.findUnique({
      where: { id: timelineEventId },
    });

    if (!timelineEvent || timelineEvent.job_id !== jobId) {
      return NextResponse.json(
        { error: 'Timeline event not found or does not belong to this job' },
        { status: 404 },
      );
    }

    // Check if this is an auto-generated event (has ID marker)
    const idMarker = extractIdMarker(timelineEvent.notes);
    if (idMarker) {
      // Auto-generated events cannot be edited directly
      return NextResponse.json(
        { error: 'Cannot edit auto-generated timeline events. Edit the source interview or follow-up instead.' },
        { status: 403 },
      );
    }

    // Update the timeline event
    const eventType = body.event_type;
    const notes = body.notes;
    const occurredAt = body.occurred_at;

    const updatedEvent = await prisma.timelineEvent.update({
      where: { id: timelineEventId },
      data: {
        ...(typeof eventType === 'string' && eventType.trim() && { event_type: eventType.trim() }),
        ...(typeof notes === 'string' && notes.trim() && { notes: notes.trim() }),
        ...(typeof notes === 'string' && !notes.trim() && { notes: null }),
        ...((occurredAt instanceof Date || (typeof occurredAt === 'string' && !Number.isNaN(new Date(occurredAt).getTime()))) && { occurred_at: new Date(occurredAt) }),
      },
    });

    return NextResponse.json(updatedEvent, { status: 200 });
  } catch (error) {
    console.error('Failed to update timeline event', error);

    return NextResponse.json(
      {
        error:
          'Unable to update timeline event due to a server error. Please try again later.',
      },
      { status: 500 },
    );
  }
}

