/**
 * Sources Admin Page
 *
 * Wire service feed layout - editorial control room aesthetic.
 */

import prisma from "@/lib/db";
import Link from "next/link";

export const dynamic = "force-dynamic";

function formatTimeAgo(date: Date | null): string {
  if (!date) return "never";
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default async function SourcesAdminPage() {
  const sources = await prisma.source.findMany({
    orderBy: [{ active: "desc" }, { name: "asc" }],
    include: {
      category: true,
      _count: { select: { mentions: true, sourceItems: true } },
    },
  });

  const activeCount = sources.filter((s) => s.active).length;
  const errorCount = sources.filter((s) => s.consecutiveErrors >= 3).length;

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
              className="hover:opacity-70 transition-opacity"
              style={{ color: "var(--muted)", textDecoration: "none" }}
            >
              Admin
            </Link>
          </nav>
        </div>
      </header>

      {/* Stats Bar */}
      <div
        className="border-b px-6 py-3"
        style={{ borderColor: "var(--border)", background: "var(--ink)" }}
      >
        <div className="max-w-4xl mx-auto flex items-center gap-8">
          <div className="flex items-center gap-2">
            <span
              className="text-2xl font-medium tabular-nums"
              style={{ fontFamily: "var(--font-mono)", color: "#fff" }}
            >
              {activeCount}
            </span>
            <span className="text-xs uppercase tracking-wide" style={{ color: "#888" }}>
              Active
            </span>
          </div>
          <div className="w-px h-6" style={{ background: "rgba(255,255,255,0.2)" }} />
          <div className="flex items-center gap-2">
            <span
              className="text-2xl font-medium tabular-nums"
              style={{ fontFamily: "var(--font-mono)", color: "#fff" }}
            >
              {sources.length}
            </span>
            <span className="text-xs uppercase tracking-wide" style={{ color: "#888" }}>
              Total
            </span>
          </div>
          {errorCount > 0 && (
            <>
              <div className="w-px h-6" style={{ background: "rgba(255,255,255,0.2)" }} />
              <div className="flex items-center gap-2">
                <span
                  className="text-2xl font-medium tabular-nums"
                  style={{ fontFamily: "var(--font-mono)", color: "var(--status-error)" }}
                >
                  {errorCount}
                </span>
                <span className="text-xs uppercase tracking-wide" style={{ color: "#888" }}>
                  Errors
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Add Source Form */}
        <div
          className="border mb-8 p-6"
          style={{ borderColor: "var(--border)", background: "#fff" }}
        >
          <h3
            className="text-xs uppercase tracking-wide mb-6"
            style={{ color: "var(--muted)", fontFamily: "var(--font-mono)" }}
          >
            Add Source
          </h3>
          <form action="/api/admin/sources" method="POST">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label
                  htmlFor="name"
                  className="block text-xs uppercase tracking-wide mb-2"
                  style={{ color: "var(--muted)", fontFamily: "var(--font-mono)" }}
                >
                  Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  placeholder="Stratechery"
                  className="w-full px-3 py-2 text-sm"
                  style={{
                    border: "1px solid var(--border)",
                    background: "var(--surface-cream)",
                  }}
                />
              </div>
              <div>
                <label
                  htmlFor="url"
                  className="block text-xs uppercase tracking-wide mb-2"
                  style={{ color: "var(--muted)", fontFamily: "var(--font-mono)" }}
                >
                  RSS Feed URL
                </label>
                <input
                  type="url"
                  id="url"
                  name="url"
                  required
                  placeholder="https://example.com/feed.xml"
                  className="w-full px-3 py-2 text-sm"
                  style={{
                    border: "1px solid var(--border)",
                    background: "var(--surface-cream)",
                  }}
                />
              </div>
            </div>
            <div className="mt-6 flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm" style={{ color: "var(--muted)" }}>
                <input
                  type="checkbox"
                  name="includeOwnLinks"
                  value="true"
                  className="size-4"
                />
                Include source&apos;s own links
              </label>
              <button
                type="submit"
                className="px-4 py-2 text-sm transition-opacity hover:opacity-80"
                style={{
                  background: "var(--ink)",
                  color: "#fff",
                  border: "none",
                }}
              >
                Add Source
              </button>
            </div>
          </form>
        </div>

        {/* Legend */}
        <div
          className="mb-6 flex items-center gap-6 text-xs"
          style={{ color: "var(--muted)", fontFamily: "var(--font-mono)" }}
        >
          <span>
            <strong>Dashboard:</strong> Show on trending
          </span>
          <span>
            <strong>Own Links:</strong> Include self-referential links
          </span>
        </div>

        {/* Source Feed */}
        <div className="space-y-2">
          {sources.map((source) => {
            const hasError = source.consecutiveErrors >= 3;
            const borderColor = hasError
              ? "var(--status-error)"
              : source.active
                ? "var(--status-success)"
                : "var(--border)";

            return (
              <div
                key={source.id}
                className="border-l-4 bg-white"
                style={{
                  borderLeftColor: borderColor,
                  borderTop: "1px solid var(--border)",
                  borderRight: "1px solid var(--border)",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <div className="p-4">
                  {/* Top Row: Name + Status */}
                  <div className="flex items-start justify-between mb-2">
                    <h3
                      className="text-base font-medium"
                      style={{ color: "var(--ink)", letterSpacing: "0.02em" }}
                    >
                      {source.name}
                    </h3>
                    <div className="flex items-center gap-2">
                      {source.active ? (
                        <span
                          className="text-xs px-2 py-0.5"
                          style={{
                            background: "var(--status-success)",
                            color: "#fff",
                            fontFamily: "var(--font-mono)",
                          }}
                        >
                          ACTIVE
                        </span>
                      ) : (
                        <span
                          className="text-xs px-2 py-0.5"
                          style={{
                            background: "var(--muted)",
                            color: "#fff",
                            fontFamily: "var(--font-mono)",
                          }}
                        >
                          INACTIVE
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Meta Row */}
                  <p
                    className="text-sm mb-2"
                    style={{ color: "var(--muted)", fontFamily: "var(--font-mono)" }}
                  >
                    {source.type.toUpperCase()}
                    <span style={{ opacity: 0.5 }}> · </span>
                    {source._count.sourceItems} items
                    <span style={{ opacity: 0.5 }}> · </span>
                    {source._count.mentions} mentions
                    {source.category && (
                      <>
                        <span style={{ opacity: 0.5 }}> · </span>
                        {source.category.name}
                      </>
                    )}
                    <span style={{ opacity: 0.5 }}> · </span>
                    last {formatTimeAgo(source.lastFetchedAt)}
                  </p>

                  {/* URL */}
                  {source.url && (
                    <p
                      className="text-xs truncate mb-3"
                      style={{ color: "var(--status-muted)", fontFamily: "var(--font-mono)" }}
                    >
                      {source.url}
                    </p>
                  )}

                  {/* Error */}
                  {source.lastError && (
                    <p
                      className="text-xs mb-3 p-2"
                      style={{
                        color: "var(--status-error)",
                        background: "rgba(166, 84, 84, 0.1)",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      {source.lastError}
                    </p>
                  )}

                  {/* Controls */}
                  <div className="flex items-center gap-2 pt-2" style={{ borderTop: "1px solid var(--border)" }}>
                    <form action={`/api/admin/sources/${source.id}`} method="POST">
                      <input
                        type="hidden"
                        name="showOnDashboard"
                        value={source.showOnDashboard ? "false" : "true"}
                      />
                      <button
                        type="submit"
                        className="text-xs px-3 py-1 transition-opacity hover:opacity-80"
                        style={{
                          fontFamily: "var(--font-mono)",
                          background: source.showOnDashboard
                            ? "var(--accent-warm)"
                            : "var(--surface-cream)",
                          color: source.showOnDashboard ? "#fff" : "var(--muted)",
                          border: source.showOnDashboard
                            ? "1px solid var(--accent-warm)"
                            : "1px solid var(--border)",
                        }}
                      >
                        Dashboard {source.showOnDashboard ? "ON" : "OFF"}
                      </button>
                    </form>
                    <form action={`/api/admin/sources/${source.id}`} method="POST">
                      <input
                        type="hidden"
                        name="includeOwnLinks"
                        value={source.includeOwnLinks ? "false" : "true"}
                      />
                      <button
                        type="submit"
                        className="text-xs px-3 py-1 transition-opacity hover:opacity-80"
                        style={{
                          fontFamily: "var(--font-mono)",
                          background: source.includeOwnLinks
                            ? "var(--status-success)"
                            : "var(--surface-cream)",
                          color: source.includeOwnLinks ? "#fff" : "var(--muted)",
                          border: source.includeOwnLinks
                            ? "1px solid var(--status-success)"
                            : "1px solid var(--border)",
                        }}
                      >
                        Own Links {source.includeOwnLinks ? "ON" : "OFF"}
                      </button>
                    </form>
                    <form action={`/api/admin/sources/${source.id}`} method="POST" className="ml-auto">
                      <input type="hidden" name="active" value={source.active ? "false" : "true"} />
                      <button
                        type="submit"
                        className="text-xs px-3 py-1 transition-opacity hover:opacity-80"
                        style={{
                          fontFamily: "var(--font-mono)",
                          background: "transparent",
                          color: source.active ? "var(--status-error)" : "var(--status-success)",
                          border: "1px solid currentColor",
                        }}
                      >
                        {source.active ? "Deactivate" : "Activate"}
                      </button>
                    </form>
                  </div>

                  {/* Internal Domains */}
                  <details className="mt-3 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
                    <summary
                      className="text-xs cursor-pointer select-none"
                      style={{ color: "var(--muted)", fontFamily: "var(--font-mono)" }}
                    >
                      Internal Domains ({source.internalDomains?.length || 0})
                      {source.baseDomain && (
                        <span style={{ opacity: 0.6 }}> · base: {source.baseDomain}</span>
                      )}
                    </summary>
                    <form
                      action={`/api/admin/sources/${source.id}`}
                      method="POST"
                      className="mt-3"
                    >
                      <label
                        className="block text-xs mb-2"
                        style={{ color: "var(--muted)", fontFamily: "var(--font-mono)" }}
                      >
                        Additional domains to treat as internal (one per line):
                      </label>
                      <textarea
                        name="internalDomains"
                        rows={3}
                        defaultValue={source.internalDomains?.join("\n") || ""}
                        placeholder="passport.online&#10;stratechery.network"
                        className="w-full px-2 py-1 text-xs mb-2"
                        style={{
                          fontFamily: "var(--font-mono)",
                          border: "1px solid var(--border)",
                          background: "var(--surface-cream)",
                          resize: "vertical",
                        }}
                      />
                      <button
                        type="submit"
                        className="text-xs px-3 py-1 transition-opacity hover:opacity-80"
                        style={{
                          fontFamily: "var(--font-mono)",
                          background: "var(--ink)",
                          color: "#fff",
                          border: "none",
                        }}
                      >
                        Save Domains
                      </button>
                    </form>
                  </details>
                </div>
              </div>
            );
          })}
        </div>

        {sources.length === 0 && (
          <div
            className="text-center py-12"
            style={{ color: "var(--muted)" }}
          >
            <p className="mb-2">No sources configured.</p>
            <p className="text-sm">Add your first RSS feed above.</p>
          </div>
        )}
      </main>
    </div>
  );
}
