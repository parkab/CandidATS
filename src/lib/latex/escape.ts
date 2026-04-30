// Commands that could read files, execute shell commands, or redefine macros.
// Checked against raw user input before any escaping is applied.
const FORBIDDEN_COMMANDS = [
  'write18',
  'input',
  'include',
  'immediate',
  'def',
  'newcommand',
  'renewcommand',
  'catcode',
  'csname',
  'expandafter',
  'openin',
  'openout',
] as const;

/**
 * Escapes all LaTeX special characters in plain-text user input.
 * Throws if any forbidden command (e.g. \write18, \input) is detected.
 *
 * Uses a single-pass regex so that replacement strings (like \textbackslash{})
 * are never re-processed by subsequent replacements.
 */
export function escapeLatex(raw: string): string {
  for (const cmd of FORBIDDEN_COMMANDS) {
    if (new RegExp(`\\\\${cmd}\\b`, 'i').test(raw)) {
      throw new Error(`Forbidden LaTeX command in input: \\${cmd}`);
    }
  }

  // Single-pass replacement — order matters only within the switch, not
  // across multiple calls, because each character is handled exactly once.
  return raw.replace(/[\\&%$#_{}~^]/g, (char) => {
    switch (char) {
      case '\\': return '\\textbackslash{}';
      case '&':  return '\\&';
      case '%':  return '\\%';
      case '$':  return '\\$';
      case '#':  return '\\#';
      case '_':  return '\\_';
      case '{':  return '\\{';
      case '}':  return '\\}';
      case '~':  return '\\textasciitilde{}';
      case '^':  return '\\textasciicircum{}';
      default:   return char;
    }
  });
}
