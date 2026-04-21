import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import CreateJobForm from './create-job-form';

const mockPush = jest.fn();
const mockRefresh = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}));

describe('CreateJobForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  it('shows inline required messages and clears one when field is updated', async () => {
    render(<CreateJobForm />);

    fireEvent.click(screen.getByRole('button', { name: 'Create job' }));

    expect(screen.getAllByText('This field is required.')).toHaveLength(4);

    fireEvent.change(screen.getByLabelText(/Job Position/i), {
      target: { value: 'Frontend Engineer' },
    });

    await waitFor(() => {
      expect(screen.getAllByText('This field is required.')).toHaveLength(3);
    });
  });

  it('submits successfully and routes to dashboard for full-page usage', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });

    render(<CreateJobForm />);

    fireEvent.change(screen.getByLabelText(/Job Position/i), {
      target: { value: 'Frontend Engineer' },
    });
    fireEvent.change(screen.getByLabelText(/Company Name/i), {
      target: { value: 'Acme' },
    });
    fireEvent.change(screen.getByLabelText(/Location/i), {
      target: { value: 'Remote' },
    });
    fireEvent.change(screen.getByLabelText(/Last Activity Date/i), {
      target: { value: '2026-04-06' },
    });
    fireEvent.change(screen.getByLabelText(/Compensation/i), {
      target: { value: '  $200k  ' },
    });
    fireEvent.change(screen.getByLabelText(/Recruiter Notes/i), {
      target: { value: '  Recruiter reached out  ' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Create job' }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/jobs',
        expect.objectContaining({ method: 'POST' }),
      );
      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });

    const request = (global.fetch as jest.Mock).mock.calls[0][1] as RequestInit;
    const payload = JSON.parse(request.body as string);

    expect(payload).toMatchObject({
      title: 'Frontend Engineer',
      company: 'Acme',
      location: 'Remote',
      stage: 'Interested',
      lastActivityDate: '2026-04-06',
      deadline: null,
      priority: false,
      jobDescription: null,
      compensation: '$200k',
      applicationDate: null,
      recruiterNotes: 'Recruiter reached out',
      otherNotes: null,
      timeline: [],
      interviews: [],
      followUps: [],
      documents: { files: [] },
    });
  });
});
