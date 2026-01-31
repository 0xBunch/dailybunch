/**
 * Trending Page
 *
 * Velocity-ranked links - what multiple sources are linking to.
 */

import prisma from "@/lib/db";
import { getVelocityLinks, getTrendingLinks, getLinkEntities } from "@/lib/queries";
import { LinkCard } from "@/components/LinkCard";
import { StatsTicker } from "@/components/StatsTicker";
import { TrendingSection } from "@/components/TrendingSection";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function TrendingPage() {
  // Default to 7 days of data
  const timeFilter = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // Get stats (parallel)
  const [totalLinks, activeSourceCount, recentLinks, trendingLinks] =
    await Promise.all([
      prisma.link.count(),
      prisma.source.count({ where: { active: true } }),
      prisma.link.count({
        where: { firstSeenAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
      }),
      getTrendingLinks({ limit: 5 }),
    ]);

  // Get velocity-ranked links
  const links = await getVelocityLinks({
    timeFilter,
    limit: 100,
  });

  // Get entities for these links
  const entityMap = await getLinkEntities(links.map((l) => l.id));

  // Combine data
  const linksWithEntities = links.map((link) => ({
    ...link,
    entities: entityMap.get(link.id) || [],
  }));

  return (
    <div className="min-h-dvh" style={{ background: "var(--surface-cream)" }}>
      {/* Header */}
      <header
        className="border-b px-4 py-3 md:px-6 md:py-4"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="flex items-center justify-between">
          <h1>
            <Link
              href="/"
              className="text-2xl hover:opacity-70 transition-opacity"
              style={{ color: "var(--ink)", textDecoration: "none" }}
            >
              Daily Bunch
            </Link>
          </h1>
          <nav className="flex gap-6 text-sm">
            <Link
              href="/links"
              className="hover:opacity-70 transition-opacity"
              style={{ color: "var(--muted)", textDecoration: "none" }}
            >
              Latest
            </Link>
            <Link
              href="/dashboard"
              className="font-medium"
              style={{
                color: "var(--ink)",
                textDecoration: "underline",
                textUnderlineOffset: "4px",
              }}
              aria-current="page"
            >
              Trending
            </Link>
            <Link
              href="/admin"
              className="hover:opacity-70 transition-opacity"
              style={{ color: "var(--muted)", textDecoration: "none" }}
            >
              Admin
            </Link>
          </nav>
        </div>
      </header>

      {/* Stats Ticker */}
      <StatsTicker
        stats={[
          { value: totalLinks, label: "Links" },
          { value: activeSourceCount, label: "Sources" },
          { value: `+${recentLinks}`, label: "24h" },
          {
            value: trendingLinks.length,
            label: "Trending",
            highlight: trendingLinks.length > 0,
          },
        ]}
      />

      {/* Main content */}
      <main className="max-w-4xl mx-auto p-4 md:p-6">
        {/* Trending Section */}
        {trendingLinks.length > 0 && <TrendingSection links={trendingLinks} />}

        {/* Feed Header */}
        <div className="mb-4 flex items-center justify-between">
          <h2
            className="text-xs uppercase tracking-wide"
            style={{ color: "var(--muted)", fontFamily: "var(--font-mono)" }}
          >
            By Velocity
            <span className="ml-2 tabular-nums">
              ({linksWithEntities.length})
            </span>
          </h2>
        </div>

        {linksWithEntities.length === 0 ? (
          <div
            className="text-center py-12"
            style={{ color: "var(--muted)" }}
          >
            <p className="mb-2">No trending links yet.</p>
            <p className="text-sm">
              Links appear here when multiple sources link to them.
            </p>
          </div>
        ) : (
          <div
            className="divide-y"
            style={{ borderColor: "var(--border)" }}
          >
            {linksWithEntities.map((link) => (
              <LinkCard
                key={link.id}
                id={link.id}
                title={link.title}
                fallbackTitle={link.fallbackTitle}
                canonicalUrl={link.canonicalUrl}
                domain={link.domain}
                summary={link.aiSummary}
                category={link.categoryName ? { name: link.categoryName } : null}
                subcategory={link.subcategoryName ? { name: link.subcategoryName } : null}
                entities={link.entities.map((e) => ({ entity: e }))}
                velocity={link.velocity}
                sources={link.sourceNames}
                firstSeenAt={link.firstSeenAt}
                isTrending={link.isTrending}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
