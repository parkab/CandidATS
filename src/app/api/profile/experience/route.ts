import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSupabaseUserFromRequest } from '@/lib/supabase';
import { parseExperienceCreatePayload } from '@/lib/profile/experience';

export async function GET(request: Request) {
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

  try {
    const experiences = await prisma.experience.findMany({
      where: { userId: data.user.id },
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json(experiences, { status: 200 });
  } catch (routeError) {
    console.error('Failed to fetch experiences', routeError);
    return NextResponse.json(
      { error: 'Unable to process request.' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
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

  const body = await request.json().catch(() => null);
  const { payload, error: payloadError } = parseExperienceCreatePayload(body);

  if (!payload || payloadError) {
    return NextResponse.json(
      { error: payloadError ?? 'Invalid request.' },
      { status: 400 },
    );
  }

  try {
    const experience = await prisma.experience.create({
      data: {
        userId: data.user.id,
        type: payload.type,
        title: payload.title,
        organization: payload.organization,
        role: payload.role,
        startDate: payload.startDate,
        endDate: payload.endDate,
        description: payload.description,
        accomplishments: payload.accomplishments,
        sortOrder: payload.sortOrder,
      },
    });

    return NextResponse.json(experience, { status: 201 });
  } catch (routeError) {
    console.error('Failed to create experience', routeError);
    return NextResponse.json(
      { error: 'Unable to process request.' },
      { status: 500 },
    );
  }
}
