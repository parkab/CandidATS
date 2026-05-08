import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { generateWithGemini } from '@/lib/ai/gemini';
import type { ResumeData } from '@/lib/latex/types';
import { prisma } from '@/lib/prisma';

// Minimal shape of job data accepted from the request body.
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

// Gemini may wrap JSON in ```json ... ``` fences — strip them first.
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

type ResumeUser = {
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
    role: string | null;
    startDate: Date;
    endDate: Date | null;
    description: string | null;
    accomplishments: string | null;
  }>;
  Education: Array<{
    institution: string;
    degree: string;
    fieldOfStudy: string;
    startDate: Date;
    endDate: Date | null;
    honors: string | null;
    gpa: string | null;
  }>;
  Skill: Array<{
    name: string;
    category: string | null;
    proficiencyLabel: string | null;
  }>;
};

function buildResumePrompt(user: ResumeUser, job: JobInput): string {
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
    lines.push('WORK EXPERIENCE');
    for (const exp of user.Experience) {
      lines.push(
        `${exp.title} at ${exp.organization} | ${fmtRange(exp.startDate, exp.endDate)}`,
      );
      if (exp.description) lines.push(exp.description);
      if (exp.accomplishments) lines.push(exp.accomplishments);
    }
  }

  if (user.Education.length > 0) {
    lines.push('');
    lines.push('EDUCATION');
    for (const edu of user.Education) {
      lines.push(
        `${edu.degree} in ${edu.fieldOfStudy} — ${edu.institution} | ${fmtRange(edu.startDate, edu.endDate)}`,
      );
      if (edu.honors) lines.push(`Honors: ${edu.honors}`);
      if (edu.gpa) lines.push(`GPA: ${edu.gpa}`);
    }
  }

  if (user.Skill.length > 0) {
    lines.push('');
    lines.push('SKILLS');
    lines.push(
      user.Skill.map(
        (s) =>
          `${s.name}${s.category ? ` (${s.category})` : ''}${s.proficiencyLabel ? ` — ${s.proficiencyLabel}` : ''}`,
      ).join(', '),
    );
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
      education: [
        {
          institution: 'string',
          location: 'string',
          degree: 'string e.g. "Bachelor of Science in Computer Science"',
          dates: 'string e.g. "Aug. 2020 -- May 2024"',
          gpa: 'string (optional)',
          honors: 'string (optional)',
        },
      ],
      experience: [
        {
          title: 'string',
          organization: 'string',
          location: 'string',
          dates: 'string e.g. "June 2022 -- Present"',
          bullets: ['Achievement-focused bullet using strong action verbs'],
        },
      ],
      projects: [
        {
          name: 'string',
          tech: 'comma-separated stack e.g. "Python, React, PostgreSQL"',
          dates: 'string',
          bullets: ['What you built and its impact'],
        },
      ],
      skills: {
        languages: 'string (optional)',
        frameworks: 'string (optional)',
        tools: 'string (optional)',
        libraries: 'string (optional)',
      },
    },
    null,
    2,
  );

  return `You are a professional resume writer. Using the candidate profile and target job below, generate tailored resume data as a single JSON object.

Return ONLY valid JSON with no code fences, no explanation, and no extra text. Match this exact schema:
${schema}

Rules:
- Tailor every experience bullet to highlight achievements relevant to the target job description
- Use strong action verbs and quantify results wherever the data supports it
- Keep bullets to one concise sentence each (15–20 words)
- Derive "projects" from project-type experiences in the profile; leave as [] if none
- Only include skills that appear in the profile
- Omit optional fields (linkedin, github, gpa, honors, libraries, etc.) if not available

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
        Education: { orderBy: { startDate: 'desc' } },
        Skill: { orderBy: { sortOrder: 'asc' } },
        CareerPreferences: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const prompt = buildResumePrompt(user, job);
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

    if (!isResumeData(parsed)) {
      return NextResponse.json(
        {
          error:
            'AI response did not match the expected resume structure — please retry',
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      templateName: 'jakes-resume' as const,
      structuredData: parsed,
    });
  } catch (error) {
    console.error('[resume-draft] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
