/**
 * Link Card Component
 *
 * Displays a single link with all metadata.
 * Supports multiple view modes: feed (default), compact, grid.
 * Minimalist editorial aesthetic: restrained, text-forward, serif headlines.
 */

import { CategoryBadge } from "./CategoryBadge";
import { EntityChip } from "./EntityChip";
import { VelocityIndicator } from "./VelocityIndicator";
import { getDisplayTitle } from "@/lib/title-utils";

export type LinkCardVariant = "feed" | "compact" | "grid";

interface LinkCardProps {
  id: string;
  title: string | null;
  fallbackTitle?: string | null;
  canonicalUrl: string;
  domain: string;
  summary?: string | null;
  imageUrl?: string | null;
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
  variant?: LinkCardVariant;
  isSelected?: boolean;
  feedIndex?: number;
}

export function LinkCard({
  id,
  title,
  fallbackTitle,
  canonicalUrl,
  domain,
  summary,
  imageUrl,
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
  variant = "feed",
  isSelected = false,
  feedIndex,
}: LinkCardProps) {
  const displayTitle = getDisplayTitle({
    title,
    fallbackTitle: fallbackTitle ?? null,
    canonicalUrl,
    domain,
  });

  // Compact variant - title + meta only
  if (variant === "compact") {
    return (
      <article
        className="group py-2"
        data-feed-index={feedIndex}
        style={{
          background: isSelected ? "var(--accent-subtle)" : "transparent",
        }}
      >
        <div className="flex items-center gap-3">
          {onSelect && (
            <input
              type="checkbox"
              checked={selected}
              onChange={(e) => onSelect(id, e.target.checked)}
              aria-label={`Select ${displayTitle.text}`}
              className="size-3.5 shrink-0"
              style={{ accentColor: "var(--text-primary)" }}
            />
          )}
          <VelocityIndicator count={velocity} sources={sources} />
          <h3 className="min-w-0 flex-1 truncate text-sm">
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
          <span
            className="shrink-0 text-xs"
            style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}
          >
            {domain}
          </span>
          <time
            dateTime={firstSeenAt.toISOString()}
            className="shrink-0 text-xs tabular-nums"
            style={{ color: "var(--text-faint)" }}
          >
            {formatRelativeTime(firstSeenAt)}
          </time>
        </div>
      </article>
    );
  }

  // Grid variant - thumbnail + title
  if (variant === "grid") {
    return (
      <article
        className="group"
        data-feed-index={feedIndex}
        style={{
          background: isSelected ? "var(--accent-subtle)" : "transparent",
        }}
      >
        {/* Thumbnail */}
        <a
          href={canonicalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="relative mb-2 block overflow-hidden"
          style={{ aspectRatio: "16/10" }}
        >
          {imageUrl ? (
            <img
              src={imageUrl}
              alt=""
              className="size-full object-cover transition-opacity group-hover:opacity-80"
              loading="lazy"
            />
          ) : (
            <div
              className="flex size-full items-center justify-center"
              style={{ background: "var(--surface)" }}
            >
              <span
                className="text-4xl"
                style={{ color: "var(--text-faint)" }}
              >
                📄
              </span>
            </div>
          )}
          {/* Velocity badge */}
          <span
            className="absolute right-2 top-2 px-1.5 py-0.5 text-[10px] tabular-nums"
            style={{
              background: "rgba(0,0,0,0.75)",
              color: "#fff",
              fontFamily: "var(--font-mono)",
            }}
          >
            v{velocity}
          </span>
        </a>

        {/* Title */}
        <h3 className="mb-1 line-clamp-2 text-sm leading-snug">
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

        {/* Meta */}
        <div className="flex items-center gap-2 text-[10px]">
          <span style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
            {domain}
          </span>
          <span style={{ color: "var(--text-faint)" }}>·</span>
          <time dateTime={firstSeenAt.toISOString()} style={{ color: "var(--text-faint)" }}>
            {formatRelativeTime(firstSeenAt)}
          </time>
        </div>
      </article>
    );
  }

  // Default feed variant
  return (
    <article
      className="group py-5"
      data-feed-index={feedIndex}
      style={{
        background: isSelected ? "var(--accent-subtle)" : "transparent",
      }}
    >
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

        <div className="min-w-0 flex-1">
          {/* Meta row */}
          <div className="mb-2 flex items-center gap-3">
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
          <h3 className="mb-1 text-lg leading-snug">
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
            className="mb-2 text-sm"
            style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}
          >
            {domain}
          </p>

          {/* Summary or Commentary */}
          {(commentary || summary) && (
            <p
              className="mb-3 line-clamp-2 text-sm leading-relaxed"
              style={{ color: "var(--text-secondary)" }}
            >
              {commentary || summary}
            </p>
          )}

          {/* Entities */}
          {entities.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {entities.slice(0, 4).map(({ entity }) => (
                <EntityChip key={entity.name} name={entity.name} type={entity.type} />
              ))}
              {entities.length > 4 && (
                <span className="text-xs" style={{ color: "var(--text-faint)" }}>
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
