import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSupabaseUserFromRequest } from '@/lib/supabase';
import { parseProfileUpdatePayload } from '@/lib/profile/profile';
import { withErrorHandler } from '@/app/api/error-handler';
import { authError, validationError, notFoundError, databaseError, serviceError } from '@/lib/errors';
import { logger } from '@/lib/logger';

async function handlePatch(request: NextRequest) {
  let authResult: Awaited<ReturnType<typeof getSupabaseUserFromRequest>>;

  try {
    authResult = await getSupabaseUserFromRequest(request);
  } catch {
    throw serviceError('Supabase');
  }

  const { data, error } = authResult;

  if (error || !data.user) {
    throw authError('Unauthorized');
  }

  const body = await request.json().catch(() => null);
  const { payload, error: payloadError } = parseProfileUpdatePayload(body);

  if (!payload || payloadError) {
    throw validationError('Invalid profile update payload', { error: payloadError });
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
      throw notFoundError('User profile');
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
      throw databaseError('Failed to retrieve updated user profile');
    }

    logger.info('Profile updated successfully', { userId: data.user.id });

    return NextResponse.json(
      {
        ...updatedUser,
        Profile: latestProfile,
      },
      { status: 200 },
    );
  } catch (routeError) {
    if (routeError instanceof Error && 'statusCode' in routeError) {
      throw routeError;
    }
    throw databaseError('Failed to update profile', { error: String(routeError) });
  }
}

export const PATCH = withErrorHandler(handlePatch);
