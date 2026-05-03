/** @jest-environment node */

import { getSession } from '@/lib/auth/session';
import { compileLatex } from '@/lib/latex/compile';
import { prisma } from '@/lib/prisma';
import { uploadPdf } from '@/lib/storage/pdf';
import { POST } from './route';

jest.mock('@/lib/auth/session', () => ({ getSession: jest.fn() }));

const mockDocCreate = jest.fn();
const mockVersionCreate = jest.fn();

jest.mock('@/lib/prisma', () => ({
  prisma: {
    document: { findFirst: jest.fn() },
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
jest.mock('@/lib/storage/pdf', () => ({ uploadPdf: jest.fn() }));

const mockedGetSession = jest.mocked(getSession);
const mockedDocFindFirst = jest.mocked(prisma.document.findFirst);
const mockedCompile = jest.mocked(compileLatex);
const mockedUpload = jest.mocked(uploadPdf);

const SESSION = { userId: 'user-1', email: 'a@b.com' };
const SOURCE_DOC = {
  id: 'doc-1',
  title: 'My Resume',
  job_id: 'job-1',
  type: 'resume',
  status: 'ready',
  tags: ['tailored'],
};
const RESUME_DATA = {
  header: { name: 'Jane', phone: '555', email: 'j@j.com' },
  education: [],
  experience: [],
  projects: [],
  skills: {},
};

function buildRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/api/documents/doc-1/fork', {
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
  mockedDocFindFirst.mockResolvedValue(SOURCE_DOC as never);
  mockedCompile.mockResolvedValue(Buffer.from('%PDF fake'));
  mockedUpload.mockResolvedValue('user-1/resumes/new.pdf');
  mockDocCreate.mockResolvedValue({ id: 'doc-forked' });
  mockVersionCreate.mockResolvedValue({ id: 'ver-1' });

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

describe('POST /api/documents/[id]/fork', () => {
  it('creates a new document and returns its id with 201', async () => {
    const res = await POST(
      buildRequest({ templateName: 'jakes-resume', structuredData: RESUME_DATA }),
      buildContext(),
    );
    expect(res.status).toBe(201);
    const body = (await res.json()) as { documentId: string };
    expect(body.documentId).toBe('doc-forked');
  });

  it('uses provided title in the new document', async () => {
    await POST(
      buildRequest({ templateName: 'jakes-resume', structuredData: RESUME_DATA, title: 'Concise Resume' }),
      buildContext(),
    );
    expect(mockDocCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ title: 'Concise Resume' }) }),
    );
  });

  it('falls back to source document title when no title provided', async () => {
    await POST(
      buildRequest({ templateName: 'jakes-resume', structuredData: RESUME_DATA }),
      buildContext(),
    );
    expect(mockDocCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ title: 'My Resume' }) }),
    );
  });

  it('new version always has versionNumber 1', async () => {
    await POST(
      buildRequest({ templateName: 'jakes-resume', structuredData: RESUME_DATA }),
      buildContext(),
    );
    expect(mockVersionCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ versionNumber: 1 }) }),
    );
  });

  it('links the new document to the source document job_id', async () => {
    await POST(
      buildRequest({ templateName: 'jakes-resume', structuredData: RESUME_DATA }),
      buildContext(),
    );
    expect(mockDocCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ job_id: 'job-1' }) }),
    );
  });

  it('returns 401 when not authenticated', async () => {
    mockedGetSession.mockResolvedValue(null);
    const res = await POST(buildRequest({ templateName: 'jakes-resume', structuredData: RESUME_DATA }), buildContext());
    expect(res.status).toBe(401);
  });

  it('returns 404 when document not found or not owned by user', async () => {
    mockedDocFindFirst.mockResolvedValue(null);
    const res = await POST(buildRequest({ templateName: 'jakes-resume', structuredData: RESUME_DATA }), buildContext());
    expect(res.status).toBe(404);
  });

  it('returns 400 for invalid templateName', async () => {
    const { isSupportedTemplate } = jest.requireMock('@/lib/latex/render') as { isSupportedTemplate: jest.Mock };
    isSupportedTemplate.mockReturnValue(false);
    const res = await POST(buildRequest({ templateName: 'bad', structuredData: RESUME_DATA }), buildContext());
    expect(res.status).toBe(400);
  });

  it('returns 502 when PDF compilation fails', async () => {
    mockedCompile.mockRejectedValue(new Error('Tectonic error'));
    const res = await POST(buildRequest({ templateName: 'jakes-resume', structuredData: RESUME_DATA }), buildContext());
    expect(res.status).toBe(502);
  });
});
