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
      hasExperience: false,
      hasEducation: false,
      hasSkills: false,
      hasCareerPreferences: false,
    });

    expect(result).toEqual({
      total: 11,
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
      hasExperience: false,
      hasEducation: false,
      hasSkills: true,
      hasCareerPreferences: false,
    });

    expect(result).toEqual({
      total: 11,
      completed: 4,
      percentage: 36,
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
      hasExperience: true,
      hasEducation: false,
      hasSkills: false,
      hasCareerPreferences: false,
    });

    expect(result).toEqual({
      total: 11,
      completed: 3,
      percentage: 27,
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
      hasExperience: true,
      hasEducation: true,
      hasSkills: true,
      hasCareerPreferences: true,
    });

    expect(result).toEqual({
      total: 11,
      completed: 11,
      percentage: 100,
      isComplete: true,
    });
  });
});
