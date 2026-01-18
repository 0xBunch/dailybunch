/**
 * Category Badge Component
 *
 * Displays a category name with color coding.
 * Lo-fi aesthetic: plain text with subtle background.
 */

interface CategoryBadgeProps {
  name: string;
  subcategory?: string | null;
}

const categoryColors: Record<string, string> = {
  SPORTS: "bg-neutral-200 text-neutral-800",
  CULTURE: "bg-neutral-300 text-neutral-900",
  BUSINESS: "bg-neutral-100 text-neutral-700",
  AI: "bg-neutral-800 text-neutral-100",
};

export function CategoryBadge({ name, subcategory }: CategoryBadgeProps) {
  const colorClass = categoryColors[name.toUpperCase()] || "bg-neutral-100 text-neutral-700";

  return (
    <span className={`inline-block px-2 py-0.5 text-xs font-medium ${colorClass}`}>
      {name}
      {subcategory && <span className="opacity-60"> / {subcategory}</span>}
    </span>
  );
}
