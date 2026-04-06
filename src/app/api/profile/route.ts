import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSupabaseUserFromRequest } from '@/lib/supabase';
import { parseProfileUpdatePayload } from '@/lib/profile/profile';

export async function PATCH(request: Request) {
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

  const body = await request.json().catch(() => null);
  const { payload, error: payloadError } = parseProfileUpdatePayload(body);

  if (!payload || payloadError) {
    return NextResponse.json(
      { error: payloadError ?? 'Invalid request payload' },
      { status: 400 },
    );
  }

  try {
    const updateResult = await prisma.user.updateMany({
      where: {
        id: data.user.id,
      },
      data: {
        firstName: payload.firstName,
        lastName: payload.lastName,
        updatedAt: new Date(),
      },
    });

    if (updateResult.count === 0) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const updatedUser = await prisma.user.findUnique({
      where: {
        id: data.user.id,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        updatedAt: true,
      },
    });

    if (!updatedUser) {
      return NextResponse.json(
        { error: 'Unable to load updated profile' },
        { status: 500 },
      );
    }

    return NextResponse.json(updatedUser, { status: 200 });
  } catch (routeError) {
    console.error('Failed to update profile', routeError);

    return NextResponse.json(
      { error: 'Unable to update profile right now.' },
      { status: 500 },
    );
  }
}
