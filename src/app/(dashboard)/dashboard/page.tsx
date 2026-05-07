import GRADIENT_HEADING_CLASS from '@/components/dashboard/gradient';
import DashboardMetrics from '@/components/dashboard/dashboard-metrics';
import JobSearchFilterControl from '@/components/dashboard/job-search-filter-control';
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
  archived: boolean | null;
  last_activity_date: Date;
  deadline: Date | null;
  priority_flag: boolean | null;
  job_description: string | null;
  compensation_notes: string | null;
  application_date: Date | null;
  recruiter_contact_notes: string | null;
  interview_prep_notes: string | null;
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

type EventFilter = 'any' | 'upcoming' | 'none';

type StageFilter =
  | 'all'
  | 'Interested'
  | 'Applied'
  | 'Interview'
  | 'Offer'
  | 'Rejected'
  | 'Archived';

export type DashboardPageProps = {
  searchParams: Promise<{
    sort?: string | string[];
    q?: string | string[];
    stage?: string | string[];
    deadlineState?: string | string[];
    priority?: string | string[];
    events?: string | string[];
    openJob?: string | string[];
    tab?: string | string[];
    showArchived?: string | string[];
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

function parseBooleanParam(value: string | string[] | undefined) {
  const candidate = Array.isArray(value) ? value[0] : value;
  return candidate === 'true';
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

function parseOpenJobId(
  value: string | string[] | undefined,
  validIds: Set<string>,
): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  const id = typeof raw === 'string' ? raw.trim() : undefined;
  if (!id || !validIds.has(id)) {
    return undefined;
  }
  return id;
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

function parseDeadlineState(
  value: string | string[] | undefined,
): DeadlineState {
  const candidate = Array.isArray(value) ? value[0] : value;

  if (
    candidate === 'upcoming' ||
    candidate === 'past' ||
    candidate === 'noDeadline'
  ) {
    return candidate;
  }

  return 'any';
}

function parseEventFilter(value: string | string[] | undefined): EventFilter {
  const candidate = Array.isArray(value) ? value[0] : value;

  if (candidate === 'upcoming' || candidate === 'none') {
    return candidate;
  }

  return 'any';
}

function getJobWhere(
  userId: string,
  searchQuery: string,
  stageFilter: StageFilter,
  deadlineState: DeadlineState,
  priorityOnly: boolean,
  eventFilter: EventFilter,
) {
  const where: Record<string, unknown> = {
    user_id: userId,
  };

  if (searchQuery) {
    where.OR = [
      { title: { contains: searchQuery, mode: 'insensitive' } },
      { company_name: { contains: searchQuery, mode: 'insensitive' } },
      { location: { contains: searchQuery, mode: 'insensitive' } },
      { job_description: { contains: searchQuery, mode: 'insensitive' } },
      { compensation_notes: { contains: searchQuery, mode: 'insensitive' } },
      {
        recruiter_contact_notes: { contains: searchQuery, mode: 'insensitive' },
      },
      { interview_prep_notes: { contains: searchQuery, mode: 'insensitive' } },
      { custom_notes: { contains: searchQuery, mode: 'insensitive' } },
    ];
  }

  if (stageFilter !== 'all') {
    where.pipeline_stage = {
      equals: stageFilter,
    };
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

  if (priorityOnly) {
    where.priority_flag = true;
  }

  if (eventFilter !== 'any') {
    const now = new Date();
    const upcomingEventCondition = {
      TimelineEvent: {
        some: {
          occurred_at: { gte: now },
          event_type: { not: null },
        },
      },
    };

    if (eventFilter === 'upcoming') {
      where.AND = Array.isArray(where.AND)
        ? [...where.AND, upcomingEventCondition]
        : [upcomingEventCondition];
    }

    if (eventFilter === 'none') {
      const noUpcomingEventCondition = {
        TimelineEvent: {
          none: {
            occurred_at: { gte: now },
            event_type: { not: null },
          },
        },
      };

      where.AND = Array.isArray(where.AND)
        ? [...where.AND, noUpcomingEventCondition]
        : [noUpcomingEventCondition];
    }
  }

  return where;
}

const PIPELINE_STAGE_ORDER = [
  'Interested',
  'Applied',
  'Interview',
  'Offer',
  'Rejected',
] as const;

type PipelineStage = (typeof PIPELINE_STAGE_ORDER)[number];

type TimelineEventForAnalytics = {
  event_type: string | null;
  occurred_at: Date | null;
  notes: string | null;
};

function formatPercent(numerator: number, denominator: number) {
  if (denominator === 0) {
    return '0%';
  }

  return `${Math.round((numerator / denominator) * 100)}%`;
}

function getStageRank(stage: string) {
  const normalizedStage = toApplicationStatus(stage);
  const index = PIPELINE_STAGE_ORDER.indexOf(normalizedStage as PipelineStage);

  return index === -1 ? 0 : index;
}

function countJobsAtOrPastStage(jobs: DashboardJob[], stage: PipelineStage) {
  const targetRank = PIPELINE_STAGE_ORDER.indexOf(stage);

  return jobs.filter((job) => getStageRank(job.pipeline_stage) >= targetRank)
    .length;
}

function calculateAverageDaysBetweenEvents(
  jobsWithEvents: Array<{
    TimelineEvent?: TimelineEventForAnalytics[] | null;
  }>,
) {
  const durationsInDays: number[] = [];

  for (const job of jobsWithEvents) {
    const events = [...(job.TimelineEvent ?? [])]
      .filter(
        (
          event,
        ): event is TimelineEventForAnalytics & {
          occurred_at: Date;
        } => event.occurred_at !== null,
      )
      .sort((a, b) => a.occurred_at.getTime() - b.occurred_at.getTime());

    for (let i = 0; i < events.length - 1; i += 1) {
      const currentEvent = events[i];
      const nextEvent = events[i + 1];

      const days =
        (nextEvent.occurred_at.getTime() - currentEvent.occurred_at.getTime()) /
        1000 /
        60 /
        60 /
        24;

      if (days >= 0) {
        durationsInDays.push(days);
      }
    }
  }

  if (durationsInDays.length === 0) {
    return null;
  }

  const average =
    durationsInDays.reduce((sum, days) => sum + days, 0) /
    durationsInDays.length;

  return Math.round(average);
}

function calculateThirtyDayEventVelocity(
  jobsWithEvents: Array<{
    TimelineEvent?: TimelineEventForAnalytics[] | null;
  }>,
  now: Date,
) {
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  return jobsWithEvents.reduce((count, job) => {
    const recentEvents = (job.TimelineEvent ?? []).filter((event) => {
      return event.occurred_at !== null && event.occurred_at >= thirtyDaysAgo;
    });

    return count + recentEvents.length;
  }, 0);
}

function calculateEventVelocityForDays(
  jobsWithEvents: Array<{
    TimelineEvent?: TimelineEventForAnalytics[] | null;
  }>,
  now: Date,
  days: number,
) {
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - days);

  return jobsWithEvents.reduce((count, job) => {
    const recentEvents = (job.TimelineEvent ?? []).filter((event) => {
      return event.occurred_at !== null && event.occurred_at >= cutoff;
    });

    return count + recentEvents.length;
  }, 0);
}

function calculateActiveJobsForDays(
  jobsWithEvents: Array<{
    TimelineEvent?: TimelineEventForAnalytics[] | null;
  }>,
  now: Date,
  days: number,
) {
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - days);

  return jobsWithEvents.filter((job) =>
    (job.TimelineEvent ?? []).some(
      (event) => event.occurred_at !== null && event.occurred_at >= cutoff,
    ),
  ).length;
}

export default async function Dashboard({ searchParams }: DashboardPageProps) {
  const session = await getSession();
  const params = await searchParams;
  const sortOption = parseSortOption(params.sort);
  const searchQuery = parseTextQuery(params.q);
  const stageFilter = parseStageFilter(params.stage);
  const deadlineState = parseDeadlineState(params.deadlineState);
  const priorityOnly = parseBooleanParam(params.priority);
  const eventFilter = parseEventFilter(params.events);
  const initialTab = parseTextQuery(params.tab);
  const showArchived = parseBooleanParam(params.showArchived);

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
      archived: true,
      last_activity_date: true,
      deadline: true,
      priority_flag: true,
      job_description: true,
      compensation_notes: true,
      application_date: true,
      recruiter_contact_notes: true,
      interview_prep_notes: true,
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
        orderBy: [
          {
            occurred_at: 'asc',
          },
          {
            id: 'asc',
          },
        ],
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
      FollowUpTask: {
        select: {
          id: true,
          title: true,
          due_date: true,
          completed: true,
          notes: true,
        },
        orderBy: {
          due_date: 'asc',
        },
      },
    },
    where: getJobWhere(
      session.userId,
      searchQuery,
      stageFilter,
      deadlineState,
      priorityOnly,
      eventFilter,
    ),
    orderBy: getJobOrderBy(sortOption),
  });

  // Transform the data to match the expected format
  const jobs: DashboardJob[] = jobsWithRelations.map((job) => ({
    id: job.id,
    company_name: job.company_name,
    title: job.title,
    location: job.location,
    pipeline_stage: job.pipeline_stage,
    archived: job.archived,
    last_activity_date: job.last_activity_date,
    deadline: job.deadline,
    priority_flag: job.priority_flag,
    job_description: job.job_description,
    compensation_notes: job.compensation_notes,
    application_date: job.application_date,
    recruiter_contact_notes: job.recruiter_contact_notes,
    interview_prep_notes: job.interview_prep_notes,
    custom_notes: job.custom_notes,
  }));

  // Build timeline map from included data
  const timelineByJobId = new Map<
    string,
    Array<{
      id: string;
      event_type: string;
      occurred_at: Date;
      notes: string | null;
    }>
  >();
  for (const job of jobsWithRelations) {
    // Cast to the expected type since we filtered nulls in the query
    timelineByJobId.set(
      job.id,
      (job.TimelineEvent ?? []) as Array<{
        id: string;
        event_type: string;
        occurred_at: Date;
        notes: string | null;
      }>,
    );
  }

  // Build interviews map from included data
  const interviewsByJobId = new Map<
    string,
    Array<{
      id: string;
      round_type: string;
      scheduled_at: Date;
      notes: string | null;
    }>
  >();
  for (const job of jobsWithRelations) {
    interviewsByJobId.set(job.id, job.Interview ?? []);
  }

  // Build follow-ups map from included data
  const followUpsByJobId = new Map<
    string,
    Array<{
      id: string;
      title: string | null;
      due_date: Date | null;
      completed: boolean | null;
      notes: string | null;
    }>
  >();
  for (const job of jobsWithRelations) {
    followUpsByJobId.set(job.id, job.FollowUpTask ?? []);
  }

  const now = new Date();

  const metricJobs = showArchived ? jobs : jobs.filter((job) => !job.archived);

  const metricJobsWithRelations = showArchived
    ? jobsWithRelations
    : jobsWithRelations.filter((job) => !job.archived);

  // Get upcoming interviews for metrics
  const upcomingInterviewsList = metricJobsWithRelations.flatMap((job) =>
    (job.Interview ?? []).filter(
      (interview: { scheduled_at: Date }) => interview.scheduled_at >= now,
    ),
  );

  const upcomingFollowUps = metricJobsWithRelations.flatMap((job) =>
    (job.FollowUpTask ?? []).filter(
      (followUp: { due_date: Date | null; completed: boolean | null }) =>
        followUp.due_date !== null &&
        followUp.due_date >= now &&
        followUp.completed !== true,
    ),
  );

  const upcomingTimelineEvents = metricJobsWithRelations.flatMap((job) =>
    (job.TimelineEvent ?? []).filter(
      (event: { occurred_at: Date | null }) =>
        event.occurred_at !== null && event.occurred_at >= now,
    ),
  );

  const normalizedStages = metricJobs.map((job) =>
    toApplicationStatus(job.pipeline_stage),
  );
  const totalApplications = metricJobs.length;
  const openApplications = metricJobs.filter((job) => !job.archived).length;
  const upcomingDeadlines = metricJobs.filter(
    (job) => job.deadline !== null && job.deadline >= now,
  ).length;
  const upcomingInterviews = upcomingInterviewsList.length;
  const upcomingEvents =
    upcomingInterviews +
    upcomingFollowUps.length +
    upcomingTimelineEvents.length;
  const averageDaysSinceLastActivity =
    totalApplications === 0
      ? 0
      : Math.round(
          metricJobs.reduce(
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

  const appliedApplications = countJobsAtOrPastStage(metricJobs, 'Applied');
  const interviewApplications = countJobsAtOrPastStage(metricJobs, 'Interview');
  const offerApplications = countJobsAtOrPastStage(metricJobs, 'Offer');

  const appliedToInterviewConversion = formatPercent(
    interviewApplications,
    appliedApplications,
  );

  const interviewToOfferConversion = formatPercent(
    offerApplications,
    interviewApplications,
  );

  const averageDaysBetweenTimelineEvents = calculateAverageDaysBetweenEvents(
    metricJobsWithRelations,
  );

  const sevenDayVelocity = calculateEventVelocityForDays(
    metricJobsWithRelations,
    now,
    7,
  );

  const thirtyDayVelocity = calculateEventVelocityForDays(
    metricJobsWithRelations,
    now,
    30,
  );

  const activeJobsThirtyDays = calculateActiveJobsForDays(
    metricJobsWithRelations,
    now,
    30,
  );

  const stageCounts = PIPELINE_STAGE_ORDER.map((stage) => {
    const count = normalizedStages.filter((status) => status === stage).length;
    const percent =
      totalApplications === 0
        ? 0
        : Math.round((count / totalApplications) * 100);

    return {
      stage,
      count,
      percent,
    };
  });

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

    const followUpsForJob = followUpsByJobId.get(job.id) ?? [];
    const followUps = followUpsForJob.map((followUp) => {
      let dateString = '';
      if (followUp.due_date) {
        const dateObj =
          typeof followUp.due_date === 'string'
            ? new Date(followUp.due_date)
            : followUp.due_date;
        if (!Number.isNaN(dateObj.getTime())) {
          dateString = dateObj.toISOString().split('T')[0];
        }
      }
      return {
        id: followUp.id,
        title: followUp.title ?? '',
        date: dateString,
        notes: followUp.notes ?? '',
      };
    });

    return {
      id: job.id,
      company: job.company_name,
      title: job.title,
      location: job.location,
      archived: Boolean(job.archived),
      status: toApplicationStatus(job.pipeline_stage),
      lastActivityDateLabel: formatDate(job.last_activity_date),
      angle: getStableAngle(job.id),
      timeline,
      interviews,
      followUps,
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
        prepNotes: job.interview_prep_notes,
        otherNotes: job.custom_notes,
        archived: Boolean(job.archived),
      },
    };
  });

  const jobIdSet = new Set(jobsForModal.map((j) => j.id));
  const initialOpenJobId = parseOpenJobId(params.openJob, jobIdSet);

  return (
    <section className="px-6 py-12">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className={GRADIENT_HEADING_CLASS}>Dashboard</h1>
      </div>

      <div className="mx-auto mt-8 flex max-w-6xl flex-col gap-6 px-4 sm:px-0 lg:flex-row">
        <div className="min-w-0 flex-1 space-y-4">
          <JobSearchFilterControl />
          <JobsModalGrid
            initialJobs={jobsForModal}
            initialOpenJobId={initialOpenJobId}
            initialTab={initialTab}
          />
        </div>
        <div className="lg:pt-1">
          <DashboardMetrics
            applicationCounts={{
              total: totalApplications,
              open: openApplications,
              active: activeJobsThirtyDays,
            }}
            stageCounts={stageCounts}
            timelineCounts={{
              upcomingDeadlines,
              upcomingEvents,
            }}
            conversionRates={{
              appliedToInterview: appliedToInterviewConversion,
              interviewToOffer: interviewToOfferConversion,
            }}
            productivity={{
              avgDaysSinceLastActivity: averageDaysSinceLastActivity,
              avgDaysBetweenEvents: averageDaysBetweenTimelineEvents,
              sevenDayVelocity,
              thirtyDayVelocity,
            }}
          />
        </div>
      </div>
    </section>
  );
}
