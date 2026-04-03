import GRADIENT_HEADING_CLASS from '@/components/dashboard/gradient';
import PolaroidAddCard from '@/components/dashboard/polaroid-add-card';
import PolaroidCard from '@/components/dashboard/polaroid-card';
import PolaroidLandingCard from '@/components/dashboard/polaroid-landing-card';
import type { ApplicationStatus } from '@/lib/jobs/status';
import Link from 'next/link';

// TODO: Remove mock jobs and replace with real data
type MockJob = {
  id: string;
  company: string;
  location: string;
  position: string;
  lastActivityDate: string;
  status: ApplicationStatus;
};

const MOCK_JOBS: MockJob[] = [
  {
    id: 'stripe-frontend-engineer',
    company: 'Stripe',
    location: 'San Francisco, CA',
    position: 'Software Engineer',
    lastActivityDate: '03.30.2026',
    status: 'Applied',
  },
];

const CARD_ANGLES = [-3, -2, -1, 0, 1, 2, 3];

function getStableAngle(id: string) {
  const hash = Array.from(id).reduce(
    (sum, char) => sum + char.charCodeAt(0),
    0,
  );
  return CARD_ANGLES[hash % CARD_ANGLES.length];
}

export default function Dashboard() {
  const isLoggedIn = process.env.MOCK_USER === 'true';

  if (!isLoggedIn) {
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

  return (
    <section className="px-6 py-12">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className={GRADIENT_HEADING_CLASS}>Dashboard</h1>
      </div>

      <div className="mx-auto mt-12 grid max-w-6xl gap-8 grid-cols-[repeat(auto-fit,minmax(15rem,1fr))]">
        <PolaroidAddCard />
        {MOCK_JOBS.map((job) => (
          <PolaroidCard
            key={job.id}
            company={job.company}
            location={job.location}
            position={job.position}
            lastActivityDate={job.lastActivityDate}
            status={job.status}
            angle={getStableAngle(job.id)}
          />
        ))}
      </div>
    </section>
  );
}
