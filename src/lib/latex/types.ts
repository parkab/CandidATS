export interface ResumeHeader {
  name: string;
  phone: string;
  email: string;
  linkedin?: string;
  github?: string;
}

export interface EducationEntry {
  institution: string;
  location: string;
  /** e.g. "Bachelor of Science in Computer Science" */
  degree: string;
  /** e.g. "Aug. 2020 -- May 2024" */
  dates: string;
  gpa?: string;
  honors?: string;
}

export interface ExperienceEntry {
  title: string;
  organization: string;
  location: string;
  /** e.g. "June 2022 -- Present" */
  dates: string;
  bullets: string[];
}

export interface ProjectEntry {
  name: string;
  /** Comma-separated tech stack, e.g. "Python, Flask, React, PostgreSQL" */
  tech: string;
  /** e.g. "Jan. 2024 -- May 2024" */
  dates: string;
  bullets: string[];
}

export interface ResumeSkills {
  languages?: string;
  frameworks?: string;
  tools?: string;
  libraries?: string;
}

export interface ResumeData {
  header: ResumeHeader;
  education: EducationEntry[];
  experience: ExperienceEntry[];
  projects: ProjectEntry[];
  skills: ResumeSkills;
}

export interface CoverLetterHeader {
  name: string;
  phone: string;
  email: string;
  linkedin?: string;
  github?: string;
}

export interface CoverLetterData {
  header: CoverLetterHeader;
  /** Formatted date string, e.g. "April 30, 2026" */
  date: string;
  recipientName?: string;
  recipientTitle?: string;
  company: string;
  /** The role being applied for; optional until consumed by the renderer */
  role?: string;
  /** Each element is one body paragraph */
  paragraphs: string[];
  senderName: string;
}
