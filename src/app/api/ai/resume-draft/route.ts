/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { generateWithGemini } from '@/lib/ai/gemini';

export async function POST(request: NextRequest) {
  try {
    console.log('Resume draft API called');
    const session = await getSession();
    if (!session) {
      console.log('No session found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    console.log('Request body:', body);
    const { jobId, jobData } = body;

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

    // Fetch user profile data
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: {
        Profile: true,
        Experience: {
          orderBy: { sortOrder: 'asc' },
        },
        Education: {
          orderBy: { startDate: 'desc' },
        },
        Skill: {
          orderBy: { sortOrder: 'asc' },
        },
        CareerPreferences: true,
      },
    });

    if (!user) {
      console.log('User not found');
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    console.log('User data:', {
      hasProfile: !!user.Profile,
      experienceCount: user.Experience.length,
      educationCount: user.Education.length,
      skillsCount: user.Skill.length,
      hasCareerPreferences: !!user.CareerPreferences,
    });

    // Build the prompt
    console.log('Building prompt with job:', job);
    const prompt = buildResumePrompt(user, job);
    console.log('Prompt length:', prompt.length);

    // Generate resume with Gemini
    const generatedResume = await generateWithGemini(prompt);
    console.log('Generated resume:', generatedResume.substring(0, 100) + '...');

    return NextResponse.json({ resume: generatedResume });
  } catch (error) {
    console.error('Error generating resume:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to generate resume', details: errorMessage },
      { status: 500 },
    );
  }
}

function buildResumePrompt(user: any, job: any): string {
  const sections = [];

  // Personal Information
  sections.push(`Personal Information:
Name: ${user.firstName || ''} ${user.lastName || ''}
Email: ${user.email}
Phone: ${user.Profile?.phone || ''}
Location: ${user.Profile?.location || ''}
LinkedIn: ${user.Profile?.linkedIn || ''}
Headline: ${user.Profile?.headline || ''}`);

  // Professional Summary
  if (user.Profile?.bio) {
    sections.push(`Professional Summary:
${user.Profile.bio}`);
  }

  // Experience
  if (user.Experience.length > 0) {
    sections.push(`Work Experience:
${user.Experience.map(
  (exp: any) => `
${exp.title} at ${exp.organization}
${exp.role ? `Role: ${exp.role}` : ''}
${new Date(exp.startDate).toLocaleDateString()} - ${exp.endDate ? new Date(exp.endDate).toLocaleDateString() : 'Present'}
${exp.description || ''}
${exp.accomplishments || ''}`,
).join('\n')}`);
  }

  // Education
  if (user.Education.length > 0) {
    sections.push(`Education:
${user.Education.map(
  (edu: any) => `
${edu.degree} in ${edu.fieldOfStudy}
${edu.institution}
${new Date(edu.startDate).toLocaleDateString()} - ${edu.endDate ? new Date(edu.endDate).toLocaleDateString() : 'Present'}
${edu.honors ? `Honors: ${edu.honors}` : ''}
${edu.gpa ? `GPA: ${edu.gpa}` : ''}`,
).join('\n')}`);
  }

  // Skills
  if (user.Skill.length > 0) {
    sections.push(`Skills:
${user.Skill.map((skill: any) => `${skill.name}${skill.category ? ` (${skill.category})` : ''}${skill.proficiencyLabel ? ` - ${skill.proficiencyLabel}` : ''}`).join(', ')}`);
  }

  // Job Information
  sections.push(`Target Job:
Position: ${job.title}
Company: ${job.company_name}
Location: ${job.location}
Description: ${job.job_description || ''}`);

  // Career Preferences
  if (user.CareerPreferences) {
    sections.push(`Career Preferences:
Target Roles: ${user.CareerPreferences.targetRoles || ''}
Target Locations: ${user.CareerPreferences.targetLocations || ''}
Work Mode: ${user.CareerPreferences.workMode || ''}
Salary Preference: ${user.CareerPreferences.salaryPreference || ''}`);
  }

  const prompt = `Generate a professional resume tailored for the following job application. Use the provided profile information and customize the resume to highlight relevant experience, skills, and qualifications that match the job requirements.

${sections.join('\n\n')}

Please create a well-formatted resume that:
1. Is ATS-friendly with clear sections and keywords
2. Highlights achievements and quantifiable results
3. Tailors content to match the job description
4. Uses professional language and formatting
5. Keeps the resume to 1-2 pages worth of content

Format the resume with proper headings, bullet points, and consistent styling. Return ONLY the resume.`;

  return prompt;
}
