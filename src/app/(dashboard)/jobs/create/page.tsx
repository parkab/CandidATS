import GRADIENT_HEADING_CLASS from '@/components/dashboard/gradient';
import { getSession } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import CreateJobForm from './create-job-form';

export default async function CreateJobApplication() {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  return (
    <section className="px-6 py-12">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className={GRADIENT_HEADING_CLASS}>Create a Job Application</h1>
        <p className="mt-3 text-sm text-(--text-muted)">
          Track your pipeline and details in one place.
        </p>
      </div>
      <CreateJobForm />
    </section>
  );
}
