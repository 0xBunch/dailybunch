/**
 * Mission Control Dashboard
 *
 * The central hub for cultural signal intelligence.
 * Features: Breaking stories, trending grid, rising entities, hidden gems.
 */

import prisma from "@/lib/db";
import { getVelocityLinks, getTrendingLinks, getLinkEntities, getTopVideo } from "@/lib/queries";
import { getRisingEntities, getHiddenGems } from "@/lib/trends";
import { getTopMarkets } from "@/lib/polymarket";
import { MissionControlClient } from "@/components/MissionControlClient";
import { TrendingSection } from "@/components/TrendingSection";
import { RightRail } from "@/components/RightRail";
import { TopVideoModule } from "@/components/TopVideoModule";
import { PolymarketModule } from "@/components/PolymarketModule";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  // Get time ranges
  const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // Parallel data fetching
  const [
    breakingLinks,
    trendingLinksData,
    allLinks,
    risingEntitiesData,
    hiddenGemsData,
    categoriesData,
    counts,
    topVideoData,
    polymarketData,
  ] = await Promise.all([
    // Breaking: v5+, <6h
    getTrendingLinks({ limit: 3, minVelocity: 5 }),
    // Trending: v2+, <24h
    getTrendingLinks({ limit: 6, minVelocity: 2 }),
    // All velocity-ranked links
    getVelocityLinks({ timeFilter: sevenDaysAgo, limit: 100 }),
    // Rising entities
    getRisingEntities(8),
    // Hidden gems
    getHiddenGems(5),
    // Categories with counts
    prisma.category.findMany({
      select: {
        name: true,
        slug: true,
        _count: { select: { links: true } },
      },
      orderBy: { name: "asc" },
    }),
    // Counts for sidebar
    Promise.all([
      prisma.link.count({
        where: {
          isBlocked: false,
          firstSeenAt: { gte: sevenDaysAgo },
          OR: [
            { title: { not: null } },
            { fallbackTitle: { not: null } },
          ],
        },
      }),
      prisma.link.count({
        where: {
          isBlocked: false,
          mediaType: "video",
          firstSeenAt: { gte: sevenDaysAgo },
        },
      }),
      prisma.link.count({
        where: {
          isBlocked: false,
          mediaType: "podcast",
          firstSeenAt: { gte: sevenDaysAgo },
        },
      }),
    ]),
    // Top video for right rail
    getTopVideo({ minVelocity: 2, hoursLookback: 48 }),
    // Polymarket data for right rail
    getTopMarkets(5),
  ]);

  // Filter breaking to only include recent (< 6h)
  const actualBreaking = breakingLinks.filter(
    (l) => l.firstSeenAt >= sixHoursAgo
  );

  // Get cultural data for all links
  const allLinkIds = [
    ...breakingLinks.map((l) => l.id),
    ...trendingLinksData.map((l) => l.id),
    ...allLinks.map((l) => l.id),
  ];

  const [entityMap, culturalData, linksWithMedia] = await Promise.all([
    getLinkEntities(allLinkIds),
    prisma.link.findMany({
      where: { id: { in: allLinkIds } },
      select: {
        id: true,
        imageUrl: true,
        mediaType: true,
        culturalPrediction: true,
        commentary: true,
      },
    }),
    prisma.link.findMany({
      where: { id: { in: allLinkIds } },
      select: { id: true, imageUrl: true, mediaType: true },
    }),
  ]);

  const culturalMap = new Map(culturalData.map((l) => [l.id, l]));
  const mediaMap = new Map(linksWithMedia.map((l) => [l.id, l]));

  // Format links for client component
  const formatLink = (link: (typeof allLinks)[0]) => {
    const cultural = culturalMap.get(link.id);
    const media = mediaMap.get(link.id);
    return {
      id: link.id,
      title: link.title,
      fallbackTitle: link.fallbackTitle,
      canonicalUrl: link.canonicalUrl,
      domain: link.domain,
      aiSummary: link.aiSummary,
      imageUrl: media?.imageUrl ?? null,
      mediaType: media?.mediaType ?? null,
      firstSeenAt: link.firstSeenAt,
      categoryName: link.categoryName,
      velocity: link.velocity,
      isTrending: link.isTrending,
      sourceNames: link.sourceNames,
      entities: (entityMap.get(link.id) || []).map((e) => ({
        name: e.name,
        type: e.type,
      })),
      culturalPrediction: cultural?.culturalPrediction ?? null,
      commentary: cultural?.commentary ?? null,
    };
  };

  // Format trending links with cultural data
  const trendingLinks = trendingLinksData.map((link) => {
    const cultural = culturalMap.get(link.id);
    return {
      ...link,
      culturalWhyNow: cultural?.culturalPrediction ? undefined : null,
      culturalPrediction: cultural?.culturalPrediction ?? null,
      commentary: cultural?.commentary ?? null,
    };
  });

  const formattedLinks = allLinks.map(formatLink);

  // Format categories
  const categories = categoriesData.map((c) => ({
    name: c.name,
    slug: c.slug,
    count: c._count.links,
  }));

  // Format rising entities
  const risingEntities = risingEntitiesData.map((e) => ({
    name: e.name,
    slug: e.name.toLowerCase().replace(/\s+/g, "-"),
    type: e.type,
    trend: "rising" as const,
    count: e.velocityWeek,
  }));

  const [allCount, videoCount, podcastCount] = counts;

  // Format top video for right rail
  const topVideo = topVideoData
    ? {
        id: topVideoData.id,
        title: topVideoData.title,
        fallbackTitle: topVideoData.fallbackTitle,
        canonicalUrl: topVideoData.canonicalUrl,
        domain: topVideoData.domain,
        velocity: topVideoData.velocity,
        sourceNames: topVideoData.sourceNames,
        firstSeenAt: topVideoData.firstSeenAt,
      }
    : null;

  return (
    <MissionControlClient
      links={formattedLinks}
      categories={categories}
      risingEntities={risingEntities}
      counts={{
        all: allCount,
        trending: trendingLinksData.length,
        hiddenGems: hiddenGemsData.length,
        videos: videoCount,
        podcasts: podcastCount,
      }}
      rightRail={
        <RightRail>
          <TopVideoModule video={topVideo} />
          <PolymarketModule markets={polymarketData} />
        </RightRail>
      }
    >
      {/* Breaking Now Section */}
      {actualBreaking.length > 0 && (
        <section className="border-b px-4 py-6 md:px-6" style={{ borderColor: "var(--border)" }}>
          <div className="mb-4 flex items-center gap-2">
            <span
              className="inline-block size-2"
              style={{ background: "var(--accent)", borderRadius: "50%" }}
            />
            <h2
              className="text-xs uppercase tracking-wider"
              style={{ color: "var(--accent)", fontFamily: "var(--font-mono)" }}
            >
              Breaking Now
            </h2>
          </div>

          <div className="space-y-4">
            {actualBreaking.map((link) => {
              const cultural = culturalMap.get(link.id);
              return (
                <article
                  key={link.id}
                  className="p-4"
                  style={{
                    background: "var(--accent-subtle)",
                    borderLeft: "3px solid var(--accent)",
                  }}
                >
                  <h3 className="mb-2 text-xl leading-snug">
                    <a
                      href={link.canonicalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:opacity-70 transition-opacity"
                      style={{ color: "var(--text-primary)", textDecoration: "none" }}
                    >
                      {link.title || link.fallbackTitle}
                    </a>
                  </h3>
                  {cultural?.commentary && (
                    <p
                      className="mb-2 text-sm leading-relaxed"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {cultural.commentary}
                    </p>
                  )}
                  <div className="flex items-center gap-3 text-xs">
                    <span
                      className="tabular-nums"
                      style={{ color: "var(--accent)", fontFamily: "var(--font-mono)" }}
                    >
                      v{link.velocity}
                    </span>
                    <span style={{ color: "var(--text-faint)" }}>
                      {link.sourceNames.slice(0, 3).join(", ")}
                      {link.sourceNames.length > 3 && ` +${link.sourceNames.length - 3}`}
                    </span>
                    <span style={{ color: "var(--text-faint)" }}>·</span>
                    <span style={{ color: "var(--text-faint)" }}>{link.domain}</span>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {/* Trending Grid */}
      {trendingLinks.length > 0 && (
        <section className="border-b px-4 py-6 md:px-6" style={{ borderColor: "var(--border)" }}>
          <TrendingSection links={trendingLinks} />
        </section>
      )}

      {/* Rising Entities Chips */}
      {risingEntities.length > 0 && (
        <section className="border-b px-4 py-4 md:px-6" style={{ borderColor: "var(--border)" }}>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="mr-2 text-[10px] uppercase tracking-wider"
              style={{ color: "var(--text-faint)", fontFamily: "var(--font-mono)" }}
            >
              Rising:
            </span>
            {risingEntities.map((entity) => (
              <Link
                key={entity.slug}
                href={`/entity/${entity.slug}`}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs transition-opacity hover:opacity-70"
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  color: "var(--text-secondary)",
                  textDecoration: "none",
                }}
              >
                <span style={{ color: "var(--status-success)" }}>↑</span>
                <span>
                  {entity.type === "person" && "@"}
                  {entity.type === "organization" && "+"}
                  {entity.type === "product" && "#"}
                  {entity.name}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Hidden Gems */}
      {hiddenGemsData.length > 0 && (
        <section className="border-b px-4 py-6 md:px-6" style={{ borderColor: "var(--border)" }}>
          <div className="mb-3 flex items-center gap-2">
            <span style={{ color: "var(--text-faint)" }}>💎</span>
            <h2
              className="text-xs uppercase tracking-wider"
              style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}
            >
              Hidden Gems
            </h2>
            <span
              className="text-[10px]"
              style={{ color: "var(--text-faint)", fontFamily: "var(--font-mono)" }}
            >
              from trusted sources
            </span>
          </div>
          <div className="space-y-2">
            {hiddenGemsData.map((gem) => (
              <div key={gem.id} className="flex items-start gap-3">
                <span className="mt-1 text-xs" style={{ color: "var(--text-faint)" }}>
                  •
                </span>
                <div className="min-w-0 flex-1">
                  <a
                    href={gem.canonicalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm hover:opacity-70 transition-opacity"
                    style={{ color: "var(--text-primary)", textDecoration: "none" }}
                  >
                    {gem.title || gem.fallbackTitle}
                  </a>
                  <span
                    className="ml-2 text-xs"
                    style={{ color: "var(--text-faint)", fontFamily: "var(--font-mono)" }}
                  >
                    {gem.sourceNames[0]}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </MissionControlClient>
  );
}
