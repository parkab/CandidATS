import { render, screen } from '@testing-library/react';
import DocumentsStepSection from './job-documents-step-section';
import type { JobDocumentItemDraft } from '@/lib/jobs/multi-step-form';

jest.mock('next/link', () => {
  const Link = ({ href, children, ...rest }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} {...rest}>{children}</a>
  );
  Link.displayName = 'Link';
  return Link;
});

const EMPTY_DRAFT: JobDocumentItemDraft = {
  id: 'draft-1',
  title: '',
  date: '',
  documentType: 'resume',
  status: 'draft',
  tags: [],
  notes: '',
  name: '',
  size: 0,
  mimeType: '',
};

const SAMPLE_FILE: JobDocumentItemDraft = {
  id: 'file-1',
  title: 'My Resume',
  date: '2026-05-01',
  documentType: 'resume',
  status: 'ready',
  tags: ['tailored'],
  notes: 'Version 1',
  name: 'resume.pdf',
  size: 1024,
  mimeType: 'application/pdf',
  isAiGenerated: false,
};

function renderSection(overrides: Partial<Parameters<typeof DocumentsStepSection>[0]> = {}) {
  const defaults = {
    files: [] as JobDocumentItemDraft[],
    documentDraft: EMPTY_DRAFT,
    isComposerOpen: false,
    composerMode: 'add' as const,
    editingDocumentId: null,
    onOpenComposer: jest.fn(),
    onEditDocument: jest.fn(),
    onCloseComposer: jest.fn(),
    onDocumentDraftChange: jest.fn(),
    onDocumentFileSelected: jest.fn(),
    onSaveDocument: jest.fn(),
    onRemoveDocument: jest.fn(),
  };

  return render(<DocumentsStepSection {...defaults} {...overrides} />);
}

describe('DocumentsStepSection', () => {
  it('shows Add Document button', () => {
    renderSection();
    expect(screen.getByRole('button', { name: '+ Add Document' })).toBeInTheDocument();
  });

  it('shows empty state when no files', () => {
    renderSection();
    expect(screen.getByText('No documents added yet.')).toBeInTheDocument();
  });

  describe('document composer (file input)', () => {
    it('file input has accept=".pdf,.docx,.txt"', () => {
      renderSection({ isComposerOpen: true, composerMode: 'add' });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      expect(fileInput).not.toBeNull();
      expect(fileInput.accept).toBe('.pdf,.docx,.txt');
    });

    it('shows supported formats caption when composer is open', () => {
      renderSection({ isComposerOpen: true, composerMode: 'add' });
      expect(screen.getByText('Supported: PDF, DOCX, TXT')).toBeInTheDocument();
    });
  });

  describe('file list', () => {
    it('renders a file with View link pointing to /documents/[id]/view', () => {
      renderSection({ files: [SAMPLE_FILE] });
      const viewLink = screen.getByRole('link', { name: 'View/Download' });
      expect(viewLink).toHaveAttribute('href', '/documents/file-1/view');
    });

    it('renders Edit Document link only for AI-generated files', () => {
      const aiFile = { ...SAMPLE_FILE, id: 'ai-1', isAiGenerated: true };
      const uploadedFile = { ...SAMPLE_FILE, id: 'up-1', isAiGenerated: false };
      renderSection({ files: [aiFile, uploadedFile] });

      const editLinks = screen.getAllByRole('link', { name: 'Edit Document' });
      expect(editLinks).toHaveLength(1);
      expect(editLinks[0]).toHaveAttribute('href', '/documents/ai-1/edit');
    });

    it('renders Edit Details and Remove buttons for each file', () => {
      renderSection({ files: [SAMPLE_FILE] });
      expect(screen.getByRole('button', { name: 'Edit Details' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Remove' })).toBeInTheDocument();
    });

    it('View link works for both AI-generated and uploaded files', () => {
      const aiFile = { ...SAMPLE_FILE, id: 'ai-1', isAiGenerated: true };
      const uploadedFile = { ...SAMPLE_FILE, id: 'up-1', isAiGenerated: false };
      renderSection({ files: [aiFile, uploadedFile] });

      const viewLinks = screen.getAllByRole('link', { name: 'View/Download' });
      expect(viewLinks).toHaveLength(2);
      expect(viewLinks[0]).toHaveAttribute('href', '/documents/ai-1/view');
      expect(viewLinks[1]).toHaveAttribute('href', '/documents/up-1/view');
    });
  });
});
