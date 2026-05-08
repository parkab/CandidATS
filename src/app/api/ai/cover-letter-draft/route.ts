import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { generateWithGemini } from '@/lib/ai/gemini';
import type { CoverLetterData } from '@/lib/latex/types';
import { prisma } from '@/lib/prisma';

type JobInput = {
  title: string;
  company_name: string;
  location: string;
  job_description?: string | null;
};

function isJobInput(v: unknown): v is JobInput {
  if (!v || typeof v !== 'object') return false;
  const r = v as Record<string, unknown>;
  return (
    typeof r.title === 'string' &&
    typeof r.company_name === 'string' &&
    typeof r.location === 'string'
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

function fmtDate(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function fmtRange(start: Date, end: Date | null): string {
  return `${fmtDate(start)} -- ${end ? fmtDate(end) : 'Present'}`;
}

type CoverLetterUser = {
  firstName: string | null;
  lastName: string | null;
  email: string;
  Profile: {
    phone: string | null;
    location: string | null;
    linkedIn: string | null;
    bio: string | null;
  } | null;
  Experience: Array<{
    title: string;
    organization: string;
    startDate: Date;
    endDate: Date | null;
    description: string | null;
    accomplishments: string | null;
  }>;
  Skill: Array<{ name: string }>;
};

function todayFormatted(): string {
  return new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function buildCoverLetterPrompt(user: CoverLetterUser, job: JobInput): string {
  const lines: string[] = [];

  lines.push('CANDIDATE PROFILE');
  lines.push(
    `Name: ${[user.firstName, user.lastName].filter(Boolean).join(' ') || 'Not provided'}`,
  );
  lines.push(`Email: ${user.email}`);
  if (user.Profile?.phone) lines.push(`Phone: ${user.Profile.phone}`);
  if (user.Profile?.location) lines.push(`Location: ${user.Profile.location}`);
  if (user.Profile?.linkedIn) lines.push(`LinkedIn: ${user.Profile.linkedIn}`);
  if (user.Profile?.bio) lines.push(`Summary: ${user.Profile.bio}`);

  if (user.Experience.length > 0) {
    lines.push('');
    lines.push('EXPERIENCE');
    for (const exp of user.Experience) {
      lines.push(
        `${exp.title} at ${exp.organization} | ${fmtRange(exp.startDate, exp.endDate)}`,
      );
      if (exp.description) lines.push(exp.description);
      if (exp.accomplishments) lines.push(exp.accomplishments);
    }
  }

  if (user.Skill.length > 0) {
    lines.push('');
    lines.push(`SKILLS: ${user.Skill.map((s) => s.name).join(', ')}`);
  }

  lines.push('');
  lines.push('TARGET JOB');
  lines.push(`Title: ${job.title}`);
  lines.push(`Company: ${job.company_name}`);
  lines.push(`Location: ${job.location}`);
  if (job.job_description) lines.push(`Description: ${job.job_description}`);

  const schema = JSON.stringify(
    {
      header: {
        name: 'string',
        phone: 'string',
        email: 'string',
        linkedin: 'string (optional)',
        github: 'string (optional)',
      },
      date: `string formatted as "${todayFormatted()}"`,
      recipientName: 'string — use "Hiring Manager" if unknown',
      recipientTitle: 'string (optional)',
      company: 'string',
      role: 'string',
      paragraphs: [
        'Opening: express strong interest and state top qualification',
        'Body: connect 2–3 specific experiences to the job requirements',
        'Closing: summarize fit, express enthusiasm, request an interview',
      ],
      senderName: 'string — full name of the candidate',
    },
    null,
    2,
  );

  return `You are a professional cover letter writer. Using the candidate profile and target job below, generate a tailored cover letter as a single JSON object.

Return ONLY valid JSON with no code fences, no explanation, and no extra text. Match this exact schema:
${schema}

Rules:
- Write exactly 3 paragraphs totalling 300–400 words
- Reference specific aspects of the job description
- Highlight quantifiable achievements from the candidate's experience
- Keep paragraphs as plain text — no bullet points or line breaks within a paragraph
- Omit optional fields (recipientTitle, linkedin, github) if not available
- Use today's date: ${todayFormatted()}

${lines.join('\n')}`;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json().catch(() => null)) as {
      jobId?: unknown;
      jobData?: unknown;
    } | null;

    if (!body) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    let job: JobInput;

    if (typeof body.jobId === 'string' && body.jobId.length > 0) {
      const dbJob = await prisma.job.findFirst({
        where: { id: body.jobId, user_id: session.userId },
      });
      if (!dbJob) {
        return NextResponse.json({ error: 'Job not found' }, { status: 404 });
      }
      job = dbJob;
    } else if (body.jobData !== undefined) {
      if (!isJobInput(body.jobData)) {
        return NextResponse.json(
          { error: 'jobData must include title, company_name, and location' },
          { status: 400 },
        );
      }
      job = body.jobData;
    } else {
      return NextResponse.json(
        { error: 'Either jobId or jobData is required' },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: {
        Profile: true,
        Experience: { orderBy: { sortOrder: 'asc' } },
        Skill: { orderBy: { sortOrder: 'asc' } },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const prompt = buildCoverLetterPrompt(user, job);
    const rawResponse = await generateWithGemini(prompt);

    let parsed: unknown;
    try {
      parsed = parseJsonResponse(rawResponse);
    } catch {
      return NextResponse.json(
        { error: 'AI returned an invalid response — please retry' },
        { status: 502 },
      );
    }

    if (!isCoverLetterData(parsed)) {
      return NextResponse.json(
        {
          error:
            'AI response did not match the expected cover letter structure — please retry',
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      templateName: 'jakes-cover-letter' as const,
      structuredData: parsed,
    });
  } catch (error) {
    console.error('[cover-letter-draft] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
