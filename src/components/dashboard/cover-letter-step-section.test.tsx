import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CoverLetterStepSection from '@/components/dashboard/cover-letter-step-section';

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }));

const mockJobData = {
  title: 'Product Manager',
  company_name: 'TechCo',
  location: 'Remote',
  job_description: 'Lead product strategy...',
};

const MOCK_AI_RESPONSE = {
  templateName: 'jakes-cover-letter',
  structuredData: {
    header: { name: 'Jane Doe', phone: '555-1234', email: 'jane@example.com' },
    date: 'May 1, 2026',
    company: 'TechCo',
    paragraphs: ['Opening.', 'Body.', 'Closing.'],
    senderName: 'Jane Doe',
  },
};
const MOCK_DOC_RESPONSE = { document: { id: 'doc-456' } };

describe('CoverLetterStepSection', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
    jest.clearAllMocks();
    Object.defineProperty(window, 'sessionStorage', {
      value: { setItem: jest.fn(), getItem: jest.fn(), removeItem: jest.fn() },
      writable: true,
    });
  });

  it('renders with a Generate Cover Letter button', () => {
    render(<CoverLetterStepSection jobId="job-1" jobData={mockJobData} />);
    expect(screen.getByRole('button', { name: /generate cover letter/i })).toBeInTheDocument();
  });

  it('disables button when no job data is provided', () => {
    render(<CoverLetterStepSection />);
    expect(screen.getByRole('button', { name: /generate cover letter/i })).toBeDisabled();
  });

  it('navigates to editor after successful generation', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => MOCK_AI_RESPONSE })
      .mockResolvedValueOnce({ ok: true, json: async () => MOCK_DOC_RESPONSE });

    render(<CoverLetterStepSection jobId="job-1" jobData={mockJobData} />);

    fireEvent.click(screen.getByRole('button', { name: /generate cover letter/i }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/documents/doc-456/edit');
    });
  });

  it('shows error message when generation fails', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'AI service unavailable' }),
    });

    render(<CoverLetterStepSection jobId="job-1" jobData={mockJobData} />);

    fireEvent.click(screen.getByRole('button', { name: /generate cover letter/i }));

    await waitFor(() => {
      expect(screen.getByText(/ai service unavailable/i)).toBeInTheDocument();
    });
  });
});
