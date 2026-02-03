/**
 * Dashboard - Latest Feed
 *
 * Simple chronological view of what's coming in.
 * No trending logic, just the raw feed to see what we're capturing.
 */

import prisma from "@/lib/db";
import { getDisplayTitle } from "@/lib/title-utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // Get latest links with their sources - simple chronological feed
  const latestLinks = await prisma.link.findMany({
    where: {
      isBlocked: false,
      firstSeenAt: { gte: twentyFourHoursAgo },
      OR: [
        { title: { not: null } },
        { fallbackTitle: { not: null } },
      ],
    },
    include: {
      mentions: {
        include: {
          source: {
            select: { name: true, showOnDashboard: true },
          },
        },
        orderBy: { seenAt: "desc" },
      },
      category: { select: { name: true } },
    },
    orderBy: { firstSeenAt: "desc" },
    take: 100,
  });

  // Process links
  const links = latestLinks.map((link) => {
    const sources = [...new Set(
      link.mentions
        .filter((m) => m.source.showOnDashboard)
        .map((m) => m.source.name)
    )];

    return {
      id: link.id,
      title: getDisplayTitle({
        title: link.title,
        fallbackTitle: link.fallbackTitle,
        canonicalUrl: link.canonicalUrl,
        domain: link.domain,
      }).text,
      canonicalUrl: link.canonicalUrl,
      domain: link.domain,
      category: link.category?.name || null,
      velocity: sources.length,
      sources,
      firstSeenAt: link.firstSeenAt,
      mediaType: link.mediaType,
    };
  });

  // Stats
  const totalToday = links.length;
  const withMultipleSources = links.filter((l) => l.velocity >= 2).length;

  // Format relative time
  const formatTime = (date: Date) => {
    const mins = Math.floor((Date.now() - date.getTime()) / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <div
      className="min-h-screen"
      style={{ background: "var(--background)", color: "var(--text-primary)" }}
    >
      {/* Header */}
      <header
        className="sticky top-0 z-10 border-b px-4 py-3 md:px-6"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <div className="flex items-center justify-between">
          <h1
            className="text-lg font-medium"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            DAILY BUNCH
          </h1>
          <div
            className="text-xs"
            style={{ color: "var(--text-faint)", fontFamily: "var(--font-mono)" }}
          >
            {totalToday} links today · {withMultipleSources} with v2+
          </div>
        </div>
      </header>

      {/* Feed */}
      <main className="mx-auto max-w-4xl px-4 py-6 md:px-6">
        <div className="space-y-1">
          {links.map((link) => (
            <article
              key={link.id}
              className="group flex items-start gap-4 rounded px-3 py-2 transition-colors hover:bg-white/5"
            >
              {/* Time */}
              <div
                className="w-16 flex-shrink-0 pt-0.5 text-xs tabular-nums"
                style={{ color: "var(--text-faint)", fontFamily: "var(--font-mono)" }}
              >
                {formatTime(link.firstSeenAt)}
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1">
                <a
                  href={link.canonicalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-sm leading-snug transition-opacity hover:opacity-70"
                  style={{ color: "var(--text-primary)", textDecoration: "none" }}
                >
                  {link.title}
                </a>
                <div
                  className="mt-1 flex items-center gap-2 text-xs"
                  style={{ color: "var(--text-faint)" }}
                >
                  <span>{link.domain}</span>
                  {link.category && (
                    <>
                      <span>·</span>
                      <span>{link.category}</span>
                    </>
                  )}
                  {link.mediaType && (
                    <>
                      <span>·</span>
                      <span className="uppercase">{link.mediaType}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Velocity + Sources */}
              <div className="flex-shrink-0 text-right">
                <div
                  className="text-xs tabular-nums"
                  style={{
                    color: link.velocity >= 3 ? "var(--accent)" : link.velocity >= 2 ? "var(--text-secondary)" : "var(--text-faint)",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  v{link.velocity}
                </div>
                <div
                  className="mt-0.5 max-w-32 truncate text-xs"
                  style={{ color: "var(--text-faint)" }}
                  title={link.sources.join(", ")}
                >
                  {link.sources.slice(0, 2).join(", ")}
                  {link.sources.length > 2 && ` +${link.sources.length - 2}`}
                </div>
              </div>
            </article>
          ))}
        </div>

        {links.length === 0 && (
          <div
            className="py-12 text-center text-sm"
            style={{ color: "var(--text-faint)" }}
          >
            No links in the last 24 hours. Check if ingestion is running.
          </div>
        )}
      </main>
    </div>
  );
}
