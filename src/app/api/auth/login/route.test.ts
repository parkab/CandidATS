/** @jest-environment node */

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
    session: {
      create: jest.fn(),
    },
  },
}));

jest.mock('next/headers', () => ({
  cookies: jest.fn(() =>
    Promise.resolve({
      set: jest.fn(),
    })
  ),
}));

const { prisma } = jest.requireMock('@/lib/prisma') as {
  prisma: {
    user: {
      findUnique: jest.Mock;
    };
    session: {
      create: jest.Mock;
    };
  };
};

let POST: (request: Request) => Promise<Response>;

beforeAll(async () => {
  const routeModule = await import('./route');
  POST = routeModule.POST;
});

function createJsonRequest(body: unknown) {
  return new Request('http://localhost/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    prisma.user.findUnique.mockReset();
    prisma.session.create.mockReset();
  });

  test('returns 400 for invalid login payload', async () => {
    const response = await POST(createJsonRequest({ email: 'bad', password: '' }));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toHaveProperty('error');
  });

  test('returns 401 for non-existent email', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    const response = await POST(
      createJsonRequest({ email: 'nouser@example.com', password: 'password123' })
    );

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('Invalid email or password');
  });

  test('returns 401 for incorrect password', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: '1',
      email: 'test@example.com',
      hashedPassword: 'some-hashed-password',
      firstName: 'John',
      lastName: 'Doe',
    });

    const response = await POST(
      createJsonRequest({ email: 'test@example.com', password: 'wrongpassword' })
    );

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('Invalid email or password');
  });

  test('returns 200 and creates session for valid credentials', async () => {
    const hashedPassword = await import('bcryptjs').then((bcrypt) =>
      bcrypt.default.hash('validpassword', 12)
    );

    prisma.user.findUnique.mockResolvedValue({
      id: '1',
      email: 'test@example.com',
      hashedPassword,
      firstName: 'John',
      lastName: 'Doe',
    });

    prisma.session.create.mockResolvedValue({
      id: 'session-123',
      userId: '1',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const response = await POST(
      createJsonRequest({ email: 'test@example.com', password: 'validpassword' })
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.message).toBe('Login successful');
    expect(body.user).toEqual({
      id: '1',
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
    });
    expect(prisma.session.create).toHaveBeenCalledTimes(1);
  });
});
