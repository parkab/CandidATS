import {
  APPLICATION_STATUS_COLOR,
  type ApplicationStatus,
} from '@/lib/jobs/status';
import type {
  JobDocumentItemDraft,
  JobMultiStepDraft,
  JobOverviewDraft,
  JobSectionItemDraft,
} from '@/lib/jobs/multi-step-form';

const STAGE_COLOR_MIX_RATIO = 75;

export function getMixedStageColor(stage: ApplicationStatus) {
  return `color-mix(in oklab, ${APPLICATION_STATUS_COLOR[stage]} ${STAGE_COLOR_MIX_RATIO}%, var(--foreground))`;
}

export function createSectionDraftItem(): JobSectionItemDraft {
  return {
    id: crypto.randomUUID(),
    title: '',
    date: '',
    notes: '',
  };
}

export function createDocumentDraftItem(): JobDocumentItemDraft {
  return {
    id: crypto.randomUUID(),
    title: '',
    date: '',
    notes: '',
    name: '',
    size: 0,
    mimeType: '',
  };
}

export function normalizeDocumentDraft(
  document: Partial<JobDocumentItemDraft> & {
    id?: string;
    name?: string;
    size?: number;
    mimeType?: string;
  },
): JobDocumentItemDraft {
  return {
    id: document.id ?? crypto.randomUUID(),
    title: document.title ?? '',
    date: document.date ?? '',
    notes: document.notes ?? '',
    name: document.name ?? '',
    size: document.size ?? 0,
    mimeType: document.mimeType ?? '',
    objectUrl: document.objectUrl,
  };
}

export function buildInitialDraft(
  initialOverview: JobOverviewDraft,
  initialDraft?: Partial<JobMultiStepDraft>,
): JobMultiStepDraft {
  const timeline = initialDraft?.timeline ?? [];
  const interviews = initialDraft?.interviews ?? [];
  const followUps = initialDraft?.followUps ?? [];
  const documents = {
    files: (initialDraft?.documents?.files ?? []).map((document) =>
      normalizeDocumentDraft(document),
    ),
  };
  const resume = initialDraft?.resume ?? {
    content: '',
    isGenerating: false,
  };
  const coverLetter = initialDraft?.coverLetter ?? {
    content: '',
    isGenerating: false,
  };

  return {
    overview: initialOverview,
    timeline: timeline,
    interviews: interviews,
    followUps: followUps,
    documents: documents,
    resume: resume,
    coverLetter: coverLetter,
  };
}
