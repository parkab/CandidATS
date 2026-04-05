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

jest.mock('@/components/dashboard/polaroid-add-card', () => ({
  __esModule: true,
  default: () => <div>Mock Add Card</div>,
}));

jest.mock('@/components/dashboard/polaroid-card', () => ({
  __esModule: true,
  default: ({
    company,
    status,
    angle,
  }: {
    company: string;
    status: string;
    angle: number;
  }) => (
    <div>
      Mock Job Card: {company} | status: {status} | angle: {angle}
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
      },
    ]);

    render(await Dashboard());

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Mock Add Card')).toBeInTheDocument();
    expect(
      screen.getByText(
        /Mock Job Card:\s*Stripe\s*\|\s*status:\s*Applied\s*\|\s*angle:\s*-?\d+/,
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText('Sign up now!')).not.toBeInTheDocument();
    expect(prisma.job.findMany).toHaveBeenCalledWith({
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
      },
      {
        id: 'job-offered',
        company_name: 'Offer Co',
        location: 'Seattle, WA',
        title: 'Backend Engineer',
        last_activity_date: new Date('2026-03-29T00:00:00.000Z'),
        pipeline_stage: 'offered',
      },
      {
        id: 'job-archive',
        company_name: 'Archive Co',
        location: 'Denver, CO',
        title: 'Fullstack Engineer',
        last_activity_date: new Date('2026-03-28T00:00:00.000Z'),
        pipeline_stage: 'archive',
      },
      {
        id: 'job-unknown',
        company_name: 'Unknown Co',
        location: 'Remote',
        title: 'QA Engineer',
        last_activity_date: new Date('2026-03-27T00:00:00.000Z'),
        pipeline_stage: 'mystery-stage',
      },
    ]);

    render(await Dashboard());

    expect(
      screen.getByText('Mock Job Card: Interview Co | status: Interview', {
        exact: false,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Mock Job Card: Offer Co | status: Offer', {
        exact: false,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Mock Job Card: Archive Co | status: Archived', {
        exact: false,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Mock Job Card: Unknown Co | status: Interested', {
        exact: false,
      }),
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
      },
    ]);

    const getAngleFromCard = () => {
      const text = screen.getByText('Mock Job Card: Stable Co', {
        exact: false,
      }).textContent;
      const matched = text?.match(/angle:\s*(-?\d+)/);

      return matched?.[1];
    };

    render(await Dashboard());
    const firstAngle = getAngleFromCard();

    cleanup();

    render(await Dashboard());
    const secondAngle = getAngleFromCard();

    expect(firstAngle).toBeDefined();
    expect(secondAngle).toBeDefined();
    expect(firstAngle).toBe(secondAngle);
  });
});
