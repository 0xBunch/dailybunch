/**
 * TrendingSection Component
 *
 * Displays trending links in a highlighted section.
 * Shows full source attribution for transparency.
 */

import { TrendingBadge } from "./TrendingBadge";
import { getDisplayTitle } from "@/lib/title-utils";
import type { VelocityLink } from "@/lib/queries";

interface TrendingSectionProps {
  links: VelocityLink[];
  title?: string;
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function TrendingSection({
  links,
  title = "Trending Now",
}: TrendingSectionProps) {
  if (links.length === 0) return null;

  return (
    <section className="mb-8">
      <h2
        className="text-xs uppercase tracking-wide mb-4 pb-2 flex items-center gap-2"
        style={{
          color: "var(--accent-warm)",
          fontFamily: "var(--font-mono)",
          borderBottom: "1px solid var(--accent-warm)",
        }}
      >
        <span>★</span>
        {title}
      </h2>
      <div className="space-y-3">
        {links.map((link) => (
          <TrendingLinkCard key={link.id} link={link} />
        ))}
      </div>
    </section>
  );
}

function TrendingLinkCard({ link }: { link: VelocityLink }) {
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
      className="block p-4 transition-opacity hover:opacity-80"
      style={{
        background: "#fff",
        border: "1px solid var(--border)",
        borderLeft: "4px solid var(--accent-warm)",
        textDecoration: "none",
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <TrendingBadge />
          </div>
          <h3
            className="text-base font-medium mb-2 line-clamp-2"
            style={{ color: "var(--ink)" }}
          >
            {displayTitle}
          </h3>
          <div
            className="flex items-center gap-2 text-sm flex-wrap"
            style={{ color: "var(--muted)", fontFamily: "var(--font-mono)" }}
          >
            <span>{link.domain}</span>
            <span style={{ opacity: 0.5 }}>·</span>
            <span className="tabular-nums">
              {link.velocity} {link.velocity === 1 ? "source" : "sources"}
            </span>
            <span style={{ opacity: 0.5 }}>·</span>
            <span>{formatTimeAgo(link.firstSeenAt)}</span>
          </div>
          {link.sourceNames.length > 0 && (
            <div
              className="mt-2 text-xs"
              style={{ color: "var(--muted)" }}
            >
              {link.sourceNames.join(", ")}
            </div>
          )}
        </div>
        {link.categoryName && (
          <span
            className="shrink-0 text-xs px-2 py-1"
            style={{
              background: "var(--surface-cream)",
              color: "var(--muted)",
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
