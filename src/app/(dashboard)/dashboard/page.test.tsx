import { cleanup, render, screen } from '@testing-library/react';
import type { AnchorHTMLAttributes, ReactNode } from 'react';
import Dashboard, { type DashboardPageProps } from './page';
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
    timelineEvent: {
      findMany: jest.fn(),
    },
    interview: {
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
  default: ({
    initialJobs,
  }: {
    initialJobs: Array<{ company: string; status: string; angle: number }>;
  }) => (
    <div>
      Mock Jobs Modal Grid: {initialJobs.length} jobs | first company:{' '}
      {initialJobs[0]?.company} | first angle: {initialJobs[0]?.angle}
    </div>
  ),
}));

jest.mock('@/components/dashboard/polaroid-landing-card', () => ({
  __esModule: true,
  default: ({ caption }: { caption: string }) => <div>{caption}</div>,
}));

jest.mock('@/components/dashboard/job-search-filter-control', () => ({
  __esModule: true,
  default: () => <div>Mock Job Search Filter Control</div>,
}));

jest.mock('@/components/dashboard/job-sort-control', () => ({
  __esModule: true,
  default: () => <div>Mock Job Sort Control</div>,
}));

jest.mock('@/components/dashboard/dashboard-metrics', () => ({
  __esModule: true,
  default: ({
    metrics,
  }: {
    metrics: Array<{
      label: string;
      value: string | number;
      description: string;
    }>;
  }) => (
    <div>
      Mock Dashboard Metrics:
      {metrics.map((m) => (
        <div key={m.label}>{m.label}</div>
      ))}
    </div>
  ),
}));

describe('Dashboard page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders landing experience when session does not exist', async () => {
    (getSession as jest.Mock).mockResolvedValue(null);

    render(
      await Dashboard({
        searchParams: Promise.resolve({}),
      } as unknown as DashboardPageProps),
    );

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
        archived: false,
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
    (prisma.timelineEvent.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.interview.findMany as jest.Mock).mockResolvedValue([]);

    render(
      await Dashboard({
        searchParams: Promise.resolve({}),
      } as unknown as DashboardPageProps),
    );

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Total applications')).toBeInTheDocument();
    expect(screen.getByText('Open opportunities')).toBeInTheDocument();
    expect(screen.getByText('Offers received')).toBeInTheDocument();
    expect(screen.getByText('Past due deadlines')).toBeInTheDocument();
    expect(screen.getByText('Interviews scheduled')).toBeInTheDocument();
    expect(
      screen.getByText(
        /Mock Jobs Modal Grid: 1 jobs \| first company: Stripe \| first angle: -?\d+/,
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Mock Job Card:/)).not.toBeInTheDocument();
    expect(screen.queryByText('Sign up now!')).not.toBeInTheDocument();
    expect(prisma.job.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({
          id: true,
          company_name: true,
          title: true,
          location: true,
          pipeline_stage: true,
          archived: true,
          last_activity_date: true,
          deadline: true,
          priority_flag: true,
          job_description: true,
          compensation_notes: true,
          application_date: true,
          recruiter_contact_notes: true,
          custom_notes: true,
        }),
        where: { user_id: 'user-123' },
        orderBy: { last_activity_date: 'desc' },
      }),
    );
  });

  it('orders jobs by company name when sort query parameter is company', async () => {
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
        archived: false,
        deadline: null,
        priority_flag: false,
        job_description: null,
        compensation_notes: null,
        application_date: null,
        recruiter_contact_notes: null,
        custom_notes: null,
      },
    ]);
    (prisma.timelineEvent.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.interview.findMany as jest.Mock).mockResolvedValue([]);

    render(
      await Dashboard({
        searchParams: Promise.resolve({ sort: 'company' }),
      } as unknown as DashboardPageProps),
    );

    expect(prisma.job.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({
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
        }),
        where: { user_id: 'user-123' },
        orderBy: { company_name: 'asc' },
      }),
    );
  });

  it('filters jobs by query, stage, location, and upcoming deadline', async () => {
    (getSession as jest.Mock).mockResolvedValue({
      userId: 'user-123',
      email: 'test@example.com',
    });
    (prisma.job.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'job-1',
        company_name: 'Stripe',
        location: 'Austin, TX',
        title: 'Frontend Engineer',
        last_activity_date: new Date('2026-03-30T00:00:00.000Z'),
        pipeline_stage: 'Interview',
        deadline: new Date('2026-04-30T00:00:00.000Z'),
        priority_flag: false,
        job_description: null,
        compensation_notes: null,
        application_date: null,
        recruiter_contact_notes: null,
        custom_notes: null,
      },
    ]);
    (prisma.timelineEvent.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.interview.findMany as jest.Mock).mockResolvedValue([]);

    render(
      await Dashboard({
        searchParams: Promise.resolve({
          q: 'engineer',
          stage: 'Interview',
          location: 'Austin',
          deadlineState: 'upcoming',
        }),
      } as unknown as DashboardPageProps),
    );

    expect(prisma.job.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({
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
          TimelineEvent: expect.any(Object),
          Interview: expect.any(Object),
        }),
        where: expect.objectContaining({
          user_id: 'user-123',
          pipeline_stage: {
            equals: 'Interview',
          },
          location: {
            contains: 'Austin',
            mode: 'insensitive',
          },
          deadline: expect.objectContaining({
            not: null,
            gte: expect.any(Date),
          }),
          OR: expect.any(Array),
        }),
        orderBy: {
          last_activity_date: 'desc',
        },
      }),
    );
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
        archived: false,
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
        archived: false,
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
        archived: true,
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
        archived: false,
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
    (prisma.timelineEvent.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.interview.findMany as jest.Mock).mockResolvedValue([]);

    render(
      await Dashboard({
        searchParams: Promise.resolve({}),
      } as unknown as DashboardPageProps),
    );

    expect(
      screen.getByText(
        /Mock Jobs Modal Grid: 4 jobs \| first company: Interview Co \| first angle: -?\d+/,
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
        archived: false,
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
    (prisma.timelineEvent.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.interview.findMany as jest.Mock).mockResolvedValue([]);

    render(
      await Dashboard({
        searchParams: Promise.resolve({}),
      } as unknown as DashboardPageProps),
    );
    const firstText = screen.getByText(
      /Mock Jobs Modal Grid: 1 jobs \| first company: Stable Co \| first angle: -?\d+/,
    ).textContent;
    const firstAngle = firstText?.match(/first angle:\s*(-?\d+)/)?.[1];

    cleanup();

    render(
      await Dashboard({
        searchParams: Promise.resolve({}),
      } as unknown as DashboardPageProps),
    );
    const secondText = screen.getByText(
      /Mock Jobs Modal Grid: 1 jobs \| first company: Stable Co \| first angle: -?\d+/,
    ).textContent;
    const secondAngle = secondText?.match(/first angle:\s*(-?\d+)/)?.[1];

    expect(firstAngle).toBeDefined();
    expect(secondAngle).toBeDefined();
    expect(firstAngle).toBe(secondAngle);
  });
});
