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
  const [totalLinks, activeSourceCount, recentLinks, trendingLinksData] =
    await Promise.all([
      prisma.link.count(),
      prisma.source.count({ where: { active: true } }),
      prisma.link.count({
        where: { firstSeenAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
      }),
      getTrendingLinks({ limit: 5 }),
    ]);

  // Get cultural analysis data for trending links
  const trendingLinkIds = trendingLinksData.map((l) => l.id);
  const trendingLinksWithCultural = await prisma.link.findMany({
    where: { id: { in: trendingLinkIds } },
    select: {
      id: true,
      culturalWhyNow: true,
      culturalPrediction: true,
      commentary: true,
    },
  });
  const culturalMap = new Map(trendingLinksWithCultural.map((l) => [l.id, l]));

  const trendingLinks = trendingLinksData.map((link) => ({
    ...link,
    ...culturalMap.get(link.id),
  }));

  // Get velocity-ranked links
  const links = await getVelocityLinks({
    timeFilter,
    limit: 100,
  });

  // Get entities for these links
  const entityMap = await getLinkEntities(links.map((l) => l.id));

  // Get cultural data for feed links
  const feedLinkIds = links.map((l) => l.id);
  const feedLinksWithCultural = await prisma.link.findMany({
    where: { id: { in: feedLinkIds } },
    select: {
      id: true,
      culturalPrediction: true,
      commentary: true,
    },
  });
  const feedCulturalMap = new Map(feedLinksWithCultural.map((l) => [l.id, l]));

  // Combine data
  const linksWithEntities = links.map((link) => ({
    ...link,
    entities: entityMap.get(link.id) || [],
    ...feedCulturalMap.get(link.id),
  }));

  return (
    <div className="min-h-dvh" style={{ background: "var(--background)" }}>
      {/* Header */}
      <header
        className="border-b px-4 py-4 md:px-6"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h1>
            <Link
              href="/"
              className="text-xl md:text-2xl hover:opacity-70 transition-opacity"
              style={{ color: "var(--text-primary)", textDecoration: "none" }}
            >
              Daily Bunch
            </Link>
          </h1>
          <nav className="flex gap-6 text-sm">
            <Link
              href="/links"
              className="hover:opacity-70 transition-opacity"
              style={{ color: "var(--text-muted)", textDecoration: "none" }}
            >
              Latest
            </Link>
            <Link
              href="/dashboard"
              style={{
                color: "var(--text-primary)",
                textDecoration: "underline",
                textUnderlineOffset: "4px",
                textDecorationColor: "var(--text-primary)",
              }}
              aria-current="page"
            >
              Trending
            </Link>
            <Link
              href="/admin"
              className="hover:opacity-70 transition-opacity"
              style={{ color: "var(--text-muted)", textDecoration: "none" }}
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
      <main className="max-w-4xl mx-auto px-4 py-8 md:px-6 md:py-10">
        {/* Trending Section */}
        {trendingLinks.length > 0 && <TrendingSection links={trendingLinks} />}

        {/* Feed Header */}
        <div
          className="flex items-center gap-3 mb-6 pb-3 border-b"
          style={{ borderColor: "var(--border)" }}
        >
          <h2
            className="text-xs uppercase tracking-wider"
            style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}
          >
            By Velocity
          </h2>
          <span
            className="text-xs tabular-nums"
            style={{ color: "var(--text-faint)", fontFamily: "var(--font-mono)" }}
          >
            {linksWithEntities.length}
          </span>
        </div>

        {linksWithEntities.length === 0 ? (
          <div className="text-center py-16">
            <p className="mb-2" style={{ color: "var(--text-muted)" }}>
              No trending links yet.
            </p>
            <p className="text-sm" style={{ color: "var(--text-faint)" }}>
              Links appear here when multiple sources link to them.
            </p>
          </div>
        ) : (
          <div
            className="divide-y"
            style={{ "--tw-divide-opacity": 1, borderColor: "var(--border-subtle)" } as React.CSSProperties}
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
                culturalPrediction={link.culturalPrediction}
                commentary={link.commentary}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
