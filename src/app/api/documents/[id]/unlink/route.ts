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

    const { jobId } = await request.json();
    if (typeof jobId !== 'string' || jobId.trim().length === 0) {
      return NextResponse.json(
        { error: 'jobId must be a non-empty string' },
        { status: 400 },
      );
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

    // Verify job ownership
    const job = await prisma.job.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    if (job.user_id !== session.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if this is a generated document (has job_id)
    if (document.job_id === jobId) {
      // Generated document - unlink via job_id field
      const updatedDocument = await prisma.document.update({
        where: { id },
        data: { job_id: null },
      });

      return NextResponse.json({ 
        document: updatedDocument,
        wasGenerated: true,
      });
    }

    // Uploaded document - remove from DocumentJob junction table
    const deletedLink = await prisma.documentJob.deleteMany({
      where: {
        documentId: id,
        jobId: jobId,
      },
    });

    if (deletedLink.count === 0) {
      return NextResponse.json(
        { error: 'Document is not linked to this job' },
        { status: 404 },
      );
    }

    // Fetch updated document with remaining linked jobs
    const updatedDocument = await prisma.document.findUnique({
      where: { id },
      include: {
        linkedJobs: true,
      },
    });

    return NextResponse.json({ 
      document: updatedDocument,
      wasGenerated: false,
    });
  } catch (error) {
    console.error('Error unlinking document:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 },
    );
  }
}
