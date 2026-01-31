/**
 * Latest Page
 *
 * Chronological view of all links, newest first.
 */

import prisma from "@/lib/db";
import { LinkCard } from "@/components/LinkCard";
import { StatsTicker } from "@/components/StatsTicker";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface SearchParams {
  page?: string;
}

const PAGE_SIZE = 50;

export default async function LatestPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const currentPage = parseInt(params.page || "1", 10);

  // Get stats for ticker
  const [totalLinks, activeSourceCount, recentLinks] = await Promise.all([
    prisma.link.count(),
    prisma.source.count({ where: { active: true } }),
    prisma.link.count({
      where: { firstSeenAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
    }),
  ]);

  // Get total count (excluding blocked)
  const totalCount = await prisma.link.count({
    where: {
      isBlocked: false,
      OR: [
        { title: { not: null } },
        { fallbackTitle: { not: null } },
      ],
    },
  });
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // Get links chronologically (newest first)
  const links = await prisma.link.findMany({
    where: {
      isBlocked: false,
      OR: [
        { title: { not: null } },
        { fallbackTitle: { not: null } },
      ],
    },
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
    orderBy: { firstSeenAt: "desc" },
    skip: (currentPage - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });

  // Transform to display format
  const displayLinks = links.map((link) => ({
    id: link.id,
    title: link.title,
    fallbackTitle: link.fallbackTitle,
    canonicalUrl: link.canonicalUrl,
    domain: link.domain,
    aiSummary: link.aiSummary,
    firstSeenAt: link.firstSeenAt,
    category: link.category,
    subcategory: link.subcategory,
    entities: link.entities,
    velocity: link.mentions.length,
    sourceNames: [...new Set(link.mentions.map((m) => m.source.name))],
    isTrending: link.mentions.length >= 2,
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
              className="font-medium"
              style={{
                color: "var(--ink)",
                textDecoration: "underline",
                textUnderlineOffset: "4px",
              }}
              aria-current="page"
            >
              Latest
            </Link>
            <Link
              href="/dashboard"
              className="hover:opacity-70 transition-opacity"
              style={{ color: "var(--muted)", textDecoration: "none" }}
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
        ]}
      />

      {/* Main content */}
      <main className="max-w-4xl mx-auto p-4 md:p-6">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h2
            className="text-xs uppercase tracking-wide"
            style={{ color: "var(--muted)", fontFamily: "var(--font-mono)" }}
          >
            Latest Links
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
            <p>No links yet.</p>
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
                  category={link.category}
                  subcategory={link.subcategory}
                  entities={link.entities}
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
                    href={`/links?page=${currentPage - 1}`}
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
                    href={`/links?page=${currentPage + 1}`}
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
  );
}
