/** @jest-environment node */

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}));

const { prisma } = jest.requireMock('@/lib/prisma') as {
  prisma: {
    user: {
      findUnique: jest.Mock;
      create: jest.Mock;
    };
  };
};

let POST: (request: Request) => Promise<Response>;

beforeAll(async () => {
  const module = await import('./route');
  POST = module.POST;
});

function createJsonRequest(body: unknown) {
  return new Request('http://localhost/api/auth/register', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/auth/register', () => {
  beforeEach(() => {
    prisma.user.findUnique.mockReset();
    prisma.user.create.mockReset();
  });

  test('returns 400 for invalid registration payload', async () => {
    const response = await POST(createJsonRequest({ email: 'bad', password: '123' }));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toHaveProperty('error');
  });

  test('returns 409 when email already exists', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: '1', email: 'test@example.com' });

    const response = await POST(createJsonRequest({ email: 'test@example.com', password: 'validPassword123' }));

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: 'Email already in use' });
  });

  test('returns 201 and creates a user with a hashed password', async () => {
    const password = 'validPassword123';
    const createdUser = {
      id: '1',
      email: 'new@example.com',
    };

    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue(createdUser);

    const response = await POST(createJsonRequest({ email: 'new@example.com', password }));

    expect(response.status).toBe(201);
    expect(prisma.user.create).toHaveBeenCalledTimes(1);
    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: 'new@example.com',
          password: expect.any(String),
        }),
      }),
    );

    const createArgs = prisma.user.create.mock.calls[0][0];
    expect(createArgs.data.password).not.toBe(password);

    expect(await response.json()).toEqual(createdUser);
  });
});
