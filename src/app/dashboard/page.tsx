/**
 * Feed Page
 *
 * Raw velocity-ranked links from visible sources.
 * Uses optimized raw SQL query (~150ms vs 1700ms with Prisma includes).
 */

import prisma from "@/lib/db";
import { getVelocityLinks, getLinkEntities } from "@/lib/queries";
import { LinkCard } from "@/components/LinkCard";
import Link from "next/link";

export const dynamic = 'force-dynamic';

interface SearchParams {
  category?: string;
  entity?: string;
}

export default async function ScoreboardPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  // Default to 7 days of data
  const timeFilter = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // Get categories and entities for filters (parallel)
  const [categories, entities] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.entity.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
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
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-neutral-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1><Link href="/" className="text-2xl hover:text-neutral-700 no-underline">Daily Bunch</Link></h1>
          <nav className="flex gap-6 text-sm" aria-label="Main navigation">
            <Link href="/links" className="text-neutral-600 hover:text-neutral-900">
              Home
            </Link>
            <Link href="/dashboard" className="font-medium underline underline-offset-4" aria-current="page">
              Feed
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
            {/* Category Filter */}
            <div>
              <label
                htmlFor="category-filter"
                className="block text-xs font-medium text-neutral-500 uppercase tracking-wide mb-2"
              >
                Category
              </label>
              <select
                id="category-filter"
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

            {/* Entity Filter */}
            <div>
              <label
                htmlFor="entity-filter"
                className="block text-xs font-medium text-neutral-500 uppercase tracking-wide mb-2"
              >
                Entity
              </label>
              <select
                id="entity-filter"
                name="entity"
                defaultValue={params.entity || ""}
                className="w-full text-sm border border-neutral-200 rounded-none px-2 py-1"
              >
                <option value="">All entities</option>
                {entities.map((entity) => (
                  <option key={entity.id} value={entity.id}>
                    {entity.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              className="w-full bg-neutral-900 text-white text-sm py-2 hover:bg-neutral-800 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-neutral-900"
            >
              Apply Filters
            </button>
          </form>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-6">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-neutral-600">
              {linksWithEntities.length} links
              {params.category && ` in ${params.category}`}
              {params.entity && ` mentioning selected entity`}
            </p>
          </div>

          {linksWithEntities.length === 0 ? (
            <div className="text-center py-12 text-neutral-500">
              <p>No links found matching your criteria.</p>
              <p className="text-sm mt-2">
                Try adjusting filters or{" "}
                <Link href="/links/new" className="underline">
                  add a link manually
                </Link>
                .
              </p>
            </div>
          ) : (
            <div className="divide-y divide-neutral-200">
              {linksWithEntities.map((link) => (
                <LinkCard
                  key={link.id}
                  id={link.id}
                  title={link.title}
                  canonicalUrl={link.canonicalUrl}
                  domain={link.domain}
                  summary={link.aiSummary}
                  category={link.categoryName ? { name: link.categoryName } : null}
                  subcategory={link.subcategoryName ? { name: link.subcategoryName } : null}
                  entities={link.entities.map((e) => ({ entity: e }))}
                  velocity={link.velocity}
                  sources={link.sourceNames}
                  firstSeenAt={link.firstSeenAt}
                />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
