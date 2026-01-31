/**
 * StatsTicker Component
 *
 * Minimal horizontal bar with live stats.
 * Inverted colors, monospace numbers.
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
      className="border-b px-4 py-2.5 md:px-6"
      style={{
        borderColor: "var(--border)",
        background: "var(--text-primary)",
      }}
    >
      <div className="max-w-4xl mx-auto flex items-center gap-6 md:gap-10">
        {stats.map((stat, index) => (
          <div key={stat.label} className="flex items-center gap-6 md:gap-10">
            {index > 0 && (
              <div
                className="w-px h-4"
                style={{ background: "rgba(255,255,255,0.15)" }}
              />
            )}
            <div className="flex items-baseline gap-2">
              <span
                className="text-xl md:text-2xl tabular-nums"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontWeight: 400,
                  color: stat.highlight ? "var(--accent)" : "#ffffff",
                }}
              >
                {typeof stat.value === "number"
                  ? stat.value.toLocaleString()
                  : stat.value}
              </span>
              <span
                className="text-[10px] uppercase tracking-wider"
                style={{ color: "rgba(255,255,255,0.5)" }}
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
