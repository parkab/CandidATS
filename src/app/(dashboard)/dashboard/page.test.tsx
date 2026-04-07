import { cleanup, render, screen } from '@testing-library/react';
import type { AnchorHTMLAttributes, ReactNode } from 'react';
import Dashboard from './page';
import { getSession } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';

jest.mock('@/lib/auth/session', () => ({
  getSession: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    job: {
      findMany: jest.fn(),
    },
  },
}));

type MockLinkProps = {
  href: string;
  children: ReactNode;
} & AnchorHTMLAttributes<HTMLAnchorElement>;

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...props }: MockLinkProps) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

jest.mock('@/components/dashboard/jobs-modal-grid', () => ({
  __esModule: true,
  default: ({ jobs }: { jobs: Array<{ company: string; status: string }> }) => (
    <div>
      Mock Jobs Modal Grid: {jobs.length} jobs | first company:{' '}
      {jobs[0]?.company}
    </div>
  ),
}));

jest.mock('@/components/dashboard/polaroid-landing-card', () => ({
  __esModule: true,
  default: ({ caption }: { caption: string }) => <div>{caption}</div>,
}));

describe('Dashboard page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders landing experience when session does not exist', async () => {
    (getSession as jest.Mock).mockResolvedValue(null);

    render(await Dashboard());

    expect(screen.getByText('The ATS for Candidates.')).toBeInTheDocument();
    expect(screen.getByText('Organize your jobs.')).toBeInTheDocument();
    expect(screen.getByText('Sign up now!')).toBeInTheDocument();
    expect(screen.queryByText('Mock Add Card')).not.toBeInTheDocument();
    expect(prisma.job.findMany).not.toHaveBeenCalled();
  });

  it('renders dashboard cards when session exists', async () => {
    (getSession as jest.Mock).mockResolvedValue({
      userId: 'user-123',
      email: 'test@example.com',
    });
    (prisma.job.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'job-1',
        company_name: 'Stripe',
        location: 'San Francisco, CA',
        title: 'Software Engineer',
        last_activity_date: new Date('2026-03-30T00:00:00.000Z'),
        pipeline_stage: 'Applied',
        deadline: null,
        priority_flag: false,
        job_description: null,
        compensation_notes: null,
        application_date: null,
        recruiter_contact_notes: null,
        custom_notes: null,
      },
    ]);

    render(await Dashboard());

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(
      screen.getByText('Mock Jobs Modal Grid: 1 jobs | first company: Stripe'),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Mock Job Card:/)).not.toBeInTheDocument();
    expect(screen.queryByText('Sign up now!')).not.toBeInTheDocument();
    expect(prisma.job.findMany).toHaveBeenCalledWith({
      select: {
        id: true,
        company_name: true,
        title: true,
        location: true,
        pipeline_stage: true,
        last_activity_date: true,
        deadline: true,
        priority_flag: true,
        job_description: true,
        compensation_notes: true,
        application_date: true,
        recruiter_contact_notes: true,
        custom_notes: true,
      },
      where: {
        user_id: 'user-123',
      },
      orderBy: {
        last_activity_date: 'desc',
      },
    });
  });

  it('maps pipeline stages to application statuses before rendering cards', async () => {
    (getSession as jest.Mock).mockResolvedValue({
      userId: 'user-123',
      email: 'test@example.com',
    });
    (prisma.job.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'job-interviewing',
        company_name: 'Interview Co',
        location: 'Austin, TX',
        title: 'Frontend Engineer',
        last_activity_date: new Date('2026-03-30T00:00:00.000Z'),
        pipeline_stage: ' interviewing ',
        deadline: null,
        priority_flag: false,
        job_description: null,
        compensation_notes: null,
        application_date: null,
        recruiter_contact_notes: null,
        custom_notes: null,
      },
      {
        id: 'job-offered',
        company_name: 'Offer Co',
        location: 'Seattle, WA',
        title: 'Backend Engineer',
        last_activity_date: new Date('2026-03-29T00:00:00.000Z'),
        pipeline_stage: 'offered',
        deadline: null,
        priority_flag: false,
        job_description: null,
        compensation_notes: null,
        application_date: null,
        recruiter_contact_notes: null,
        custom_notes: null,
      },
      {
        id: 'job-archive',
        company_name: 'Archive Co',
        location: 'Denver, CO',
        title: 'Fullstack Engineer',
        last_activity_date: new Date('2026-03-28T00:00:00.000Z'),
        pipeline_stage: 'archive',
        deadline: null,
        priority_flag: false,
        job_description: null,
        compensation_notes: null,
        application_date: null,
        recruiter_contact_notes: null,
        custom_notes: null,
      },
      {
        id: 'job-unknown',
        company_name: 'Unknown Co',
        location: 'Remote',
        title: 'QA Engineer',
        last_activity_date: new Date('2026-03-27T00:00:00.000Z'),
        pipeline_stage: 'mystery-stage',
        deadline: null,
        priority_flag: false,
        job_description: null,
        compensation_notes: null,
        application_date: null,
        recruiter_contact_notes: null,
        custom_notes: null,
      },
    ]);

    render(await Dashboard());

    expect(
      screen.getByText(
        'Mock Jobs Modal Grid: 4 jobs | first company: Interview Co',
      ),
    ).toBeInTheDocument();
  });

  it('keeps angle stable for the same job id across renders', async () => {
    (getSession as jest.Mock).mockResolvedValue({
      userId: 'user-123',
      email: 'test@example.com',
    });
    (prisma.job.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'stable-job-id',
        company_name: 'Stable Co',
        location: 'Remote',
        title: 'Platform Engineer',
        last_activity_date: new Date('2026-03-30T00:00:00.000Z'),
        pipeline_stage: 'Applied',
        deadline: null,
        priority_flag: false,
        job_description: null,
        compensation_notes: null,
        application_date: null,
        recruiter_contact_notes: null,
        custom_notes: null,
      },
    ]);

    render(await Dashboard());
    expect(
      screen.getByText(
        'Mock Jobs Modal Grid: 1 jobs | first company: Stable Co',
      ),
    ).toBeInTheDocument();

    cleanup();

    render(await Dashboard());
    expect(
      screen.getByText(
        'Mock Jobs Modal Grid: 1 jobs | first company: Stable Co',
      ),
    ).toBeInTheDocument();
  });
});
