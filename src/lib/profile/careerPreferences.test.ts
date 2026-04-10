import { parseCareerPreferencesPayload } from './careerPreferences';

describe('parseCareerPreferencesPayload', () => {
  it('returns an error for invalid input', () => {
    expect(parseCareerPreferencesPayload(null)).toEqual({ error: 'Invalid request body' });
    expect(parseCareerPreferencesPayload({ workMode: 'Freelance' })).toEqual({
      error: 'workMode must be "Remote", "Hybrid", or "On-site"',
    });
  });

  it('parses an empty body as all-null fields', () => {
    const result = parseCareerPreferencesPayload({});
    expect(result.error).toBeUndefined();
    expect(result.payload).toEqual({ targetRoles: null, targetLocations: null, workMode: null, salaryPreference: null });
  });

  it('parses a valid payload and trims whitespace', () => {
    const result = parseCareerPreferencesPayload({
      targetRoles: '  Software Engineer  ',
      workMode: 'Remote',
      salaryPreference: '$120k',
    });
    expect(result.error).toBeUndefined();
    expect(result.payload).toMatchObject({ targetRoles: 'Software Engineer', workMode: 'Remote' });
  });
});
