import type { ApplicationStatus } from '@/lib/jobs/status';
import { APPLICATION_STATUS_COLOR } from '@/lib/jobs/status';

type StageSummary = {
  stage: ApplicationStatus;
  count: number;
  percent: number;
};

type DashboardMetricsProps = {
  applicationCounts: {
    total: number;
    open: number;
    active: number;
  };
  stageCounts: StageSummary[];
  timelineCounts: {
    upcomingDeadlines: number;
    upcomingEvents: number;
  };
  conversionRates: {
    appliedToInterview: string;
    interviewToOffer: string;
  };
  productivity: {
    avgDaysSinceLastActivity: number;
    avgDaysBetweenEvents: number | null;
    sevenDayVelocity: number;
    thirtyDayVelocity: number;
  };
};

function formatPercentValue(value: number) {
  return `${Math.round(value)}%`;
}

export default function DashboardMetrics({
  applicationCounts,
  stageCounts,
  timelineCounts,
  conversionRates,
  productivity,
}: DashboardMetricsProps) {
  const appliedToInterviewPercent =
    Number.parseInt(conversionRates.appliedToInterview, 10) || 0;
  const interviewToOfferPercent =
    Number.parseInt(conversionRates.interviewToOffer, 10) || 0;

  return (
    <aside className="w-full max-w-sm shrink-0 space-y-6 rounded-3xl border border-(--surface-border) bg-(--surface) p-5 shadow-sm">
      <section className="space-y-3">
        <p className="text-sm font-semibold text-(--foreground)">
          Applications
        </p>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="text-(--text-muted)">Total</span>
            <span className="text-right font-semibold text-(--foreground)">
              {applicationCounts.total}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-(--text-muted)">Open (non-archived)</span>
            <span className="text-right font-semibold text-(--foreground)">
              {applicationCounts.open}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-(--text-muted)">Active (last 30 days)</span>
            <span className="text-right font-semibold text-(--foreground)">
              {applicationCounts.active}
            </span>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <p className="text-sm font-semibold text-(--foreground)">
          Stage Counts
        </p>
        <div className="space-y-3">
          {stageCounts.map((stage) => (
            <div key={stage.stage} className="space-y-1">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="font-medium text-(--foreground)">
                  {stage.stage}
                </span>
                <span className="text-right text-(--text-muted)">
                  {stage.count} | {formatPercentValue(stage.percent)}
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-(--surface-hover)">
                <div
                  className="h-2 rounded-full"
                  style={{
                    width: `${stage.percent}%`,
                    backgroundColor: APPLICATION_STATUS_COLOR[stage.stage],
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <p className="text-sm font-semibold text-(--foreground)">
          Conversion Rates
        </p>
        <div className="space-y-3 text-sm">
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-3">
              <span className="text-(--text-muted)">Applied → Interview</span>
              <span className="text-right font-semibold text-(--foreground)">
                {conversionRates.appliedToInterview}
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-(--surface-hover)">
              <div
                className="h-2 rounded-full bg-(--foreground)"
                style={{ width: `${appliedToInterviewPercent}%` }}
              />
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-3">
              <span className="text-(--text-muted)">Interview → Offer</span>
              <span className="text-right font-semibold text-(--foreground)">
                {conversionRates.interviewToOffer}
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-(--surface-hover)">
              <div
                className="h-2 rounded-full bg-(--foreground)"
                style={{ width: `${interviewToOfferPercent}%` }}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <p className="text-sm font-semibold text-(--foreground)">
          Deadlines and Events
        </p>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="text-(--text-muted)">Upcoming deadlines</span>
            <span className="text-right font-semibold text-(--foreground)">
              {timelineCounts.upcomingDeadlines}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-(--text-muted)">Upcoming events</span>
            <span className="text-right font-semibold text-(--foreground)">
              {timelineCounts.upcomingEvents}
            </span>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <p className="text-sm font-semibold text-(--foreground)">
          Productivity
        </p>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="text-(--text-muted)">
              Days since last activity (avg)
            </span>
            <span className="text-right font-semibold text-(--foreground)">
              {productivity.avgDaysSinceLastActivity}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-(--text-muted)">
              Days between events (avg)
            </span>
            <span className="text-right font-semibold text-(--foreground)">
              {productivity.avgDaysBetweenEvents === null
                ? 'N/A'
                : `${productivity.avgDaysBetweenEvents}`}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-(--text-muted)">
              Events logged (last 7 days)
            </span>
            <span className="text-right font-semibold text-(--foreground)">
              {productivity.sevenDayVelocity}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-(--text-muted)">
              Events logged (last 30 days)
            </span>
            <span className="text-right font-semibold text-(--foreground)">
              {productivity.thirtyDayVelocity}
            </span>
          </div>
        </div>
      </section>
    </aside>
  );
}
