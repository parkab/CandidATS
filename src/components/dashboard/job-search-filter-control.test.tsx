import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import JobSearchFilterControl from './job-search-filter-control';

const replaceMock = jest.fn();
let searchParams = new URLSearchParams(
  'q=engineer&stage=Interview&deadlineState=upcoming&events=upcoming&priority=true&sort=company',
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
      'q=engineer&stage=Interview&deadlineState=upcoming&events=upcoming&priority=true&sort=company',
    );
  });

  it('renders with values from search params', () => {
    render(<JobSearchFilterControl />);

    expect(
      screen.getByPlaceholderText(
        'Search by title, company, location, or keywords',
      ),
    ).toHaveValue('engineer');
    expect(screen.getByLabelText(/stage/i)).toHaveValue('Interview');
    expect(screen.getByLabelText(/deadline/i)).toHaveValue('upcoming');
    expect(screen.getByLabelText(/events/i)).toHaveValue('upcoming');
    expect(screen.getByLabelText(/priority/i)).toBeChecked();
    expect(screen.getByLabelText(/sort by/i)).toHaveValue('company');
  });

  it('updates filters when selections change', async () => {
    const user = userEvent.setup();
    render(<JobSearchFilterControl />);

    replaceMock.mockClear();

    await user.selectOptions(screen.getByLabelText(/stage/i), 'Offer');
    await user.selectOptions(screen.getByLabelText(/deadline/i), 'past');
    await user.selectOptions(screen.getByLabelText(/events/i), 'none');
    await user.click(screen.getByLabelText(/priority/i));
    await user.selectOptions(screen.getByLabelText(/sort by/i), 'createdDate');

    expect(replaceMock).toHaveBeenLastCalledWith(
      '/dashboard?q=engineer&stage=Offer&deadlineState=past&events=none&sort=createdDate',
    );
  });

  it('updates search query after debounce', async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<JobSearchFilterControl />);

    replaceMock.mockClear();

    await user.clear(
      screen.getByPlaceholderText(
        'Search by title, company, location, or keywords',
      ),
    );
    await user.type(
      screen.getByPlaceholderText(
        'Search by title, company, location, or keywords',
      ),
      'designer',
    );

    jest.advanceTimersByTime(160);

    expect(replaceMock).toHaveBeenCalledWith(
      '/dashboard?q=designer&stage=Interview&deadlineState=upcoming&events=upcoming&priority=true&sort=company',
    );

    jest.useRealTimers();
  });
});
