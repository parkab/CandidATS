import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSupabaseUserFromRequest } from '@/lib/supabase';
import { parseEducationCreatePayload } from '@/lib/profile/education';

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
    const education = await prisma.education.findMany({
      where: { userId: data.user.id },
      orderBy: [{ startDate: 'desc' }, { id: 'asc' }],
    });

    return NextResponse.json(education, { status: 200 });
  } catch (routeError) {
    console.error('Failed to fetch education', routeError);
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
  const { payload, error: payloadError } = parseEducationCreatePayload(body);

  if (!payload || payloadError) {
    return NextResponse.json(
      { error: payloadError ?? 'Invalid request.' },
      { status: 400 },
    );
  }

  try {
    const education = await prisma.education.create({
      data: {
        userId: data.user.id,
        institution: payload.institution,
        degree: payload.degree,
        fieldOfStudy: payload.fieldOfStudy,
        startDate: payload.startDate,
        endDate: payload.endDate,
        honors: payload.honors,
        gpa: payload.gpa,
      },
    });

    return NextResponse.json(education, { status: 201 });
  } catch (routeError) {
    console.error('Failed to create education', routeError);
    return NextResponse.json(
      { error: 'Unable to process request.' },
      { status: 500 },
    );
  }
}
