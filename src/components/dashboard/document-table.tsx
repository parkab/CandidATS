// src/components/dashboard/document-list.tsx

import DocumentRow from './document-row';

type Document = {
  id: string;
  job: string;
  document: string;
  lastUpdated: string;
  status: 'Ready' | 'Needs review' | 'Draft';
};

export default function DocumentList() {
  const documents: Document[] = [
    {
      id: '1',
      job: 'Frontend Engineer',
      document: 'Resume - Senior Frontend',
      lastUpdated: 'Apr 28, 2026',
      status: 'Ready',
    },
    {
      id: '2',
      job: 'Data Analyst',
      document: 'Cover Letter - Data Analyst',
      lastUpdated: 'Apr 27, 2026',
      status: 'Needs review',
    },
    {
      id: '3',
      job: 'Product Designer',
      document: 'Portfolio Summary',
      lastUpdated: 'Apr 25, 2026',
      status: 'Draft',
    },
  ];

  return (
    <div className="mx-auto mt-8 max-w-5xl rounded-2xl border border-[--surface-border] bg-[--surface] shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[--surface-border] px-5 py-4">
        <div>
          <h2 className="text-lg font-semibold text-[--foreground]">Document List</h2>
          <p className="text-sm text-[--foreground-muted]">
            Track resumes, cover letters, and drafts in one place.
          </p>
        </div>
        <button
          type="button"
          className="rounded-lg border border-[--surface-border] px-3 py-2 text-sm font-medium text-[--foreground] transition hover:bg-[--surface-hover]"
        >
          + Upload
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px] table-auto">
          <caption className="sr-only">Documents for active applications</caption>
          <thead className="bg-[--surface-hover]">
            <tr>
              <th className="px-4 py-5 text-left text-xs font-semibold uppercase tracking-wide text-[--foreground-muted]">
                Job
              </th>
              <th className="px-4 py-5 text-left text-xs font-semibold uppercase tracking-wide text-[--foreground-muted]">
                Document
              </th>
              <th className="px-4 py-5 text-left text-xs font-semibold uppercase tracking-wide text-[--foreground-muted]">
                Last Updated
              </th>
              <th className="px-4 py-5 text-left text-xs font-semibold uppercase tracking-wide text-[--foreground-muted]">
                Status
              </th>
              <th className="px-4 py-5 text-right text-xs font-semibold uppercase tracking-wide text-[--foreground-muted]">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {documents.map((doc) => (
              <DocumentRow
                key={doc.id}
                job={doc.job}
                documentTitle={doc.document}
                lastUpdated={doc.lastUpdated}
                status={doc.status}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}