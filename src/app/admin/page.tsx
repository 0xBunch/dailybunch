/**
 * Admin Landing Page
 *
 * Editorial Control Room aesthetic - newsroom dashboard feel.
 */

import prisma from "@/lib/db";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const [
    linkCount,
    sourceCount,
    entityCount,
    pendingSuggestions,
    unanalyzedCount,
    untitledCount,
    recentLinks,
    errorSources,
  ] = await Promise.all([
    prisma.link.count(),
    prisma.source.count({ where: { active: true } }),
    prisma.entity.count({ where: { active: true } }),
    prisma.entitySuggestion.count({ where: { status: "pending" } }),
    prisma.link.count({ where: { aiAnalyzedAt: null, title: { not: null } } }),
    prisma.link.count({ where: { title: null, fallbackTitle: null } }),
    prisma.link.count({
      where: { firstSeenAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
    }),
    prisma.source.count({ where: { consecutiveErrors: { gte: 3 } } }),
  ]);

  const hasIssues = untitledCount > 0 || errorSources > 0;

  return (
    <div className="min-h-dvh" style={{ background: "var(--surface-cream)" }}>
      {/* Header */}
      <header className="border-b px-6 py-4" style={{ borderColor: "var(--border)" }}>
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
              href="/admin"
              className="font-medium"
              style={{
                color: "var(--ink)",
                textDecoration: "underline",
                textUnderlineOffset: "4px",
              }}
            >
              Admin
            </Link>
          </nav>
        </div>
      </header>

      {/* Stats Ticker */}
      <div
        className="border-b px-6 py-3"
        style={{ borderColor: "var(--border)", background: "var(--ink)" }}
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <span
                className="text-2xl font-medium tabular-nums"
                style={{ fontFamily: "var(--font-mono)", color: "#fff" }}
              >
                {linkCount.toLocaleString()}
              </span>
              <span className="text-xs uppercase tracking-wide" style={{ color: "#888" }}>
                Links
              </span>
            </div>
            <div
              className="w-px h-6"
              style={{ background: "rgba(255,255,255,0.2)" }}
            />
            <div className="flex items-center gap-2">
              <span
                className="text-2xl font-medium tabular-nums"
                style={{ fontFamily: "var(--font-mono)", color: "#fff" }}
              >
                {sourceCount}
              </span>
              <span className="text-xs uppercase tracking-wide" style={{ color: "#888" }}>
                Sources
              </span>
            </div>
            <div
              className="w-px h-6"
              style={{ background: "rgba(255,255,255,0.2)" }}
            />
            <div className="flex items-center gap-2">
              <span
                className="text-2xl font-medium tabular-nums"
                style={{ fontFamily: "var(--font-mono)", color: "#fff" }}
              >
                {entityCount}
              </span>
              <span className="text-xs uppercase tracking-wide" style={{ color: "#888" }}>
                Entities
              </span>
            </div>
            <div
              className="w-px h-6"
              style={{ background: "rgba(255,255,255,0.2)" }}
            />
            <div className="flex items-center gap-2">
              <span
                className="text-2xl font-medium tabular-nums"
                style={{ fontFamily: "var(--font-mono)", color: "#fff" }}
              >
                +{recentLinks}
              </span>
              <span className="text-xs uppercase tracking-wide" style={{ color: "#888" }}>
                24h
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="size-2 rounded-full animate-pulse"
              style={{ background: hasIssues ? "var(--status-warning)" : "var(--status-success)" }}
            />
            <span
              className="text-xs uppercase tracking-wide font-medium"
              style={{
                fontFamily: "var(--font-mono)",
                color: hasIssues ? "var(--status-warning)" : "var(--status-success)",
              }}
            >
              {hasIssues ? "Needs Attention" : "Live"}
            </span>
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Command Bar */}
        <div
          className="border p-1 mb-8 flex items-center gap-1"
          style={{ borderColor: "var(--border)", background: "#fff" }}
        >
          <form action="/api/ingest/poll" method="POST" className="contents">
            <button
              type="submit"
              className="px-4 py-2 text-sm hover:opacity-100 transition-opacity"
              style={{
                fontFamily: "var(--font-mono)",
                color: "var(--ink)",
                background: "transparent",
                border: "none",
                opacity: 0.7,
              }}
            >
              ▸ Poll RSS
            </button>
          </form>
          <div className="w-px h-6" style={{ background: "var(--border)" }} />
          {unanalyzedCount > 0 && (
            <>
              <form action="/api/admin/analyze-all" method="POST" className="contents">
                <button
                  type="submit"
                  className="px-4 py-2 text-sm hover:opacity-100 transition-opacity"
                  style={{
                    fontFamily: "var(--font-mono)",
                    color: "var(--accent-warm)",
                    background: "transparent",
                    border: "none",
                    opacity: 0.9,
                  }}
                >
                  ▸ Analyze ({unanalyzedCount})
                </button>
              </form>
              <div className="w-px h-6" style={{ background: "var(--border)" }} />
            </>
          )}
          {untitledCount > 0 && (
            <>
              <form action="/api/admin/links/refetch-titles" method="POST" className="contents">
                <button
                  type="submit"
                  className="px-4 py-2 text-sm hover:opacity-100 transition-opacity"
                  style={{
                    fontFamily: "var(--font-mono)",
                    color: "var(--status-warning)",
                    background: "transparent",
                    border: "none",
                    opacity: 0.9,
                  }}
                >
                  ▸ Refetch Titles ({untitledCount})
                </button>
              </form>
              <div className="w-px h-6" style={{ background: "var(--border)" }} />
            </>
          )}
          <form action="/api/admin/links/cleanup" method="POST" className="contents">
            <button
              type="submit"
              className="px-4 py-2 text-sm hover:opacity-100 transition-opacity"
              style={{
                fontFamily: "var(--font-mono)",
                color: "var(--status-error)",
                background: "transparent",
                border: "none",
                opacity: 0.7,
              }}
            >
              ▸ Purge
            </button>
          </form>
        </div>

        {/* Status Alerts */}
        {(pendingSuggestions > 0 || errorSources > 0) && (
          <div className="mb-8 space-y-2">
            {pendingSuggestions > 0 && (
              <Link
                href="/admin/entities"
                className="block border-l-4 px-4 py-3 hover:opacity-80 transition-opacity"
                style={{
                  borderColor: "var(--status-warning)",
                  background: "rgba(181, 135, 44, 0.1)",
                  textDecoration: "none",
                }}
              >
                <span
                  className="text-sm font-medium"
                  style={{ fontFamily: "var(--font-mono)", color: "var(--ink)" }}
                >
                  {pendingSuggestions} entity suggestion{pendingSuggestions !== 1 ? "s" : ""} awaiting
                  review
                </span>
              </Link>
            )}
            {errorSources > 0 && (
              <Link
                href="/admin/sources"
                className="block border-l-4 px-4 py-3 hover:opacity-80 transition-opacity"
                style={{
                  borderColor: "var(--status-error)",
                  background: "rgba(166, 84, 84, 0.1)",
                  textDecoration: "none",
                }}
              >
                <span
                  className="text-sm font-medium"
                  style={{ fontFamily: "var(--font-mono)", color: "var(--ink)" }}
                >
                  {errorSources} source{errorSources !== 1 ? "s" : ""} with fetch errors
                </span>
              </Link>
            )}
          </div>
        )}

        {/* Section Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/admin/sources"
            className="group border p-6 hover:border-current transition-colors"
            style={{
              borderColor: "var(--border)",
              background: "#fff",
              textDecoration: "none",
            }}
          >
            <div className="flex items-start justify-between mb-4">
              <h3
                className="text-lg font-medium"
                style={{ color: "var(--ink)", textTransform: "uppercase", letterSpacing: "0.05em" }}
              >
                Sources
              </h3>
              <span
                className="text-2xl tabular-nums"
                style={{ fontFamily: "var(--font-mono)", color: "var(--muted)" }}
              >
                {sourceCount}
              </span>
            </div>
            <p className="text-sm" style={{ color: "var(--muted)" }}>
              RSS feeds and newsletters feeding the system
            </p>
            {errorSources > 0 && (
              <div className="mt-4 pt-4" style={{ borderTop: "1px solid var(--border)" }}>
                <span
                  className="text-xs font-medium"
                  style={{ color: "var(--status-error)", fontFamily: "var(--font-mono)" }}
                >
                  {errorSources} with errors
                </span>
              </div>
            )}
          </Link>

          <Link
            href="/admin/entities"
            className="group border p-6 hover:border-current transition-colors"
            style={{
              borderColor: "var(--border)",
              background: "#fff",
              textDecoration: "none",
            }}
          >
            <div className="flex items-start justify-between mb-4">
              <h3
                className="text-lg font-medium"
                style={{ color: "var(--ink)", textTransform: "uppercase", letterSpacing: "0.05em" }}
              >
                Entities
              </h3>
              <span
                className="text-2xl tabular-nums"
                style={{ fontFamily: "var(--font-mono)", color: "var(--muted)" }}
              >
                {entityCount}
              </span>
            </div>
            <p className="text-sm" style={{ color: "var(--muted)" }}>
              People, companies, and products tracked
            </p>
            {pendingSuggestions > 0 && (
              <div className="mt-4 pt-4" style={{ borderTop: "1px solid var(--border)" }}>
                <span
                  className="text-xs font-medium"
                  style={{ color: "var(--status-warning)", fontFamily: "var(--font-mono)" }}
                >
                  {pendingSuggestions} pending
                </span>
              </div>
            )}
          </Link>

          <Link
            href="/admin/blacklist"
            className="group border p-6 hover:border-current transition-colors"
            style={{
              borderColor: "var(--border)",
              background: "#fff",
              textDecoration: "none",
            }}
          >
            <div className="flex items-start justify-between mb-4">
              <h3
                className="text-lg font-medium"
                style={{ color: "var(--ink)", textTransform: "uppercase", letterSpacing: "0.05em" }}
              >
                Blacklist
              </h3>
              <span
                className="text-lg"
                style={{ color: "var(--muted)" }}
              >
                →
              </span>
            </div>
            <p className="text-sm" style={{ color: "var(--muted)" }}>
              Domains and URLs to filter out
            </p>
          </Link>
        </div>

        {/* System Status */}
        <div className="mt-12 pt-8" style={{ borderTop: "1px solid var(--border)" }}>
          <h3
            className="text-xs uppercase tracking-wide mb-4"
            style={{ color: "var(--muted)", fontFamily: "var(--font-mono)" }}
          >
            Pipeline Status
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4" style={{ background: "#fff", border: "1px solid var(--border)" }}>
              <div
                className="text-xl font-medium tabular-nums"
                style={{ fontFamily: "var(--font-mono)", color: "var(--ink)" }}
              >
                {unanalyzedCount}
              </div>
              <div className="text-xs mt-1" style={{ color: "var(--muted)" }}>
                Awaiting AI analysis
              </div>
            </div>
            <div className="p-4" style={{ background: "#fff", border: "1px solid var(--border)" }}>
              <div
                className="text-xl font-medium tabular-nums"
                style={{
                  fontFamily: "var(--font-mono)",
                  color: untitledCount > 0 ? "var(--status-warning)" : "var(--status-success)",
                }}
              >
                {untitledCount}
              </div>
              <div className="text-xs mt-1" style={{ color: "var(--muted)" }}>
                Missing titles
              </div>
            </div>
            <div className="p-4" style={{ background: "#fff", border: "1px solid var(--border)" }}>
              <div
                className="text-xl font-medium tabular-nums"
                style={{
                  fontFamily: "var(--font-mono)",
                  color: errorSources > 0 ? "var(--status-error)" : "var(--status-success)",
                }}
              >
                {errorSources}
              </div>
              <div className="text-xs mt-1" style={{ color: "var(--muted)" }}>
                Source errors
              </div>
            </div>
            <div className="p-4" style={{ background: "#fff", border: "1px solid var(--border)" }}>
              <div
                className="text-xl font-medium tabular-nums"
                style={{ fontFamily: "var(--font-mono)", color: "var(--status-success)" }}
              >
                {pendingSuggestions}
              </div>
              <div className="text-xs mt-1" style={{ color: "var(--muted)" }}>
                Entity suggestions
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
