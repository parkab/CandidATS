import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSupabaseUserFromRequest } from '@/lib/supabase';
import { parseExperienceUpdatePayload } from '@/lib/profile/experience';

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  let authResult: Awaited<ReturnType<typeof getSupabaseUserFromRequest>>;
  try {
    authResult = await getSupabaseUserFromRequest(request);
  } catch {
    return NextResponse.json(
      { error: 'Unable to process request.' },
      { status: 503 },
    );
  }

  const { data, error } = authResult;

  if (error || !data.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json(
      { error: 'Experience id is required' },
      { status: 400 },
    );
  }

  const body = await request.json().catch(() => null);
  const { payload, error: payloadError } = parseExperienceUpdatePayload(body);

  if (!payload || payloadError) {
    return NextResponse.json(
      { error: payloadError ?? 'Invalid request.' },
      { status: 400 },
    );
  }

  try {
    const updateResult = await prisma.experience.updateMany({
      where: { id, userId: data.user.id },
      data: payload,
    });

    if (updateResult.count === 0) {
      return NextResponse.json(
        { error: 'Experience not found or access denied' },
        { status: 404 },
      );
    }

    const updated = await prisma.experience.findFirst({
      where: { id, userId: data.user.id },
    });

    if (!updated) {
      return NextResponse.json(
        { error: 'Unable to process request.' },
        { status: 500 },
      );
    }

    return NextResponse.json(updated, { status: 200 });
  } catch (routeError) {
    console.error('Failed to update experience', routeError);
    return NextResponse.json(
      { error: 'Unable to process request.' },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  let authResult: Awaited<ReturnType<typeof getSupabaseUserFromRequest>>;
  try {
    authResult = await getSupabaseUserFromRequest(request);
  } catch {
    return NextResponse.json(
      { error: 'Unable to process request.' },
      { status: 503 },
    );
  }

  const { data, error } = authResult;

  if (error || !data.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json(
      { error: 'Experience id is required' },
      { status: 400 },
    );
  }

  try {
    const deleteResult = await prisma.experience.deleteMany({
      where: { id, userId: data.user.id },
    });

    if (deleteResult.count === 0) {
      return NextResponse.json(
        { error: 'Experience not found or access denied' },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (routeError) {
    console.error('Failed to delete experience', routeError);
    return NextResponse.json(
      { error: 'Unable to process request.' },
      { status: 500 },
    );
  }
}
