import {
  parseExperienceCreatePayload,
  parseExperienceUpdatePayload,
} from './experience';

describe('parseExperienceCreatePayload', () => {
  it('returns an error for invalid or missing required fields', () => {
    expect(parseExperienceCreatePayload(null)).toEqual({
      error: 'Invalid request body',
    });
    expect(
      parseExperienceCreatePayload({
        type: 'internship',
        title: 'Eng',
        organization: 'Co',
        startDate: '2023-01-01',
      }),
    ).toEqual({
      error: 'type must be "employment" or "project"',
    });
    expect(
      parseExperienceCreatePayload({
        type: 'employment',
        title: '',
        organization: 'Co',
        startDate: '2023-01-01',
      }),
    ).toEqual({
      error: 'title is required',
    });
    expect(
      parseExperienceCreatePayload({
        type: 'employment',
        title: 'Eng',
        organization: 'Co',
        startDate: 'bad',
      }),
    ).toEqual({
      error: 'startDate is required and must be a valid date',
    });
    expect(
      parseExperienceCreatePayload({
        type: 'employment',
        title: 'Eng',
        organization: 'Co',
        startDate: '2023-06-01',
        endDate: '2023-01-01',
      }),
    ).toEqual({
      error: 'endDate must not be before startDate',
    });
  });

  it('parses a valid payload and returns correct defaults for optional fields', () => {
    const result = parseExperienceCreatePayload({
      type: 'employment',
      title: '  Software Engineer  ',
      organization: 'Acme',
      startDate: '2023-01-15',
    });
    expect(result.error).toBeUndefined();
    expect(result.payload).toMatchObject({
      type: 'employment',
      title: 'Software Engineer',
      organization: 'Acme',
      startDate: new Date('2023-01-15'),
      endDate: null,
      role: null,
      sortOrder: 0,
    });
  });
});

describe('parseExperienceUpdatePayload', () => {
  it('rejects an empty update, invalid field values, and out-of-order dates when both are provided', () => {
    expect(parseExperienceUpdatePayload({})).toEqual({
      error: 'No updatable fields provided',
    });
    expect(parseExperienceUpdatePayload({ title: '' })).toEqual({
      error: 'title must not be empty',
    });
    expect(parseExperienceUpdatePayload({ sortOrder: -1 })).toEqual({
      error: 'sortOrder must be a non-negative integer',
    });
    expect(
      parseExperienceUpdatePayload({
        startDate: '2023-06-01',
        endDate: '2023-01-01',
      }),
    ).toEqual({
      error: 'endDate must not be before startDate',
    });
  });

  it('parses a partial update and only includes provided fields', () => {
    const result = parseExperienceUpdatePayload({
      title: 'New Title',
      endDate: null,
    });
    expect(result.error).toBeUndefined();
    expect(result.payload).toEqual({ title: 'New Title', endDate: null });
    expect(result.payload).not.toHaveProperty('organization');
  });
});
