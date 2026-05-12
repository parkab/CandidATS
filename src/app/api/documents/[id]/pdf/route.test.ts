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
jest.mock('@/lib/storage/pdf', () => ({
  createPdfSignedUrl: jest.fn(),
}));
jest.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    storage: {
      from: jest.fn(() => ({
        createSignedUrl: jest.fn(),
      })),
    },
  },
}));

import { createPdfSignedUrl } from '@/lib/storage/pdf';
import { getSupabaseAdmin } from '@/lib/supabase';
import { encodeStoredFileContent, DOCUMENTS_BUCKET } from '@/lib/documents/metadata';

const mockedGetSession = jest.mocked(getSession);
const mockedDocFind = jest.mocked(prisma.document.findFirst);
const mockedVersionFind = jest.mocked(prisma.documentVersion.findFirst);
const mockedCreatePdfSignedUrl = jest.mocked(createPdfSignedUrl);

const SESSION = { userId: 'user-1', email: 'a@b.com' };

function buildRequest() {
  return new Request('http://localhost/api/documents/doc-1/pdf') as never;
}

function buildContext(id = 'doc-1') {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedGetSession.mockResolvedValue(SESSION);
  mockedVersionFind.mockResolvedValue(null);
  mockedCreatePdfSignedUrl.mockResolvedValue('https://signed.example/doc.pdf');
});

describe('GET /api/documents/[id]/pdf', () => {
  it('returns 401 when not authenticated', async () => {
    mockedGetSession.mockResolvedValue(null);
    mockedDocFind.mockResolvedValue(null);
    const res = await GET(buildRequest(), buildContext());
    expect(res.status).toBe(401);
  });

  it('returns 404 when document does not belong to user', async () => {
    mockedDocFind.mockResolvedValue(null);
    const res = await GET(buildRequest(), buildContext());
    expect(res.status).toBe(404);
  });

  it('returns generated PDF via DocumentVersion.pdfUrl', async () => {
    mockedDocFind.mockResolvedValue({
      id: 'doc-1',
      title: 'My Resume',
      content: '',
    } as never);
    mockedVersionFind.mockResolvedValue({ pdfUrl: 'user-1/resumes/abc.pdf' } as never);

    const res = await GET(buildRequest(), buildContext());
    expect(res.status).toBe(200);

    const body = (await res.json()) as { title: string; signedUrl: string; mimeType: string };
    expect(body.title).toBe('My Resume');
    expect(body.mimeType).toBe('application/pdf');
    expect(body.signedUrl).toBe('https://signed.example/doc.pdf');
    expect(mockedCreatePdfSignedUrl).toHaveBeenCalledWith('user-1/resumes/abc.pdf');
  });

  it('returns uploaded PDF via StoredFileDocumentContent', async () => {
    const storedContent = encodeStoredFileContent({
      kind: 'file',
      bucket: DOCUMENTS_BUCKET,
      path: 'user-1/resumes/upload.pdf',
      fileName: 'upload.pdf',
      mimeType: 'application/pdf',
      size: 1024,
    });

    mockedDocFind.mockResolvedValue({
      id: 'doc-1',
      title: 'Uploaded Resume',
      content: storedContent,
    } as never);

    const storageFrom = jest.mocked(supabaseAdmin!.storage.from);
    const signedUrlMock = { createSignedUrl: jest.fn().mockResolvedValue({
      data: { signedUrl: 'https://supabase.example/signed' },
      error: null,
    })};
    storageFrom.mockReturnValue(signedUrlMock as never);

    const res = await GET(buildRequest(), buildContext());
    expect(res.status).toBe(200);

    const body = (await res.json()) as { title: string; signedUrl: string; mimeType: string };
    expect(body.title).toBe('Uploaded Resume');
    expect(body.mimeType).toBe('application/pdf');
    expect(body.signedUrl).toBe('https://supabase.example/signed');
  });

  it('returns uploaded TXT with correct mimeType', async () => {
    const storedContent = encodeStoredFileContent({
      kind: 'file',
      bucket: DOCUMENTS_BUCKET,
      path: 'user-1/other/notes.txt',
      fileName: 'notes.txt',
      mimeType: 'text/plain',
      size: 42,
    });

    mockedDocFind.mockResolvedValue({
      id: 'doc-1',
      title: 'Notes',
      content: storedContent,
    } as never);

    const storageFrom = jest.mocked(supabaseAdmin!.storage.from);
    storageFrom.mockReturnValue({
      createSignedUrl: jest.fn().mockResolvedValue({
        data: { signedUrl: 'https://supabase.example/notes' },
        error: null,
      }),
    } as never);

    const res = await GET(buildRequest(), buildContext());
    const body = (await res.json()) as { mimeType: string };
    expect(body.mimeType).toBe('text/plain');
  });

  it('returns signedUrl: null when document has no file and no version', async () => {
    mockedDocFind.mockResolvedValue({
      id: 'doc-1',
      title: 'Plain Doc',
      content: 'just plain text',
    } as never);

    const res = await GET(buildRequest(), buildContext());
    expect(res.status).toBe(200);
    const body = (await res.json()) as { signedUrl: null };
    expect(body.signedUrl).toBeNull();
  });

  it('does not return another user\'s document (ownership enforced)', async () => {
    // Document scoped by user_id → findFirst returns null for wrong user
    mockedDocFind.mockResolvedValue(null);

    const res = await GET(buildRequest(), buildContext());
    expect(res.status).toBe(404);
  });
});
