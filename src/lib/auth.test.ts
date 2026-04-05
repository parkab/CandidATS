import { hashPassword, verifyPassword, validateRegistrationPayload, validateForgotPasswordPayload, validateUpdatePasswordPayload } from './auth';

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
    expect(
      validateRegistrationPayload({ email: 'bad-email', password: '12345678' }),
    ).toMatchObject({ valid: false });
    expect(
      validateRegistrationPayload({
        email: 'test@example.com',
        password: 'short',
      }),
    ).toMatchObject({ valid: false });
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

  test('validateForgotPasswordPayload rejects invalid payloads', () => {
    expect(validateForgotPasswordPayload(null)).toMatchObject({ valid: false });
    expect(validateForgotPasswordPayload({ email: '' })).toMatchObject({ valid: false });
    expect(validateForgotPasswordPayload({ email: 'bad-email' })).toMatchObject({ valid: false });
  });

  test('validateForgotPasswordPayload normalizes a valid email', () => {
    const result = validateForgotPasswordPayload({
      email: ' USER@Example.COM ',
    });

    expect(result.valid).toBe(true);

    if (!result.valid) return;

    expect(result.data.email).toBe('user@example.com');
  });

  test('validateUpdatePasswordPayload rejects invalid payloads', () => {
    expect(validateUpdatePasswordPayload(null)).toMatchObject({ valid: false });
    expect(validateUpdatePasswordPayload({ password: '' })).toMatchObject({ valid: false });
    expect(validateUpdatePasswordPayload({ password: 'short' })).toMatchObject({ valid: false });
  });

  test('validateUpdatePasswordPayload accepts a valid password', () => {
    const result = validateUpdatePasswordPayload({
      password: 'ValidPassword123!',
    });

    expect(result.valid).toBe(true);

    if (!result.valid) return;

    expect(result.data.password).toBe('ValidPassword123!');
  });
});
