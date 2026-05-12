import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSupabaseUserFromRequest } from '@/lib/supabase';
import { parseExperienceCreatePayload } from '@/lib/profile/experience';
import { withErrorHandler } from '@/app/api/error-handler';
import { authError, validationError, databaseError, serviceError } from '@/lib/errors';
import { logger } from '@/lib/logger';

async function handleGet(request: NextRequest) {
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

  try {
    const experiences = await prisma.experience.findMany({
      where: { userId: data.user.id },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });

    logger.info('Experiences retrieved successfully', { userId: data.user.id, count: experiences.length });

    return NextResponse.json(experiences, { status: 200 });
  } catch (routeError) {
    if (routeError instanceof Error && 'statusCode' in routeError) {
      throw routeError;
    }
    throw databaseError('Failed to fetch experiences', { error: String(routeError) });
  }
}

export const GET = withErrorHandler(handleGet);

async function handlePost(request: NextRequest) {
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
  const { payload, error: payloadError } = parseExperienceCreatePayload(body);

  if (!payload || payloadError) {
    throw validationError('Invalid experience payload', { error: payloadError });
  }

  try {
    const last = await prisma.experience.findFirst({
      where: { userId: data.user.id },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });
    const nextSortOrder = (last?.sortOrder ?? -1) + 1;

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
        sortOrder: nextSortOrder,
      },
    });

    logger.info('Experience created successfully', { userId: data.user.id, experienceId: experience.id });

    return NextResponse.json(experience, { status: 201 });
  } catch (routeError) {
    if (routeError instanceof Error && 'statusCode' in routeError) {
      throw routeError;
    }
    throw databaseError('Failed to create experience', { error: String(routeError) });
  }
}

export const POST = withErrorHandler(handlePost);
