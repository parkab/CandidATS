/** @jest-environment node */

import { getSession } from '@/lib/auth/session';
import { compileLatex } from '@/lib/latex/compile';
import {
  DOCUMENTS_BUCKET,
  encodeStoredFileContent,
} from '@/lib/documents/metadata';
import { prisma } from '@/lib/prisma';
import { uploadPdf } from '@/lib/storage/pdf';
import { POST } from './route';

jest.mock('@/lib/auth/session', () => ({ getSession: jest.fn() }));

const mockDocCreate = jest.fn();
const mockVersionCreate = jest.fn();

jest.mock('@/lib/prisma', () => ({
  prisma: {
    job: { findFirst: jest.fn() },
    document: { findFirst: jest.fn(), create: jest.fn() },
    documentVersion: { findFirst: jest.fn() },
    $transaction: jest.fn().mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({ document: { create: mockDocCreate }, documentVersion: { create: mockVersionCreate } }),
    ),
  },
}));

jest.mock('@/lib/latex/compile', () => ({ compileLatex: jest.fn() }));
jest.mock('@/lib/latex/render', () => ({
  isSupportedTemplate: jest.fn(),
  renderTemplate: jest.fn(),
  documentTypeFromTemplate: jest.fn(),
}));
jest.mock('@/lib/storage/pdf', () => ({ uploadPdf: jest.fn(), deletePdf: jest.fn() }));

const mockCopy = jest.fn();
jest.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    storage: {
      from: jest.fn(() => ({
        copy: mockCopy,
      })),
    },
  },
}));

const mockedGetSession = jest.mocked(getSession);
const mockedJobFindFirst = jest.mocked(prisma.job.findFirst);
const mockedDocFindFirst = jest.mocked(prisma.document.findFirst);
const mockedPrismaDocumentCreate = jest.mocked(prisma.document.create);
const mockedVersionFindFirst = jest.mocked(prisma.documentVersion.findFirst);
const mockedCompile = jest.mocked(compileLatex);
const mockedUpload = jest.mocked(uploadPdf);

const SESSION = { userId: 'user-1', email: 'a@b.com' };
const SOURCE_DOC_LATEX = {
  id: 'doc-1',
  title: 'My Resume',
  content: '',
  type: 'resume',
  status: 'ready',
  tags: ['a'],
};
const VERSION_ROW = {
  id: 'ver-1',
  documentId: 'doc-1',
  versionNumber: 1,
  templateName: 'jakes-resume',
  structuredData: { header: { name: 'X' } },
  latexSource: 'old',
  pdfUrl: 'old.pdf',
  changeNotes: null,
};

function buildRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/api/documents/doc-1/duplicate', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }) as never;
}

function buildContext() {
  return { params: Promise.resolve({ id: 'doc-1' }) };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedGetSession.mockResolvedValue(SESSION);
  mockedJobFindFirst.mockResolvedValue({ id: 'job-2' } as never);
  mockedDocFindFirst.mockResolvedValue(SOURCE_DOC_LATEX as never);
  mockedVersionFindFirst.mockResolvedValue(VERSION_ROW as never);
  mockedCompile.mockResolvedValue(Buffer.from('%PDF fake'));
  mockedUpload.mockResolvedValue('user-1/resumes/new.pdf');
  mockDocCreate.mockResolvedValue({ id: 'doc-dup' });
  mockVersionCreate.mockResolvedValue({ id: 'ver-new' });

  const { isSupportedTemplate, renderTemplate, documentTypeFromTemplate } =
    jest.requireMock('@/lib/latex/render') as {
      isSupportedTemplate: jest.Mock;
      renderTemplate: jest.Mock;
      documentTypeFromTemplate: jest.Mock;
    };
  isSupportedTemplate.mockReturnValue(true);
  renderTemplate.mockReturnValue('\\documentclass{article}...');
  documentTypeFromTemplate.mockReturnValue('resume');
});

describe('POST /api/documents/[id]/duplicate (LaTeX)', () => {
  it('returns 201 and documentId', async () => {
    const res = await POST(
      buildRequest({ title: 'Copy', jobId: 'job-2' }),
      buildContext(),
    );
    expect(res.status).toBe(201);
    const body = (await res.json()) as { documentId: string };
    expect(body.documentId).toBe('doc-dup');
  });

  it('creates document with target jobId', async () => {
    await POST(buildRequest({ title: 'Copy', jobId: 'job-2' }), buildContext());
    expect(mockDocCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ job_id: 'job-2', title: 'Copy' }),
      }),
    );
  });

  it('returns 404 when job not owned', async () => {
    mockedJobFindFirst.mockResolvedValue(null);
    const res = await POST(buildRequest({ title: 'Copy', jobId: 'job-x' }), buildContext());
    expect(res.status).toBe(404);
  });

  it('returns 404 when document missing', async () => {
    mockedDocFindFirst.mockResolvedValue(null);
    const res = await POST(buildRequest({ title: 'Copy', jobId: 'job-2' }), buildContext());
    expect(res.status).toBe(404);
  });

  it('returns 400 when title missing', async () => {
    const res = await POST(buildRequest({ jobId: 'job-2' }), buildContext());
    expect(res.status).toBe(400);
  });

  it('returns 400 when jobId missing', async () => {
    const res = await POST(buildRequest({ title: 'Copy' }), buildContext());
    expect(res.status).toBe(400);
  });

  it('returns 401 when unauthenticated', async () => {
    mockedGetSession.mockResolvedValue(null);
    const res = await POST(buildRequest({ title: 'Copy', jobId: 'job-2' }), buildContext());
    expect(res.status).toBe(401);
  });

  it('returns 502 when compile fails', async () => {
    mockedCompile.mockRejectedValue(new Error('fail'));
    const res = await POST(buildRequest({ title: 'Copy', jobId: 'job-2' }), buildContext());
    expect(res.status).toBe(502);
  });
});

describe('POST /api/documents/[id]/duplicate (file)', () => {
  const fileContent = encodeStoredFileContent({
    kind: 'file',
    bucket: DOCUMENTS_BUCKET,
    path: 'user-1/resumes/old.pdf',
    fileName: 'resume.pdf',
    mimeType: 'application/pdf',
    size: 100,
  });

  beforeEach(() => {
    mockedVersionFindFirst.mockResolvedValue(null);
    mockedDocFindFirst.mockResolvedValue({
      ...SOURCE_DOC_LATEX,
      content: fileContent,
    } as never);
    mockCopy.mockResolvedValue({ data: { path: 'new' }, error: null });
    mockedPrismaDocumentCreate.mockResolvedValue({ id: 'file-dup' } as never);
  });

  it('copies storage and creates document', async () => {
    const res = await POST(
      buildRequest({ title: 'Resume copy', jobId: 'job-2' }),
      buildContext(),
    );
    expect(res.status).toBe(201);
    expect(mockCopy).toHaveBeenCalled();
    expect(mockDocCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          job_id: 'job-2',
          title: 'Resume copy',
        }),
      }),
    );
    expect(mockVersionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          templateName: 'uploaded',
          versionNumber: 2,
        }),
      }),
    );
  });
});

describe('POST /api/documents/[id]/duplicate (no content)', () => {
  it('returns 422 when no version and no file', async () => {
    mockedVersionFindFirst.mockResolvedValue(null);
    mockedDocFindFirst.mockResolvedValue({
      ...SOURCE_DOC_LATEX,
      content: 'not-a-file-json',
    } as never);

    const res = await POST(
      buildRequest({ title: 'N', jobId: 'job-2' }),
      buildContext(),
    );
    expect(res.status).toBe(422);
  });
});
