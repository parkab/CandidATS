import { calculateProfileBaselineCompletion } from './profile';

describe('calculateProfileBaselineCompletion', () => {
  it('returns zero completion when only required names are missing', () => {
    const result = calculateProfileBaselineCompletion({
      firstName: '',
      lastName: '',
      phone: null,
      location: null,
      linkedIn: null,
      headline: null,
      bio: null,
    });

    expect(result).toEqual({
      total: 7,
      completed: 0,
      percentage: 0,
      isComplete: false,
    });
  });

  it('treats whitespace-only values as incomplete', () => {
    const result = calculateProfileBaselineCompletion({
      firstName: '  ',
      lastName: 'Doe',
      phone: '   ',
      location: 'Boston',
      linkedIn: '   ',
      headline: 'Engineer',
      bio: '',
    });

    expect(result).toEqual({
      total: 7,
      completed: 3,
      percentage: 43,
      isComplete: false,
    });
  });

  it('computes partial completion percentage', () => {
    const result = calculateProfileBaselineCompletion({
      firstName: 'Jane',
      lastName: 'Doe',
      phone: null,
      location: null,
      linkedIn: null,
      headline: null,
      bio: null,
    });

    expect(result).toEqual({
      total: 7,
      completed: 2,
      percentage: 29,
      isComplete: false,
    });
  });

  it('returns complete when all baseline fields are filled', () => {
    const result = calculateProfileBaselineCompletion({
      firstName: 'Jane',
      lastName: 'Doe',
      phone: '(555) 123-4567',
      location: 'Boston, MA',
      linkedIn: 'https://www.linkedin.com/in/jane-doe',
      headline: 'Frontend Engineer',
      bio: 'Building delightful products',
    });

    expect(result).toEqual({
      total: 7,
      completed: 7,
      percentage: 100,
      isComplete: true,
    });
  });
});
