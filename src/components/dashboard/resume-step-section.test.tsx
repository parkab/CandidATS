import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ResumeStepSection from '@/components/dashboard/resume-step-section';
import type { JobResumeDraft } from '@/lib/jobs/multi-step-form';

// Mock the comparison modal
jest.mock('@/components/dashboard/edit-comparison-modal', () => {
  return function MockModal({
    isOpen,
    onAccept,
    onReject,
  }: {
    isOpen: boolean;
    onAccept: (content: string) => void;
    onReject: () => void;
  }) {
    if (!isOpen) return null;
    return (
      <div data-testid="mock-comparison-modal">
        <button onClick={() => onAccept('edited content')}>Accept</button>
        <button onClick={() => onReject()}>Reject</button>
      </div>
    );
  };
});

const mockResume: JobResumeDraft = {
  content: 'Sample resume content with work experience and skills.',
  isGenerating: false,
};

const mockJobData = {
  title: 'Software Engineer',
  company_name: 'Google',
  location: 'San Francisco, CA',
  job_description: 'We are looking for a talented engineer...',
};

describe('ResumeStepSection', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
    jest.clearAllMocks();
  });

  it('renders resume section with generate button', () => {
    render(
      <ResumeStepSection
        resume={mockResume}
        jobData={mockJobData}
        onResumeChange={jest.fn()}
      />,
    );

    expect(screen.getByText('AI-Generated Resume')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Generate Resume/i }),
    ).toBeInTheDocument();
  });

  it('displays edit action buttons when content is present', () => {
    render(
      <ResumeStepSection
        resume={mockResume}
        jobData={mockJobData}
        onResumeChange={jest.fn()}
      />,
    );

    expect(screen.getByText('✏️ Rewrite')).toBeInTheDocument();
    expect(screen.getByText('📉 Concise')).toBeInTheDocument();
    expect(screen.getByText('📈 Detail')).toBeInTheDocument();
    expect(screen.getByText('🎯 Tone')).toBeInTheDocument();
  });

  it('does not display edit action buttons when content is empty', () => {
    const emptyResume: JobResumeDraft = { content: '', isGenerating: false };
    render(
      <ResumeStepSection
        resume={emptyResume}
        jobData={mockJobData}
        onResumeChange={jest.fn()}
      />,
    );

    expect(screen.queryByText('✏️ Rewrite')).not.toBeInTheDocument();
  });

  it('shows loading state during resume generation', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        resume: 'Generated resume content',
      }),
    });

    const onResumeChange = jest.fn();
    render(
      <ResumeStepSection
        resume={mockResume}
        jobData={mockJobData}
        onResumeChange={onResumeChange}
      />,
    );

    const generateButton = screen.getByRole('button', {
      name: /Generate Resume/i,
    });
    fireEvent.click(generateButton);

    // Wait for the button text to change to "Generating..."
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /Generating\.\.\./i }),
      ).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(onResumeChange).toHaveBeenCalled();
    });
  });

  it('calls onResumeChange when user edits textarea', () => {
    const onResumeChange = jest.fn();
    render(
      <ResumeStepSection
        resume={mockResume}
        jobData={mockJobData}
        onResumeChange={onResumeChange}
      />,
    );

    const textarea = screen.getByDisplayValue(mockResume.content);
    fireEvent.change(textarea, { target: { value: 'New content' } });

    expect(onResumeChange).toHaveBeenCalledWith('New content');
  });

  it('fetches edited content when rewrite button is clicked', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        original: mockResume.content,
        edited: 'Rewritten resume content',
        action: 'rewrite',
      }),
    });

    render(
      <ResumeStepSection
        resume={mockResume}
        jobData={mockJobData}
        onResumeChange={jest.fn()}
      />,
    );

    const rewriteButton = screen.getByText('✏️ Rewrite');
    fireEvent.click(rewriteButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/ai/edit-content',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    });
  });

  it('shows comparison modal after editing', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        original: mockResume.content,
        edited: 'Edited content',
        action: 'rewrite',
      }),
    });

    render(
      <ResumeStepSection
        resume={mockResume}
        jobData={mockJobData}
        onResumeChange={jest.fn()}
      />,
    );

    const rewriteButton = screen.getByText('✏️ Rewrite');
    fireEvent.click(rewriteButton);

    await waitFor(() => {
      expect(screen.getByTestId('mock-comparison-modal')).toBeInTheDocument();
    });
  });

  it('updates content when accepting changes in modal', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        original: mockResume.content,
        edited: 'Edited content',
        action: 'rewrite',
      }),
    });

    const onResumeChange = jest.fn();
    render(
      <ResumeStepSection
        resume={mockResume}
        jobData={mockJobData}
        onResumeChange={onResumeChange}
      />,
    );

    const rewriteButton = screen.getByText('✏️ Rewrite');
    fireEvent.click(rewriteButton);

    await waitFor(() => {
      expect(screen.getByTestId('mock-comparison-modal')).toBeInTheDocument();
    });

    const acceptButton = screen.getByRole('button', { name: /Accept/i });
    fireEvent.click(acceptButton);

    expect(onResumeChange).toHaveBeenCalledWith('edited content');
  });

  it('hides modal when rejecting changes', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        original: mockResume.content,
        edited: 'Edited content',
        action: 'rewrite',
      }),
    });

    render(
      <ResumeStepSection
        resume={mockResume}
        jobData={mockJobData}
        onResumeChange={jest.fn()}
      />,
    );

    const rewriteButton = screen.getByText('✏️ Rewrite');
    fireEvent.click(rewriteButton);

    await waitFor(() => {
      expect(screen.getByTestId('mock-comparison-modal')).toBeInTheDocument();
    });

    const rejectButton = screen.getByRole('button', { name: /Reject/i });
    fireEvent.click(rejectButton);

    await waitFor(() => {
      expect(
        screen.queryByTestId('mock-comparison-modal'),
      ).not.toBeInTheDocument();
    });
  });

  it('disables edit buttons while editing', async () => {
    (global.fetch as jest.Mock).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          setTimeout(
            () =>
              resolve({
                ok: true,
                json: async () => ({
                  original: mockResume.content,
                  edited: 'Edited',
                  action: 'rewrite',
                }),
              }),
            100,
          );
        }),
    );

    render(
      <ResumeStepSection
        resume={mockResume}
        jobData={mockJobData}
        onResumeChange={jest.fn()}
      />,
    );

    const rewriteButton = screen.getByText('✏️ Rewrite');
    fireEvent.click(rewriteButton);

    const conciseButton = screen.getByText('📉 Concise');
    expect(conciseButton).toBeDisabled();

    await waitFor(() => {
      expect(conciseButton).not.toBeDisabled();
    });
  });

  it('displays editing loading state', async () => {
    (global.fetch as jest.Mock).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          setTimeout(
            () =>
              resolve({
                ok: true,
                json: async () => ({
                  original: mockResume.content,
                  edited: 'Edited',
                  action: 'rewrite',
                }),
              }),
            100,
          );
        }),
    );

    render(
      <ResumeStepSection
        resume={mockResume}
        jobData={mockJobData}
        onResumeChange={jest.fn()}
      />,
    );

    const rewriteButton = screen.getByText('✏️ Rewrite');
    fireEvent.click(rewriteButton);

    expect(screen.getByText(/Editing content with AI.../)).toBeInTheDocument();

    await waitFor(() => {
      expect(
        screen.queryByText(/Editing content with AI.../),
      ).not.toBeInTheDocument();
    });
  });

  it('handles API errors gracefully', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        error: 'API Error',
      }),
    });

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    window.alert = jest.fn();

    render(
      <ResumeStepSection
        resume={mockResume}
        jobData={mockJobData}
        onResumeChange={jest.fn()}
      />,
    );

    const rewriteButton = screen.getByText('✏️ Rewrite');
    fireEvent.click(rewriteButton);

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith(
        expect.stringContaining('Failed to edit content'),
      );
    });

    consoleErrorSpy.mockRestore();
  });

  it('displays resume content length', () => {
    render(
      <ResumeStepSection
        resume={mockResume}
        jobData={mockJobData}
        onResumeChange={jest.fn()}
      />,
    );

    expect(
      screen.getByText(`Resume content length: ${mockResume.content.length}`),
    ).toBeInTheDocument();
  });

  it('disables textarea while generating or editing', () => {
    (global.fetch as jest.Mock).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          setTimeout(
            () =>
              resolve({
                ok: true,
                json: async () => ({
                  resume: 'Generated',
                }),
              }),
            100,
          );
        }),
    );

    render(
      <ResumeStepSection
        resume={mockResume}
        jobData={mockJobData}
        onResumeChange={jest.fn()}
      />,
    );

    const generateButton = screen.getByRole('button', {
      name: /Generate Resume/i,
    });
    fireEvent.click(generateButton);

    const textarea = screen.getByDisplayValue(
      mockResume.content,
    ) as HTMLTextAreaElement;
    expect(textarea.disabled).toBe(true);

    const rewriteButton = screen.getByText('✏️ Rewrite');
    fireEvent.click(rewriteButton);

    expect(textarea.disabled).toBe(true);
  });
});
