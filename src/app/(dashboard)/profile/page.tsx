import GRADIENT_HEADING_CLASS from '@/components/dashboard/gradient';

export default function Profile() {
  return (
    <section className="px-6 py-12">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className={GRADIENT_HEADING_CLASS}>Profile</h1>
        <p className="mt-3 text-base text-[#d6d3cc]">
          Keep your personal details and application information up to date.
        </p>
      </div>
    </section>
  );
}
