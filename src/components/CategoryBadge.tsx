/**
 * Category Badge Component
 *
 * Minimal category label with monospace styling.
 */

interface CategoryBadgeProps {
  name: string;
  subcategory?: string | null;
}

export function CategoryBadge({ name, subcategory }: CategoryBadgeProps) {
  return (
    <span
      className="text-[10px] uppercase tracking-wider"
      style={{
        color: "var(--text-muted)",
        fontFamily: "var(--font-mono)",
      }}
    >
      {name}
      {subcategory && (
        <span style={{ color: "var(--text-faint)" }}> / {subcategory}</span>
      )}
    </span>
  );
}
