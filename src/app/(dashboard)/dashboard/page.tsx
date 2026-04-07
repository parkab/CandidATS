import GRADIENT_HEADING_CLASS from '@/components/dashboard/gradient';
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

export default async function Dashboard() {
  const session = await getSession();

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

  const jobs: DashboardJob[] = await prisma.job.findMany({
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
      user_id: session.userId,
    },
    orderBy: {
      last_activity_date: 'desc',
    },
  });

  const jobsForModal = jobs.map((job: DashboardJob) => ({
    id: job.id,
    company: job.company_name,
    title: job.title,
    location: job.location,
    status: toApplicationStatus(job.pipeline_stage),
    lastActivityDateLabel: formatDate(job.last_activity_date),
    angle: getStableAngle(job.id),
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
  }));

  return (
    <section className="px-6 py-12">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className={GRADIENT_HEADING_CLASS}>Dashboard</h1>
      </div>

      <JobsModalGrid jobs={jobsForModal} />
    </section>
  );
}
