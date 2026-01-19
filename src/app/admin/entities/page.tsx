/**
 * Entities Admin Page
 *
 * Manage people, organizations, and products.
 */

import prisma from "@/lib/db";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function EntitiesAdminPage() {
  const [entities, pendingSuggestions] = await Promise.all([
    prisma.entity.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: { select: { links: true } },
      },
    }),
    prisma.entitySuggestion.findMany({
      where: { status: "pending" },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-neutral-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1><Link href="/" className="text-2xl hover:text-neutral-700 !text-neutral-900 !no-underline">Daily Bunch</Link></h1>
          <nav className="flex gap-6 text-sm">
            <Link href="/links" className="text-neutral-600 hover:text-neutral-900">
              Home
            </Link>
            <Link href="/dashboard" className="text-neutral-600 hover:text-neutral-900">
              Feed
            </Link>
            <Link href="/admin" className="text-neutral-600 hover:text-neutral-900">
              Admin
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <h2 className="font-serif text-3xl">Entities</h2>
        </div>

        {/* Add Entity Form */}
        <form
          action="/api/admin/entities"
          method="POST"
          className="border border-neutral-200 p-4 mb-8 bg-neutral-50"
        >
          <h3 className="font-medium mb-4">Add New Entity</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-neutral-700 mb-1">
                Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                required
                placeholder="e.g., Elon Musk"
                className="w-full border border-neutral-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="type" className="block text-sm font-medium text-neutral-700 mb-1">
                Type
              </label>
              <select
                id="type"
                name="type"
                required
                className="w-full border border-neutral-300 px-3 py-2 text-sm"
              >
                <option value="person">Person</option>
                <option value="organization">Organization</option>
                <option value="product">Product</option>
              </select>
            </div>
            <div>
              <label htmlFor="aliases" className="block text-sm font-medium text-neutral-700 mb-1">
                Aliases (comma-separated)
              </label>
              <input
                type="text"
                id="aliases"
                name="aliases"
                placeholder="e.g., @elonmusk, Tesla CEO"
                className="w-full border border-neutral-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="mt-4">
            <button
              type="submit"
              className="bg-neutral-900 text-white px-4 py-2 text-sm hover:bg-neutral-800"
            >
              Add Entity
            </button>
          </div>
        </form>

        {/* Pending Suggestions */}
        {pendingSuggestions.length > 0 && (
          <div className="mb-8">
            <h3 className="font-medium mb-4">
              Pending Suggestions ({pendingSuggestions.length})
            </h3>
            <div className="space-y-2">
              {pendingSuggestions.map((suggestion) => (
                <div
                  key={suggestion.id}
                  className="border border-yellow-200 bg-yellow-50 p-3 flex items-center justify-between"
                >
                  <div>
                    <span className="font-medium">{suggestion.name}</span>
                    <span className="text-xs text-neutral-500 ml-2">
                      {suggestion.type}
                    </span>
                    {suggestion.aliases.length > 0 && (
                      <span className="text-xs text-neutral-400 ml-2">
                        ({suggestion.aliases.join(", ")})
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <form action={`/api/admin/entities/suggestions/${suggestion.id}`} method="POST">
                      <input type="hidden" name="action" value="approve" />
                      <button
                        type="submit"
                        className="text-xs bg-green-100 text-green-800 px-3 py-1 hover:bg-green-200"
                      >
                        Approve
                      </button>
                    </form>
                    <form action={`/api/admin/entities/suggestions/${suggestion.id}`} method="POST">
                      <input type="hidden" name="action" value="reject" />
                      <button
                        type="submit"
                        className="text-xs bg-red-100 text-red-800 px-3 py-1 hover:bg-red-200"
                      >
                        Reject
                      </button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Existing Entities */}
        <h3 className="font-medium mb-4">All Entities ({entities.length})</h3>
        <div className="space-y-2">
          {entities.map((entity) => (
            <div
              key={entity.id}
              className="border border-neutral-200 p-3 flex items-center justify-between"
            >
              <div>
                <span className="font-medium">{entity.name}</span>
                <span className="text-xs text-neutral-500 ml-2">{entity.type}</span>
                <span className="text-xs text-neutral-400 ml-2">
                  {entity._count.links} links
                </span>
                {entity.aliases.length > 0 && (
                  <span className="text-xs text-neutral-400 ml-2">
                    ({entity.aliases.join(", ")})
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <form action={`/api/admin/entities/${entity.id}`} method="POST">
                  <input type="hidden" name="active" value={entity.active ? "false" : "true"} />
                  <button
                    type="submit"
                    className={`text-xs px-3 py-1 ${
                      entity.active
                        ? "bg-green-100 text-green-800"
                        : "bg-neutral-100 text-neutral-600"
                    }`}
                  >
                    {entity.active ? "Active" : "Inactive"}
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>

        {entities.length === 0 && (
          <div className="text-center py-12 text-neutral-500">
            <p>No entities yet.</p>
            <p className="text-sm mt-2">Add entities above or wait for AI suggestions.</p>
          </div>
        )}
      </main>
    </div>
  );
}
