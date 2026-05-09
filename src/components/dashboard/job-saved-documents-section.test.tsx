import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import JobSavedDocumentsSection from './job-saved-documents-section';

const mockDocuments = [
  {
    id: 'doc-1',
    title: 'My Resume',
    content: 'Resume content',
    type: 'resume' as const,
    status: 'draft' as const,
    tags: [],
    created_at: '2026-04-01T00:00:00.000Z',
    updated_at: '2026-04-01T00:00:00.000Z',
    storage: null,
  },
  {
    id: 'doc-2',
    title: 'My Cover Letter',
    content: 'Cover letter content',
    type: 'cover_letter' as const,
    status: 'draft' as const,
    tags: [],
    created_at: '2026-04-01T00:00:00.000Z',
    updated_at: '2026-04-01T00:00:00.000Z',
    storage: null,
  },
];

describe('JobSavedDocumentsSection', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  it('renders documents correctly', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ documents: mockDocuments }),
    });

    render(<JobSavedDocumentsSection jobId="job-1" />);

    await waitFor(() => {
      expect(screen.getByText('My Resume')).toBeInTheDocument();
      expect(screen.getByText('My Cover Letter')).toBeInTheDocument();
    });
  });

  it('shows loading state initially', () => {
    (global.fetch as jest.Mock).mockImplementation(() => new Promise(() => {})); // Never resolves

    render(<JobSavedDocumentsSection jobId="job-1" />);

    expect(screen.getByText('Loading documents...')).toBeInTheDocument();
  });

  it('shows error state when fetch fails', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
    });

    render(<JobSavedDocumentsSection jobId="job-1" />);

    await waitFor(() => {
      expect(screen.getByText(/Error loading documents/)).toBeInTheDocument();
    });
  });

  it('shows empty state when no documents', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ documents: [] }),
    });

    render(<JobSavedDocumentsSection jobId="job-1" />);

    await waitFor(() => {
      expect(screen.getByText(/No documents have been saved/)).toBeInTheDocument();
    });
  });

  it('calls unlinkDocument when unlink button is clicked', async () => {
    const user = userEvent.setup();

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ documents: mockDocuments }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ documents: [mockDocuments[1]] }), // After unlink
      });

    render(<JobSavedDocumentsSection jobId="job-1" />);

    await waitFor(() => {
      expect(screen.getByText('My Resume')).toBeInTheDocument();
    });

    const unlinkButton = screen.getAllByText('Unlink')[0]; // Click the first unlink button (resume)
    await user.click(unlinkButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/documents/doc-1',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ jobId: null }),
        })
      );
    });
  });
});