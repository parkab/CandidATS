import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify document ownership
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

    const linkedJobs: string[] = [];

    // If document has job_id set (generated document), include it
    if (document.job_id) {
      linkedJobs.push(document.job_id);
    }

    // Get jobs linked via DocumentJob junction table (uploaded documents)
    const documentJobLinks = await prisma.documentJob.findMany({
      where: { documentId: id },
      select: { jobId: true },
    });

    linkedJobs.push(...documentJobLinks.map((link) => link.jobId));

    // Fetch the actual job documents with full details
    const jobs = await prisma.job.findMany({
      where: {
        id: { in: linkedJobs },
        user_id: session.userId,
      },
      select: {
        id: true,
        title: true,
        company_name: true,
      },
    });

    return NextResponse.json({ 
      jobs,
      count: jobs.length,
    });
  } catch (error) {
    console.error('Error fetching linked jobs:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 },
    );
  }
}
