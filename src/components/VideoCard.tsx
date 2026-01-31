/**
 * Video Card Component
 *
 * Displays video content with thumbnail-forward design.
 * Used for YouTube, Vimeo, TikTok, etc.
 */

import { CategoryBadge } from "./CategoryBadge";
import { VelocityIndicator } from "./VelocityIndicator";
import { getDisplayTitle } from "@/lib/title-utils";

interface VideoCardProps {
  id: string;
  title: string | null;
  fallbackTitle?: string | null;
  canonicalUrl: string;
  domain: string;
  imageUrl?: string | null;
  category?: { name: string } | null;
  velocity: number;
  sources: string[];
  firstSeenAt: Date;
  selected?: boolean;
  onSelect?: (id: string, selected: boolean) => void;
  culturalPrediction?: string | null;
}

export function VideoCard({
  id,
  title,
  fallbackTitle,
  canonicalUrl,
  domain,
  imageUrl,
  category,
  velocity,
  sources,
  firstSeenAt,
  selected = false,
  onSelect,
  culturalPrediction,
}: VideoCardProps) {
  const displayTitle = getDisplayTitle({
    title,
    fallbackTitle: fallbackTitle ?? null,
    canonicalUrl,
    domain,
  });

  return (
    <article className="group py-4">
      <div className="flex gap-4">
        {/* Selection checkbox */}
        {onSelect && (
          <input
            type="checkbox"
            checked={selected}
            onChange={(e) => onSelect(id, e.target.checked)}
            aria-label={`Select ${displayTitle.text}`}
            className="mt-1 size-4 shrink-0"
            style={{ accentColor: "var(--text-primary)" }}
          />
        )}

        {/* Thumbnail */}
        <a
          href={canonicalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="relative block shrink-0 overflow-hidden"
          style={{ width: "160px", aspectRatio: "16/9" }}
        >
          {imageUrl ? (
            <img
              src={imageUrl}
              alt=""
              className="size-full object-cover"
              loading="lazy"
            />
          ) : (
            <div
              className="flex size-full items-center justify-center"
              style={{ background: "var(--surface)" }}
            >
              <span
                className="text-3xl"
                style={{ color: "var(--text-faint)" }}
              >
                ▶
              </span>
            </div>
          )}
          {/* Play button overlay */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity group-hover:opacity-100">
            <span
              className="flex size-10 items-center justify-center"
              style={{
                background: "var(--text-primary)",
                color: "var(--background)",
              }}
            >
              ▶
            </span>
          </div>
          {/* Video badge */}
          <span
            className="absolute bottom-1 left-1 px-1.5 py-0.5 text-[10px] uppercase"
            style={{
              background: "rgba(0,0,0,0.75)",
              color: "#fff",
              fontFamily: "var(--font-mono)",
            }}
          >
            Video
          </span>
        </a>

        {/* Content */}
        <div className="min-w-0 flex-1">
          {/* Meta row */}
          <div className="mb-1 flex items-center gap-3">
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
          </div>

          {/* Title */}
          <h3 className="mb-1 line-clamp-2 text-base leading-snug">
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

          {/* Domain + time */}
          <div className="flex items-center gap-2">
            <span
              className="text-xs"
              style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}
            >
              {domain}
            </span>
            <span style={{ color: "var(--text-faint)" }}>·</span>
            <time
              dateTime={firstSeenAt.toISOString()}
              className="text-xs"
              style={{ color: "var(--text-faint)" }}
            >
              {formatRelativeTime(firstSeenAt)}
            </time>
          </div>
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
