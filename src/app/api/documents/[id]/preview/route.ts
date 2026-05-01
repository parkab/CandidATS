import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { compileLatex } from '@/lib/latex/compile';
import {
  isSupportedTemplate,
  renderTemplate,
  type TemplateName,
} from '@/lib/latex/render';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: documentId } = await context.params;

    const document = await prisma.document.findFirst({
      where: { id: documentId, user_id: session.userId },
      select: { id: true },
    });

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 },
      );
    }

    const body = (await request.json().catch(() => null)) as {
      templateName?: unknown;
      structuredData?: unknown;
    } | null;

    if (!body) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 },
      );
    }

    if (!isSupportedTemplate(body.templateName)) {
      return NextResponse.json(
        {
          error:
            'templateName must be one of: jakes-resume, jakes-cover-letter',
        },
        { status: 400 },
      );
    }

    if (body.structuredData === null || body.structuredData === undefined) {
      return NextResponse.json(
        { error: 'structuredData is required' },
        { status: 400 },
      );
    }

    let latexSource: string;
    try {
      latexSource = renderTemplate(
        body.templateName as TemplateName,
        body.structuredData,
      );
    } catch (err) {
      const detail = err instanceof Error ? err.message : 'Render error';
      return NextResponse.json(
        { error: `Template render failed: ${detail}` },
        { status: 422 },
      );
    }

    let pdfBuffer: Buffer;
    try {
      pdfBuffer = await compileLatex(latexSource);
    } catch (err) {
      const detail = err instanceof Error ? err.message : 'Compile error';
      return NextResponse.json(
        { error: `PDF compilation failed: ${detail}` },
        { status: 502 },
      );
    }

    return new Response(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Length': String(pdfBuffer.length),
        'Content-Disposition': 'inline; filename="preview.pdf"',
      },
    });
  } catch (error) {
    console.error('[preview] unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
