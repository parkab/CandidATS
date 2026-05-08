/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { generateWithGemini } from '@/lib/ai/gemini';

export async function POST(request: NextRequest) {
  try {
    console.log('Company research draft API called');
    const session = await getSession();
    if (!session) {
      console.log('No session found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    console.log('Request body:', body);
    const { jobId, jobData, userContext } = body;

    let job: any;
    if (jobId) {
      // Fetch job from database
      job = await prisma.job.findFirst({
        where: {
          id: jobId,
          user_id: session.userId,
        },
      });

      if (!job) {
        return NextResponse.json({ error: 'Job not found' }, { status: 404 });
      }
    } else if (jobData) {
      // Use provided job data
      job = jobData;
    } else {
      return NextResponse.json(
        { error: 'Either jobId or jobData is required' },
        { status: 400 },
      );
    }

    // Fetch user profile data (for background context)
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: {
        Profile: true,
        CareerPreferences: true,
      },
    });

    if (!user) {
      console.log('User not found');
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    console.log('User data:', {
      hasProfile: !!user.Profile,
      hasCareerPreferences: !!user.CareerPreferences,
    });

    // Build the prompt
    console.log('Building company research prompt with job:', job);
    const prompt = buildCompanyResearchPrompt(user, job, userContext);
    console.log('Prompt length:', prompt.length);

    // Generate company research with Gemini using the research API key
    const generatedResearch = await generateWithGemini(
      prompt,
      'GEMINI_RESEARCH_KEY',
    );
    console.log(
      'Generated research:',
      generatedResearch.substring(0, 100) + '...',
    );

    return NextResponse.json({ research: generatedResearch });
  } catch (error) {
    console.error('Error generating company research:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to generate company research', details: errorMessage },
      { status: 500 },
    );
  }
}

function buildCompanyResearchPrompt(
  user: any,
  job: any,
  userContext?: string,
): string {
  const sections = [];

  // Job Information
  sections.push(`Job Target Information:
Position: ${job.title}
Company: ${job.company_name}
Location: ${job.location}
Job Description: ${job.job_description || 'Not provided'}`);

  // User's Career Context
  sections.push(`Candidate Background:
Name: ${user.firstName || ''} ${user.lastName || ''}
Current Location: ${user.Profile?.location || 'Not specified'}
Professional Headline: ${user.Profile?.headline || 'Not specified'}
Target Roles: ${user.CareerPreferences?.targetRoles || 'Not specified'}
Work Mode Preference: ${user.CareerPreferences?.workMode || 'Not specified'}`);

  // Determine if this is a focused or general research request
  const hasFocusedContext = userContext && userContext.trim().length > 0;

  if (hasFocusedContext) {
    sections.push(`Specific Research Questions & Topics:
${userContext}`);
  }

  const prompt = hasFocusedContext
    ? `You are an expert business research analyst. The candidate has specific questions about the company. Provide focused research that directly addresses their concerns.

${sections.join('\n\n')}

Research ONLY the topics the candidate asked about. Focus on specific, relevant information that answers their questions. Be concise and direct - provide only what they asked for, not everything about the company.

Format as clear sections with bullet points. Keep it brief and actionable.

IMPORTANT: Use PLAIN TEXT ONLY. Do NOT use any markdown formatting like asterisks, underscores, backticks, or any other special formatting characters. Write everything as regular text without decorative formatting.`
    : `You are an expert business research analyst. Provide a concise company overview that will help a job candidate prepare for an interview.

${sections.join('\n\n')}

Provide a brief but comprehensive overview including:

1. Quick Overview - What the company does, size, and market position
2. Key Business - Main products/services and revenue model  
3. Recent News - Latest developments, funding, or strategic moves
4. Culture - Work environment and team dynamics based on available info
5. Role Fit - How this position fits into the company's goals
6. Interview Tips - Key strengths to highlight and good questions to ask

Keep it concise - focus on what's most relevant for interview preparation. Avoid excessive details.

IMPORTANT: Use PLAIN TEXT ONLY. Do NOT use any markdown formatting like asterisks, underscores, backticks, or any other special formatting characters. Write everything as regular text without decorative formatting.`;

  return prompt;
}
