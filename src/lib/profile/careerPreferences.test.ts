import {
  parseCareerPreferencesPayload,
  parseCareerPreferencesUpdatePayload,
} from './careerPreferences';

describe('parseCareerPreferencesPayload', () => {
  it('returns an error for invalid input', () => {
    expect(parseCareerPreferencesPayload(null)).toEqual({
      error: 'Invalid request body',
    });
    expect(parseCareerPreferencesPayload({ workMode: 'Freelance' })).toEqual({
      error: 'workMode must be "Remote", "Hybrid", or "On-site"',
    });
  });

  it('parses an empty body as all-null fields', () => {
    const result = parseCareerPreferencesPayload({});
    expect(result.error).toBeUndefined();
    expect(result.payload).toEqual({
      targetRoles: null,
      targetLocations: null,
      workMode: null,
      salaryPreference: null,
    });
  });

  it('parses a valid payload and trims whitespace', () => {
    const result = parseCareerPreferencesPayload({
      targetRoles: '  Software Engineer  ',
      workMode: 'Remote',
      salaryPreference: '$120k',
    });
    expect(result.error).toBeUndefined();
    expect(result.payload).toMatchObject({
      targetRoles: 'Software Engineer',
      workMode: 'Remote',
    });
  });
});

describe('parseCareerPreferencesUpdatePayload', () => {
  it('rejects a non-object body, an empty update, and an invalid workMode', () => {
    expect(parseCareerPreferencesUpdatePayload(null)).toEqual({
      error: 'Invalid request body',
    });
    expect(parseCareerPreferencesUpdatePayload({})).toEqual({
      error: 'No updatable fields provided',
    });
    expect(
      parseCareerPreferencesUpdatePayload({ workMode: 'Freelance' }),
    ).toEqual({
      error: 'workMode must be "Remote", "Hybrid", or "On-site"',
    });
  });

  it('parses a partial update and only includes provided fields', () => {
    const result = parseCareerPreferencesUpdatePayload({
      workMode: 'Remote',
      targetRoles: '  Engineer  ',
    });
    expect(result.error).toBeUndefined();
    expect(result.payload).toEqual({
      workMode: 'Remote',
      targetRoles: 'Engineer',
    });
    expect(result.payload).not.toHaveProperty('targetLocations');
    expect(result.payload).not.toHaveProperty('salaryPreference');
  });
});
