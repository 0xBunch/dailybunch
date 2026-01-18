/**
 * Link Card Component
 *
 * Displays a single link with all metadata.
 * Lo-fi editorial aesthetic: dense, text-forward, serif headlines.
 */

import { CategoryBadge } from "./CategoryBadge";
import { EntityChip } from "./EntityChip";
import { VelocityIndicator } from "./VelocityIndicator";

interface LinkCardProps {
  id: string;
  title: string | null;
  canonicalUrl: string;
  domain: string;
  summary?: string | null;
  category?: { name: string } | null;
  subcategory?: { name: string } | null;
  entities: Array<{ entity: { name: string; type: string } }>;
  velocity: number;
  sources: string[];
  firstSeenAt: Date;
  selected?: boolean;
  onSelect?: (id: string, selected: boolean) => void;
}

export function LinkCard({
  id,
  title,
  canonicalUrl,
  domain,
  summary,
  category,
  subcategory,
  entities,
  velocity,
  sources,
  firstSeenAt,
  selected = false,
  onSelect,
}: LinkCardProps) {
  return (
    <article className="border-b border-neutral-200 py-4 last:border-b-0">
      <div className="flex items-start gap-3">
        {/* Selection checkbox */}
        {onSelect && (
          <input
            type="checkbox"
            checked={selected}
            onChange={(e) => onSelect(id, e.target.checked)}
            className="mt-1.5 h-4 w-4 rounded-none border-neutral-300 text-neutral-900 focus:ring-0 focus:ring-offset-0"
          />
        )}

        <div className="flex-1 min-w-0">
          {/* Header row: category, velocity, date */}
          <div className="flex items-center gap-3 text-xs text-neutral-500 mb-1">
            {category && (
              <CategoryBadge
                name={category.name}
                subcategory={subcategory?.name}
              />
            )}
            <VelocityIndicator count={velocity} sources={sources} />
            <time dateTime={firstSeenAt.toISOString()}>
              {formatRelativeTime(firstSeenAt)}
            </time>
          </div>

          {/* Title (serif) */}
          <h3 className="font-serif text-lg leading-tight mb-1">
            <a
              href={canonicalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
            >
              {title || "Untitled"}
            </a>
          </h3>

          {/* Domain */}
          <p className="text-sm text-neutral-500 mb-2">{domain}</p>

          {/* Summary (if available) */}
          {summary && (
            <p className="text-sm text-neutral-600 mb-2 line-clamp-2">
              {summary}
            </p>
          )}

          {/* Entities */}
          {entities.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {entities.map(({ entity }) => (
                <EntityChip
                  key={entity.name}
                  name={entity.name}
                  type={entity.type}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffHours < 1) return "just now";
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffHours < 48) return "yesterday";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
