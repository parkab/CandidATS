import GRADIENT_HEADING_CLASS from '@/components/dashboard/gradient';

export default function Dashboard() {
  return (
    <section className="px-6 py-12">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className={GRADIENT_HEADING_CLASS}>Dashboard</h1>
        <p className="mt-3 text-base text-(--text-muted)">
          View all of your job applications in one place!
        </p>
      </div>
    </section>
  );
}
