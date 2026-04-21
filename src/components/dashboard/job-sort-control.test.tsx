import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import JobSortControl from './job-sort-control';

const replaceMock = jest.fn();
let searchParams = new URLSearchParams('sort=company');

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: replaceMock,
  }),
  useSearchParams: () => searchParams,
}));

describe('JobSortControl', () => {
  beforeEach(() => {
    replaceMock.mockClear();
    searchParams = new URLSearchParams('sort=company');
  });

  it('renders the current sort option from query params', () => {
    render(<JobSortControl />);

    expect(screen.getByRole('combobox')).toHaveValue('company');
  });

  it('defaults to lastActivity when the query param is invalid', () => {
    searchParams = new URLSearchParams('sort=bad-value');

    render(<JobSortControl />);

    expect(screen.getByRole('combobox')).toHaveValue('lastActivity');
  });

  it('replaces the URL with the selected sort option', async () => {
    searchParams = new URLSearchParams('sort=createdDate&stage=all');

    render(<JobSortControl />);

    await userEvent.selectOptions(screen.getByRole('combobox'), 'company');

    expect(replaceMock).toHaveBeenCalledWith('/dashboard?sort=company&stage=all');
  });
});
