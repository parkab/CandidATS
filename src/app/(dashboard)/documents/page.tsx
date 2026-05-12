'use client';

import { useState } from 'react';
import GRADIENT_HEADING_CLASS from '@/components/dashboard/gradient';
import DocumentTable from '@/components/dashboard/document-table';
import DocumentUpload from '@/components/dashboard/document-upload';

export default function Documents() {
  const [refreshToken, setRefreshToken] = useState(0);

  return (
    <section className="px-5 py-10 sm:px-8 sm:py-14">
      <div className="flex justify-center mb-4">
        <h1 className={GRADIENT_HEADING_CLASS}>Documents</h1>
      </div>
      <div className="mx-auto max-w-7xl">
        <DocumentUpload
          onUploadSuccess={() => setRefreshToken((prev) => prev + 1)}
        />
        <DocumentTable key={refreshToken} />
      </div>
    </section>
  );
}
