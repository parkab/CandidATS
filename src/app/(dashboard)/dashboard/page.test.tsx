import { render, screen } from '@testing-library/react';
import type { AnchorHTMLAttributes, ReactNode } from 'react';
import Dashboard from './page';

type MockLinkProps = {
  href: string;
  children: ReactNode;
} & AnchorHTMLAttributes<HTMLAnchorElement>;

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...props }: MockLinkProps) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

jest.mock('@/components/dashboard/polaroid-add-card', () => ({
  __esModule: true,
  default: () => <div>Mock Add Card</div>,
}));

jest.mock('@/components/dashboard/polaroid-card', () => ({
  __esModule: true,
  default: ({ company }: { company: string }) => (
    <div>Mock Job Card: {company}</div>
  ),
}));

jest.mock('@/components/dashboard/polaroid-landing-card', () => ({
  __esModule: true,
  default: ({ caption }: { caption: string }) => <div>{caption}</div>,
}));

describe('Dashboard page', () => {
  const originalMockUser = process.env.MOCK_USER;

  afterEach(() => {
    process.env.MOCK_USER = originalMockUser;
  });

  it('renders landing experience when MOCK_USER is not true', () => {
    process.env.MOCK_USER = 'false';

    render(<Dashboard />);

    expect(screen.getByText('The ATS for Candidates.')).toBeInTheDocument();
    expect(screen.getByText('Organize your jobs.')).toBeInTheDocument();
    expect(screen.getByText('Sign up now!')).toBeInTheDocument();
    expect(screen.queryByText('Mock Add Card')).not.toBeInTheDocument();
  });

  it('renders dashboard cards when MOCK_USER is true', () => {
    process.env.MOCK_USER = 'true';

    render(<Dashboard />);

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Mock Add Card')).toBeInTheDocument();
    expect(
      screen.getByText('Mock Job Card: Stripe', { exact: false }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Sign up now!')).not.toBeInTheDocument();
  });
});
