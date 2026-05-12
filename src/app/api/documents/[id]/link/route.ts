import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { jobId, jobIds } = body;

    // Support both single jobId and array of jobIds for backwards compatibility
    let jobIdsToLink: string[] = [];
    
    if (jobIds && Array.isArray(jobIds)) {
      jobIdsToLink = jobIds.filter((id): id is string => typeof id === 'string' && id.trim().length > 0);
    } else if (jobId && typeof jobId === 'string' && jobId.trim().length > 0) {
      jobIdsToLink = [jobId];
    }

    if (jobIdsToLink.length === 0) {
      return NextResponse.json(
        { error: 'Either jobId or jobIds array must be provided with non-empty values' },
        { status: 400 },
      );
    }

    // Verify document ownership and get document details
    const document = await prisma.document.findUnique({
      where: { id },
    });

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 },
      );
    }

    if (document.user_id !== session.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Verify all jobs exist and belong to user
    const jobs = await prisma.job.findMany({
      where: {
        id: { in: jobIdsToLink },
        user_id: session.userId,
      },
      select: { id: true },
    });

    if (jobs.length !== jobIdsToLink.length) {
      return NextResponse.json(
        { error: 'One or more jobs not found or do not belong to user' },
        { status: 404 },
      );
    }

    // For generated documents (those with job_id set), only allow one link via job_id
    // For uploaded documents, use the DocumentJob junction table for multiple links
    if (document.job_id) {
      // Generated document - already linked via job_id, cannot add more links via junction table
      return NextResponse.json(
        { error: 'Generated documents can only be linked to one job' },
        { status: 400 },
      );
    }

    // Create links in DocumentJob junction table
    const createdLinks = await Promise.all(
      jobIdsToLink.map((jobIdToLink) =>
        prisma.documentJob.upsert({
          where: {
            documentId_jobId: {
              documentId: id,
              jobId: jobIdToLink,
            },
          },
          update: {}, // If already exists, do nothing
          create: {
            documentId: id,
            jobId: jobIdToLink,
          },
        }),
      ),
    );

    // Fetch updated document with linked jobs
    const updatedDocument = await prisma.document.findUnique({
      where: { id },
      include: {
        linkedJobs: true,
      },
    });

    return NextResponse.json({ 
      document: updatedDocument,
      linkedJobsCount: createdLinks.length,
    });
  } catch (error) {
    console.error('Error linking document:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 },
    );
  }
}
