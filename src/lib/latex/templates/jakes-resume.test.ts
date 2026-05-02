import { renderResume } from './jakes-resume';
import type { ResumeData } from '../types';

const SAMPLE: ResumeData = {
  header: {
    name: 'Jane Smith',
    phone: '555-123-4567',
    email: 'jane@example.com',
    linkedin: 'https://linkedin.com/in/jane',
    github: 'https://github.com/jane',
  },
  education: [
    {
      institution: 'State University',
      location: 'Newark, NJ',
      degree: 'B.S. Computer Science',
      dates: 'Aug. 2020 -- May 2024',
    },
  ],
  experience: [
    {
      title: 'Software Engineer Intern',
      organization: 'Acme Corp',
      location: 'New York, NY',
      dates: 'June 2023 -- Aug. 2023',
      bullets: ['Built a REST API with Node.js', 'Reduced build time by 30%'],
    },
  ],
  projects: [],
  skills: { languages: 'TypeScript, Python' },
};

describe('renderResume', () => {
  it('produces a valid LaTeX document with all expected sections', () => {
    const out = renderResume(SAMPLE);
    expect(out).toContain('\\documentclass[letterpaper,11pt]{article}');
    expect(out).toContain('\\begin{document}');
    expect(out).toContain('\\end{document}');
    expect(out).toContain('\\section{Education}');
    expect(out).toContain('\\section{Experience}');
    expect(out).toContain('\\section{Technical Skills}');
  });

  it('places the name and email in the header', () => {
    const out = renderResume(SAMPLE);
    expect(out).toContain('\\scshape Jane Smith');
    expect(out).toContain('jane@example.com');
    expect(out).toContain('\\href{https://linkedin.com/in/jane}');
  });

  it('escapes special characters in user data', () => {
    const data: ResumeData = {
      ...SAMPLE,
      experience: [
        {
          ...SAMPLE.experience[0],
          organization: 'R&D Labs',
          bullets: ['Improved throughput by 50%', 'Managed $1M budget'],
        },
      ],
    };
    const out = renderResume(data);
    expect(out).toContain('R\\&D Labs');
    expect(out).toContain('50\\%');
    expect(out).toContain('\\$1M');
  });

  it('throws when a bullet contains a forbidden LaTeX command', () => {
    const data: ResumeData = {
      ...SAMPLE,
      experience: [
        { ...SAMPLE.experience[0], bullets: ['\\write18{rm -rf /}'] },
      ],
    };
    expect(() => renderResume(data)).toThrow('Forbidden LaTeX command');
  });

  it('omits sections entirely when their arrays are empty', () => {
    const data: ResumeData = {
      ...SAMPLE,
      experience: [],
      projects: [],
      skills: {},
    };
    const out = renderResume(data);
    expect(out).not.toContain('\\section{Experience}');
    expect(out).not.toContain('\\section{Projects}');
    expect(out).not.toContain('\\section{Technical Skills}');
  });

  it('skips blank bullet points', () => {
    const data: ResumeData = {
      ...SAMPLE,
      experience: [
        { ...SAMPLE.experience[0], bullets: ['', '  ', 'Valid bullet'] },
      ],
      projects: [],
    };
    const out = renderResume(data);
    // Check only the document body (after \begin{document}) to avoid preamble matches
    const body = out.split('\\begin{document}')[1] ?? '';
    const items = body.match(/\\resumeItem\{/g) ?? [];
    expect(items).toHaveLength(1);
  });
});
