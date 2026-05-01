/** @jest-environment node */

import { getSession } from '@/lib/auth/session';
import { compileLatex } from '@/lib/latex/compile';
import { prisma } from '@/lib/prisma';
import { uploadPdf } from '@/lib/storage/pdf';
import { GET, PATCH } from './route';

jest.mock('@/lib/auth/session', () => ({ getSession: jest.fn() }));
jest.mock('@/lib/prisma', () => ({
  prisma: {
    document: { findFirst: jest.fn(), update: jest.fn() },
    documentVersion: { findFirst: jest.fn(), update: jest.fn(), create: jest.fn() },
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
const mockedDocFind = jest.mocked(prisma.document.findFirst);
const mockedVersionFind = jest.mocked(prisma.documentVersion.findFirst);
const mockedVersionUpdate = jest.mocked(prisma.documentVersion.update);
const mockedVersionCreate = jest.mocked(prisma.documentVersion.create);
const mockedCompile = jest.mocked(compileLatex);
const mockedUpload = jest.mocked(uploadPdf);

const SESSION = { userId: 'user-1', email: 'a@b.com' };
const MOCK_DOC = { id: 'doc-1', title: 'My Resume' };
const MOCK_VERSION = {
  id: 'ver-1',
  documentId: 'doc-1',
  versionNumber: 2,
  templateName: 'jakes-resume',
  structuredData: { header: { name: 'Jane Doe' } },
  latexSource: '\\documentclass{article}',
  pdfUrl: 'user-1/resumes/abc.pdf',
  changeNotes: null,
};

const RESUME_DATA = {
  header: { name: 'Jane', phone: '555', email: 'j@j.com' },
  education: [],
  experience: [],
  projects: [],
  skills: {},
};

function buildGetRequest() {
  return new Request('http://localhost/api/documents/doc-1/version') as never;
}

function buildPatchRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/api/documents/doc-1/version', {
    method: 'PATCH',
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
  mockedDocFind.mockResolvedValue(MOCK_DOC as never);
  mockedVersionFind.mockResolvedValue(MOCK_VERSION as never);
  mockedCompile.mockResolvedValue(Buffer.from('%PDF fake'));
  mockedUpload.mockResolvedValue('user-1/resumes/new.pdf');
  mockedVersionUpdate.mockResolvedValue({ ...MOCK_VERSION, pdfUrl: 'user-1/resumes/new.pdf' } as never);
  mockedVersionCreate.mockResolvedValue({ ...MOCK_VERSION, versionNumber: 1 } as never);

  // isSupportedTemplate returns true for known templates
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

describe('GET /api/documents/[id]/version', () => {
  it('returns the latest version and document title', async () => {
    const res = await GET(buildGetRequest(), buildContext());
    expect(res.status).toBe(200);
    const body = (await res.json()) as { version: typeof MOCK_VERSION; title: string };
    expect(body.version.versionNumber).toBe(2);
    expect(body.title).toBe('My Resume');
  });

  it('returns version: null when no version exists', async () => {
    mockedVersionFind.mockResolvedValue(null);
    const res = await GET(buildGetRequest(), buildContext());
    expect(res.status).toBe(200);
    const body = (await res.json()) as { version: null };
    expect(body.version).toBeNull();
  });

  it('returns 401 when not authenticated', async () => {
    mockedGetSession.mockResolvedValue(null);
    const res = await GET(buildGetRequest(), buildContext());
    expect(res.status).toBe(401);
  });
});

describe('PATCH /api/documents/[id]/version', () => {
  it('updates existing version and returns 200', async () => {
    const res = await PATCH(
      buildPatchRequest({ templateName: 'jakes-resume', structuredData: RESUME_DATA }),
      buildContext(),
    );
    expect(res.status).toBe(200);
    expect(mockedVersionUpdate).toHaveBeenCalled();
    expect(mockedVersionCreate).not.toHaveBeenCalled();
  });

  it('creates version 1 when no existing version', async () => {
    mockedVersionFind.mockResolvedValue(null);
    const res = await PATCH(
      buildPatchRequest({ templateName: 'jakes-resume', structuredData: RESUME_DATA }),
      buildContext(),
    );
    expect(res.status).toBe(200);
    expect(mockedVersionCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ versionNumber: 1 }) }),
    );
  });

  it('returns 400 for invalid templateName', async () => {
    const { isSupportedTemplate } = jest.requireMock('@/lib/latex/render') as {
      isSupportedTemplate: jest.Mock;
    };
    isSupportedTemplate.mockReturnValue(false);
    const res = await PATCH(
      buildPatchRequest({ templateName: 'bad-template', structuredData: RESUME_DATA }),
      buildContext(),
    );
    expect(res.status).toBe(400);
  });

  it('returns 502 when PDF compilation fails', async () => {
    mockedCompile.mockRejectedValue(new Error('Tectonic error: missing package'));
    const res = await PATCH(
      buildPatchRequest({ templateName: 'jakes-resume', structuredData: RESUME_DATA }),
      buildContext(),
    );
    expect(res.status).toBe(502);
  });

  it('returns 401 when not authenticated', async () => {
    mockedGetSession.mockResolvedValue(null);
    const res = await PATCH(
      buildPatchRequest({ templateName: 'jakes-resume', structuredData: RESUME_DATA }),
      buildContext(),
    );
    expect(res.status).toBe(401);
  });
});
