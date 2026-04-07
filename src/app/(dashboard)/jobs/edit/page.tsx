import GRADIENT_HEADING_CLASS from '@/components/dashboard/gradient';
import { getSession } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import EditJobForm from './edit-job-form';

type EditJobPageProps = {
  searchParams?: Promise<{
    id?: string;
  }>;
};

export default async function EditJobApplication({
  searchParams,
}: EditJobPageProps) {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const jobId = resolvedSearchParams?.id?.trim();

  if (!jobId) {
    return (
      <section className="px-6 py-12">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className={GRADIENT_HEADING_CLASS}>Edit Job Application</h1>
          <p className="mt-3 text-sm text-(--text-muted)">
            Provide a job id in the URL to load the record for editing.
          </p>
        </div>
      </section>
    );
  }

  const job = await prisma.job.findUnique({
    where: { id: jobId },
  });

  if (!job || job.user_id !== session.userId) {
    redirect('/dashboard');
  }

  return (
    <section className="px-6 py-12">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className={GRADIENT_HEADING_CLASS}>Edit Job Application</h1>
        <p className="mt-3 text-sm text-(--text-muted)">
          Update your existing job record and keep your pipeline current.
        </p>
      </div>
      <EditJobForm
        initialJob={{
          id: job.id,
          title: job.title,
          company: job.company_name,
          location: job.location,
          stage: job.pipeline_stage,
          lastActivityDate: job.last_activity_date,
          deadline: job.deadline,
          priority: job.priority_flag,
          jobDescription: job.job_description,
          compensation: job.compensation_notes,
          applicationDate: job.application_date,
          recruiterNotes: job.recruiter_contact_notes,
          otherNotes: job.custom_notes,
        }}
      />
    </section>
  );
}
