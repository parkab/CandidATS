import { ApplicationStatus, APPLICATION_STATUS_COLOR } from '@/lib/jobs/status';
import PolaroidShell from '@/components/dashboard/polaroid-shell';
import PipelineStageDropdown from '@/components/dashboard/pipeline-stage-dropdown';

type PolaroidCardProps = {
  company: string;
  location: string;
  position: string;
  lastActivityDate: string;
  status: ApplicationStatus;
  angle?: number;
  jobId?: string;
  onStageChange?: (newStage: ApplicationStatus) => Promise<void>;
};

export default function PolaroidCard({
  company,
  location,
  position,
  lastActivityDate,
  status,
  angle = 0,
  jobId,
  onStageChange,
}: PolaroidCardProps) {
  return (
    <PolaroidShell angle={angle}>
      <div className="flex min-h-48 flex-col justify-center text-center rounded-xs bg-[linear-gradient(to_right,#ff75c3_0%,#ffa647_20%,#ffe83f_40%,#9fff5b_60%,#70e2ff_80%,#cd93ff_100%)] px-4 py-5 text-[#111111] shadow-inner">
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

      <div className="mt-4 flex items-center justify-between gap-3 text-sm">
        <p className="text-left italic leading-none opacity-80">
          {lastActivityDate}
        </p>
        {jobId && onStageChange ? (
          <div className="flex-1 max-w-xs">
            <PipelineStageDropdown
              currentStage={status}
              jobId={jobId}
              onStageChange={onStageChange}
            />
          </div>
        ) : (
          <p
            className="rounded-md px-2.5 py-1 text-right leading-none font-bold text-(--background)"
            style={{ backgroundColor: `${APPLICATION_STATUS_COLOR[status]}8C` }}
          >
            {status}
          </p>
        )}
      </div>
    </PolaroidShell>
  );
}
