import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import JobMultiStepForm from './job-multi-step-form';
import type { JobOverviewDraft } from '@/lib/jobs/multi-step-form';

const VALID_OVERVIEW: JobOverviewDraft = {
  id: 'job-1',
  title: 'Software Engineer',
  company: 'Acme',
  location: 'Remote',
  stage: 'Applied',
  lastActivityDate: '2026-04-10',
  deadline: '',
  priority: false,
  jobDescription: '',
  compensation: '',
  applicationDate: '',
  recruiterNotes: '',
  prepNotes: '',
  otherNotes: '',
};

const EMPTY_REQUIRED_OVERVIEW: JobOverviewDraft = {
  ...VALID_OVERVIEW,
  title: '',
  company: '',
  location: '',
  lastActivityDate: '',
};

describe('JobMultiStepForm', () => {
  const revokeObjectURL = URL.revokeObjectURL;

  afterEach(() => {
    URL.revokeObjectURL = revokeObjectURL;
  });

  it('shows required field errors and blocks Next when overview is incomplete', async () => {
    const onStepSave = jest.fn();
    const onFinalSave = jest.fn();

    render(
      <JobMultiStepForm
        initialOverview={EMPTY_REQUIRED_OVERVIEW}
        onCancel={() => undefined}
        onFinalSave={onFinalSave}
        onStepSave={onStepSave}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));

    expect(await screen.findAllByText('This field is required.')).toHaveLength(
      4,
    );
    expect(onStepSave).not.toHaveBeenCalled();
  });

  it('calls onStepSave and advances to timeline when overview is valid', async () => {
    const onStepSave = jest.fn().mockResolvedValue(undefined);

    render(
      <JobMultiStepForm
        initialOverview={VALID_OVERVIEW}
        onCancel={() => undefined}
        onFinalSave={jest.fn()}
        onStepSave={onStepSave}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));

    await waitFor(() => {
      expect(onStepSave).toHaveBeenCalledWith(
        expect.objectContaining({
          step: 'overview',
          draft: expect.objectContaining({
            overview: expect.objectContaining({
              title: 'Software Engineer',
              company: 'Acme',
              location: 'Remote',
            }),
          }),
        }),
      );
    });

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { level: 3, name: 'Timeline' }),
      ).toBeInTheDocument();
    });
  });

  it('calls onFinalSave with form draft when Save changes is clicked', async () => {
    const onFinalSave = jest.fn().mockResolvedValue(undefined);

    render(
      <JobMultiStepForm
        initialOverview={VALID_OVERVIEW}
        onCancel={() => undefined}
        onFinalSave={onFinalSave}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => {
      expect(onFinalSave).toHaveBeenCalledWith(
        expect.objectContaining({
          overview: expect.objectContaining({
            title: 'Software Engineer',
            company: 'Acme',
            location: 'Remote',
            stage: 'Applied',
          }),
          timeline: [],
          interviews: [],
          followUps: [],
          documents: { files: [] },
        }),
      );
    });
  });

  it('blocks Save changes when required overview fields are missing', async () => {
    const onFinalSave = jest.fn();

    render(
      <JobMultiStepForm
        initialOverview={EMPTY_REQUIRED_OVERVIEW}
        onCancel={() => undefined}
        onFinalSave={onFinalSave}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findAllByText('This field is required.')).toHaveLength(
      4,
    );
    expect(onFinalSave).not.toHaveBeenCalled();
    expect(
      screen.getByRole('heading', { level: 3, name: 'Overview' }),
    ).toBeInTheDocument();
  });

  it('surfaces onStepSave server error message', async () => {
    const onStepSave = jest
      .fn()
      .mockRejectedValue(new Error('Step save failed from server'));

    render(
      <JobMultiStepForm
        initialOverview={VALID_OVERVIEW}
        onCancel={() => undefined}
        onFinalSave={jest.fn()}
        onStepSave={onStepSave}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));

    expect(
      await screen.findByText('Step save failed from server'),
    ).toBeInTheDocument();
  });

  it('surfaces onFinalSave server error message', async () => {
    const onFinalSave = jest
      .fn()
      .mockRejectedValue(new Error('Final save failed from server'));

    render(
      <JobMultiStepForm
        initialOverview={VALID_OVERVIEW}
        onCancel={() => undefined}
        onFinalSave={onFinalSave}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(
      await screen.findByText('Final save failed from server'),
    ).toBeInTheDocument();
  });

  it('revokes remaining document object URLs on unmount', () => {
    const revokeSpy = jest.fn();
    URL.revokeObjectURL = revokeSpy;

    const { unmount } = render(
      <JobMultiStepForm
        initialOverview={VALID_OVERVIEW}
        initialDraft={{
          documents: {
            files: [
              {
                id: 'doc-1',
                title: 'Resume',
                date: '2026-04-10',
                notes: '',
                name: 'resume.pdf',
                size: 2048,
                mimeType: 'application/pdf',
                objectUrl: 'blob:resume-preview',
              },
            ],
          },
        }}
        onCancel={() => undefined}
        onFinalSave={jest.fn()}
      />,
    );

    unmount();

    expect(revokeSpy).toHaveBeenCalledWith('blob:resume-preview');
  });
});
