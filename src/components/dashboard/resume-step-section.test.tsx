import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ResumeStepSection from '@/components/dashboard/resume-step-section';
import type { JobResumeDraft } from '@/lib/jobs/multi-step-form';

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }));

const mockResume: JobResumeDraft = { content: '', isGenerating: false };
const mockJobData = {
  title: 'Software Engineer',
  company_name: 'Google',
  location: 'San Francisco, CA',
  job_description: 'We are looking for a talented engineer...',
};

const MOCK_AI_RESPONSE = {
  templateName: 'jakes-resume',
  structuredData: { header: { name: 'Jane Doe' }, education: [], experience: [], projects: [], skills: {} },
};
const MOCK_DOC_RESPONSE = { document: { id: 'doc-123' } };

describe('ResumeStepSection', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
    jest.clearAllMocks();
    Object.defineProperty(window, 'sessionStorage', {
      value: { setItem: jest.fn(), getItem: jest.fn(), removeItem: jest.fn() },
      writable: true,
    });
  });

  it('renders with a Generate Resume button', () => {
    render(
      <ResumeStepSection
        resume={mockResume}
        jobId="job-1"
        jobData={mockJobData}
        onResumeChange={jest.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: /generate resume/i })).toBeInTheDocument();
  });

  it('disables button when no job data is provided', () => {
    render(
      <ResumeStepSection
        resume={mockResume}
        onResumeChange={jest.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: /generate resume/i })).toBeDisabled();
  });

  it('navigates to editor after successful generation', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => MOCK_AI_RESPONSE })
      .mockResolvedValueOnce({ ok: true, json: async () => MOCK_DOC_RESPONSE });

    render(
      <ResumeStepSection
        resume={mockResume}
        jobId="job-1"
        jobData={mockJobData}
        onResumeChange={jest.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /generate resume/i }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/documents/doc-123/edit');
    });
  });

  it('shows error message when generation fails', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'AI service unavailable' }),
    });

    render(
      <ResumeStepSection
        resume={mockResume}
        jobId="job-1"
        jobData={mockJobData}
        onResumeChange={jest.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /generate resume/i }));

    await waitFor(() => {
      expect(screen.getByText(/ai service unavailable/i)).toBeInTheDocument();
    });
  });
});
