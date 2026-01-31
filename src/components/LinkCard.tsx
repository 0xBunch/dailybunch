/**
 * Link Card Component
 *
 * Displays a single link with all metadata.
 * Minimalist editorial aesthetic: restrained, text-forward, serif headlines.
 */

import { CategoryBadge } from "./CategoryBadge";
import { EntityChip } from "./EntityChip";
import { VelocityIndicator } from "./VelocityIndicator";
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
  culturalPrediction?: string | null;
  commentary?: string | null;
}

export function LinkCard({
  id,
  title,
  fallbackTitle,
  canonicalUrl,
  domain,
  summary,
  category,
  entities,
  velocity,
  sources,
  firstSeenAt,
  selected = false,
  onSelect,
  isTrending = false,
  culturalPrediction,
  commentary,
}: LinkCardProps) {
  const displayTitle = getDisplayTitle({
    title,
    fallbackTitle: fallbackTitle ?? null,
    canonicalUrl,
    domain,
  });

  return (
    <article className="py-5 group">
      <div className="flex items-start gap-4">
        {/* Selection checkbox */}
        {onSelect && (
          <input
            type="checkbox"
            checked={selected}
            onChange={(e) => onSelect(id, e.target.checked)}
            aria-label={`Select ${displayTitle.text}`}
            className="mt-1.5 size-4 shrink-0"
            style={{ accentColor: "var(--text-primary)" }}
          />
        )}

        <div className="flex-1 min-w-0">
          {/* Meta row */}
          <div className="flex items-center gap-3 mb-2">
            {isTrending && (
              <span
                className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider"
                style={{ color: "var(--accent)" }}
              >
                <span>●</span>
                <span>Trending</span>
              </span>
            )}
            {culturalPrediction && (
              <span
                className="text-[10px] uppercase tracking-wider"
                style={{
                  color:
                    culturalPrediction === "growing"
                      ? "var(--status-success)"
                      : culturalPrediction === "fading"
                        ? "var(--text-faint)"
                        : "var(--text-muted)",
                }}
              >
                {culturalPrediction === "growing" && "↑ Growing"}
                {culturalPrediction === "peaking" && "◆ Peaking"}
                {culturalPrediction === "fading" && "↓ Fading"}
              </span>
            )}
            {category && <CategoryBadge name={category.name} />}
            <VelocityIndicator count={velocity} sources={sources} />
            <time
              dateTime={firstSeenAt.toISOString()}
              className="text-[11px]"
              style={{ color: "var(--text-faint)" }}
            >
              {formatRelativeTime(firstSeenAt)}
            </time>
          </div>

          {/* Title */}
          <h3 className="text-lg leading-snug mb-1">
            <a
              href={canonicalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:opacity-70 transition-opacity"
              style={{
                color: "var(--text-primary)",
                textDecoration: "none",
                fontStyle: displayTitle.source === "generated" ? "italic" : "normal",
              }}
            >
              {displayTitle.text}
            </a>
          </h3>

          {/* Domain */}
          <p
            className="text-sm mb-2"
            style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}
          >
            {domain}
          </p>

          {/* Summary or Commentary */}
          {(commentary || summary) && (
            <p
              className="text-sm leading-relaxed mb-3 line-clamp-2"
              style={{ color: "var(--text-secondary)" }}
            >
              {commentary || summary}
            </p>
          )}

          {/* Entities */}
          {entities.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {entities.slice(0, 4).map(({ entity }) => (
                <EntityChip key={entity.name} name={entity.name} type={entity.type} />
              ))}
              {entities.length > 4 && (
                <span
                  className="text-xs"
                  style={{ color: "var(--text-faint)" }}
                >
                  +{entities.length - 4} more
                </span>
              )}
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

  if (diffHours < 1) return "now";
  if (diffHours < 24) return `${diffHours}h`;
  if (diffHours < 48) return "1d";
  const days = Math.floor(diffHours / 24);
  if (days < 7) return `${days}d`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
