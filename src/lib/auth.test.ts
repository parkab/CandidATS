import { hashPassword, verifyPassword, validateRegistrationPayload } from './auth';

describe('auth helpers', () => {
  test('hashPassword and verifyPassword work together', async () => {
    const password = 'StrongPass123!';
    const hashed = await hashPassword(password);

    expect(typeof hashed).toBe('string');
    expect(hashed).not.toBe(password);

    const valid = await verifyPassword(password, hashed);
    expect(valid).toBe(true);
  });

  test('validateRegistrationPayload rejects invalid payloads', () => {
    expect(validateRegistrationPayload(null)).toMatchObject({ valid: false });
    expect(validateRegistrationPayload({ email: 'bad-email', password: '12345678' })).toMatchObject({ valid: false });
    expect(validateRegistrationPayload({ email: 'test@example.com', password: 'short' })).toMatchObject({ valid: false });
  });

  test('validateRegistrationPayload normalizes a valid payload', () => {
    const result = validateRegistrationPayload({
      email: ' TEST@Example.COM ',
      password: 'validPassword123',
      firstName: 'Sam',
      lastName: 'Lee',
    });

    expect(result.valid).toBe(true);

    if (!result.valid) return;

    expect(result.data.email).toBe('test@example.com');
    expect(result.data.firstName).toBe('Sam');
    expect(result.data.lastName).toBe('Lee');
  });
});
