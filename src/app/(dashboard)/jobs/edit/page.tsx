import GRADIENT_HEADING_CLASS from '@/components/dashboard/gradient';
import { getSession } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import EditJobForm from './edit-job-form';

export default async function EditJobApplication() {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  return (
    <section className="px-6 py-12">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className={GRADIENT_HEADING_CLASS}>Edit Job Application</h1>
        <p className="mt-3 text-sm text-(--text-muted)">
          Update your existing job record and keep your pipeline current.
        </p>
      </div>
      <EditJobForm />
    </section>
  );
}
