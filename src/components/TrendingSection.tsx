/**
 * TrendingSection Component
 *
 * Displays trending links with cultural context.
 * Elevated cards with accent border and full metadata.
 */

import { getDisplayTitle } from "@/lib/title-utils";
import type { VelocityLink } from "@/lib/queries";

interface TrendingSectionProps {
  links: Array<
    VelocityLink & {
      culturalWhyNow?: string | null;
      culturalPrediction?: string | null;
      commentary?: string | null;
    }
  >;
  title?: string;
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export function TrendingSection({
  links,
  title = "Trending Now",
}: TrendingSectionProps) {
  if (links.length === 0) return null;

  return (
    <section className="mb-10">
      <header className="flex items-center gap-3 mb-5 pb-3 border-b" style={{ borderColor: "var(--border)" }}>
        <span
          className="size-2"
          style={{ background: "var(--accent)" }}
        />
        <h2
          className="text-xs uppercase tracking-wider"
          style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}
        >
          {title}
        </h2>
        <span
          className="text-xs tabular-nums"
          style={{ color: "var(--text-faint)", fontFamily: "var(--font-mono)" }}
        >
          {links.length}
        </span>
      </header>
      <div className="space-y-4">
        {links.map((link) => (
          <TrendingCard key={link.id} link={link} />
        ))}
      </div>
    </section>
  );
}

function TrendingCard({
  link,
}: {
  link: TrendingSectionProps["links"][0];
}) {
  const displayTitle = getDisplayTitle({
    title: link.title,
    fallbackTitle: link.fallbackTitle,
    canonicalUrl: link.canonicalUrl,
    domain: link.domain,
  }).text;

  return (
    <a
      href={link.canonicalUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="block p-5 transition-all hover:translate-x-1"
      style={{
        background: "var(--surface-elevated)",
        border: "1px solid var(--border)",
        borderLeft: "3px solid var(--accent)",
        textDecoration: "none",
      }}
    >
      <div className="flex items-start justify-between gap-6">
        <div className="flex-1 min-w-0">
          {/* Meta row */}
          <div className="flex items-center gap-3 mb-2">
            <span
              className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider"
              style={{ color: "var(--accent)" }}
            >
              <span>●</span>
              <span>Trending</span>
            </span>
            {link.culturalPrediction && (
              <span
                className="text-[10px] uppercase tracking-wider"
                style={{
                  color:
                    link.culturalPrediction === "growing"
                      ? "var(--status-success)"
                      : link.culturalPrediction === "fading"
                        ? "var(--text-faint)"
                        : "var(--text-muted)",
                }}
              >
                {link.culturalPrediction === "growing" && "↑ Growing"}
                {link.culturalPrediction === "peaking" && "◆ Peaking"}
                {link.culturalPrediction === "fading" && "↓ Fading"}
              </span>
            )}
          </div>

          {/* Title */}
          <h3
            className="text-lg leading-snug mb-2"
            style={{ color: "var(--text-primary)" }}
          >
            {displayTitle}
          </h3>

          {/* Cultural context or summary */}
          {(link.culturalWhyNow || link.commentary || link.aiSummary) && (
            <p
              className="text-sm leading-relaxed mb-3 line-clamp-2"
              style={{ color: "var(--text-secondary)" }}
            >
              {link.culturalWhyNow || link.commentary || link.aiSummary}
            </p>
          )}

          {/* Stats row */}
          <div
            className="flex items-center gap-3 text-xs"
            style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}
          >
            <span>{link.domain}</span>
            <span style={{ color: "var(--border)" }}>·</span>
            <span className="tabular-nums">
              {link.velocity} {link.velocity === 1 ? "source" : "sources"}
            </span>
            <span style={{ color: "var(--border)" }}>·</span>
            <span>{formatTimeAgo(link.firstSeenAt)}</span>
          </div>

          {/* Source attribution */}
          {link.sourceNames.length > 0 && (
            <div
              className="mt-3 pt-3 border-t text-xs"
              style={{ borderColor: "var(--border-subtle)", color: "var(--text-faint)" }}
            >
              {link.sourceNames.slice(0, 4).join(" · ")}
              {link.sourceNames.length > 4 && ` +${link.sourceNames.length - 4}`}
            </div>
          )}
        </div>

        {/* Category badge */}
        {link.categoryName && (
          <span
            className="shrink-0 text-[10px] px-2 py-1 uppercase tracking-wider"
            style={{
              background: "var(--surface)",
              color: "var(--text-muted)",
              fontFamily: "var(--font-mono)",
            }}
          >
            {link.categoryName}
          </span>
        )}
      </div>
    </a>
  );
}
