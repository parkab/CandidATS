import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ProfilePanel from './profile-panel';

const mockRefresh = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: mockRefresh,
  }),
}));

describe('ProfilePanel', () => {
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

  it('renders baseline completion details from initial profile data', () => {
    render(<ProfilePanel initialProfile={initialProfile} />);

    expect(screen.getByText('29% complete')).toBeInTheDocument();
    expect(
      screen.getByText('2 of 7 baseline fields complete'),
    ).toBeInTheDocument();

    const progress = screen.getByRole('progressbar', {
      name: 'Baseline profile completion',
    });

    expect(progress).toHaveAttribute('aria-valuenow', '29');
  });

  it('updates baseline completion immediately after successful save', async () => {
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

    render(<ProfilePanel initialProfile={initialProfile} />);

    fireEvent.click(screen.getByRole('button', { name: 'Edit profile' }));

    fireEvent.change(screen.getByLabelText('Phone'), {
      target: { value: '(555) 123-4567' },
    });
    fireEvent.change(screen.getByLabelText('Location'), {
      target: { value: 'Boston, MA' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => {
      expect(screen.getByText('57% complete')).toBeInTheDocument();
    });

    expect(
      screen.getByText('4 of 7 baseline fields complete'),
    ).toBeInTheDocument();
    expect(mockRefresh).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/profile',
      expect.objectContaining({ method: 'PATCH' }),
    );
  });
});
