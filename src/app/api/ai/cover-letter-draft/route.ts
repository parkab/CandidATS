/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { generateWithGemini } from '@/lib/ai/gemini';

export async function POST(request: NextRequest) {
  try {
    console.log('Cover letter draft API called');
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
    const prompt = buildCoverLetterPrompt(user, job);
    console.log('Prompt length:', prompt.length);

    // Generate cover letter with Gemini
    const generatedCoverLetter = await generateWithGemini(prompt);
    console.log(
      'Generated cover letter:',
      generatedCoverLetter.substring(0, 100) + '...',
    );

    return NextResponse.json({ coverLetter: generatedCoverLetter });
  } catch (error) {
    console.error('Error generating cover letter:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to generate cover letter', details: errorMessage },
      { status: 500 },
    );
  }
}

function buildCoverLetterPrompt(user: any, job: any): string {
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

  const prompt = `Generate a professional cover letter tailored for the following job application. Use the provided profile information and customize the cover letter to highlight relevant experience, skills, and qualifications that match the job requirements.

${sections.join('\n\n')}

Please create a compelling cover letter that:
1. Is personalized and addresses the hiring manager by name if possible (use "Hiring Manager" if not specified)
2. References specific aspects of the job description and company
3. Highlights relevant achievements and quantifiable results from the candidate's experience
4. Explains why the candidate is interested in the role and company
5. Demonstrates knowledge of the company and industry
6. Uses professional language and formatting
7. Is concise (3-4 paragraphs, ideally 300-500 words)

Format the cover letter with proper business letter structure including:
- Header with contact information
- Date
- Employer's contact information
- Salutation
- Body paragraphs
- Closing

Return ONLY the cover letter.`;

  return prompt;
}
