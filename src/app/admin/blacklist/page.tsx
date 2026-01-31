/**
 * Blacklist Admin Page
 *
 * Manage blocked domains and URL patterns.
 */

import prisma from "@/lib/db";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function BlacklistAdminPage() {
  const entries = await prisma.blacklist.findMany({
    orderBy: [{ type: "asc" }, { pattern: "asc" }],
  });

  const domainCount = entries.filter((e) => e.type === "domain").length;
  const urlCount = entries.filter((e) => e.type === "url").length;

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
              {entries.length}
            </span>
            <span className="text-xs uppercase tracking-wide" style={{ color: "#888" }}>
              Total
            </span>
          </div>
          <div className="w-px h-6" style={{ background: "rgba(255,255,255,0.2)" }} />
          <div className="flex items-center gap-2">
            <span
              className="text-2xl font-medium tabular-nums"
              style={{ fontFamily: "var(--font-mono)", color: "#fff" }}
            >
              {domainCount}
            </span>
            <span className="text-xs uppercase tracking-wide" style={{ color: "#888" }}>
              Domains
            </span>
          </div>
          <div className="w-px h-6" style={{ background: "rgba(255,255,255,0.2)" }} />
          <div className="flex items-center gap-2">
            <span
              className="text-2xl font-medium tabular-nums"
              style={{ fontFamily: "var(--font-mono)", color: "#fff" }}
            >
              {urlCount}
            </span>
            <span className="text-xs uppercase tracking-wide" style={{ color: "#888" }}>
              URLs
            </span>
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Add Entry Form */}
        <div
          className="border mb-8 p-6"
          style={{ borderColor: "var(--border)", background: "#fff" }}
        >
          <h3
            className="text-xs uppercase tracking-wide mb-6"
            style={{ color: "var(--muted)", fontFamily: "var(--font-mono)" }}
          >
            Add to Blacklist
          </h3>
          <form action="/api/admin/blacklist" method="POST">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label
                  htmlFor="type"
                  className="block text-xs uppercase tracking-wide mb-2"
                  style={{ color: "var(--muted)", fontFamily: "var(--font-mono)" }}
                >
                  Type
                </label>
                <select
                  id="type"
                  name="type"
                  required
                  className="w-full px-3 py-2 text-sm"
                  style={{
                    border: "1px solid var(--border)",
                    background: "var(--surface-cream)",
                  }}
                >
                  <option value="domain">Domain</option>
                  <option value="url">URL Pattern</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label
                  htmlFor="pattern"
                  className="block text-xs uppercase tracking-wide mb-2"
                  style={{ color: "var(--muted)", fontFamily: "var(--font-mono)" }}
                >
                  Pattern
                </label>
                <input
                  type="text"
                  id="pattern"
                  name="pattern"
                  required
                  placeholder="example.com or https://example.com/path/*"
                  className="w-full px-3 py-2 text-sm"
                  style={{
                    border: "1px solid var(--border)",
                    background: "var(--surface-cream)",
                  }}
                />
              </div>
            </div>
            <div className="mt-4">
              <label
                htmlFor="reason"
                className="block text-xs uppercase tracking-wide mb-2"
                style={{ color: "var(--muted)", fontFamily: "var(--font-mono)" }}
              >
                Reason (optional)
              </label>
              <input
                type="text"
                id="reason"
                name="reason"
                placeholder="Why is this blocked?"
                className="w-full px-3 py-2 text-sm"
                style={{
                  border: "1px solid var(--border)",
                  background: "var(--surface-cream)",
                }}
              />
            </div>
            <div className="mt-6 flex justify-end">
              <button
                type="submit"
                className="px-4 py-2 text-sm transition-opacity hover:opacity-80"
                style={{
                  background: "var(--ink)",
                  color: "#fff",
                  border: "none",
                }}
              >
                Add to Blacklist
              </button>
            </div>
          </form>
        </div>

        {/* Blacklist Entries */}
        <div className="space-y-2">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="border-l-4 bg-white"
              style={{
                borderLeftColor: entry.type === "domain" ? "var(--status-error)" : "var(--accent-warm)",
                borderTop: "1px solid var(--border)",
                borderRight: "1px solid var(--border)",
                borderBottom: "1px solid var(--border)",
              }}
            >
              <div className="p-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span
                      className="text-xs px-2 py-0.5"
                      style={{
                        background: entry.type === "domain" ? "var(--status-error)" : "var(--accent-warm)",
                        color: "#fff",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      {entry.type.toUpperCase()}
                    </span>
                    <code
                      className="text-sm"
                      style={{ fontFamily: "var(--font-mono)", color: "var(--ink)" }}
                    >
                      {entry.pattern}
                    </code>
                  </div>
                  {entry.reason && (
                    <p className="text-sm" style={{ color: "var(--muted)" }}>
                      {entry.reason}
                    </p>
                  )}
                  <p
                    className="text-xs mt-1"
                    style={{ color: "var(--muted)", fontFamily: "var(--font-mono)" }}
                  >
                    Added {entry.createdAt.toLocaleDateString()}
                  </p>
                </div>
                <form action={`/api/admin/blacklist/${entry.id}`} method="POST">
                  <input type="hidden" name="_method" value="DELETE" />
                  <button
                    type="submit"
                    className="text-xs px-3 py-1 transition-opacity hover:opacity-80"
                    style={{
                      fontFamily: "var(--font-mono)",
                      background: "transparent",
                      color: "var(--status-error)",
                      border: "1px solid currentColor",
                    }}
                  >
                    Remove
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>

        {entries.length === 0 && (
          <div
            className="text-center py-12"
            style={{ color: "var(--muted)" }}
          >
            <p className="mb-2">No blacklist entries.</p>
            <p className="text-sm">Add domains or URL patterns to block above.</p>
          </div>
        )}
      </main>
    </div>
  );
}
