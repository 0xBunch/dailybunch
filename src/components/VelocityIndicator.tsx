/**
 * Velocity Indicator Component
 *
 * Shows how many sources mentioned a link.
 * Hover reveals source names.
 */

interface VelocityIndicatorProps {
  count: number;
  sources: string[];
}

export function VelocityIndicator({ count, sources }: VelocityIndicatorProps) {
  if (count === 0) {
    return (
      <span
        className="text-[10px]"
        style={{ color: "var(--text-faint)" }}
      >
        no sources
      </span>
    );
  }

  const sourceList = sources.join(", ");

  return (
    <span
      className="inline-flex items-center text-[11px] cursor-help"
      style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}
      title={sourceList}
      tabIndex={0}
      role="note"
      aria-label={`${count} ${count === 1 ? "source" : "sources"}: ${sourceList}`}
    >
      <span className="tabular-nums" style={{ color: "var(--text-secondary)" }}>
        {count}
      </span>
      <span className="ml-1" style={{ color: "var(--text-faint)" }}>
        {count === 1 ? "src" : "srcs"}
      </span>
    </span>
  );
}
