/** @jest-environment node */

import { getSession } from '@/lib/auth/session';
import { compileLatex } from '@/lib/latex/compile';
import { prisma } from '@/lib/prisma';
import { uploadPdf } from '@/lib/storage/pdf';
import { POST } from './route';

jest.mock('@/lib/auth/session', () => ({ getSession: jest.fn() }));
jest.mock('@/lib/prisma', () => {
  const mockDocVersion = { findFirst: jest.fn(), create: jest.fn() };
  return {
    prisma: {
      document: { findFirst: jest.fn() },
      documentVersion: mockDocVersion,
      $transaction: jest.fn().mockImplementation(async (fn: (tx: unknown) => unknown) =>
        fn({ documentVersion: mockDocVersion }),
      ),
    },
  };
});
jest.mock('@/lib/latex/compile', () => ({ compileLatex: jest.fn() }));
jest.mock('@/lib/storage/pdf', () => ({ uploadPdf: jest.fn() }));

const mockedGetSession = jest.mocked(getSession);
const mockedDocFindFirst = jest.mocked(prisma.document.findFirst);
const mockedVersionFindFirst = jest.mocked(prisma.documentVersion.findFirst);
const mockedVersionCreate = jest.mocked(prisma.documentVersion.create);
const mockedCompile = jest.mocked(compileLatex);
const mockedUploadPdf = jest.mocked(uploadPdf);

const CONTEXT = { params: Promise.resolve({ id: 'doc-1' }) };

function buildRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/api/documents/doc-1/versions', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const SESSION = { userId: 'user-1', email: 'a@b.com' };
const RESUME_DATA = {
  header: { name: 'Jane', phone: '555', email: 'j@j.com' },
  education: [],
  experience: [],
  projects: [],
  skills: {},
};
const FAKE_VERSION = {
  id: 'ver-1',
  documentId: 'doc-1',
  versionNumber: 1,
  templateName: 'jakes-resume',
  structuredData: RESUME_DATA,
  latexSource: '\\documentclass{}',
  pdfUrl: 'user-1/resumes/uuid.pdf',
  changeNotes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => {
  jest.clearAllMocks();
  mockedGetSession.mockResolvedValue(SESSION);
  mockedDocFindFirst.mockResolvedValue({ id: 'doc-1' } as never);
  mockedVersionFindFirst.mockResolvedValue(null);
  mockedCompile.mockResolvedValue(Buffer.from('%PDF fake'));
  mockedUploadPdf.mockResolvedValue('user-1/resumes/uuid.pdf');
  mockedVersionCreate.mockResolvedValue(FAKE_VERSION as never);
});

describe('POST /api/documents/[id]/versions', () => {
  it('creates version 1 when no existing versions', async () => {
    const res = await POST(
      buildRequest({ templateName: 'jakes-resume', structuredData: RESUME_DATA }),
      CONTEXT,
    );
    expect(res.status).toBe(201);
    expect(mockedVersionCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ versionNumber: 1 }) }),
    );
  });

  it('increments version number from existing latest', async () => {
    mockedVersionFindFirst.mockResolvedValue({ versionNumber: 3 } as never);
    await POST(
      buildRequest({ templateName: 'jakes-resume', structuredData: RESUME_DATA }),
      CONTEXT,
    );
    expect(mockedVersionCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ versionNumber: 4 }) }),
    );
  });

  it('returns 401 when not authenticated', async () => {
    mockedGetSession.mockResolvedValue(null);
    const res = await POST(
      buildRequest({ templateName: 'jakes-resume', structuredData: RESUME_DATA }),
      CONTEXT,
    );
    expect(res.status).toBe(401);
  });
});
