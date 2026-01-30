/**
 * StatsTicker Component
 *
 * Dark horizontal bar with live stats in monospace.
 * Editorial control room aesthetic.
 */

interface StatsTickerProps {
  stats: Array<{
    value: number | string;
    label: string;
    highlight?: boolean;
  }>;
}

export function StatsTicker({ stats }: StatsTickerProps) {
  return (
    <div
      className="border-b px-6 py-3"
      style={{ borderColor: "var(--border)", background: "var(--ink)" }}
    >
      <div className="max-w-6xl mx-auto flex items-center gap-8">
        {stats.map((stat, index) => (
          <div key={stat.label} className="flex items-center gap-8">
            {index > 0 && (
              <div
                className="w-px h-6"
                style={{ background: "rgba(255,255,255,0.2)" }}
              />
            )}
            <div className="flex items-center gap-2">
              <span
                className="text-2xl font-medium tabular-nums"
                style={{
                  fontFamily: "var(--font-mono)",
                  color: stat.highlight ? "var(--accent-warm)" : "#fff",
                }}
              >
                {typeof stat.value === "number"
                  ? stat.value.toLocaleString()
                  : stat.value}
              </span>
              <span
                className="text-xs uppercase tracking-wide"
                style={{ color: "#888" }}
              >
                {stat.label}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
