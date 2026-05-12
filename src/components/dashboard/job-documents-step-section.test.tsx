import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DocumentsStepSection from './job-documents-step-section';
import type { JobDocumentItemDraft } from '@/lib/jobs/multi-step-form';

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('next/link', () => {
  const Link = ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
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
  versionNumber: 1,
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
  versionNumber: 1,
};

function renderSection(
  overrides: Partial<Parameters<typeof DocumentsStepSection>[0]> = {},
) {
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
    expect(
      screen.getByRole('button', { name: '+ Add Document' }),
    ).toBeInTheDocument();
  });

  it('shows empty state when no files', () => {
    renderSection();
    expect(screen.getByText('No documents added yet.')).toBeInTheDocument();
  });

  describe('document composer (file input)', () => {
    it('file input has accept=".pdf,.docx,.txt"', () => {
      renderSection({ isComposerOpen: true, composerMode: 'add' });
      const fileInput = document.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;
      expect(fileInput).not.toBeNull();
      expect(fileInput.accept).toBe('.pdf,.docx,.txt');
    });

    it('shows supported formats caption when composer is open', () => {
      renderSection({ isComposerOpen: true, composerMode: 'add' });
      expect(screen.getByText('Supported: PDF, DOCX, TXT')).toBeInTheDocument();
    });
  });

  describe('file list', () => {
    it('renders a file with View link pointing to /documents/[id]/view', async () => {
      const user = userEvent.setup();
      renderSection({ files: [SAMPLE_FILE] });
      await user.click(screen.getByRole('button', { name: /options/i }));
      const menu = await screen.findByRole('menu');
      const viewLink = within(menu).getByRole('menuitem', {
        name: 'View/Download',
      });
      expect(viewLink).toHaveAttribute('href', '/documents/file-1/view');
    });

    it('renders Edit Document link only for AI-generated files', async () => {
      const user = userEvent.setup();
      const aiFile = { ...SAMPLE_FILE, id: 'ai-1', isAiGenerated: true };
      const uploadedFile = { ...SAMPLE_FILE, id: 'up-1', isAiGenerated: false };
      renderSection({ files: [aiFile, uploadedFile] });

      await user.click(screen.getAllByRole('button', { name: /options/i })[0]);

      const menu = await screen.findByRole('menu');
      const editLink = within(menu).getByRole('menuitem', {
        name: 'Edit Document',
      });
      expect(editLink).toHaveAttribute('href', '/documents/ai-1/edit');
    });

    it('renders Edit Details and Remove items inside the options dropdown', async () => {
      const user = userEvent.setup();
      renderSection({ files: [SAMPLE_FILE] });

      await user.click(screen.getByRole('button', { name: /options/i }));
      const menu = await screen.findByRole('menu');

      expect(
        within(menu).getByRole('menuitem', { name: 'Edit Details' }),
      ).toBeInTheDocument();
      expect(
        within(menu).getByRole('menuitem', { name: 'Remove' }),
      ).toBeInTheDocument();
    });

    it('View link works for both AI-generated and uploaded files', async () => {
      const user = userEvent.setup();
      const aiFile = { ...SAMPLE_FILE, id: 'ai-1', isAiGenerated: true };
      const uploadedFile = { ...SAMPLE_FILE, id: 'up-1', isAiGenerated: false };
      renderSection({ files: [aiFile, uploadedFile] });

      await user.click(screen.getAllByRole('button', { name: /options/i })[0]);
      let menu = await screen.findByRole('menu');
      expect(
        within(menu).getByRole('menuitem', { name: 'View/Download' }),
      ).toHaveAttribute('href', '/documents/ai-1/view');

      await user.click(screen.getAllByRole('button', { name: /options/i })[1]);
      menu = await screen.findByRole('menu');
      expect(
        within(menu).getByRole('menuitem', { name: 'View/Download' }),
      ).toHaveAttribute('href', '/documents/up-1/view');
    });
  });
});
