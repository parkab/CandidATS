import { ApplicationStatus, APPLICATION_STATUS_COLOR } from '@/lib/jobs/status';
import PolaroidShell from '@/components/dashboard/polaroid-shell';

type PolaroidCardProps = {
  company: string;
  location: string;
  position: string;
  lastActivityDate: string;
  status: ApplicationStatus;
  angle?: number;
  highPriority?: boolean;
};

export default function PolaroidCard({
  company,
  location,
  position,
  lastActivityDate,
  status,
  angle = 0,
  highPriority = false,
}: PolaroidCardProps) {
  return (
    <PolaroidShell angle={angle}>
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
            <span className="sr-only">High priority</span>
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

      <div className="mt-4 flex items-center justify-between gap-3 text-sm">
        <p className="text-left italic leading-none opacity-80">
          {lastActivityDate}
        </p>
        <p
          className="rounded-md px-2.5 py-1 text-right leading-none font-bold text-(--background)"
          style={{ backgroundColor: `${APPLICATION_STATUS_COLOR[status]}8C` }}
        >
          {status}
        </p>
      </div>
    </PolaroidShell>
  );
}
