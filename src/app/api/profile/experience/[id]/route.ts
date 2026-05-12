import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSupabaseUserFromRequest } from '@/lib/supabase';
import { parseExperienceUpdatePayload } from '@/lib/profile/experience';
import { withErrorHandler } from '@/app/api/error-handler';
import { authError, validationError, notFoundError, databaseError, serviceError } from '@/lib/errors';
import { logger } from '@/lib/logger';

async function handlePatch(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
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

  const { id } = await context.params;
  if (!id) {
    throw validationError('Experience id is required');
  }

  const body = await request.json().catch(() => null);
  const { payload, error: payloadError } = parseExperienceUpdatePayload(body);

  if (!payload || payloadError) {
    throw validationError('Invalid experience update payload', { error: payloadError });
  }

  try {
    const updateResult = await prisma.experience.updateMany({
      where: { id, userId: data.user.id },
      data: payload,
    });

    if (updateResult.count === 0) {
      throw notFoundError('Experience');
    }

    const updated = await prisma.experience.findFirst({
      where: { id, userId: data.user.id },
    });

    if (!updated) {
      throw databaseError('Failed to retrieve updated experience');
    }

    logger.info('Experience updated successfully', { userId: data.user.id, experienceId: id });

    return NextResponse.json(updated, { status: 200 });
  } catch (routeError) {
    if (routeError instanceof Error && 'statusCode' in routeError) {
      throw routeError;
    }
    throw databaseError('Failed to update experience', { error: String(routeError) });
  }
}

export const PATCH = withErrorHandler(handlePatch as Parameters<typeof withErrorHandler>[0]);

async function handleDelete(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
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

  const { id } = await context.params;
  if (!id) {
    throw validationError('Experience id is required');
  }

  try {
    const deleteResult = await prisma.experience.deleteMany({
      where: { id, userId: data.user.id },
    });

    if (deleteResult.count === 0) {
      throw notFoundError('Experience');
    }

    logger.info('Experience deleted successfully', { userId: data.user.id, experienceId: id });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (routeError) {
    if (routeError instanceof Error && 'statusCode' in routeError) {
      throw routeError;
    }
    throw databaseError('Failed to delete experience', { error: String(routeError) });
  }
}

export const DELETE = withErrorHandler(handleDelete as Parameters<typeof withErrorHandler>[0]);
