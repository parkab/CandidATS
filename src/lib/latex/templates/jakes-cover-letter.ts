import { escapeLatex } from '../escape';
import type { CoverLetterData } from '../types';

// Matches Jake's Resume header style: \Huge \scshape name + contact line.
// Preamble is simpler than the resume (no titlesec/enumitem/color needed).
const PREAMBLE = String.raw`\documentclass[letterpaper,11pt]{article}

\usepackage[empty]{fullpage}
\usepackage[hidelinks]{hyperref}
\usepackage{fancyhdr}
\usepackage{tabularx}
\input{glyphtounicode}

\pagestyle{fancy}
\fancyhf{}
\fancyfoot{}
\renewcommand{\headrulewidth}{0pt}
\renewcommand{\footrulewidth}{0pt}

\addtolength{\oddsidemargin}{-0.5in}
\addtolength{\evensidemargin}{-0.5in}
\addtolength{\textwidth}{1in}
\addtolength{\topmargin}{-.5in}
\addtolength{\textheight}{1.0in}

\urlstyle{same}
\raggedbottom
\raggedright

\pdfgentounicode=1`;

export function renderCoverLetter(data: CoverLetterData): string {
  const heading = buildHeading(data.header);
  const recipientName = data.recipientName
    ? escapeLatex(data.recipientName)
    : 'Hiring Manager';
  const recipientTitle = data.recipientTitle
    ? escapeLatex(data.recipientTitle)
    : '';
  const company = escapeLatex(data.company);
  const date = escapeLatex(data.date);
  const senderName = escapeLatex(data.senderName);

  const recipientBlock = [recipientTitle, company]
    .filter((s) => s.length > 0)
    .join(' \\\\\n');

  const bodyParagraphs = data.paragraphs
    .filter((p) => p.trim().length > 0)
    .map((p) => escapeLatex(p))
    .join('\n\n\\vspace{8pt}\n\n');

  const body = String.raw`\begin{center}
${heading}
\end{center}

\vspace{16pt}

${date}

\vspace{12pt}

${recipientName} \\
${recipientBlock}

\vspace{12pt}

Dear ${recipientName},

\vspace{8pt}

${bodyParagraphs}

\vspace{24pt}

Sincerely,

\vspace{20pt}

${senderName}`;

  return `${PREAMBLE}\n\n\\begin{document}\n\n${body}\n\n\\end{document}\n`;
}

function buildHeading(header: CoverLetterData['header']): string {
  const parts: string[] = [escapeLatex(header.phone)];

  parts.push(
    `\\href{mailto:${header.email}}{\\underline{${escapeLatex(header.email)}}}`,
  );

  if (header.linkedin) {
    const display = escapeLatex(header.linkedin.replace(/^https?:\/\//, ''));
    parts.push(`\\href{${header.linkedin}}{\\underline{${display}}}`);
  }

  if (header.github) {
    const display = escapeLatex(header.github.replace(/^https?:\/\//, ''));
    parts.push(`\\href{${header.github}}{\\underline{${display}}}`);
  }

  const contactLine = parts.join(' $|$ ');

  return String.raw`    \textbf{\Huge \scshape ${escapeLatex(header.name)}} \\ \vspace{1pt}
    \small ${contactLine}`;
}
