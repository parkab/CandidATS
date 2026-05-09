import { escapeLatex } from '../escape';
import type {
  EducationEntry,
  ExperienceEntry,
  ProjectEntry,
  ResumeData,
  ResumeSkills,
} from '../types';

/**
 * Portions of this file are derived from the "Jake's Resume" LaTeX template:
 * https://www.overleaf.com/latex/templates/jakes-resume/syzfjbzwjncs
 *
 * MIT License
 *
 * Copyright (c) Jake Gutierrez
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 * This preamble is fixed; user data is injected only via renderResume().
 * String.raw avoids double-escaping backslashes in this constant.
 */
const EMAIL_REGEX =
  /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+$/;

function getSafeEmailAddress(email: string): string | null {
  const normalized = email.trim();
  if (!EMAIL_REGEX.test(normalized)) return null;
  return normalized;
}

function buildSafeMailtoTarget(email: string): string | null {
  const safeEmail = getSafeEmailAddress(email);
  if (!safeEmail) return null;
  return escapeLatex(`mailto:${safeEmail}`);
}

function buildSafeHttpsTarget(rawUrl: string): string | null {
  const trimmed = rawUrl.trim();
  const normalized = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  if (/\s/.test(normalized) || normalized.includes('\\')) return null;

  try {
    const parsed = new URL(normalized);
    if (parsed.protocol !== 'https:') return null;
  } catch {
    return null;
  }

  return escapeLatex(normalized);
}

const PREAMBLE = String.raw`\documentclass[letterpaper,11pt]{article}

\usepackage{latexsym}
\usepackage[empty]{fullpage}
\usepackage{titlesec}
\usepackage{marvosym}
\usepackage[usenames,dvipsnames]{color}
\usepackage{verbatim}
\usepackage{enumitem}
\usepackage[hidelinks]{hyperref}
\usepackage{fancyhdr}
\usepackage[english]{babel}
\usepackage{tabularx}
\ifdefined\pdfglyphtounicode
\input{glyphtounicode}
\fi

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
\setlength{\tabcolsep}{0in}

\titleformat{\section}{
  \vspace{-4pt}\scshape\raggedright\large
}{}{0em}{}[\color{black}\titlerule \vspace{-5pt}]

\ifdefined\pdfgentounicode
\pdfgentounicode=1
\fi

\newcommand{\resumeItem}[1]{
  \item\small{
    {#1 \vspace{-2pt}}
  }
}

\newcommand{\resumeSubheading}[4]{
  \vspace{-2pt}\item
    \begin{tabular*}{0.97\textwidth}[t]{l@{\extracolsep{\fill}}r}
      \textbf{#1} & #2 \\
      \textit{\small#3} & \textit{\small #4} \\
    \end{tabular*}\vspace{-7pt}
}

\newcommand{\resumeSubSubheading}[2]{
    \item
    \begin{tabular*}{0.97\textwidth}{l@{\extracolsep{\fill}}r}
      \textit{\small#1} & \textit{\small #2} \\
    \end{tabular*}\vspace{-7pt}
}

\newcommand{\resumeProjectHeading}[2]{
    \item
    \begin{tabular*}{0.97\textwidth}{l@{\extracolsep{\fill}}r}
      \small#1 & #2 \\
    \end{tabular*}\vspace{-7pt}
}

\newcommand{\resumeSubItem}[1]{\resumeItem{#1}\vspace{-4pt}}

\renewcommand\labelitemii{$\vcenter{\hbox{\tiny$\bullet$}}$}

\newcommand{\resumeSubHeadingListStart}{\begin{itemize}[leftmargin=0.15in, label={}]}
\newcommand{\resumeSubHeadingListEnd}{\end{itemize}}
\newcommand{\resumeItemListStart}{\begin{itemize}}
\newcommand{\resumeItemListEnd}{\end{itemize}\vspace{-5pt}}`;

export function renderResume(data: ResumeData): string {
  const heading = buildHeading(data.header);
  const education = buildEducationSection(data.education);
  const experience = buildExperienceSection(data.experience);
  const projects = buildProjectsSection(data.projects);
  const skills = buildSkillsSection(data.skills);

  const body = [heading, education, experience, projects, skills]
    .filter((s) => s.trim().length > 0)
    .join('\n');

  return `${PREAMBLE}\n\n\\begin{document}\n\n${body}\n\n\\end{document}\n`;
}

function buildHeading(header: ResumeData['header']): string {
  const parts: string[] = [escapeLatex(header.phone)];
  const emailDisplay = escapeLatex(header.email);
  const mailtoTarget = buildSafeMailtoTarget(header.email);

  parts.push(
    mailtoTarget
      ? `\\href{${mailtoTarget}}{\\underline{${emailDisplay}}}`
      : emailDisplay,
  );

  if (header.linkedin) {
    const display = escapeLatex(header.linkedin.replace(/^https?:\/\//, ''));
    const target = buildSafeHttpsTarget(header.linkedin);
    parts.push(target ? `\\href{${target}}{\\underline{${display}}}` : display);
  }

  if (header.github) {
    const display = escapeLatex(header.github.replace(/^https?:\/\//, ''));
    const target = buildSafeHttpsTarget(header.github);
    parts.push(target ? `\\href{${target}}{\\underline{${display}}}` : display);
  }

  const contactLine = parts.join(' $|$ ');

  return String.raw`\begin{center}
    \textbf{\Huge \scshape ${escapeLatex(header.name)}} \\ \vspace{1pt}
    \small ${contactLine}
\end{center}`;
}

function buildEducationSection(entries: EducationEntry[]): string {
  if (entries.length === 0) return '';

  const rows = entries.map((e) => {
    const extras: string[] = [];
    if (e.honors) extras.push(escapeLatex(e.honors));
    if (e.gpa) extras.push(`GPA: ${escapeLatex(e.gpa)}`);
    const degreeField = [escapeLatex(e.degree), ...extras].join(', ');

    return String.raw`    \resumeSubheading
      {${escapeLatex(e.institution)}}{${escapeLatex(e.location)}}
      {${degreeField}}{${escapeLatex(e.dates)}}`;
  });

  return String.raw`%-----------EDUCATION-----------
\section{Education}
  \resumeSubHeadingListStart
${rows.join('\n')}
  \resumeSubHeadingListEnd`;
}

function buildExperienceSection(entries: ExperienceEntry[]): string {
  if (entries.length === 0) return '';

  const rows = entries.map((e) => {
    const bullets = e.bullets
      .filter((b) => b.trim().length > 0)
      .map((b) => `        \\resumeItem{${escapeLatex(b)}}`)
      .join('\n');

    return String.raw`    \resumeSubheading
      {${escapeLatex(e.title)}}{${escapeLatex(e.dates)}}
      {${escapeLatex(e.organization)}}{${escapeLatex(e.location)}}
      \resumeItemListStart
${bullets}
      \resumeItemListEnd`;
  });

  return String.raw`%-----------EXPERIENCE-----------
\section{Experience}
  \resumeSubHeadingListStart
${rows.join('\n')}
  \resumeSubHeadingListEnd`;
}

function buildProjectsSection(entries: ProjectEntry[]): string {
  if (entries.length === 0) return '';

  const rows = entries.map((e) => {
    const bullets = e.bullets
      .filter((b) => b.trim().length > 0)
      .map((b) => `          \\resumeItem{${escapeLatex(b)}}`)
      .join('\n');

    return String.raw`      \resumeProjectHeading
          {\textbf{${escapeLatex(e.name)}} $|$ \emph{${escapeLatex(e.tech)}}}{${escapeLatex(e.dates)}}
          \resumeItemListStart
${bullets}
          \resumeItemListEnd`;
  });

  return String.raw`%-----------PROJECTS-----------
\section{Projects}
    \resumeSubHeadingListStart
${rows.join('\n')}
    \resumeSubHeadingListEnd`;
}

function buildSkillsSection(skills: ResumeSkills): string {
  const rows: string[] = [];
  if (skills.languages)
    rows.push(`     \\textbf{Languages}{: ${escapeLatex(skills.languages)}}`);
  if (skills.frameworks)
    rows.push(`     \\textbf{Frameworks}{: ${escapeLatex(skills.frameworks)}}`);
  if (skills.tools)
    rows.push(`     \\textbf{Developer Tools}{: ${escapeLatex(skills.tools)}}`);
  if (skills.libraries)
    rows.push(`     \\textbf{Libraries}{: ${escapeLatex(skills.libraries)}}`);

  if (rows.length === 0) return '';

  return String.raw`%-----------TECHNICAL SKILLS-----------
\section{Technical Skills}
 \begin{itemize}[leftmargin=0.15in, label={}]
    \small{\item{
${rows.join(' \\\\\n')}
    }}
 \end{itemize}`;
}
