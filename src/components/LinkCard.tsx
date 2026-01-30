/**
 * Link Card Component
 *
 * Displays a single link with all metadata.
 * Lo-fi editorial aesthetic: dense, text-forward, serif headlines.
 * Never shows "Untitled" - always derives a title from available data.
 */

import { CategoryBadge } from "./CategoryBadge";
import { EntityChip } from "./EntityChip";
import { VelocityIndicator } from "./VelocityIndicator";
import { TrendingBadge } from "./TrendingBadge";
import { getDisplayTitle } from "@/lib/title-utils";

interface LinkCardProps {
  id: string;
  title: string | null;
  fallbackTitle?: string | null;
  canonicalUrl: string;
  domain: string;
  summary?: string | null;
  category?: { name: string; slug?: string } | null;
  subcategory?: { name: string } | null;
  entities: Array<{ entity: { name: string; type: string } }>;
  velocity: number;
  sources: string[];
  firstSeenAt: Date;
  selected?: boolean;
  onSelect?: (id: string, selected: boolean) => void;
  isTrending?: boolean;
}

export function LinkCard({
  id,
  title,
  fallbackTitle,
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
  isTrending = false,
}: LinkCardProps) {
  // Get display title - never returns empty/null
  const displayTitle = getDisplayTitle({
    title,
    fallbackTitle: fallbackTitle ?? null,
    canonicalUrl,
    domain,
  });
  return (
    <article
      className="py-3 md:py-4 last:border-b-0"
      style={{ borderBottom: "1px solid var(--border)" }}
    >
      <div className="flex items-start gap-3">
        {/* Selection checkbox */}
        {onSelect && (
          <input
            type="checkbox"
            checked={selected}
            onChange={(e) => onSelect(id, e.target.checked)}
            aria-label={`Select ${displayTitle.text}`}
            className="mt-1.5 size-4"
            style={{ accentColor: "var(--ink)" }}
          />
        )}

        <div className="flex-1 min-w-0">
          {/* Header row: trending, category, velocity, date */}
          <div
            className="flex items-center gap-3 text-xs mb-1"
            style={{ color: "var(--muted)" }}
          >
            {isTrending && <TrendingBadge />}
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
          <h3 className="font-serif text-base md:text-lg leading-tight mb-1">
            <a
              href={canonicalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:opacity-70 transition-opacity"
              style={{
                color: "var(--ink)",
                textDecoration: "none",
                fontStyle: displayTitle.source === "generated" ? "italic" : "normal",
                opacity: displayTitle.source === "generated" ? 0.8 : 1,
              }}
            >
              {displayTitle.text}
            </a>
          </h3>

          {/* Domain */}
          <p className="text-sm mb-2" style={{ color: "var(--muted)" }}>
            {domain}
          </p>

          {/* Summary (if available) */}
          {summary && (
            <p
              className="text-sm mb-2 line-clamp-2"
              style={{ color: "var(--muted)" }}
            >
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
