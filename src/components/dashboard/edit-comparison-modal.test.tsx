import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ComparisonModal from '@/components/dashboard/edit-comparison-modal';

describe('ComparisonModal', () => {
  const mockOnAccept = jest.fn();
  const mockOnReject = jest.fn();

  const defaultProps = {
    isOpen: true,
    original: 'This is the original text that needs improvement.',
    edited:
      'This represents the enhanced version of the content with better wording.',
    action: 'rewrite',
    onAccept: mockOnAccept,
    onReject: mockOnReject,
    isLoading: false,
  };

  beforeEach(() => {
    mockOnAccept.mockClear();
    mockOnReject.mockClear();
  });

  it('does not render when isOpen is false', () => {
    render(<ComparisonModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByText('Compare Changes')).not.toBeInTheDocument();
  });

  it('renders with correct title and action label', () => {
    render(<ComparisonModal {...defaultProps} />);

    expect(
      screen.getByText(/Compare Changes - Rewritten Version/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Review the suggested changes and decide whether to accept or reject them/i,
      ),
    ).toBeInTheDocument();
  });

  it('displays original and edited content in separate panels', () => {
    render(<ComparisonModal {...defaultProps} />);

    expect(screen.getByText('Original')).toBeInTheDocument();
    expect(screen.getByText('Rewritten Version')).toBeInTheDocument();
    expect(screen.getByText(defaultProps.original)).toBeInTheDocument();
    expect(screen.getByText(defaultProps.edited)).toBeInTheDocument();
  });

  it('calls onAccept with edited content when Accept button is clicked', async () => {
    render(<ComparisonModal {...defaultProps} />);

    const acceptButton = screen.getByRole('button', {
      name: /Accept Changes/i,
    });
    fireEvent.click(acceptButton);

    await waitFor(() => {
      expect(mockOnAccept).toHaveBeenCalledWith(defaultProps.edited);
    });
  });

  it('calls onReject when Reject button is clicked', async () => {
    render(<ComparisonModal {...defaultProps} />);

    const rejectButton = screen.getByRole('button', {
      name: /Reject Changes/i,
    });
    fireEvent.click(rejectButton);

    await waitFor(() => {
      expect(mockOnReject).toHaveBeenCalled();
    });
  });

  it('disables buttons when isLoading is true', () => {
    render(<ComparisonModal {...defaultProps} isLoading={true} />);

    const acceptButton = screen.getByRole('button', {
      name: /Processing\.\.\./i,
    });
    const rejectButton = screen.getByRole('button', {
      name: /Reject Changes/i,
    });

    expect(acceptButton).toBeDisabled();
    expect(rejectButton).toBeDisabled();
  });

  it('shows "Processing..." text when isLoading is true', () => {
    render(<ComparisonModal {...defaultProps} isLoading={true} />);

    expect(screen.getByText('Processing...')).toBeInTheDocument();
  });

  it('displays correct action labels for different actions', () => {
    const { rerender } = render(
      <ComparisonModal {...defaultProps} action="concise" />,
    );
    expect(screen.getByText('Concise Version')).toBeInTheDocument();

    rerender(<ComparisonModal {...defaultProps} action="detail" />);
    expect(screen.getByText('Detailed Version')).toBeInTheDocument();

    rerender(<ComparisonModal {...defaultProps} action="tone" />);
    expect(screen.getByText('Tone-Adjusted Version')).toBeInTheDocument();
  });

  it('has sync scroll checkbox that can be toggled', () => {
    render(<ComparisonModal {...defaultProps} />);

    const syncCheckbox = screen.getByRole('checkbox', { name: /Sync scroll/i });
    expect(syncCheckbox).toBeInTheDocument();
    expect(syncCheckbox).toBeChecked();

    fireEvent.click(syncCheckbox);
    expect(syncCheckbox).not.toBeChecked();
  });

  it('renders both panels with scrollable content areas', () => {
    render(<ComparisonModal {...defaultProps} />);

    const leftPanel = document.getElementById('comparison-left');
    const rightPanel = document.getElementById('comparison-right');

    expect(leftPanel).toBeInTheDocument();
    expect(rightPanel).toBeInTheDocument();
    expect(leftPanel).toHaveClass('overflow-y-auto');
    expect(rightPanel).toHaveClass('overflow-y-auto');
  });

  it('preserves whitespace in displayed content', () => {
    const multilineOriginal = 'Line 1\nLine 2\nLine 3';
    const multilineEdited = 'Line 1 updated\nLine 2 updated\nLine 3 updated';

    render(
      <ComparisonModal
        {...defaultProps}
        original={multilineOriginal}
        edited={multilineEdited}
      />,
    );

    const leftPanel = document.getElementById('comparison-left');
    expect(leftPanel).toHaveClass('whitespace-pre-wrap');
  });
});
