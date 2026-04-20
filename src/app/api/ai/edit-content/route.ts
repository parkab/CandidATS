import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { generateWithGemini } from '@/lib/ai/gemini';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { content, action, context } = body;

    if (!content || !action) {
      return NextResponse.json(
        { error: 'Content and action are required' },
        { status: 400 },
      );
    }

    const validActions = ['rewrite', 'concise', 'detail', 'tone'];
    if (!validActions.includes(action)) {
      return NextResponse.json(
        {
          error:
            'Invalid action. Must be one of: rewrite, concise, detail, tone',
        },
        { status: 400 },
      );
    }

    // Build the prompt based on the action
    const prompt = buildEditPrompt(content, action, context);

    // Generate edited content with Gemini
    const editedContent = await generateWithGemini(prompt);

    return NextResponse.json({
      original: content,
      edited: editedContent,
      action,
    });
  } catch (error) {
    console.error('Error editing content:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to edit content', details: errorMessage },
      { status: 500 },
    );
  }
}

function buildEditPrompt(
  content: string,
  action: string,
  context?: string,
): string {
  const contextNote = context ? `\nContext: ${context}` : '';

  switch (action) {
    case 'rewrite':
      return `Please rewrite the following content while maintaining the same meaning and information. Use fresh language and different phrasing to make it more engaging and impactful.${contextNote}

Content to rewrite:
${content}

Return ONLY the rewritten content without any explanations or additional text.`;

    case 'concise':
      return `Please make the following content more concise and concisely worded. Remove unnecessary words and phrases while keeping all important information. Aim to reduce the length by 20-30%.${contextNote}

Content to make concise:
${content}

Return ONLY the concise version without any explanations or additional text.`;

    case 'detail':
      return `Please expand the following content with more details, examples, and specific information. Make it more comprehensive and detailed while maintaining professionalism.${contextNote}

Content to expand:
${content}

Return ONLY the expanded content without any explanations or additional text.`;

    case 'tone':
      return `Please adjust the tone of the following content to be more professional, confident, and impactful. Enhance the language to better demonstrate value and expertise.${contextNote}

Content to adjust:
${content}

Return ONLY the adjusted content without any explanations or additional text.`;

    default:
      return '';
  }
}
