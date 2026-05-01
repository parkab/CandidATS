/** @jest-environment node */

import { getSession } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { GET } from './route';

jest.mock('@/lib/auth/session', () => ({ getSession: jest.fn() }));
jest.mock('@/lib/prisma', () => ({
  prisma: {
    document: { findFirst: jest.fn() },
    documentVersion: { findFirst: jest.fn() },
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

const SESSION = { userId: 'user-1', email: 'a@b.com' };
const MOCK_DOC = { id: 'doc-1' };
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

function buildRequest() {
  return new Request('http://localhost/api/documents/doc-1/version') as never;
}

function buildContext() {
  return { params: Promise.resolve({ id: 'doc-1' }) };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedGetSession.mockResolvedValue(SESSION);
  mockedDocFind.mockResolvedValue(MOCK_DOC as never);
  mockedVersionFind.mockResolvedValue(MOCK_VERSION as never);
});

describe('GET /api/documents/[id]/version', () => {
  it('returns the latest version when one exists', async () => {
    const res = await GET(buildRequest(), buildContext());
    expect(res.status).toBe(200);
    const body = (await res.json()) as { version: typeof MOCK_VERSION };
    expect(body.version.versionNumber).toBe(2);
    expect(body.version.templateName).toBe('jakes-resume');
  });

  it('returns version: null when no version exists', async () => {
    mockedVersionFind.mockResolvedValue(null);
    const res = await GET(buildRequest(), buildContext());
    expect(res.status).toBe(200);
    const body = (await res.json()) as { version: null };
    expect(body.version).toBeNull();
  });

  it('returns 401 when not authenticated', async () => {
    mockedGetSession.mockResolvedValue(null);
    const res = await GET(buildRequest(), buildContext());
    expect(res.status).toBe(401);
  });
});
