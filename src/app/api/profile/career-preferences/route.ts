import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSupabaseUserFromRequest } from '@/lib/supabase';
import { parseCareerPreferencesUpdatePayload } from '@/lib/profile/careerPreferences';

export async function GET(request: Request) {
  let userId: string;
  try {
    const { data, error } = await getSupabaseUserFromRequest(request);
    if (error || !data?.user)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    userId = data.user.id;
  } catch {
    return NextResponse.json(
      { error: 'Auth service unavailable' },
      { status: 503 },
    );
  }

  try {
    const record = await prisma.careerPreferences.findUnique({
      where: { userId },
    });
    return NextResponse.json(record ?? null);
  } catch {
    return NextResponse.json(
      { error: 'Unable to process request.' },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  let userId: string;
  try {
    const { data, error } = await getSupabaseUserFromRequest(request);
    if (error || !data?.user)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    userId = data.user.id;
  } catch {
    return NextResponse.json(
      { error: 'Auth service unavailable' },
      { status: 503 },
    );
  }

  const rawBody = await request.json().catch(() => null);
  const { payload, error } = parseCareerPreferencesUpdatePayload(rawBody);
  if (!payload || error)
    return NextResponse.json(
      { error: error ?? 'Invalid payload' },
      { status: 400 },
    );

  try {
    const updated = await prisma.careerPreferences.upsert({
      where: { userId },
      update: payload,
      create: { userId, ...payload },
    });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json(
      { error: 'Unable to process request.' },
      { status: 500 },
    );
  }
}
