import { renderCoverLetter } from './jakes-cover-letter';
import type { CoverLetterData } from '../types';

const SAMPLE: CoverLetterData = {
  header: {
    name: 'Jane Smith',
    phone: '555-123-4567',
    email: 'jane@example.com',
    linkedin: 'https://linkedin.com/in/jane',
  },
  date: 'April 30, 2026',
  recipientName: 'John Doe',
  recipientTitle: 'Engineering Manager',
  company: 'Acme Corp',
  role: 'Software Engineer',
  paragraphs: [
    'I am excited to apply for the Software Engineer role.',
    'My experience includes building scalable systems.',
  ],
  senderName: 'Jane Smith',
};

describe('renderCoverLetter', () => {
  it('produces a valid LaTeX document with header and signature', () => {
    const out = renderCoverLetter(SAMPLE);
    expect(out).toContain('\\documentclass[letterpaper,11pt]{article}');
    expect(out).toContain('\\begin{document}');
    expect(out).toContain('\\end{document}');
    expect(out).toContain('\\scshape Jane Smith');
    expect(out).toContain('Sincerely');
  });

  it('defaults recipient to "Hiring Manager" when not provided', () => {
    const out = renderCoverLetter({
      ...SAMPLE,
      recipientName: undefined,
      recipientTitle: undefined,
    });
    expect(out).toContain('Hiring Manager');
    expect(out).toContain('Dear Hiring Manager');
  });

  it('includes all body paragraphs and skips blank ones', () => {
    const out = renderCoverLetter({
      ...SAMPLE,
      paragraphs: ['', 'Only real paragraph'],
    });
    expect(out).toContain('Only real paragraph');
    expect(out).not.toContain('I am excited');
  });

  it('escapes special characters in company and paragraphs', () => {
    const out = renderCoverLetter({
      ...SAMPLE,
      company: 'R&D Labs',
      paragraphs: ['Revenue grew 40% YoY'],
    });
    expect(out).toContain('R\\&D Labs');
    expect(out).toContain('40\\%');
  });

  it('throws when a paragraph contains a forbidden LaTeX command', () => {
    expect(() =>
      renderCoverLetter({
        ...SAMPLE,
        paragraphs: ['Hello \\input{/etc/passwd}'],
      }),
    ).toThrow('Forbidden LaTeX command');
  });
});
