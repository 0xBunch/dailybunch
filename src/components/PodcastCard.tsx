/**
 * Podcast Card Component
 *
 * Displays podcast content with audio-forward design.
 * Used for Spotify episodes, Apple Podcasts, Overcast, etc.
 */

import { CategoryBadge } from "./CategoryBadge";
import { VelocityIndicator } from "./VelocityIndicator";
import { getDisplayTitle } from "@/lib/title-utils";

interface PodcastCardProps {
  id: string;
  title: string | null;
  fallbackTitle?: string | null;
  canonicalUrl: string;
  domain: string;
  description?: string | null;
  imageUrl?: string | null;
  category?: { name: string } | null;
  velocity: number;
  sources: string[];
  firstSeenAt: Date;
  selected?: boolean;
  onSelect?: (id: string, selected: boolean) => void;
  culturalPrediction?: string | null;
}

export function PodcastCard({
  id,
  title,
  fallbackTitle,
  canonicalUrl,
  domain,
  description,
  imageUrl,
  category,
  velocity,
  sources,
  firstSeenAt,
  selected = false,
  onSelect,
  culturalPrediction,
}: PodcastCardProps) {
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

        {/* Album art / Show art */}
        <a
          href={canonicalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="relative block shrink-0 overflow-hidden"
          style={{ width: "80px", height: "80px" }}
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
                className="text-2xl"
                style={{ color: "var(--text-faint)" }}
              >
                🎧
              </span>
            </div>
          )}
        </a>

        {/* Content */}
        <div className="min-w-0 flex-1">
          {/* Meta row */}
          <div className="mb-1 flex items-center gap-3">
            <span
              className="text-[10px] uppercase tracking-wider"
              style={{ color: "var(--accent)", fontFamily: "var(--font-mono)" }}
            >
              🎧 Podcast
            </span>
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

          {/* Description */}
          {description && (
            <p
              className="mb-1 line-clamp-1 text-sm"
              style={{ color: "var(--text-secondary)" }}
            >
              {description}
            </p>
          )}

          {/* Domain + time + waveform indicator */}
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
            {/* Mini waveform indicator */}
            <span
              className="ml-auto flex items-center gap-px text-xs"
              style={{ color: "var(--text-faint)" }}
            >
              <span className="inline-block" style={{ width: "2px", height: "6px", background: "currentColor" }} />
              <span className="inline-block" style={{ width: "2px", height: "10px", background: "currentColor" }} />
              <span className="inline-block" style={{ width: "2px", height: "14px", background: "currentColor" }} />
              <span className="inline-block" style={{ width: "2px", height: "8px", background: "currentColor" }} />
              <span className="inline-block" style={{ width: "2px", height: "12px", background: "currentColor" }} />
              <span className="inline-block" style={{ width: "2px", height: "6px", background: "currentColor" }} />
            </span>
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
