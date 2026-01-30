/**
 * Feed Page
 *
 * Velocity-ranked links with trending section.
 * Editorial control room aesthetic.
 */

import prisma from "@/lib/db";
import { getVelocityLinks, getTrendingLinks, getLinkEntities } from "@/lib/queries";
import { LinkCard } from "@/components/LinkCard";
import { StatsTicker } from "@/components/StatsTicker";
import { TrendingSection } from "@/components/TrendingSection";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface SearchParams {
  category?: string;
  entity?: string;
}

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  // Default to 7 days of data
  const timeFilter = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // Get stats and filters (parallel)
  const [
    totalLinks,
    activeSourceCount,
    recentLinks,
    categories,
    entities,
    trendingLinks,
  ] = await Promise.all([
    prisma.link.count(),
    prisma.source.count({ where: { active: true } }),
    prisma.link.count({
      where: { firstSeenAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
    }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.entity.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    getTrendingLinks({
      limit: 5,
      categorySlug: params.category || undefined,
    }),
  ]);

  // Get velocity-ranked links using optimized query
  const links = await getVelocityLinks({
    timeFilter,
    limit: 100,
    categorySlug: params.category,
    entityId: params.entity,
  });

  // Get entities for these links (batch query)
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
        className="border-b px-6 py-4"
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
          <nav className="flex gap-6 text-sm" aria-label="Main navigation">
            <Link
              href="/links"
              className="hover:opacity-70 transition-opacity"
              style={{ color: "var(--muted)", textDecoration: "none" }}
            >
              Home
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
              Feed
            </Link>
            <Link
              href="/digests"
              className="hover:opacity-70 transition-opacity"
              style={{ color: "var(--muted)", textDecoration: "none" }}
            >
              Digests
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

      {/* Category Pills */}
      <div
        className="border-b px-6 py-3 overflow-x-auto"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard"
            className="shrink-0 px-3 py-1 text-sm transition-opacity hover:opacity-80"
            style={{
              background: !params.category ? "var(--ink)" : "transparent",
              color: !params.category ? "#fff" : "var(--muted)",
              border: !params.category ? "1px solid var(--ink)" : "1px solid var(--border)",
              textDecoration: "none",
              fontFamily: "var(--font-mono)",
            }}
          >
            All
          </Link>
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/dashboard?category=${cat.slug}`}
              className="shrink-0 px-3 py-1 text-sm transition-opacity hover:opacity-80"
              style={{
                background: params.category === cat.slug ? "var(--ink)" : "transparent",
                color: params.category === cat.slug ? "#fff" : "var(--muted)",
                border: params.category === cat.slug ? "1px solid var(--ink)" : "1px solid var(--border)",
                textDecoration: "none",
                fontFamily: "var(--font-mono)",
              }}
            >
              {cat.name}
            </Link>
          ))}
        </div>
      </div>

      <div className="flex">
        {/* Sidebar filters */}
        <aside
          className="w-56 border-r p-4 shrink-0"
          style={{ borderColor: "var(--border)" }}
        >
          <form method="GET" className="space-y-6">
            {/* Entity Filter */}
            <div>
              <label
                htmlFor="entity-filter"
                className="block text-xs uppercase tracking-wide mb-2"
                style={{ color: "var(--muted)", fontFamily: "var(--font-mono)" }}
              >
                Entity
              </label>
              <select
                id="entity-filter"
                name="entity"
                defaultValue={params.entity || ""}
                className="w-full text-sm px-2 py-1"
                style={{
                  border: "1px solid var(--border)",
                  background: "#fff",
                }}
              >
                <option value="">All entities</option>
                {entities.map((entity) => (
                  <option key={entity.id} value={entity.id}>
                    {entity.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Hidden category input to preserve selection */}
            {params.category && (
              <input type="hidden" name="category" value={params.category} />
            )}

            <button
              type="submit"
              className="w-full text-sm py-2 transition-opacity hover:opacity-80"
              style={{
                background: "var(--ink)",
                color: "#fff",
                border: "none",
              }}
            >
              Apply Filter
            </button>

            {params.entity && (
              <Link
                href={params.category ? `/dashboard?category=${params.category}` : "/dashboard"}
                className="block text-center text-sm hover:opacity-70 transition-opacity"
                style={{ color: "var(--muted)", textDecoration: "none" }}
              >
                Clear entity filter
              </Link>
            )}
          </form>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-6">
          {/* Trending Section */}
          {trendingLinks.length > 0 && (
            <TrendingSection links={trendingLinks} />
          )}

          {/* Feed Header */}
          <div className="mb-4 flex items-center justify-between">
            <h2
              className="text-xs uppercase tracking-wide"
              style={{ color: "var(--muted)", fontFamily: "var(--font-mono)" }}
            >
              {params.category ? `${params.category.toUpperCase()} Feed` : "All Links"}
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
              <p className="mb-2">No links found matching your criteria.</p>
              <p className="text-sm">
                Try adjusting filters or{" "}
                <Link
                  href="/links/new"
                  className="hover:opacity-70"
                  style={{ color: "var(--accent)", textDecoration: "underline" }}
                >
                  add a link manually
                </Link>
                .
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
    </div>
  );
}
