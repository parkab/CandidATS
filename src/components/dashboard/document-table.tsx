// src/components/dashboard/document-list.tsx

import DocumentRow from './document-row';

type Document = {
  id: string;
  title: string;
  lastUpdated: string;
  status: string;
};

export default function DocumentList() {
  return (
    <table className="table-auto w-full border-separate border-spacing-y-4">
      <thead>
        <tr>
          <th className="text-left w-1/4">Job</th>
          <th className="text-left w-1/4">Document</th>
          <th className="text-left w-1/4">Last Updated</th>
          <th className="text-left w-1/4">Status</th>
        </tr>
      </thead>
      <tbody>
        <DocumentRow job="Job 1" document="Document 1" lastUpdated="2021-01-01" status="Status 1" />
        <DocumentRow job="Job 2" document="Document 2" lastUpdated="2021-01-02" status="Status 2" />
        <DocumentRow job="Job 3" document="Document 3" lastUpdated="2021-01-03" status="Status 3" />
      </tbody>
    </table>
  );
}