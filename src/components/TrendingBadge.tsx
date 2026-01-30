/**
 * TrendingBadge Component
 *
 * Visual indicator for trending content.
 * Uses warm accent color from editorial palette.
 */

interface TrendingBadgeProps {
  className?: string;
}

export function TrendingBadge({ className = "" }: TrendingBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wide ${className}`}
      style={{
        fontFamily: "var(--font-mono)",
        color: "var(--accent-warm)",
      }}
    >
      <span>★</span>
      <span>Trending</span>
    </span>
  );
}
