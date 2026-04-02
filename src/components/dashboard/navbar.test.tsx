import { fireEvent, render, screen } from '@testing-library/react';
import type { AnchorHTMLAttributes, ReactNode } from 'react';
import Navbar from '@/components/dashboard/navbar';

const mockUseTheme = jest.fn();

type MockLinkProps = {
  href: string;
  children: ReactNode;
} & AnchorHTMLAttributes<HTMLAnchorElement>;

type MockImageProps = {
  alt: string;
};

jest.mock('next-themes', () => ({
  useTheme: () => mockUseTheme(),
}));

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...props }: MockLinkProps) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ alt }: MockImageProps) => <span role="img" aria-label={alt} />,
}));

describe('Navbar', () => {
  beforeEach(() => {
    mockUseTheme.mockReturnValue({ resolvedTheme: 'dark' });
  });

  it('shows auth links when user is null', () => {
    render(<Navbar user={null} />);

    expect(screen.getByText('Log in')).toBeInTheDocument();
    expect(screen.getByText('Sign up')).toBeInTheDocument();
    expect(screen.queryByText('Profile')).not.toBeInTheDocument();
  });

  it('shows user menu when user exists', () => {
    render(<Navbar user={{ name: 'Job Applicant' }} />);

    expect(screen.getByText('Job Applicant')).toBeInTheDocument();
    expect(screen.getByText('Profile')).toBeInTheDocument();
    expect(screen.getByText('Documents')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('closes details menu when clicking a menu item', () => {
    render(<Navbar user={{ name: 'Job Applicant' }} />);

    const details = document.querySelector('details');
    expect(details).not.toBeNull();

    details?.setAttribute('open', '');
    expect(details?.hasAttribute('open')).toBe(true);

    fireEvent.click(screen.getByText('Profile'));
    expect(details?.hasAttribute('open')).toBe(false);
  });
});
