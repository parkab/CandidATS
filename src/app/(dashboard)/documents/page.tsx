import GRADIENT_HEADING_CLASS from '@/components/dashboard/gradient';
import DocumentTable from '@/components/dashboard/document-table';

export default function Documents() {
  return (
    <section className="px-6 py-12">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className={GRADIENT_HEADING_CLASS}>Documents</h1>
      </div>
      <DocumentTable />
    </section>
  );
}
