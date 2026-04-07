import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import EditJobForm from './edit-job-form';

const mockPush = jest.fn();
const mockRefresh = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}));

const initialJob = {
  id: 'job-1',
  title: 'Backend Engineer',
  company: 'Acme',
  location: 'Remote',
  stage: 'Applied',
  lastActivityDate: '2026-04-06',
  deadline: null,
  priority: false,
  jobDescription: null,
  compensation: null,
  applicationDate: null,
  recruiterNotes: null,
  otherNotes: null,
};

describe('EditJobForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  it('shows inline required error when a required field is cleared', async () => {
    render(<EditJobForm initialJob={initialJob} />);

    fireEvent.change(screen.getByLabelText(/Job Position/i), {
      target: { value: '' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(screen.getByText('This field is required.')).toBeInTheDocument();
  });

  it('submits successfully and routes to dashboard for full-page usage', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });

    render(<EditJobForm initialJob={initialJob} />);

    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/jobs/job-1',
        expect.objectContaining({ method: 'PATCH' }),
      );
      expect(mockPush).toHaveBeenCalledWith('/dashboard');
      expect(mockRefresh).toHaveBeenCalled();
    });
  });
});
