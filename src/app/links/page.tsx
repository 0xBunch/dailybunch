/**
 * Link Browser Page (Homepage)
 *
 * Editorial control room aesthetic with trending section.
 * Shows what tastemakers are collectively pointing at.
 */

import prisma from "@/lib/db";
import { getTrendingLinks, getVelocityLinks } from "@/lib/queries";
import { LinkCard } from "@/components/LinkCard";
import { StatsTicker } from "@/components/StatsTicker";
import { TrendingSection } from "@/components/TrendingSection";
import { FilterSidebar } from "@/components/FilterSidebar";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface SearchParams {
  q?: string;
  category?: string;
  source?: string;
  sort?: "newest" | "oldest" | "velocity";
  page?: string;
}

const PAGE_SIZE = 50;

export default async function LinksPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const currentPage = parseInt(params.page || "1", 10);
  const sort = params.sort || "velocity";

  // Get stats for ticker
  const [
    totalLinks,
    activeSourceCount,
    recentLinks,
    categories,
    sources,
  ] = await Promise.all([
    prisma.link.count(),
    prisma.source.count({ where: { active: true } }),
    prisma.link.count({
      where: { firstSeenAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
    }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.source.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    }),
  ]);

  // Get trending links (2+ sources with recent activity)
  const trendingLinks = await getTrendingLinks({
    limit: 5,
    categorySlug: params.category || undefined,
  });

  // Build where clause for regular links
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const whereClause: any = {};

  if (params.q) {
    whereClause.OR = [
      { title: { contains: params.q, mode: "insensitive" } },
      { fallbackTitle: { contains: params.q, mode: "insensitive" } },
      { canonicalUrl: { contains: params.q, mode: "insensitive" } },
      { domain: { contains: params.q, mode: "insensitive" } },
    ];
  }

  if (params.category) {
    whereClause.category = { slug: params.category };
  }

  if (params.source) {
    whereClause.mentions = {
      some: { sourceId: params.source },
    };
  }

  // Get total count
  const totalCount = await prisma.link.count({ where: whereClause });
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // Get links using velocity query for better sorting
  const timeFilter = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const velocityLinks = await getVelocityLinks({
    timeFilter,
    limit: PAGE_SIZE,
    categorySlug: params.category || undefined,
  });

  // For non-velocity sorts, use standard Prisma query
  let displayLinks = velocityLinks;
  if (sort !== "velocity" || params.q || params.source) {
    const links = await prisma.link.findMany({
      where: whereClause,
      include: {
        category: true,
        subcategory: true,
        entities: {
          include: { entity: true },
        },
        mentions: {
          include: { source: true },
        },
      },
      orderBy:
        sort === "oldest"
          ? { firstSeenAt: "asc" }
          : sort === "velocity"
            ? { mentions: { _count: "desc" } }
            : { firstSeenAt: "desc" },
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    });

    displayLinks = links.map((link) => ({
      id: link.id,
      title: link.title,
      fallbackTitle: link.fallbackTitle,
      canonicalUrl: link.canonicalUrl,
      domain: link.domain,
      aiSummary: link.aiSummary,
      firstSeenAt: link.firstSeenAt,
      categoryName: link.category?.name || null,
      categorySlug: link.category?.slug || null,
      subcategoryName: link.subcategory?.name || null,
      velocity: link.mentions.length,
      weightedVelocity: link.mentions.length,
      isTrending: link.mentions.length >= 2,
      hoursSinceFirstMention: 0,
      sourceNames: [...new Set(link.mentions.map((m) => m.source.name))],
    }));
  }

  // Build URL with params
  const buildUrl = (newParams: Partial<SearchParams>) => {
    const merged = { ...params, ...newParams };
    const searchParams = new URLSearchParams();
    Object.entries(merged).forEach(([key, value]) => {
      if (value) searchParams.set(key, String(value));
    });
    return `/links?${searchParams.toString()}`;
  };

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
          <nav className="flex gap-6 text-sm">
            <Link
              href="/links"
              className="font-medium"
              style={{
                color: "var(--ink)",
                textDecoration: "underline",
                textUnderlineOffset: "4px",
              }}
            >
              Home
            </Link>
            <Link
              href="/dashboard"
              className="hover:opacity-70 transition-opacity"
              style={{ color: "var(--muted)", textDecoration: "none" }}
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

      <div className="flex">
        {/* Sidebar filters */}
        <FilterSidebar>
          <form method="GET" className="space-y-6">
            {/* Search */}
            <div>
              <label
                className="block text-xs uppercase tracking-wide mb-2"
                style={{ color: "var(--muted)", fontFamily: "var(--font-mono)" }}
              >
                Search
              </label>
              <input
                type="text"
                name="q"
                defaultValue={params.q || ""}
                placeholder="Title, URL, domain..."
                className="w-full text-sm px-2 py-1"
                style={{
                  border: "1px solid var(--border)",
                  background: "#fff",
                }}
              />
            </div>

            {/* Sort */}
            <div>
              <label
                className="block text-xs uppercase tracking-wide mb-2"
                style={{ color: "var(--muted)", fontFamily: "var(--font-mono)" }}
              >
                Sort By
              </label>
              <select
                name="sort"
                defaultValue={sort}
                className="w-full text-sm px-2 py-1"
                style={{
                  border: "1px solid var(--border)",
                  background: "#fff",
                }}
              >
                <option value="velocity">Most sources</option>
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
              </select>
            </div>

            {/* Category Filter */}
            <div>
              <label
                className="block text-xs uppercase tracking-wide mb-2"
                style={{ color: "var(--muted)", fontFamily: "var(--font-mono)" }}
              >
                Category
              </label>
              <select
                name="category"
                defaultValue={params.category || ""}
                className="w-full text-sm px-2 py-1"
                style={{
                  border: "1px solid var(--border)",
                  background: "#fff",
                }}
              >
                <option value="">All categories</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.slug}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Source Filter */}
            <div>
              <label
                className="block text-xs uppercase tracking-wide mb-2"
                style={{ color: "var(--muted)", fontFamily: "var(--font-mono)" }}
              >
                Source
              </label>
              <select
                name="source"
                defaultValue={params.source || ""}
                className="w-full text-sm px-2 py-1"
                style={{
                  border: "1px solid var(--border)",
                  background: "#fff",
                }}
              >
                <option value="">All sources</option>
                {sources.map((source) => (
                  <option key={source.id} value={source.id}>
                    {source.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              className="w-full text-sm py-2 transition-opacity hover:opacity-80"
              style={{
                background: "var(--ink)",
                color: "#fff",
                border: "none",
              }}
            >
              Apply Filters
            </button>

            {(params.q || params.category || params.source) && (
              <Link
                href="/links"
                className="block text-center text-sm hover:opacity-70 transition-opacity"
                style={{ color: "var(--muted)", textDecoration: "none" }}
              >
                Clear filters
              </Link>
            )}
          </form>
        </FilterSidebar>

        {/* Main content */}
        <main className="flex-1 p-6">
          {/* Trending Section */}
          {trendingLinks.length > 0 && !params.q && !params.source && (
            <TrendingSection links={trendingLinks} />
          )}

          {/* Recent Links Header */}
          <div className="mb-4 flex items-center justify-between">
            <h2
              className="text-xs uppercase tracking-wide"
              style={{ color: "var(--muted)", fontFamily: "var(--font-mono)" }}
            >
              {params.q ? `Search: "${params.q}"` : "Recent Links"}
              <span className="ml-2 tabular-nums">
                ({totalCount.toLocaleString()})
              </span>
            </h2>
            {totalPages > 1 && (
              <span
                className="text-xs tabular-nums"
                style={{ color: "var(--muted)", fontFamily: "var(--font-mono)" }}
              >
                Page {currentPage} / {totalPages}
              </span>
            )}
          </div>

          {displayLinks.length === 0 ? (
            <div
              className="text-center py-12"
              style={{ color: "var(--muted)" }}
            >
              <p className="mb-2">No links found.</p>
              <p className="text-sm">
                <Link
                  href="/links/new"
                  className="hover:opacity-70"
                  style={{ color: "var(--accent)", textDecoration: "underline" }}
                >
                  Add a link manually
                </Link>{" "}
                or wait for RSS to sync.
              </p>
            </div>
          ) : (
            <>
              <div
                className="divide-y"
                style={{ borderColor: "var(--border)" }}
              >
                {displayLinks.map((link) => (
                  <LinkCard
                    key={link.id}
                    id={link.id}
                    title={link.title}
                    fallbackTitle={link.fallbackTitle}
                    canonicalUrl={link.canonicalUrl}
                    domain={link.domain}
                    summary={link.aiSummary}
                    category={
                      link.categoryName
                        ? { name: link.categoryName, slug: link.categorySlug! }
                        : null
                    }
                    subcategory={
                      link.subcategoryName
                        ? { name: link.subcategoryName }
                        : null
                    }
                    entities={[]}
                    velocity={link.velocity}
                    sources={link.sourceNames}
                    firstSeenAt={link.firstSeenAt}
                    isTrending={link.isTrending}
                  />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-6 flex justify-center gap-2">
                  {currentPage > 1 && (
                    <Link
                      href={buildUrl({ page: String(currentPage - 1) })}
                      className="px-3 py-1 text-sm transition-opacity hover:opacity-70"
                      style={{
                        border: "1px solid var(--border)",
                        background: "#fff",
                        textDecoration: "none",
                        color: "var(--ink)",
                      }}
                    >
                      Previous
                    </Link>
                  )}
                  <span
                    className="px-3 py-1 text-sm tabular-nums"
                    style={{ color: "var(--muted)", fontFamily: "var(--font-mono)" }}
                  >
                    {currentPage} / {totalPages}
                  </span>
                  {currentPage < totalPages && (
                    <Link
                      href={buildUrl({ page: String(currentPage + 1) })}
                      className="px-3 py-1 text-sm transition-opacity hover:opacity-70"
                      style={{
                        border: "1px solid var(--border)",
                        background: "#fff",
                        textDecoration: "none",
                        color: "var(--ink)",
                      }}
                    >
                      Next
                    </Link>
                  )}
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
