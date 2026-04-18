type Metric = {
  label: string;
  value: string | number;
  description: string;
};

type DashboardMetricsProps = {
  metrics: Metric[];
};

export default function DashboardMetrics({ metrics }: DashboardMetricsProps) {
  return (
    <section className="mx-auto mt-8 max-w-6xl px-4 sm:px-0">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {metrics.map((metric) => (
          <article
            key={metric.label}
            className="rounded-3xl border border-(--surface-border) bg-(--surface-muted) p-5 shadow-sm"
          >
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-(--text-muted)">
              {metric.label}
            </p>
            <p className="mt-4 text-3xl font-semibold tracking-tight text-(--foreground)">
              {metric.value}
            </p>
            <p className="mt-2 text-sm leading-6 text-(--text-muted)">
              {metric.description}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
