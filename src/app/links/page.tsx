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
    <div className="min-h-screen flex flex-col" style={{ background: "var(--background)" }}>
      {/* Header */}
      <header
        className="sticky top-0 z-10 border-b"
        style={{ background: "var(--background)", borderColor: "var(--border)" }}
      >
        <div className="mx-auto max-w-3xl px-6 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="text-lg tracking-tight link-plain"
            style={{ fontFamily: "var(--font-headline)", fontWeight: 600 }}
          >
            Daily Bunch
          </Link>
          <nav className="flex items-center gap-6 text-sm">
            <Link href="/dashboard" className="link-muted">Trending</Link>
            <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>Latest</span>
            <Link href="/admin" className="link-muted">Admin</Link>
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 mx-auto max-w-3xl w-full px-6 py-8">
        <div className="flex items-baseline justify-between mb-6 pb-3 border-b" style={{ borderColor: "var(--border)" }}>
          <h2 className="section-header" style={{ marginBottom: 0, paddingBottom: 0, borderBottom: "none" }}>
            Latest
          </h2>
          {totalPages > 1 && (
            <span
              className="text-xs tabular-nums"
              style={{ color: "var(--text-faint)", fontFamily: "var(--font-mono)" }}
            >
              {currentPage} / {totalPages}
            </span>
          )}
        </div>

        {displayLinks.length === 0 ? (
          <div className="py-16 text-center" style={{ color: "var(--text-faint)" }}>
            No links yet.
          </div>
        ) : (
          <>
            <div>
              {displayLinks.map((link) => {
                const isHot = link.velocity >= 5;
                return (
                  <article key={link.id} className="feed-item link-item" data-hot={isHot}>
                    <time className="link-time">{formatRelativeTime(link.firstSeenAt)}</time>
                    <div className="link-content">
                      <a
                        href={link.canonicalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="link-title"
                      >
                        {link.title}
                      </a>
                      <div className="link-meta">
                        <span>{link.domain}</span>
                        <span className="link-sources" data-hot={isHot}>
                          {link.velocity} {link.velocity === 1 ? "source" : "sources"}
                        </span>
                        {link.sourceNames[0] && <span>{link.sourceNames[0]}</span>}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            {totalPages > 1 && (
              <div className="mt-8 flex justify-center items-center gap-6">
                {currentPage > 1 ? (
                  <Link href={`/links?page=${currentPage - 1}`} className="pagination-btn">
                    Previous
                  </Link>
                ) : (
                  <span className="pagination-btn-placeholder" />
                )}
                <span
                  className="text-xs tabular-nums"
                  style={{ color: "var(--text-faint)", fontFamily: "var(--font-mono)" }}
                >
                  {currentPage} / {totalPages}
                </span>
                {currentPage < totalPages ? (
                  <Link href={`/links?page=${currentPage + 1}`} className="pagination-btn">
                    Next
                  </Link>
                ) : (
                  <span className="pagination-btn-placeholder" />
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t mt-auto" style={{ borderColor: "var(--border)" }}>
        <div className="mx-auto max-w-3xl px-6 py-6 text-center">
          <p className="text-xs" style={{ color: "var(--text-faint)", fontFamily: "var(--font-mono)" }}>
            Daily Bunch tracks what tastemakers are pointing at.
          </p>
        </div>
      </footer>
    </div>
  );
}
