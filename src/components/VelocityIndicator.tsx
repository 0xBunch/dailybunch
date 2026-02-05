/**
 * Velocity Indicator Component
 *
 * Shows how many sources mentioned a link.
 * Human-readable format: "3 sources" instead of "v3"
 */

interface VelocityIndicatorProps {
  count: number;
  sources: string[];
}

export function VelocityIndicator({ count, sources }: VelocityIndicatorProps) {
  if (count === 0) {
    return null;
  }

  const sourceList = sources.join(", ");

  return (
    <span
      className="inline-flex items-center text-xs tabular-nums cursor-help"
      style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}
      title={sourceList}
      tabIndex={0}
      role="note"
      aria-label={`${count} ${count === 1 ? "source" : "sources"}: ${sourceList}`}
    >
      {count} {count === 1 ? "source" : "sources"}
    </span>
  );
}
