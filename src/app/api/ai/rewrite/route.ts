import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { generateWithGemini } from '@/lib/ai/gemini';
import { prisma } from '@/lib/prisma';
import type { ResumeData, CoverLetterData } from '@/lib/latex/types';

function isResumeData(v: unknown): v is ResumeData {
  if (!v || typeof v !== 'object') return false;
  const r = v as Record<string, unknown>;
  return (
    typeof r.header === 'object' &&
    r.header !== null &&
    Array.isArray(r.education) &&
    Array.isArray(r.experience) &&
    Array.isArray(r.projects) &&
    typeof r.skills === 'object' &&
    r.skills !== null
  );
}

function isCoverLetterData(v: unknown): v is CoverLetterData {
  if (!v || typeof v !== 'object') return false;
  const r = v as Record<string, unknown>;
  return (
    typeof r.header === 'object' &&
    r.header !== null &&
    typeof r.date === 'string' &&
    typeof r.company === 'string' &&
    Array.isArray(r.paragraphs) &&
    typeof r.senderName === 'string'
  );
}

function parseJsonResponse(text: string): unknown {
  const stripped = text
    .replace(/^```(?:json)?\s*/m, '')
    .replace(/\s*```\s*$/m, '')
    .trim();
  try {
    return JSON.parse(stripped);
  } catch {
    const match = /\{[\s\S]*\}/.exec(stripped);
    if (match) return JSON.parse(match[0]);
    throw new Error('No valid JSON in AI response');
  }
}

const DETAIL_LABELS = [
  'very concise — brief bullets with minimal words',
  'concise — tight sentences, efficient use of space',
  'balanced — standard length and detail',
  'detailed — expand bullets with more context and specifics',
  'highly detailed — comprehensive and fully expanded',
];

const PROFESSIONALISM_LABELS = [
  'casual — conversational and approachable tone',
  'slightly informal — friendly and warm tone',
  'professional — standard business tone',
  'formal — polished, precise, and refined',
  'executive — highly formal, sophisticated, and authoritative',
];

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json().catch(() => null)) as {
      documentId?: unknown;
      templateName?: unknown;
      structuredData?: unknown;
      detailLevel?: unknown;
      professionalismLevel?: unknown;
    } | null;

    if (!body) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { documentId, templateName, structuredData, detailLevel, professionalismLevel } = body;

    if (typeof documentId !== 'string' || documentId.trim().length === 0) {
      return NextResponse.json({ error: 'documentId is required' }, { status: 400 });
    }
    if (templateName !== 'jakes-resume' && templateName !== 'jakes-cover-letter') {
      return NextResponse.json(
        { error: 'templateName must be jakes-resume or jakes-cover-letter' },
        { status: 400 },
      );
    }
    if (structuredData === null || structuredData === undefined) {
      return NextResponse.json({ error: 'structuredData is required' }, { status: 400 });
    }

    const detail = typeof detailLevel === 'number' ? Math.min(Math.max(Math.round(detailLevel), 1), 5) : 3;
    const professionalism =
      typeof professionalismLevel === 'number'
        ? Math.min(Math.max(Math.round(professionalismLevel), 1), 5)
        : 3;

    const doc = await prisma.document.findFirst({
      where: { id: documentId, user_id: session.userId },
      select: { id: true },
    });
    if (!doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const docTypeLabel = templateName === 'jakes-resume' ? 'resume' : 'cover letter';
    const schemaNote =
      templateName === 'jakes-resume'
        ? 'Return the same JSON schema: { header, education[], experience[], projects[], skills }.'
        : 'Return the same JSON schema: { header, date, company, role, recipientName, recipientTitle, paragraphs[], senderName }.';

    const prompt = `You are a professional document editor. Rewrite the following ${docTypeLabel} data with these style adjustments:

Detail level: ${detail}/5 — ${DETAIL_LABELS[detail - 1]}
Professionalism level: ${professionalism}/5 — ${PROFESSIONALISM_LABELS[professionalism - 1]}

${schemaNote} Keep all factual information accurate — only change the phrasing, length, and tone. Return ONLY valid JSON with no explanation or code fences.

Current data:
${JSON.stringify(structuredData, null, 2)}`;

    const raw = await generateWithGemini(prompt);

    let parsed: unknown;
    try {
      parsed = parseJsonResponse(raw);
    } catch {
      return NextResponse.json(
        { error: 'AI returned an invalid response — please retry' },
        { status: 502 },
      );
    }

    if (templateName === 'jakes-resume' && !isResumeData(parsed)) {
      return NextResponse.json(
        { error: 'AI response did not match the expected resume structure — please retry' },
        { status: 502 },
      );
    }
    if (templateName === 'jakes-cover-letter' && !isCoverLetterData(parsed)) {
      return NextResponse.json(
        { error: 'AI response did not match the expected cover letter structure — please retry' },
        { status: 502 },
      );
    }

    return NextResponse.json({ structuredData: parsed });
  } catch (error) {
    console.error('[rewrite] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
