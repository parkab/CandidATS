import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { AnchorHTMLAttributes, ReactNode } from 'react';
import Settings from './page';

const mockSetTheme = jest.fn();
const mockUseTheme = jest.fn();

type MockLinkProps = {
  href: string;
  children: ReactNode;
} & AnchorHTMLAttributes<HTMLAnchorElement>;

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

describe('Settings page', () => {
  beforeEach(() => {
    mockSetTheme.mockReset();
    mockUseTheme.mockReturnValue({
      resolvedTheme: 'light',
      setTheme: mockSetTheme,
    });
  });

  it('reflects resolvedTheme after mount', async () => {
    render(<Settings />);

    const toggle = screen.getByLabelText('Toggle dark mode');
    await waitFor(() => {
      expect(toggle).not.toBeChecked();
    });
  });

  it('calls setTheme with dark or light based on checkbox state', () => {
    render(<Settings />);

    const toggle = screen.getByLabelText('Toggle dark mode');

    fireEvent.click(toggle);
    expect(mockSetTheme).toHaveBeenCalledWith('dark');
  });

  it('calls setTheme with light when currently in dark mode and toggled off', async () => {
    mockUseTheme.mockReturnValue({
      resolvedTheme: 'dark',
      setTheme: mockSetTheme,
    });

    render(<Settings />);

    const toggle = screen.getByLabelText('Toggle dark mode');
    await waitFor(() => {
      expect(toggle).toBeChecked();
    });

    fireEvent.click(toggle);
    expect(mockSetTheme).toHaveBeenCalledWith('light');
  });
});
