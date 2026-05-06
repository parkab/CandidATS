import GRADIENT_HEADING_CLASS from '@/components/dashboard/gradient';
import DocumentTable from '@/components/dashboard/document-table';

export default function Documents() {
  return (
    <section className="px-5 py-10 sm:px-8 sm:py-14">
      <div className="mx-auto max-w-3xl text-center">
        <h1 className={GRADIENT_HEADING_CLASS}>Documents</h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-[--text-muted] sm:text-base">
          Resumes, cover letters, and notes tied to your job pipeline.
        </p>
      </div>
      <DocumentTable />
    </section>
  );
}
