import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import JobSearchFilterControl from './job-search-filter-control';

const replaceMock = jest.fn();
let searchParams = new URLSearchParams(
  'q=engineer&stage=Interview&location=Austin&deadlineState=upcoming',
);

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: replaceMock,
  }),
  useSearchParams: () => searchParams,
}));

describe('JobSearchFilterControl', () => {
  beforeEach(() => {
    replaceMock.mockClear();
    searchParams = new URLSearchParams(
      'q=engineer&stage=Interview&location=Austin&deadlineState=upcoming',
    );
  });

  it('renders with values from search params', () => {
    render(<JobSearchFilterControl />);

    expect(screen.getByPlaceholderText('Search by title, company, or keywords')).toHaveValue(
      'engineer',
    );
    expect(screen.getByLabelText(/stage/i)).toHaveValue('Interview');
    expect(screen.getByPlaceholderText('Enter a location')).toHaveValue('Austin');
    expect(screen.getByLabelText(/deadline/i)).toHaveValue('upcoming');
  });

  it('applies updated filters when clicking apply', async () => {
    render(<JobSearchFilterControl />);

    await userEvent.clear(screen.getByPlaceholderText('Search by title, company, or keywords'));
    await userEvent.type(screen.getByPlaceholderText('Search by title, company, or keywords'), 'frontend');
    await userEvent.selectOptions(screen.getByLabelText(/stage/i), 'Offer');
    await userEvent.clear(screen.getByPlaceholderText('Enter a location'));
    await userEvent.type(screen.getByPlaceholderText('Enter a location'), 'NY');
    await userEvent.selectOptions(screen.getByLabelText(/deadline/i), 'past');

    await userEvent.click(screen.getByRole('button', { name: /apply filters/i }));

    expect(replaceMock).toHaveBeenCalledWith(
      '/dashboard?q=frontend&stage=Offer&location=NY&deadlineState=past',
    );
  });

  it('submits the filter form when pressing Enter in the search input', async () => {
    render(<JobSearchFilterControl />);

    await userEvent.clear(screen.getByPlaceholderText('Search by title, company, or keywords'));
    await userEvent.type(screen.getByPlaceholderText('Search by title, company, or keywords'), 'designer{enter}');

    expect(replaceMock).toHaveBeenCalledWith(
      '/dashboard?q=designer&stage=Interview&location=Austin&deadlineState=upcoming',
    );
  });
});
