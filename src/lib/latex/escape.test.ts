import { escapeLatex } from './escape';

describe('escapeLatex', () => {
  it('returns plain text unchanged', () => {
    expect(escapeLatex('Software Engineer at Acme Corp')).toBe(
      'Software Engineer at Acme Corp',
    );
    expect(escapeLatex('')).toBe('');
  });

  it('escapes all LaTeX special characters', () => {
    expect(escapeLatex('A & B')).toBe('A \\& B');
    expect(escapeLatex('40%')).toBe('40\\%');
    expect(escapeLatex('$10,000')).toBe('\\$10,000');
    expect(escapeLatex('issue_#1')).toBe('issue\\_\\#1');
    expect(escapeLatex('{value}')).toBe('\\{value\\}');
    expect(escapeLatex('~/.bashrc')).toBe('\\textasciitilde{}/.bashrc');
    expect(escapeLatex('x^2')).toBe('x\\textasciicircum{}2');
  });

  it('escapes backslash without corrupting subsequent replacements', () => {
    // Single-pass: the { and } in \textbackslash{} must not be re-escaped
    expect(escapeLatex('a\\{b')).toBe('a\\textbackslash{}\\{b');
  });

  it('throws on forbidden LaTeX commands', () => {
    expect(() => escapeLatex('\\write18{rm -rf /}')).toThrow(
      'Forbidden LaTeX command',
    );
    expect(() => escapeLatex('\\input{/etc/passwd}')).toThrow(
      'Forbidden LaTeX command',
    );
    expect(() => escapeLatex('\\newcommand{\\x}{evil}')).toThrow(
      'Forbidden LaTeX command',
    );
  });

  it('does not throw on the word "input" without a backslash', () => {
    expect(() => escapeLatex('user input validation')).not.toThrow();
  });
});
