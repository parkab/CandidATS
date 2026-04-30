import { escapeLatex } from '../escape';
import type {
  EducationEntry,
  ExperienceEntry,
  ProjectEntry,
  ResumeData,
  ResumeSkills,
} from '../types';

// Jake's Resume — MIT License, Jake Gutierrez
// https://www.overleaf.com/latex/templates/jakes-resume/syzfjbzwjncs
// This preamble is fixed; user data is injected only via renderResume().
// String.raw avoids double-escaping backslashes in this constant.
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
\setlength{\tabcolsep}{0in}

\titleformat{\section}{
  \vspace{-4pt}\scshape\raggedright\large
}{}{0em}{}[\color{black}\titlerule \vspace{-5pt}]

\pdfgentounicode=1

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
    rows.push(
      `     \\textbf{Developer Tools}{: ${escapeLatex(skills.tools)}}`,
    );
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
