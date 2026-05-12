import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const includeJob = searchParams.get('includeJob') === 'true';

    const documents = await prisma.document.findMany({
      where: {
        user_id: session.userId,
      },
      orderBy: {
        created_at: 'desc',
      },
      include: {
        DocumentVersion: {
          orderBy: { versionNumber: 'desc' },
          take: 1,
          select: { versionNumber: true },
        },
        ...(includeJob
          ? {
              Job: {
                select: {
                  id: true,
                  title: true,
                  company_name: true,
                },
              },
            }
          : {}),
      },
    });

    const documentsWithVersion = documents.map(({ DocumentVersion, ...rest }) => ({
      ...rest,
      versionNumber: DocumentVersion[0]?.versionNumber ?? 1,
    }));

    return NextResponse.json({ documents: documentsWithVersion });
  } catch (error) {
    console.error('Error fetching all documents:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch documents', details: errorMessage },
      { status: 500 },
    );
  }
}
