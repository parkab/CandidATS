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
      { error: 'Unable to process request.' },
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
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
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
      return NextResponse.json(
        { error: 'Unable to update profile.' },
        { status: 404 },
      );
    }

    const existingProfile = await prisma.profile.findFirst({
      where: { userId: data.user.id },
      select: { id: true },
    });

    if (existingProfile) {
      await prisma.profile.updateMany({
        where: { id: existingProfile.id },
        data: {
          phone: payload.phone,
          location: payload.location,
          linkedIn: payload.linkedIn,
          headline: payload.headline,
          bio: payload.bio,
        },
      });
    } else {
      await prisma.profile.createMany({
        data: [
          {
            userId: data.user.id,
            phone: payload.phone,
            location: payload.location,
            linkedIn: payload.linkedIn,
            headline: payload.headline,
            bio: payload.bio,
          },
        ],
      });
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

    const latestProfile = await prisma.profile.findFirst({
      where: { userId: data.user.id },
      select: {
        phone: true,
        location: true,
        linkedIn: true,
        headline: true,
        bio: true,
      },
    });

    if (!updatedUser) {
      return NextResponse.json(
        { error: 'Unable to process request.' },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        ...updatedUser,
        Profile: latestProfile,
      },
      { status: 200 },
    );
  } catch (routeError) {
    console.error('Failed to update profile', routeError);
    return NextResponse.json(
      { error: 'Unable to process request.' },
      { status: 500 },
    );
  }
}
