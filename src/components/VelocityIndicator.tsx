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
    return <span className="text-xs text-neutral-400">no sources</span>;
  }

  return (
    <span
      className="inline-flex items-center text-xs text-neutral-600 cursor-help"
      title={sources.join(", ")}
    >
      <span className="font-semibold">{count}</span>
      <span className="ml-1 opacity-60">
        {count === 1 ? "source" : "sources"}
      </span>
    </span>
  );
}
