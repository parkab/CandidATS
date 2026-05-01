import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { compileLatex } from '@/lib/latex/compile';
import {
  isSupportedTemplate,
  renderTemplate,
  documentTypeFromTemplate,
  type TemplateName,
} from '@/lib/latex/render';
import { prisma } from '@/lib/prisma';
import { uploadPdf } from '@/lib/storage/pdf';

type SaveVersionBody = {
  templateName?: unknown;
  structuredData?: unknown;
  changeNotes?: unknown;
};

export async function GET(
  _request: Request,
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

    const version = await prisma.documentVersion.findFirst({
      where: { documentId },
      orderBy: { versionNumber: 'desc' },
    });

    return NextResponse.json({ version: version ?? null });
  } catch (error) {
    console.error('[version GET] unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function PATCH(
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

    const body = (await request.json().catch(() => null)) as SaveVersionBody | null;

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

    const templateName = body.templateName as TemplateName;
    const changeNotes =
      typeof body.changeNotes === 'string' ? body.changeNotes : null;

    let latexSource: string;
    try {
      latexSource = renderTemplate(templateName, body.structuredData);
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

    const pdfPath = await uploadPdf({
      userId: session.userId,
      buffer: pdfBuffer,
      type: documentTypeFromTemplate(templateName),
    });

    const latestVersion = await prisma.documentVersion.findFirst({
      where: { documentId },
      orderBy: { versionNumber: 'desc' },
    });

    let savedVersion;
    if (latestVersion) {
      savedVersion = await prisma.documentVersion.update({
        where: { id: latestVersion.id },
        data: {
          structuredData: body.structuredData,
          latexSource,
          pdfUrl: pdfPath,
          changeNotes,
        },
      });
    } else {
      savedVersion = await prisma.documentVersion.create({
        data: {
          documentId,
          versionNumber: 1,
          templateName,
          structuredData: body.structuredData,
          latexSource,
          pdfUrl: pdfPath,
          changeNotes,
        },
      });
    }

    return NextResponse.json({ version: savedVersion });
  } catch (error) {
    console.error('[version PATCH] unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
