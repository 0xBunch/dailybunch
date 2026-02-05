/**
 * Latest Page
 *
 * Chronological view of all links, newest first.
 */

import prisma from "@/lib/db";
import Link from "next/link";
import { getDisplayTitle } from "@/lib/title-utils";

export const dynamic = "force-dynamic";

interface SearchParams {
  page?: string;
}

const PAGE_SIZE = 50;

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 60) return `${diffMins}m`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h`;
  return `${Math.floor(diffHours / 24)}d`;
}

export default async function LatestPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const currentPage = parseInt(params.page || "1", 10);

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
      mentions: {
        include: { source: true },
      },
    },
    orderBy: { firstSeenAt: "desc" },
    skip: (currentPage - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });

  // Transform to display format
  const displayLinks = links.map((link) => {
    const displayTitle = getDisplayTitle({
      title: link.title,
      fallbackTitle: link.fallbackTitle,
      canonicalUrl: link.canonicalUrl,
      domain: link.domain,
    });
    return {
      id: link.id,
      title: displayTitle.text,
      canonicalUrl: link.canonicalUrl,
      domain: link.domain,
      firstSeenAt: link.firstSeenAt,
      velocity: link.mentions.length,
      sourceNames: [...new Set(link.mentions.map((m) => m.source.name))],
    };
  });

  return (
    <div className="min-h-dvh" style={{ background: "var(--background)" }}>
      {/* Header - consistent with dashboard */}
      <header
        className="sticky top-0 z-10 border-b"
        style={{ background: "var(--background)", borderColor: "var(--border)" }}
      >
        <div className="mx-auto max-w-3xl px-6 py-5 flex items-center justify-between">
          <h1
            className="text-lg tracking-tight"
            style={{ fontFamily: "var(--font-headline)", fontWeight: 600 }}
          >
            <Link
              href="/"
              style={{ color: "var(--text-primary)", textDecoration: "none" }}
            >
              Daily Bunch
            </Link>
          </h1>
          <nav className="flex items-center gap-6 text-sm">
            <Link
              href="/links"
              className="transition-colors"
              style={{
                color: "var(--text-primary)",
                fontWeight: 500,
                textDecoration: "none",
              }}
              aria-current="page"
            >
              Latest
            </Link>
            <Link
              href="/dashboard"
              className="transition-colors"
              style={{ color: "var(--text-muted)", textDecoration: "none" }}
            >
              Trending
            </Link>
            <Link
              href="/admin"
              className="transition-colors"
              style={{ color: "var(--text-muted)", textDecoration: "none" }}
            >
              Admin
            </Link>
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-3xl px-6 py-8">
        {/* Section header */}
        <h2
          className="text-xs tracking-wide mb-6 pb-3 border-b"
          style={{
            color: "var(--text-faint)",
            fontFamily: "var(--font-mono)",
            borderColor: "var(--border)",
            textTransform: "uppercase",
            letterSpacing: "0.04em",
          }}
        >
          Latest
          {totalPages > 1 && (
            <span className="float-right tabular-nums">
              Page {currentPage} of {totalPages}
            </span>
          )}
        </h2>

        {displayLinks.length === 0 ? (
          <div
            className="py-16 text-center"
            style={{ color: "var(--text-faint)" }}
          >
            <p style={{ fontFamily: "var(--font-body)" }}>No links yet.</p>
          </div>
        ) : (
          <>
            <div className="divide-y" style={{ borderColor: "var(--border-subtle)" }}>
              {displayLinks.map((link, index) => {
                const isHighVelocity = link.velocity >= 5;
                return (
                  <article
                    key={link.id}
                    className="feed-item py-5"
                    style={{ borderColor: "var(--border-subtle)" }}
                  >
                    <div className="flex items-baseline gap-4">
                      {/* Time */}
                      <time
                        className="w-12 shrink-0 text-xs tabular-nums"
                        style={{ color: "var(--text-faint)", fontFamily: "var(--font-mono)" }}
                      >
                        {formatRelativeTime(link.firstSeenAt)}
                      </time>

                      {/* Content */}
                      <div className="min-w-0 flex-1">
                        <a
                          href={link.canonicalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-base leading-snug transition-colors"
                          style={{
                            color: "var(--text-primary)",
                            textDecoration: "none",
                            fontFamily: "var(--font-body)",
                            fontWeight: isHighVelocity ? 500 : 400,
                          }}
                        >
                          {link.title}
                        </a>
                        <div
                          className="mt-1.5 flex items-center gap-2 text-xs"
                          style={{ color: "var(--text-faint)", fontFamily: "var(--font-mono)" }}
                        >
                          <span>{link.domain}</span>
                          <span>·</span>
                          <span
                            className="tabular-nums"
                            style={{ color: isHighVelocity ? "var(--accent)" : "var(--text-faint)" }}
                          >
                            {link.velocity} {link.velocity === 1 ? "source" : "sources"}
                          </span>
                          {link.sourceNames[0] && (
                            <>
                              <span>·</span>
                              <span>via {link.sourceNames[0]}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-8 flex justify-center items-center gap-4">
                {currentPage > 1 ? (
                  <Link
                    href={`/links?page=${currentPage - 1}`}
                    className="px-4 py-2 text-sm transition-colors"
                    style={{
                      border: "1px solid var(--border)",
                      background: "var(--background)",
                      textDecoration: "none",
                      color: "var(--text-primary)",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    Previous
                  </Link>
                ) : (
                  <span className="w-24" />
                )}
                <span
                  className="text-xs tabular-nums"
                  style={{ color: "var(--text-faint)", fontFamily: "var(--font-mono)" }}
                >
                  {currentPage} / {totalPages}
                </span>
                {currentPage < totalPages ? (
                  <Link
                    href={`/links?page=${currentPage + 1}`}
                    className="px-4 py-2 text-sm transition-colors"
                    style={{
                      border: "1px solid var(--border)",
                      background: "var(--background)",
                      textDecoration: "none",
                      color: "var(--text-primary)",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    Next
                  </Link>
                ) : (
                  <span className="w-24" />
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
