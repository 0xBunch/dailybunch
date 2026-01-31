/**
 * Story Card Component
 *
 * Displays a clustered story with multiple related links.
 * Shows the narrative connection between links.
 */

interface StoryLink {
  id: string;
  title: string | null;
  domain: string;
  velocity: number;
}

interface StoryCardProps {
  id: string;
  title: string;
  narrative?: string | null;
  linkCount: number;
  combinedVelocity: number;
  firstLinkAt: Date;
  lastLinkAt: Date;
  links: StoryLink[];
  expanded?: boolean;
}

export function StoryCard({
  title,
  narrative,
  linkCount,
  combinedVelocity,
  links,
  expanded = false,
}: StoryCardProps) {
  // Show max 4 links when collapsed
  const visibleLinks = expanded ? links : links.slice(0, 4);
  const hasMore = links.length > visibleLinks.length;

  return (
    <article
      className="p-4"
      style={{
        background: "var(--surface-cream)",
        border: "1px solid var(--border)",
      }}
    >
      {/* Header */}
      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span style={{ color: "var(--text-faint)" }}>📰</span>
          <span
            className="text-[10px] uppercase tracking-wider"
            style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}
          >
            Story
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span
            className="tabular-nums"
            style={{ color: "var(--accent)", fontFamily: "var(--font-mono)" }}
          >
            v{combinedVelocity}
          </span>
          <span style={{ color: "var(--text-faint)" }}>·</span>
          <span style={{ color: "var(--text-faint)" }}>{linkCount} sources</span>
        </div>
      </div>

      {/* Title */}
      <h3
        className="mb-2 text-lg leading-snug"
        style={{ fontFamily: "var(--font-headline)" }}
      >
        {title}
      </h3>

      {/* Narrative */}
      {narrative && (
        <p
          className="mb-4 text-sm leading-relaxed"
          style={{ color: "var(--text-secondary)" }}
        >
          {narrative}
        </p>
      )}

      {/* Links list */}
      <div className="space-y-2">
        {visibleLinks.map((link, index) => (
          <div
            key={link.id}
            className="flex items-start gap-2"
            style={{
              paddingLeft: index === 0 ? 0 : "1rem",
              borderLeft: index === 0 ? "none" : "1px solid var(--border)",
            }}
          >
            <span className="mt-1 shrink-0" style={{ color: "var(--text-faint)" }}>
              {index === 0 ? "├─" : "├─"}
            </span>
            <div className="min-w-0 flex-1">
              <a
                href={`#${link.id}`}
                className="text-sm hover:opacity-70 transition-opacity"
                style={{ color: "var(--text-primary)", textDecoration: "none" }}
              >
                {link.title || "Untitled"}
              </a>
              <span
                className="ml-2 text-xs"
                style={{ color: "var(--text-faint)", fontFamily: "var(--font-mono)" }}
              >
                {link.domain}
              </span>
            </div>
            <span
              className="shrink-0 text-[10px] tabular-nums"
              style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}
            >
              v{link.velocity}
            </span>
          </div>
        ))}
        {hasMore && (
          <div
            className="pl-4 text-xs"
            style={{ color: "var(--text-faint)", fontFamily: "var(--font-mono)" }}
          >
            +{links.length - visibleLinks.length} more sources
          </div>
        )}
      </div>
    </article>
  );
}
