/**
 * Sources Admin Page
 *
 * Manage RSS and newsletter sources with settings.
 */

import prisma from "@/lib/db";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function SourcesAdminPage() {
  const sources = await prisma.source.findMany({
    orderBy: { name: "asc" },
    include: {
      category: true,
      _count: { select: { mentions: true, sourceItems: true } },
    },
  });

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-neutral-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="font-serif text-2xl">Daily Bunch</h1>
          <nav className="flex gap-6 text-sm">
            <Link
              href="/dashboard"
              className="text-neutral-600 hover:text-neutral-900"
            >
              Scoreboard
            </Link>
            <Link
              href="/links"
              className="text-neutral-600 hover:text-neutral-900"
            >
              All Links
            </Link>
            <Link
              href="/admin"
              className="text-neutral-600 hover:text-neutral-900"
            >
              Admin
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <h2 className="font-serif text-3xl">Sources</h2>
        </div>

        <p className="text-sm text-neutral-500 mb-6">
          Toggle &quot;Own Links&quot; to control whether a source&apos;s own
          articles appear on the scoreboard (ON) or only external links they
          reference (OFF).
        </p>

        <div className="space-y-4">
          {sources.map((source) => (
            <div key={source.id} className="border border-neutral-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">{source.name}</h3>
                  <p className="text-sm text-neutral-500">
                    {source.type} · {source._count.sourceItems} items ·{" "}
                    {source._count.mentions} mentions
                    {source.category && ` · ${source.category.name}`}
                  </p>
                  {source.url && (
                    <p className="text-xs text-neutral-400 truncate max-w-md">
                      {source.url}
                    </p>
                  )}
                  {source.lastError && (
                    <p className="text-xs text-red-500 mt-1">
                      Error: {source.lastError}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <form
                    action={`/api/admin/sources/${source.id}`}
                    method="POST"
                  >
                    <input
                      type="hidden"
                      name="includeOwnLinks"
                      value={source.includeOwnLinks ? "false" : "true"}
                    />
                    <button
                      type="submit"
                      className={`text-xs px-3 py-1 ${
                        source.includeOwnLinks
                          ? "bg-green-100 text-green-800"
                          : "bg-neutral-100 text-neutral-600"
                      }`}
                    >
                      {source.includeOwnLinks
                        ? "Own Links: ON"
                        : "Own Links: OFF"}
                    </button>
                  </form>
                  <span
                    className={`text-xs px-2 py-0.5 ${
                      source.active
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {source.active ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {sources.length === 0 && (
          <div className="text-center py-12 text-neutral-500">
            <p>No sources configured.</p>
            <p className="text-sm mt-2">
              Add sources in the seed file or create an API to add them.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
