import { useState } from 'react';

import { ApplicationStatus, APPLICATION_STATUS_COLOR } from '@/lib/jobs/status';
import PolaroidShell from '@/components/dashboard/polaroid-shell';
import PipelineStageDropdown, {
  type PipelineStageOption,
} from '@/components/dashboard/pipeline-stage-dropdown';

type PolaroidCardProps = {
  company: string;
  location: string;
  position: string;
  lastActivityDate: string;
  status: ApplicationStatus;
  archived?: boolean;
  angle?: number;
  jobId?: string;
  onStageChange?: (newStage: PipelineStageOption) => Promise<void>;
  highPriority?: boolean;
};

const ARCHIVED_COLOR = '#ffa647';

export default function PolaroidCard({
  company,
  location,
  position,
  lastActivityDate,
  status,
  archived = false,
  angle = 0,
  jobId,
  onStageChange,
  highPriority = false,
}: PolaroidCardProps) {
  const [isStageMenuOpen, setIsStageMenuOpen] = useState(false);
  const currentStage: PipelineStageOption = archived ? 'Archived' : status;
  const badgeColor = archived
    ? ARCHIVED_COLOR
    : APPLICATION_STATUS_COLOR[status];

  return (
    <PolaroidShell
      angle={angle}
      className={isStageMenuOpen ? 'relative z-30' : 'relative z-0'}
    >
      <div className="relative flex min-h-48 flex-col justify-center text-center rounded-xs bg-[linear-gradient(to_right,#ff75c3_0%,#ffa647_20%,#ffe83f_40%,#9fff5b_60%,#70e2ff_80%,#cd93ff_100%)] px-4 py-5 text-[#111111] shadow-inner">
        {highPriority ? (
          <span
            aria-label="High priority"
            title="High priority"
            className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center text-[#111111]"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="h-6 w-6"
              aria-hidden="true"
            >
              <path d="M12 2.5l2.2 5.1 5.6.5-4.3 3.4 1.6 5.3L12 14.9 6.9 17.8l1.6-5.3L4.2 9.1l5.6-.5L12 2.5z" />
            </svg>
          </span>
        ) : null}
        <p className="line-clamp-2 text-lg font-semibold leading-tight">
          {company}
        </p>
        <p className="mt-2 line-clamp-2 text-sm leading-snug opacity-90">
          {location}
        </p>
        <p className="mt-4 line-clamp-2 text-base leading-snug opacity-95">
          {position}
        </p>
      </div>

      <div className="mt-4 flex items-center justify-between gap-2 text-sm">
        <p className="text-left italic leading-none opacity-80 whitespace-nowrap">
          {lastActivityDate}
        </p>
        {jobId && onStageChange ? (
          <div className="flex w-full flex-col items-end gap-2">
            <div className="w-full max-w-[8.5rem]">
              <PipelineStageDropdown
                currentStage={currentStage}
                jobId={jobId}
                onStageChange={onStageChange}
                onOpenChange={setIsStageMenuOpen}
              />
            </div>
          </div>
        ) : (
          <p
            className="rounded-md px-2.5 py-1 text-right leading-none font-bold text-(--background)"
            style={{ backgroundColor: `${badgeColor}8C` }}
          >
            {currentStage}
          </p>
        )}
      </div>
    </PolaroidShell>
  );
}
