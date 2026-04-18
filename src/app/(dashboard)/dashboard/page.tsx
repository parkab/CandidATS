import GRADIENT_HEADING_CLASS from '@/components/dashboard/gradient';
import DashboardMetrics from '@/components/dashboard/dashboard-metrics';
import JobSearchFilterControl from '@/components/dashboard/job-search-filter-control';
import JobSortControl from '@/components/dashboard/job-sort-control';
import JobsModalGrid from '@/components/dashboard/jobs-modal-grid';
import PolaroidLandingCard from '@/components/dashboard/polaroid-landing-card';
import { getSession } from '@/lib/auth/session';
import type { ApplicationStatus } from '@/lib/jobs/status';
import { prisma } from '@/lib/prisma';
import { formatDate } from '@/lib/utils/formatDate';
import Link from 'next/link';

const CARD_ANGLES = [-3, -2, -1, 0, 1, 2, 3];

type DashboardJob = {
  id: string;
  company_name: string;
  title: string;
  location: string;
  pipeline_stage: string;
  last_activity_date: Date;
  deadline: Date | null;
  priority_flag: boolean | null;
  job_description: string | null;
  compensation_notes: string | null;
  application_date: Date | null;
  recruiter_contact_notes: string | null;
  custom_notes: string | null;
};

function toApplicationStatus(stage: string): ApplicationStatus {
  const normalizedStage = stage.trim().toLowerCase();

  switch (normalizedStage) {
    case 'interested':
      return 'Interested';
    case 'applied':
      return 'Applied';
    case 'interview':
    case 'interviewing':
      return 'Interview';
    case 'offer':
    case 'offered':
      return 'Offer';
    case 'rejected':
      return 'Rejected';
    case 'archived':
    case 'archive':
      return 'Archived';
    default:
      return 'Interested';
  }
}

function getStableAngle(id: string) {
  const hash = Array.from(id).reduce(
    (sum, char) => sum + char.charCodeAt(0),
    0,
  );
  return CARD_ANGLES[hash % CARD_ANGLES.length];
}

type SortOption = 'lastActivity' | 'deadline' | 'company' | 'createdDate';

type DeadlineState = 'any' | 'upcoming' | 'past' | 'noDeadline';

type StageFilter = 'all' | 'Interested' | 'Applied' | 'Interview' | 'Offer' | 'Rejected' | 'Archived';

export type DashboardPageProps = {
  searchParams: Promise<{
    sort?: string | string[];
    q?: string | string[];
    stage?: string | string[];
    location?: string | string[];
    deadlineState?: string | string[];
  }>;
};

function getJobOrderBy(sortOption: SortOption) {
  switch (sortOption) {
    case 'deadline':
      return { deadline: 'asc' } as const;
    case 'company':
      return { company_name: 'asc' } as const;
    case 'createdDate':
      return { created_at: 'desc' } as const;
    case 'lastActivity':
    default:
      return { last_activity_date: 'desc' } as const;
  }
}

function parseSortOption(value: string | string[] | undefined): SortOption {
  const candidate = Array.isArray(value) ? value[0] : value;

  if (candidate === 'deadline') {
    return 'deadline';
  }

  if (candidate === 'company') {
    return 'company';
  }

  if (candidate === 'createdDate') {
    return 'createdDate';
  }

  return 'lastActivity';
}

function parseTextQuery(value: string | string[] | undefined) {
  const candidate = Array.isArray(value) ? value[0] : value;
  return candidate?.trim() ?? '';
}

function parseStageFilter(value: string | string[] | undefined): StageFilter {
  const candidate = Array.isArray(value) ? value[0] : value;

  if (
    candidate === 'Interested' ||
    candidate === 'Applied' ||
    candidate === 'Interview' ||
    candidate === 'Offer' ||
    candidate === 'Rejected' ||
    candidate === 'Archived'
  ) {
    return candidate;
  }

  return 'all';
}

function parseDeadlineState(value: string | string[] | undefined): DeadlineState {
  const candidate = Array.isArray(value) ? value[0] : value;

  if (candidate === 'upcoming' || candidate === 'past' || candidate === 'noDeadline') {
    return candidate;
  }

  return 'any';
}

function getJobWhere(
  userId: string,
  searchQuery: string,
  stageFilter: StageFilter,
  locationFilter: string,
  deadlineState: DeadlineState,
) {
  const where: Record<string, unknown> = {
    user_id: userId,
  };

  if (searchQuery) {
    where.OR = [
      { title: { contains: searchQuery, mode: 'insensitive' } },
      { company_name: { contains: searchQuery, mode: 'insensitive' } },
      { job_description: { contains: searchQuery, mode: 'insensitive' } },
      { compensation_notes: { contains: searchQuery, mode: 'insensitive' } },
      { recruiter_contact_notes: { contains: searchQuery, mode: 'insensitive' } },
      { custom_notes: { contains: searchQuery, mode: 'insensitive' } },
    ];
  }

  if (stageFilter !== 'all') {
    where.pipeline_stage = {
      contains: stageFilter.toLowerCase(),
      mode: 'insensitive',
    };
  }

  if (locationFilter) {
    where.location = { contains: locationFilter, mode: 'insensitive' };
  }

  if (deadlineState !== 'any') {
    const now = new Date();

    if (deadlineState === 'upcoming') {
      where.deadline = { not: null, gte: now };
    } else if (deadlineState === 'past') {
      where.deadline = { lt: now };
    } else if (deadlineState === 'noDeadline') {
      where.deadline = null;
    }
  }

  return where;
}

export default async function Dashboard({ searchParams }: DashboardPageProps) {
  const session = await getSession();
  const params = await searchParams;
  const sortOption = parseSortOption(params.sort);
  const searchQuery = parseTextQuery(params.q);
  const stageFilter = parseStageFilter(params.stage);
  const locationFilter = parseTextQuery(params.location);
  const deadlineState = parseDeadlineState(params.deadlineState);

  if (!session) {
    return (
      <section className="px-6 py-16">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className={GRADIENT_HEADING_CLASS}>The ATS for Candidates.</h1>
          <p className="mt-3 text-base text-(--text-muted)">
            Flip the picture on ATS: put yourself in the frame and in control of
            your job search.
          </p>
        </div>

        <div className="mx-auto mt-12 grid max-w-6xl gap-8 justify-items-center grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          <PolaroidLandingCard
            imageSrc="/images/polaroid-camera.jpg"
            imageAlt="Polaroid camera"
            caption="Organize your jobs."
            angle={-3}
          />
          <PolaroidLandingCard
            imageSrc="/images/profile-photo.jpg"
            imageAlt="Profile photo"
            caption="Edit your profile."
            angle={1}
          />
          <div className="w-full max-w-60 place-self-center sm:col-span-2 lg:col-span-1">
            <PolaroidLandingCard
              imageSrc="/images/documents-photo.jpg"
              imageAlt="Documents photo"
              caption="Manage your documents."
              angle={-1}
            />
          </div>
        </div>

        <div className="mx-auto mt-14 max-w-3xl text-center">
          <p className="text-base text-(--text-muted)">
            Get your job search out of the dark and into focus.
          </p>

          <div className="mt-6">
            <Link
              href="/register"
              className="inline-flex rounded-md bg-(--foreground) px-8 py-4 text-lg font-semibold text-(--background) no-underline visited:text-(--background) hover:bg-(--inverse-hover)"
            >
              Sign up now!
            </Link>
          </div>

          <p className="mt-4 text-sm text-(--text-muted)">
            Already have an account?{' '}
            <Link
              href="/login"
              className="font-semibold text-(--foreground) underline underline-offset-2 hover:opacity-85"
            >
              Log in
            </Link>
          </p>
        </div>
      </section>
    );
  }

  const jobsWithRelations = await prisma.job.findMany({
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
      TimelineEvent: {
        select: {
          id: true,
          event_type: true,
          occurred_at: true,
          notes: true,
        },
        where: {
          event_type: { not: null },
          occurred_at: { not: null },
        },
      },
      Interview: {
        select: {
          id: true,
          round_type: true,
          scheduled_at: true,
          notes: true,
        },
        orderBy: {
          scheduled_at: 'asc',
        },
      },
    },
    where: getJobWhere(
      session.userId,
      searchQuery,
      stageFilter,
      locationFilter,
      deadlineState,
    ),
    orderBy: getJobOrderBy(sortOption),
  });

  // Transform the data to match the expected format
  const jobs: DashboardJob[] = jobsWithRelations.map(job => ({
    id: job.id,
    company_name: job.company_name,
    title: job.title,
    location: job.location,
    pipeline_stage: job.pipeline_stage,
    last_activity_date: job.last_activity_date,
    deadline: job.deadline,
    priority_flag: job.priority_flag,
    job_description: job.job_description,
    compensation_notes: job.compensation_notes,
    application_date: job.application_date,
    recruiter_contact_notes: job.recruiter_contact_notes,
    custom_notes: job.custom_notes,
  }));

  // Build timeline map from included data
  const timelineByJobId = new Map<
    string,
    Array<{ id: string; event_type: string; occurred_at: Date; notes: string | null }>
  >();
  for (const job of jobsWithRelations) {
    // Cast to the expected type since we filtered nulls in the query
    timelineByJobId.set(job.id, job.TimelineEvent as Array<{ id: string; event_type: string; occurred_at: Date; notes: string | null }>);
  }

  // Build interviews map from included data
  const interviewsByJobId = new Map<
    string,
    Array<{ id: string; round_type: string; scheduled_at: Date; notes: string | null }>
  >();
  for (const job of jobsWithRelations) {
    interviewsByJobId.set(job.id, job.Interview);
  }

  // Get all interviews for metrics
  const allInterviews = jobsWithRelations.flatMap(job => job.Interview);

  const now = new Date();
  const normalizedStages = jobs.map((job) => toApplicationStatus(job.pipeline_stage));
  const totalApplications = jobs.length;
  const openApplications = jobs.filter(
    (job) => toApplicationStatus(job.pipeline_stage) !== 'Archived',
  ).length;
  const offersReceived = jobs.filter(
    (job) => toApplicationStatus(job.pipeline_stage) === 'Offer',
  ).length;
  const pastDueDeadlines = jobs.filter(
    (job) => job.deadline !== null && job.deadline < now,
  ).length;
  const upcomingInterviews = allInterviews.length;
  const averageDaysSinceLastActivity =
    totalApplications === 0
      ? 0
      : Math.round(
          jobs.reduce(
            (sum, job) =>
              sum +
              (now.getTime() - job.last_activity_date.getTime()) /
                1000 /
                60 /
                60 /
                24,
            0,
          ) / totalApplications,
        );

  const dashboardMetrics = [
    {
      label: 'Total applications',
      value: totalApplications,
      description: 'All jobs currently in your pipeline.',
    },
    {
      label: 'Open opportunities',
      value: openApplications,
      description: 'Applications that are not archived.',
    },
    {
      label: 'Offers received',
      value: offersReceived,
      description: 'Jobs currently marked as offers.',
    },
    {
      label: 'Past due deadlines',
      value: pastDueDeadlines,
      description: 'Jobs with deadlines that have already passed.',
    },
    {
      label: 'Interviews scheduled',
      value: upcomingInterviews,
      description: 'Upcoming interview events stored for your jobs.',
    },
    {
      label: 'Avg. days since last activity',
      value: `${averageDaysSinceLastActivity} days`,
      description: 'Average age of job activity across your pipeline.',
    },
  ];

  const jobsForModal = jobs.map((job: DashboardJob) => {
    const timelineEvents = timelineByJobId.get(job.id) ?? [];
    const timeline = timelineEvents.map((event) => ({
      id: event.id,
      title: event.event_type,
      date: event.occurred_at.toISOString().split('T')[0],
      notes: event.notes ?? '',
    }));

    const interviewsForJob = interviewsByJobId.get(job.id) ?? [];
    const interviews = interviewsForJob.map((interview) => ({
      id: interview.id,
      title: interview.round_type,
      date: interview.scheduled_at.toISOString().split('T')[0],
      notes: interview.notes ?? '',
    }));

    return {
      id: job.id,
      company: job.company_name,
      title: job.title,
      location: job.location,
      status: toApplicationStatus(job.pipeline_stage),
      lastActivityDateLabel: formatDate(job.last_activity_date),
      angle: getStableAngle(job.id),
      timeline,
      interviews,
      formData: {
        id: job.id,
        title: job.title,
        company: job.company_name,
        location: job.location,
        stage: job.pipeline_stage,
        lastActivityDate: job.last_activity_date.toISOString(),
        deadline: job.deadline ? job.deadline.toISOString() : null,
        priority: job.priority_flag,
        jobDescription: job.job_description,
        compensation: job.compensation_notes,
        applicationDate: job.application_date
          ? job.application_date.toISOString()
          : null,
        recruiterNotes: job.recruiter_contact_notes,
        otherNotes: job.custom_notes,
      },
    };
  });

  return (
    <section className="px-6 py-12">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className={GRADIENT_HEADING_CLASS}>Dashboard</h1>
      </div>

      <DashboardMetrics metrics={dashboardMetrics} />

      <div className="mx-auto mt-8 max-w-6xl space-y-4 px-4 sm:px-0">
        <JobSearchFilterControl />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div />
          <JobSortControl />
        </div>
      </div>

      <JobsModalGrid jobs={jobsForModal} />
    </section>
  );
}
