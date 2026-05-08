import { renderResume } from './templates/jakes-resume';
import { renderCoverLetter } from './templates/jakes-cover-letter';
import type { ResumeData, CoverLetterData } from './types';

export const SUPPORTED_TEMPLATES = [
  'jakes-resume',
  'jakes-cover-letter',
] as const;

export type TemplateName = (typeof SUPPORTED_TEMPLATES)[number];

export function isSupportedTemplate(value: unknown): value is TemplateName {
  return (SUPPORTED_TEMPLATES as readonly unknown[]).includes(value);
}

export function renderTemplate(
  templateName: TemplateName,
  data: unknown,
): string {
  if (templateName === 'jakes-resume') {
    return renderResume(data as ResumeData);
  }
  return renderCoverLetter(data as CoverLetterData);
}

export function documentTypeFromTemplate(
  templateName: TemplateName,
): 'resume' | 'cover_letter' {
  return templateName === 'jakes-cover-letter' ? 'cover_letter' : 'resume';
}
