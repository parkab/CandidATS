import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ProfilePanel from './profile-panel';

const mockRefresh = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: mockRefresh,
  }),
}));

describe('ProfilePanel', () => {
  const completionProps = {
    hasExperience: false,
    hasEducation: false,
    hasSkills: false,
    hasCareerPreferences: false,
  };

  const initialProfile = {
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane@example.com',
    createdAt: '2026-04-05T08:00:00.000Z',
    phone: '',
    location: '',
    linkedIn: '',
    headline: '',
    bio: '',
  };

  const originalFetch = global.fetch;

  beforeEach(() => {
    mockRefresh.mockReset();
    global.fetch = originalFetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('renders profile details from initial profile data', () => {
    render(
      <ProfilePanel
        initialProfile={initialProfile}
        hasExperience={completionProps.hasExperience}
        hasEducation={completionProps.hasEducation}
        hasSkills={completionProps.hasSkills}
        hasCareerPreferences={completionProps.hasCareerPreferences}
      />,
    );

    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
    expect(screen.getByText('Professional Details')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Edit profile' }),
    ).toBeInTheDocument();
  });

  it('updates profile details immediately after successful save', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@example.com',
        Profile: {
          phone: '(555) 123-4567',
          location: 'Boston, MA',
          linkedIn: null,
          headline: null,
          bio: null,
        },
      }),
    });

    global.fetch = mockFetch as unknown as typeof fetch;

    render(
      <ProfilePanel
        initialProfile={initialProfile}
        hasExperience={completionProps.hasExperience}
        hasEducation={completionProps.hasEducation}
        hasSkills={completionProps.hasSkills}
        hasCareerPreferences={completionProps.hasCareerPreferences}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Edit profile' }));

    fireEvent.change(screen.getByLabelText('Phone'), {
      target: { value: '(555) 123-4567' },
    });
    fireEvent.change(screen.getByLabelText('Location'), {
      target: { value: 'Boston, MA' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => {
      expect(screen.getByText('(555) 123-4567')).toBeInTheDocument();
    });

    expect(screen.getByText('Boston, MA')).toBeInTheDocument();
    expect(mockRefresh).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/profile',
      expect.objectContaining({ method: 'PATCH' }),
    );
  });
});
