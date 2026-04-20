import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { jobId, title, content, type } = body;

    if (!jobId || !title || !content || !type) {
      return NextResponse.json(
        { error: 'jobId, title, content, and type are required' },
        { status: 400 },
      );
    }

    if (!['resume', 'cover_letter'].includes(type)) {
      return NextResponse.json(
        { error: 'Type must be either "resume" or "cover_letter"' },
        { status: 400 },
      );
    }

    // Verify the job belongs to the user
    const job = await prisma.job.findFirst({
      where: {
        id: jobId,
        user_id: session.userId,
      },
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Create the document
    const document = await prisma.document.create({
      data: {
        user_id: session.userId,
        job_id: jobId,
        title,
        content,
        type,
      },
    });

    return NextResponse.json({ document });
  } catch (error) {
    console.error('Error creating document:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to create document', details: errorMessage },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');

    if (!jobId) {
      return NextResponse.json(
        { error: 'jobId query parameter is required' },
        { status: 400 },
      );
    }

    // Verify the job belongs to the user
    const job = await prisma.job.findFirst({
      where: {
        id: jobId,
        user_id: session.userId,
      },
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Get all documents for this job
    const documents = await prisma.document.findMany({
      where: {
        job_id: jobId,
        user_id: session.userId,
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    return NextResponse.json({ documents });
  } catch (error) {
    console.error('Error fetching documents:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch documents', details: errorMessage },
      { status: 500 },
    );
  }
}
