import {
  parseEducationCreatePayload,
  parseEducationUpdatePayload,
} from './education';

describe('parseEducationCreatePayload', () => {
  const validBase = {
    institution: 'MIT',
    degree: 'Bachelor of Science',
    fieldOfStudy: 'Computer Science',
    startDate: '2018-09-01',
  };

  it('returns an error for invalid or missing required fields', () => {
    expect(parseEducationCreatePayload(null)).toEqual({ error: 'Invalid request body' });
    expect(parseEducationCreatePayload({ ...validBase, institution: '' })).toEqual({ error: 'institution is required' });
    expect(parseEducationCreatePayload({ ...validBase, startDate: 'bad' })).toEqual({
      error: 'startDate is required and must be a valid date',
    });
    expect(parseEducationCreatePayload({ ...validBase, startDate: '2022-01-01', endDate: '2021-01-01' })).toEqual({
      error: 'endDate must not be before startDate',
    });
  });

  it('parses a valid payload with correct defaults for optional fields', () => {
    const result = parseEducationCreatePayload({ ...validBase, endDate: '2022-05-31', gpa: '3.9/4.0' });
    expect(result.error).toBeUndefined();
    expect(result.payload).toMatchObject({
      institution: 'MIT',
      startDate: new Date('2018-09-01'),
      endDate: new Date('2022-05-31'),
      gpa: '3.9/4.0',
      honors: null,
    });
  });
});

describe('parseEducationUpdatePayload', () => {
  it('rejects an empty update and invalid field values', () => {
    expect(parseEducationUpdatePayload({})).toEqual({ error: 'No updatable fields provided' });
    expect(parseEducationUpdatePayload({ institution: '' })).toEqual({ error: 'institution must not be empty' });
  });

  it('parses a partial update and only includes provided fields', () => {
    const result = parseEducationUpdatePayload({ degree: 'PhD', endDate: null });
    expect(result.error).toBeUndefined();
    expect(result.payload).toEqual({ degree: 'PhD', endDate: null });
    expect(result.payload).not.toHaveProperty('institution');
  });
});
