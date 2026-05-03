import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LibraryDocumentsSection from './library-documents-section';

const mockDocuments = [
  {
    id: 'lib-doc-1',
    title: 'Library Resume',
    content: 'Library resume content',
    type: 'resume' as const,
    created_at: '2026-04-01T00:00:00.000Z',
    updated_at: '2026-04-01T00:00:00.000Z',
    storage: null,
  },
  {
    id: 'lib-doc-2',
    title: 'Library Cover Letter',
    content: 'Library cover letter content',
    type: 'cover_letter' as const,
    created_at: '2026-04-01T00:00:00.000Z',
    updated_at: '2026-04-01T00:00:00.000Z',
    storage: null,
  },
];

describe('LibraryDocumentsSection', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  it('renders library documents correctly', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ documents: mockDocuments }),
    });

    render(<LibraryDocumentsSection jobId="job-1" />);

    await waitFor(() => {
      expect(screen.getByText('Library Resume')).toBeInTheDocument();
      expect(screen.getByText('Library Cover Letter')).toBeInTheDocument();
    });
  });

  it('shows loading state initially', () => {
    (global.fetch as jest.Mock).mockImplementation(() => new Promise(() => {})); // Never resolves

    render(<LibraryDocumentsSection jobId="job-1" />);

    expect(screen.getByText('Loading library documents...')).toBeInTheDocument();
  });

  it('shows error state when fetch fails', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
    });

    render(<LibraryDocumentsSection jobId="job-1" />);

    await waitFor(() => {
      expect(screen.getByText(/Error loading library documents/)).toBeInTheDocument();
    });
  });

  it('shows empty state when no library documents', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ documents: [] }),
    });

    render(<LibraryDocumentsSection jobId="job-1" />);

    await waitFor(() => {
      expect(screen.getByText(/No library documents available/)).toBeInTheDocument();
    });
  });

  it('calls linkDocument when link button is clicked', async () => {
    const user = userEvent.setup();
    const mockOnDocumentLinked = jest.fn();

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ documents: mockDocuments }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

    render(<LibraryDocumentsSection jobId="job-1" onDocumentLinked={mockOnDocumentLinked} />);

    await waitFor(() => {
      expect(screen.getByText('Library Resume')).toBeInTheDocument();
    });

    const linkButton = screen.getAllByText('Link to Job')[0]; // Click the first link button (resume)
    await user.click(linkButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/documents/lib-doc-1',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ jobId: 'job-1' }),
        })
      );
      expect(mockOnDocumentLinked).toHaveBeenCalled();
    });
  });
});