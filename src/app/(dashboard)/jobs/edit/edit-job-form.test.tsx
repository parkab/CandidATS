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
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ documents: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

    render(<EditJobForm initialJob={initialJob} />);

    fireEvent.change(screen.getByLabelText(/Compensation/i), {
      target: { value: '  base + bonus  ' },
    });
    fireEvent.change(screen.getByLabelText(/Recruiter Notes/i), {
      target: { value: '  recruiter pinged me  ' },
    });
    fireEvent.change(screen.getByLabelText(/Other Notes/i), {
      target: { value: '  custom details  ' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard');
      expect(mockRefresh).toHaveBeenCalled();
    });

    const patchCall = (global.fetch as jest.Mock).mock.calls.find(
      ([requestUrl, requestInit]) =>
        requestUrl === '/api/jobs/job-1' && requestInit?.method === 'PATCH',
    );

    expect(patchCall).toBeDefined();

    const request = patchCall?.[1] as RequestInit;
    const payload = JSON.parse(request.body as string);

    expect(payload).toMatchObject({
      title: 'Backend Engineer',
      company: 'Acme',
      location: 'Remote',
      stage: 'Applied',
      lastActivityDate: '2026-04-06',
      deadline: null,
      priority: false,
      jobDescription: null,
      compensation: 'base + bonus',
      applicationDate: null,
      recruiterNotes: 'recruiter pinged me',
      otherNotes: 'custom details',
      timeline: [],
      interviews: [],
      followUps: [],
      documents: { files: [] },
    });
  });
});
