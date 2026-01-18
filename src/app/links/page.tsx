/**
 * Link Browser Page
 *
 * Browse ALL ingested links (not just trending).
 * Search, filter, sort with pagination.
 */

import prisma from "@/lib/db";
import { LinkCard } from "@/components/LinkCard";
import Link from "next/link";

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
  const sort = params.sort || "newest";

  // Get filter options
  const categories = await prisma.category.findMany({ orderBy: { name: "asc" } });
  const sources = await prisma.source.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
  });

  // Build where clause
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const whereClause: any = {};

  if (params.q) {
    whereClause.OR = [
      { title: { contains: params.q, mode: "insensitive" } },
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

  // Get links
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

  // Process links
  const processedLinks = links.map((link) => ({
    ...link,
    velocity: link.mentions.length,
    sources: [...new Set(link.mentions.map((m) => m.source.name))],
  }));

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
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-neutral-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="font-serif text-2xl">Daily Bunch</h1>
          <nav className="flex gap-6 text-sm">
            <Link href="/dashboard" className="text-neutral-600 hover:text-neutral-900">
              Scoreboard
            </Link>
            <Link href="/links" className="font-medium underline underline-offset-4">
              All Links
            </Link>
            <Link href="/links/new" className="text-neutral-600 hover:text-neutral-900">
              Add Link
            </Link>
            <Link href="/admin" className="text-neutral-600 hover:text-neutral-900">
              Admin
            </Link>
          </nav>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar filters */}
        <aside className="w-56 border-r border-neutral-200 p-4 shrink-0">
          <form method="GET" className="space-y-6">
            {/* Search */}
            <div>
              <h3 className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-2">
                Search
              </h3>
              <input
                type="text"
                name="q"
                defaultValue={params.q || ""}
                placeholder="Title, URL, domain..."
                className="w-full text-sm border border-neutral-200 rounded-none px-2 py-1"
              />
            </div>

            {/* Sort */}
            <div>
              <h3 className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-2">
                Sort By
              </h3>
              <select
                name="sort"
                defaultValue={sort}
                className="w-full text-sm border border-neutral-200 rounded-none px-2 py-1"
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="velocity">Most sources</option>
              </select>
            </div>

            {/* Category Filter */}
            <div>
              <h3 className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-2">
                Category
              </h3>
              <select
                name="category"
                defaultValue={params.category || ""}
                className="w-full text-sm border border-neutral-200 rounded-none px-2 py-1"
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
              <h3 className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-2">
                Source
              </h3>
              <select
                name="source"
                defaultValue={params.source || ""}
                className="w-full text-sm border border-neutral-200 rounded-none px-2 py-1"
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
              className="w-full bg-neutral-900 text-white text-sm py-2 hover:bg-neutral-800"
            >
              Apply Filters
            </button>

            {(params.q || params.category || params.source) && (
              <Link
                href="/links"
                className="block text-center text-sm text-neutral-500 hover:text-neutral-700"
              >
                Clear filters
              </Link>
            )}
          </form>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-6">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-neutral-600">
              {totalCount.toLocaleString()} links total
              {params.q && ` matching "${params.q}"`}
            </p>
            <p className="text-sm text-neutral-500">
              Page {currentPage} of {totalPages || 1}
            </p>
          </div>

          {processedLinks.length === 0 ? (
            <div className="text-center py-12 text-neutral-500">
              <p>No links found.</p>
              <p className="text-sm mt-2">
                <Link href="/links/new" className="underline">
                  Add a link manually
                </Link>{" "}
                or wait for RSS to sync.
              </p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-neutral-200">
                {processedLinks.map((link) => (
                  <LinkCard
                    key={link.id}
                    id={link.id}
                    title={link.title}
                    canonicalUrl={link.canonicalUrl}
                    domain={link.domain}
                    summary={link.aiSummary}
                    category={link.category}
                    subcategory={link.subcategory}
                    entities={link.entities}
                    velocity={link.velocity}
                    sources={link.sources}
                    firstSeenAt={link.firstSeenAt}
                  />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-6 flex justify-center gap-2">
                  {currentPage > 1 && (
                    <Link
                      href={buildUrl({ page: String(currentPage - 1) })}
                      className="px-3 py-1 text-sm border border-neutral-200 hover:bg-neutral-50"
                    >
                      Previous
                    </Link>
                  )}
                  <span className="px-3 py-1 text-sm text-neutral-500">
                    {currentPage} / {totalPages}
                  </span>
                  {currentPage < totalPages && (
                    <Link
                      href={buildUrl({ page: String(currentPage + 1) })}
                      className="px-3 py-1 text-sm border border-neutral-200 hover:bg-neutral-50"
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
