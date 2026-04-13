import { parseSkillCreatePayload, parseSkillUpdatePayload } from './skill';

describe('parseSkillCreatePayload', () => {
  it('returns an error for invalid or missing required fields', () => {
    expect(parseSkillCreatePayload(null)).toEqual({
      error: 'Invalid request body',
    });
    expect(parseSkillCreatePayload({ name: '   ' })).toEqual({
      error: 'name is required',
    });
  });

  it('parses a valid payload with correct defaults for optional fields', () => {
    const result = parseSkillCreatePayload({
      name: '  TypeScript  ',
      category: 'Languages',
      sortOrder: 2,
    });
    expect(result.error).toBeUndefined();
    expect(result.payload).toEqual({
      name: 'TypeScript',
      category: 'Languages',
      proficiencyLabel: null,
      sortOrder: 2,
    });
  });
});

describe('parseSkillUpdatePayload', () => {
  it('rejects an empty update, invalid name, and invalid sortOrder', () => {
    expect(parseSkillUpdatePayload({})).toEqual({
      error: 'No updatable fields provided',
    });
    expect(parseSkillUpdatePayload({ name: '' })).toEqual({
      error: 'name must not be empty',
    });
    expect(parseSkillUpdatePayload({ sortOrder: -1 })).toEqual({
      error: 'sortOrder must be a non-negative integer',
    });
    expect(parseSkillUpdatePayload({ sortOrder: 1.5 })).toEqual({
      error: 'sortOrder must be a non-negative integer',
    });
  });

  it('parses a partial update and only includes provided fields', () => {
    const result = parseSkillUpdatePayload({ sortOrder: 5 });
    expect(result.error).toBeUndefined();
    expect(result.payload).toEqual({ sortOrder: 5 });
    expect(result.payload).not.toHaveProperty('name');
  });
});
