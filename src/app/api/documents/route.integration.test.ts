/** @jest-environment node */

import { NextRequest } from 'next/server';
import {
  encodeStoredFileContent,
  DOCUMENTS_BUCKET,
} from '@/lib/documents/metadata';
import { getSession } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';

import { POST, GET } from './route';
import {
  GET as GET_ITEM,
  PATCH as PATCH_ITEM,
  DELETE as DELETE_ITEM,
} from './[id]/route';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    job: { findFirst: jest.fn() },
    document: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

jest.mock('@/lib/auth/session', () => ({
  getSession: jest.fn(),
}));

const storageStub = {
  upload: jest.fn(),
  createSignedUrl: jest.fn(),
  copy: jest.fn(),
  remove: jest.fn(),
};

jest.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    storage: {
      from: jest.fn(() => storageStub),
    },
  },
}));

const mockedGetSession = jest.mocked(getSession);
const mockedJobFind = jest.mocked(prisma.job.findFirst);
const mockedDocCreate = jest.mocked(prisma.document.create);
const mockedDocFindMany = jest.mocked(prisma.document.findMany);
const mockedDocFindFirst = jest.mocked(prisma.document.findFirst);
const mockedDocUpdate = jest.mocked(prisma.document.update);
const mockedDocDelete = jest.mocked(prisma.document.delete);

type SessionResult = Awaited<ReturnType<typeof getSession>>;
type JobFindFirstResult = Awaited<ReturnType<typeof prisma.job.findFirst>>;
type DocumentCreateResult = Awaited<ReturnType<typeof prisma.document.create>>;
type DocumentFindManyResult = Awaited<
  ReturnType<typeof prisma.document.findMany>
>;
type DocumentFindFirstResult = Awaited<
  ReturnType<typeof prisma.document.findFirst>
>;
type DocumentUpdateResult = Awaited<ReturnType<typeof prisma.document.update>>;
type DocumentDeleteResult = Awaited<ReturnType<typeof prisma.document.delete>>;

type RouteParamsContext = { params: Promise<{ id: string }> };

const documentRouteContext = (id: string): RouteParamsContext => ({
  params: Promise.resolve({ id }),
});

function buildJsonRequest(path: string, body: object) {
  return new Request(path, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      cookie: 'sb-access-token=test-token',
    },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

describe('Documents API integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    storageStub.upload.mockResolvedValue({ data: null, error: null });
    storageStub.createSignedUrl.mockResolvedValue({
      data: { signedUrl: 'https://signed.example' },
    });
    storageStub.copy.mockResolvedValue({ data: {}, error: null });
    storageStub.remove.mockResolvedValue({ data: null, error: null });
  });

  it('creates a document (JSON) with multiple tags', async () => {
    mockedGetSession.mockResolvedValue({
      userId: 'user-1',
      email: 'u@e',
    } satisfies NonNullable<SessionResult>);
    mockedJobFind.mockResolvedValue({
      id: 'job-1',
    } as NonNullable<JobFindFirstResult>);
    mockedDocCreate.mockResolvedValue({
      id: 'doc-1',
      user_id: 'user-1',
      job_id: 'job-1',
      title: 'Test',
      content: 'hello',
      type: 'resume',
      status: 'draft',
      tags: ['a', 'b'],
      created_at: new Date('2026-04-01T00:00:00.000Z'),
      updated_at: new Date('2026-04-01T00:00:00.000Z'),
    } as DocumentCreateResult);

    const response = await POST(
      buildJsonRequest('http://localhost/api/documents', {
        jobId: 'job-1',
        title: 'Test',
        content: 'hello',
        type: 'resume',
        tags: ['a', 'b'],
      }),
    );

    expect(response.status).toBe(201);
    expect(mockedDocCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        user_id: 'user-1',
        job_id: 'job-1',
        title: 'Test',
        content: 'hello',
        type: 'resume',
        tags: ['a', 'b'],
      }),
    });

    const body = await response.json();
    expect(body.document).toBeDefined();
  });

  it('lists documents and preserves tags', async () => {
    mockedGetSession.mockResolvedValue({
      userId: 'user-1',
      email: 'u@e',
    } satisfies NonNullable<SessionResult>);
    mockedJobFind.mockResolvedValue({
      id: 'job-1',
    } as NonNullable<JobFindFirstResult>);
    mockedDocFindMany.mockResolvedValue([
      {
        id: 'doc-1',
        user_id: 'user-1',
        job_id: 'job-1',
        title: 'Test',
        content: 'plain',
        type: 'resume',
        status: 'draft',
        tags: ['x', 'y'],
        created_at: new Date('2026-04-01T00:00:00.000Z'),
        updated_at: new Date('2026-04-01T00:00:00.000Z'),
      },
    ] as DocumentFindManyResult);

    const response = await GET(
      new Request('http://localhost/api/documents?jobId=job-1', {
        method: 'GET',
        headers: { cookie: 'sb-access-token=test-token' },
      }) as unknown as NextRequest,
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body.documents)).toBe(true);
    expect(body.documents[0].tags).toEqual(['x', 'y']);
  });

  it('updates document tags via PATCH (JSON)', async () => {
    mockedGetSession.mockResolvedValue({
      userId: 'user-1',
      email: 'u@e',
    } satisfies NonNullable<SessionResult>);
    mockedDocFindFirst.mockResolvedValue({
      id: 'doc-1',
      user_id: 'user-1',
      tags: ['old'],
      content: 'plain',
      job_id: 'job-1',
      title: 'T',
      type: 'resume',
      status: 'draft',
      created_at: new Date('2026-04-01T00:00:00.000Z'),
      updated_at: new Date('2026-04-01T00:00:00.000Z'),
    } as NonNullable<DocumentFindFirstResult>);
    mockedDocUpdate.mockResolvedValue({
      id: 'doc-1',
      user_id: 'user-1',
      job_id: 'job-1',
      title: 'T',
      content: 'plain',
      type: 'resume',
      status: 'draft',
      tags: ['new', 'tag2'],
      created_at: new Date('2026-04-01T00:00:00.000Z'),
      updated_at: new Date('2026-04-01T00:00:00.000Z'),
    } as DocumentUpdateResult);

    const request = new Request('http://localhost/api/documents/doc-1', {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
        cookie: 'sb-access-token=test-token',
      },
      body: JSON.stringify({ tags: ['new', 'tag2'] }),
    });

    const response = await PATCH_ITEM(request, documentRouteContext('doc-1'));

    expect(response.status).toBe(200);
    expect(mockedDocUpdate).toHaveBeenCalledWith({
      where: { id: 'doc-1' },
      data: expect.objectContaining({ tags: ['new', 'tag2'] }),
    });

    const body = await response.json();
    expect(body.document).toBeDefined();
  });

  it('moves stored file path when type changes via PATCH (JSON)', async () => {
    mockedGetSession.mockResolvedValue({
      userId: 'user-1',
      email: 'u@e',
    } satisfies NonNullable<SessionResult>);

    const storedContent = encodeStoredFileContent({
      kind: 'file',
      bucket: DOCUMENTS_BUCKET,
      path: 'user-1/resumes/original.pdf',
      fileName: 'original.pdf',
      mimeType: 'application/pdf',
      size: 42,
      note: 'initial',
    });

    mockedDocFindFirst.mockResolvedValue({
      id: 'doc-3',
      user_id: 'user-1',
      job_id: 'job-1',
      title: 'Stored',
      content: storedContent,
      type: 'resume',
      status: 'ready',
      tags: ['one'],
      created_at: new Date('2026-04-01T00:00:00.000Z'),
      updated_at: new Date('2026-04-01T00:00:00.000Z'),
    } as NonNullable<DocumentFindFirstResult>);

    mockedDocUpdate.mockResolvedValue({
      id: 'doc-3',
      user_id: 'user-1',
      job_id: 'job-1',
      title: 'Stored',
      content: storedContent,
      type: 'cover_letter',
      status: 'ready',
      tags: ['one'],
      created_at: new Date('2026-04-01T00:00:00.000Z'),
      updated_at: new Date('2026-04-01T00:00:00.000Z'),
    } as DocumentUpdateResult);

    const request = new Request('http://localhost/api/documents/doc-3', {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
        cookie: 'sb-access-token=test-token',
      },
      body: JSON.stringify({ type: 'cover_letter' }),
    });

    const response = await PATCH_ITEM(request, documentRouteContext('doc-3'));

    expect(response.status).toBe(200);
    expect(storageStub.copy).toHaveBeenCalledWith(
      'user-1/resumes/original.pdf',
      expect.stringContaining('user-1/cover-letters/'),
    );
    expect(storageStub.remove).toHaveBeenCalledWith([
      'user-1/resumes/original.pdf',
    ]);

    const updateArg = mockedDocUpdate.mock.calls[0]?.[0] as {
      data: { content: string; type: string };
    };
    const nextContent = JSON.parse(updateArg.data.content) as { path: string };
    expect(updateArg.data.type).toBe('cover_letter');
    expect(nextContent.path).toContain('user-1/cover-letters/');
  });

  describe('multipart file upload (POST)', () => {
    function buildMultipartRequest(
      fields: Record<string, string>,
      file?: { name: string; type: string; content: string },
    ) {
      const formData = new FormData();
      for (const [key, value] of Object.entries(fields)) {
        formData.append(key, value);
      }
      if (file) {
        const blob = new Blob([file.content], { type: file.type });
        formData.append('file', blob, file.name);
      }
      return new Request('http://localhost/api/documents', {
        method: 'POST',
        body: formData,
      }) as unknown as NextRequest;
    }

    beforeEach(() => {
      mockedGetSession.mockResolvedValue({ userId: 'user-1', email: 'u@e' } as NonNullable<SessionResult>);
      mockedJobFind.mockResolvedValue({ id: 'job-1' } as NonNullable<JobFindFirstResult>);
      mockedDocCreate.mockResolvedValue({
        id: 'doc-upload',
        user_id: 'user-1',
        job_id: 'job-1',
        title: 'cv.pdf',
        content: '{}',
        type: 'resume',
        status: 'ready',
        tags: [],
        created_at: new Date('2026-04-01T00:00:00.000Z'),
        updated_at: new Date('2026-04-01T00:00:00.000Z'),
      } as DocumentCreateResult);
    });

    it('accepts a valid PDF upload', async () => {
      const res = await POST(
        buildMultipartRequest(
          { jobId: 'job-1', type: 'resume' },
          { name: 'cv.pdf', type: 'application/pdf', content: '%PDF-1.4 fake' },
        ),
      );
      expect(res.status).toBe(201);
    });

    it('rejects unsupported MIME type with 400', async () => {
      const res = await POST(
        buildMultipartRequest(
          { jobId: 'job-1', type: 'resume' },
          { name: 'photo.jpg', type: 'image/jpeg', content: 'JFIF' },
        ),
      );
      expect(res.status).toBe(400);
      const body = (await res.json()) as { error: { message: string; timestamp: string } };
      expect(body.error.message).toMatch(/unsupported file type/i);
    });

    it('rejects empty file with 400', async () => {
      const res = await POST(
        buildMultipartRequest(
          { jobId: 'job-1', type: 'resume' },
          { name: 'empty.pdf', type: 'application/pdf', content: '' },
        ),
      );
      expect(res.status).toBe(400);
      const body = (await res.json()) as { error: { message: string; timestamp: string } };
      expect(body.error.message).toMatch(/empty/i);
    });

    it('rejects cross-user job_id with 404', async () => {
      mockedJobFind.mockResolvedValue(null);
      const res = await POST(
        buildMultipartRequest(
          { jobId: 'job-other-user', type: 'resume' },
          { name: 'cv.pdf', type: 'application/pdf', content: '%PDF content' },
        ),
      );
      expect(res.status).toBe(404);
    });

    it('rejects unauthenticated upload with 401', async () => {
      mockedGetSession.mockResolvedValue(null);
      const res = await POST(
        buildMultipartRequest(
          { jobId: 'job-1', type: 'resume' },
          { name: 'cv.pdf', type: 'application/pdf', content: '%PDF content' },
        ),
      );
      expect(res.status).toBe(401);
    });

    it('accepts upload without jobId (library context — unlinked document)', async () => {
      mockedDocCreate.mockResolvedValue({
        id: 'doc-library',
        user_id: 'user-1',
        job_id: null,
        title: 'cv.pdf',
        content: '{}',
        type: 'resume',
        status: 'ready',
        tags: [],
        created_at: new Date('2026-04-01T00:00:00.000Z'),
        updated_at: new Date('2026-04-01T00:00:00.000Z'),
      } as DocumentCreateResult);

      const res = await POST(
        buildMultipartRequest(
          { type: 'resume' },
          { name: 'cv.pdf', type: 'application/pdf', content: '%PDF-1.4 fake' },
        ),
      );

      expect(res.status).toBe(201);
      expect(mockedJobFind).not.toHaveBeenCalled();
      expect(mockedDocCreate).toHaveBeenCalledWith({
        data: expect.not.objectContaining({ job_id: expect.anything() }),
      });
    });
  });

  it('deletes document and removes stored file when present', async () => {
    mockedGetSession.mockResolvedValue({
      userId: 'user-1',
      email: 'u@e',
    } satisfies NonNullable<SessionResult>);

    const storedContent = encodeStoredFileContent({
      kind: 'file',
      bucket: DOCUMENTS_BUCKET,
      path: 'user-1/resumes/uuid-file.pdf',
      fileName: 'file.pdf',
      mimeType: 'application/pdf',
      size: 123,
    });

    mockedDocFindFirst.mockResolvedValue({
      id: 'doc-2',
      user_id: 'user-1',
      job_id: 'job-1',
      title: 'Stored',
      tags: [],
      type: 'resume',
      status: 'ready',
      content: storedContent,
      created_at: new Date('2026-04-01T00:00:00.000Z'),
      updated_at: new Date('2026-04-01T00:00:00.000Z'),
    } as NonNullable<DocumentFindFirstResult>);
    mockedDocDelete.mockResolvedValue({
      id: 'doc-2',
      user_id: 'user-1',
      job_id: 'job-1',
      title: 'Stored',
      content: storedContent,
      type: 'resume',
      status: 'ready',
      tags: [],
      created_at: new Date('2026-04-01T00:00:00.000Z'),
      updated_at: new Date('2026-04-01T00:00:00.000Z'),
    } as DocumentDeleteResult);

    const response = await DELETE_ITEM(
      new Request('http://localhost/api/documents/doc-2', {
        method: 'DELETE',
        headers: { cookie: 'sb-access-token=test-token' },
      }) as NextRequest,
      documentRouteContext('doc-2'),
    );

    expect(response.status).toBe(200);
    expect(mockedDocDelete).toHaveBeenCalledWith({ where: { id: 'doc-2' } });
    expect(storageStub.remove).toHaveBeenCalledWith([
      'user-1/resumes/uuid-file.pdf',
    ]);
  });
});
