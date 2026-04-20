import type { ApplicationStatus } from '@/lib/jobs/status';

export const JOB_FORM_STEPS = [
  { id: 'overview', label: 'Overview' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'interviews', label: 'Interviews' },
  { id: 'followUps', label: 'Follow-ups' },
  { id: 'documents', label: 'Documents' },
  { id: 'resume', label: 'Resume' },
  { id: 'coverLetter', label: 'Cover Letter' },
] as const;

export type JobFormStepId = (typeof JOB_FORM_STEPS)[number]['id'];

export type JobOverviewDraft = {
  id?: string;
  title: string;
  company: string;
  location: string;
  stage: ApplicationStatus;
  lastActivityDate: string;
  deadline: string;
  priority: boolean;
  jobDescription: string;
  compensation: string;
  applicationDate: string;
  recruiterNotes: string;
  otherNotes: string;
};

export type JobSectionItemDraft = {
  id: string;
  title: string;
  date: string;
  notes: string;
};

export type JobDocumentItemDraft = {
  id: string;
  title: string;
  date: string;
  notes: string;
  name: string;
  size: number;
  mimeType: string;
  objectUrl?: string;
};

export type JobDocumentsDraft = {
  files: JobDocumentItemDraft[];
};

export type JobResumeDraft = {
  content: string;
  isGenerating: boolean;
};

export type JobCoverLetterDraft = {
  content: string;
  isGenerating: boolean;
};

export type JobMultiStepDraft = {
  overview: JobOverviewDraft;
  timeline: JobSectionItemDraft[];
  interviews: JobSectionItemDraft[];
  followUps: JobSectionItemDraft[];
  documents: JobDocumentsDraft;
  resume: JobResumeDraft;
  coverLetter: JobCoverLetterDraft;
};

export type StepSaveAdapter = (payload: {
  step: JobFormStepId;
  draft: JobMultiStepDraft;
}) => Promise<void> | void;

export type FinalSaveAdapter = (
  draft: JobMultiStepDraft,
) => Promise<void> | void;

export const REQUIRED_OVERVIEW_FIELDS = [
  'title',
  'company',
  'location',
  'stage',
  'lastActivityDate',
] as const;

export type RequiredOverviewFieldName =
  (typeof REQUIRED_OVERVIEW_FIELDS)[number];

export const REQUIRED_FIELD_MESSAGE = 'This field is required.';

export function normalizeText(value: string) {
  return value.trim();
}
