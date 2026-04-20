import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CoverLetterStepSection from '@/components/dashboard/cover-letter-step-section';
import type { JobCoverLetterDraft } from '@/lib/jobs/multi-step-form';

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

const mockCoverLetter: JobCoverLetterDraft = {
  content:
    'Dear Hiring Manager, I am interested in the Software Engineer position...',
  isGenerating: false,
};

const mockJobData = {
  title: 'Software Engineer',
  company_name: 'Google',
  location: 'San Francisco, CA',
  job_description: 'We are looking for a talented engineer...',
};

describe('CoverLetterStepSection', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
    jest.clearAllMocks();
  });

  it('renders cover letter section with generate button', () => {
    render(
      <CoverLetterStepSection
        coverLetter={mockCoverLetter}
        jobData={mockJobData}
        onCoverLetterChange={jest.fn()}
      />,
    );

    expect(screen.getByText('AI-Generated Cover Letter')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Generate Cover Letter/i }),
    ).toBeInTheDocument();
  });

  it('displays edit action buttons when content is present', () => {
    render(
      <CoverLetterStepSection
        coverLetter={mockCoverLetter}
        jobData={mockJobData}
        onCoverLetterChange={jest.fn()}
      />,
    );

    expect(screen.getByText('✏️ Rewrite')).toBeInTheDocument();
    expect(screen.getByText('📉 Concise')).toBeInTheDocument();
    expect(screen.getByText('📈 Detail')).toBeInTheDocument();
    expect(screen.getByText('🎯 Tone')).toBeInTheDocument();
  });

  it('does not display edit action buttons when content is empty', () => {
    const emptyCoverLetter: JobCoverLetterDraft = {
      content: '',
      isGenerating: false,
    };
    render(
      <CoverLetterStepSection
        coverLetter={emptyCoverLetter}
        jobData={mockJobData}
        onCoverLetterChange={jest.fn()}
      />,
    );

    expect(screen.queryByText('✏️ Rewrite')).not.toBeInTheDocument();
  });

  it('shows loading state during cover letter generation', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        coverLetter: 'Generated cover letter content',
      }),
    });

    const onCoverLetterChange = jest.fn();
    render(
      <CoverLetterStepSection
        coverLetter={mockCoverLetter}
        jobData={mockJobData}
        onCoverLetterChange={onCoverLetterChange}
      />,
    );

    const generateButton = screen.getByRole('button', {
      name: /Generate Cover Letter/i,
    });
    fireEvent.click(generateButton);

    // Wait for the button text to change to "Generating..."
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /Generating\.\.\./i }),
      ).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(onCoverLetterChange).toHaveBeenCalled();
    });
  });

  it('calls onCoverLetterChange when user edits textarea', () => {
    const onCoverLetterChange = jest.fn();
    render(
      <CoverLetterStepSection
        coverLetter={mockCoverLetter}
        jobData={mockJobData}
        onCoverLetterChange={onCoverLetterChange}
      />,
    );

    const textarea = screen.getByDisplayValue(mockCoverLetter.content);
    fireEvent.change(textarea, { target: { value: 'New cover letter' } });

    expect(onCoverLetterChange).toHaveBeenCalledWith('New cover letter');
  });

  it('fetches edited content when rewrite button is clicked', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        original: mockCoverLetter.content,
        edited: 'Rewritten cover letter content',
        action: 'rewrite',
      }),
    });

    render(
      <CoverLetterStepSection
        coverLetter={mockCoverLetter}
        jobData={mockJobData}
        onCoverLetterChange={jest.fn()}
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
        original: mockCoverLetter.content,
        edited: 'Edited content',
        action: 'rewrite',
      }),
    });

    render(
      <CoverLetterStepSection
        coverLetter={mockCoverLetter}
        jobData={mockJobData}
        onCoverLetterChange={jest.fn()}
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
        original: mockCoverLetter.content,
        edited: 'Edited content',
        action: 'rewrite',
      }),
    });

    const onCoverLetterChange = jest.fn();
    render(
      <CoverLetterStepSection
        coverLetter={mockCoverLetter}
        jobData={mockJobData}
        onCoverLetterChange={onCoverLetterChange}
      />,
    );

    const rewriteButton = screen.getByText('✏️ Rewrite');
    fireEvent.click(rewriteButton);

    await waitFor(() => {
      expect(screen.getByTestId('mock-comparison-modal')).toBeInTheDocument();
    });

    const acceptButton = screen.getByRole('button', { name: /Accept/i });
    fireEvent.click(acceptButton);

    expect(onCoverLetterChange).toHaveBeenCalledWith('edited content');
  });

  it('hides modal when rejecting changes', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        original: mockCoverLetter.content,
        edited: 'Edited content',
        action: 'rewrite',
      }),
    });

    render(
      <CoverLetterStepSection
        coverLetter={mockCoverLetter}
        jobData={mockJobData}
        onCoverLetterChange={jest.fn()}
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
                  original: mockCoverLetter.content,
                  edited: 'Edited',
                  action: 'rewrite',
                }),
              }),
            100,
          );
        }),
    );

    render(
      <CoverLetterStepSection
        coverLetter={mockCoverLetter}
        jobData={mockJobData}
        onCoverLetterChange={jest.fn()}
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
                  original: mockCoverLetter.content,
                  edited: 'Edited',
                  action: 'rewrite',
                }),
              }),
            100,
          );
        }),
    );

    render(
      <CoverLetterStepSection
        coverLetter={mockCoverLetter}
        jobData={mockJobData}
        onCoverLetterChange={jest.fn()}
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
      <CoverLetterStepSection
        coverLetter={mockCoverLetter}
        jobData={mockJobData}
        onCoverLetterChange={jest.fn()}
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

  it('supports concise action', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        original: mockCoverLetter.content,
        edited: 'More concise version',
        action: 'concise',
      }),
    });

    render(
      <CoverLetterStepSection
        coverLetter={mockCoverLetter}
        jobData={mockJobData}
        onCoverLetterChange={jest.fn()}
      />,
    );

    const conciseButton = screen.getByText('📉 Concise');
    fireEvent.click(conciseButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/ai/edit-content',
        expect.objectContaining({
          body: expect.stringContaining('concise'),
        }),
      );
    });
  });

  it('supports detail action', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        original: mockCoverLetter.content,
        edited: 'More detailed version',
        action: 'detail',
      }),
    });

    render(
      <CoverLetterStepSection
        coverLetter={mockCoverLetter}
        jobData={mockJobData}
        onCoverLetterChange={jest.fn()}
      />,
    );

    const detailButton = screen.getByText('📈 Detail');
    fireEvent.click(detailButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/ai/edit-content',
        expect.objectContaining({
          body: expect.stringContaining('detail'),
        }),
      );
    });
  });

  it('supports tone action', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        original: mockCoverLetter.content,
        edited: 'Tone-adjusted version',
        action: 'tone',
      }),
    });

    render(
      <CoverLetterStepSection
        coverLetter={mockCoverLetter}
        jobData={mockJobData}
        onCoverLetterChange={jest.fn()}
      />,
    );

    const toneButton = screen.getByText('🎯 Tone');
    fireEvent.click(toneButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/ai/edit-content',
        expect.objectContaining({
          body: expect.stringContaining('tone'),
        }),
      );
    });
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
                  coverLetter: 'Generated',
                }),
              }),
            100,
          );
        }),
    );

    render(
      <CoverLetterStepSection
        coverLetter={mockCoverLetter}
        jobData={mockJobData}
        onCoverLetterChange={jest.fn()}
      />,
    );

    const generateButton = screen.getByRole('button', {
      name: /Generate Cover Letter/i,
    });
    fireEvent.click(generateButton);

    const textarea = screen.getByDisplayValue(
      mockCoverLetter.content,
    ) as HTMLTextAreaElement;
    expect(textarea.disabled).toBe(true);
  });
});
