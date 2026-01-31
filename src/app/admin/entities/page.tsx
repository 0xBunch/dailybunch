/**
 * Entities Admin Page
 *
 * Tag taxonomy view - editorial control room aesthetic.
 */

import prisma from "@/lib/db";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function EntitiesAdminPage() {
  // Get all entities with link counts
  const entities = await prisma.entity.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { links: true } },
    },
  });

  // Group pending suggestions by name+type
  const groupedSuggestions = await prisma.entitySuggestion.groupBy({
    by: ["name", "type"],
    where: { status: "pending" },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: 30,
  });

  // Group entities by type
  const people = entities.filter((e) => e.type === "person");
  const organizations = entities.filter((e) => e.type === "organization");
  const products = entities.filter((e) => e.type === "product");

  const activeCount = entities.filter((e) => e.active).length;

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
              {entities.length}
            </span>
            <span className="text-xs uppercase tracking-wide" style={{ color: "#888" }}>
              Total
            </span>
          </div>
          {groupedSuggestions.length > 0 && (
            <>
              <div className="w-px h-6" style={{ background: "rgba(255,255,255,0.2)" }} />
              <div className="flex items-center gap-2">
                <span
                  className="text-2xl font-medium tabular-nums"
                  style={{ fontFamily: "var(--font-mono)", color: "var(--status-warning)" }}
                >
                  {groupedSuggestions.length}
                </span>
                <span className="text-xs uppercase tracking-wide" style={{ color: "#888" }}>
                  Pending
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Pending Suggestions */}
        {groupedSuggestions.length > 0 && (
          <div
            className="mb-8 p-6"
            style={{ background: "rgba(181, 135, 44, 0.1)", border: "1px solid var(--status-warning)" }}
          >
            <h3
              className="text-xs uppercase tracking-wide mb-4"
              style={{ color: "var(--status-warning)", fontFamily: "var(--font-mono)" }}
            >
              Pending Suggestions ({groupedSuggestions.length})
            </h3>
            <div className="space-y-2">
              {groupedSuggestions.map((suggestion) => (
                <div
                  key={`${suggestion.name}-${suggestion.type}`}
                  className="flex items-center justify-between p-3 bg-white"
                  style={{ border: "1px solid var(--border)" }}
                >
                  <div className="flex items-center gap-3">
                    <span style={{ color: "var(--ink)", fontWeight: 500 }}>
                      {suggestion.name}
                    </span>
                    <span
                      className="text-xs px-2 py-0.5"
                      style={{
                        fontFamily: "var(--font-mono)",
                        background: "var(--surface-cream)",
                        color: "var(--muted)",
                      }}
                    >
                      {suggestion.type}
                    </span>
                    {suggestion._count.id > 1 && (
                      <span
                        className="text-xs font-medium"
                        style={{ fontFamily: "var(--font-mono)", color: "var(--status-warning)" }}
                      >
                        ×{suggestion._count.id}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <form action="/api/admin/entities/suggestions/bulk" method="POST">
                      <input type="hidden" name="action" value="approve" />
                      <input type="hidden" name="name" value={suggestion.name} />
                      <input type="hidden" name="type" value={suggestion.type} />
                      <button
                        type="submit"
                        className="text-xs px-3 py-1 transition-opacity hover:opacity-80"
                        style={{
                          fontFamily: "var(--font-mono)",
                          background: "var(--status-success)",
                          color: "#fff",
                          border: "none",
                        }}
                      >
                        Approve
                      </button>
                    </form>
                    <form action="/api/admin/entities/suggestions/bulk" method="POST">
                      <input type="hidden" name="action" value="reject" />
                      <input type="hidden" name="name" value={suggestion.name} />
                      <input type="hidden" name="type" value={suggestion.type} />
                      <button
                        type="submit"
                        className="text-xs px-3 py-1 transition-opacity hover:opacity-80"
                        style={{
                          fontFamily: "var(--font-mono)",
                          background: "var(--status-error)",
                          color: "#fff",
                          border: "none",
                        }}
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

        {/* Entity Taxonomy */}
        <div className="space-y-8">
          {/* People */}
          <EntityTypeSection
            title="People"
            entities={people}
            emptyMessage="No people tracked yet"
          />

          {/* Organizations */}
          <EntityTypeSection
            title="Organizations"
            entities={organizations}
            emptyMessage="No organizations tracked yet"
          />

          {/* Products */}
          <EntityTypeSection
            title="Products"
            entities={products}
            emptyMessage="No products tracked yet"
          />
        </div>

        {/* Add Entity Form */}
        <div
          className="mt-12 p-6"
          style={{ background: "#fff", border: "1px solid var(--border)" }}
        >
          <h3
            className="text-xs uppercase tracking-wide mb-6"
            style={{ color: "var(--muted)", fontFamily: "var(--font-mono)" }}
          >
            Add Entity
          </h3>
          <form action="/api/admin/entities" method="POST">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                  placeholder="Elon Musk"
                  className="w-full px-3 py-2 text-sm"
                  style={{
                    border: "1px solid var(--border)",
                    background: "var(--surface-cream)",
                  }}
                />
              </div>
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
                  <option value="person">Person</option>
                  <option value="organization">Organization</option>
                  <option value="product">Product</option>
                </select>
              </div>
              <div>
                <label
                  htmlFor="aliases"
                  className="block text-xs uppercase tracking-wide mb-2"
                  style={{ color: "var(--muted)", fontFamily: "var(--font-mono)" }}
                >
                  Aliases
                </label>
                <input
                  type="text"
                  id="aliases"
                  name="aliases"
                  placeholder="@elonmusk, Tesla CEO"
                  className="w-full px-3 py-2 text-sm"
                  style={{
                    border: "1px solid var(--border)",
                    background: "var(--surface-cream)",
                  }}
                />
              </div>
            </div>
            <div className="mt-6">
              <button
                type="submit"
                className="px-4 py-2 text-sm transition-opacity hover:opacity-80"
                style={{
                  background: "var(--ink)",
                  color: "#fff",
                  border: "none",
                }}
              >
                Add Entity
              </button>
            </div>
          </form>
        </div>

        {entities.length === 0 && groupedSuggestions.length === 0 && (
          <div className="text-center py-12" style={{ color: "var(--muted)" }}>
            <p className="mb-2">No entities yet.</p>
            <p className="text-sm">Add entities above or wait for AI suggestions.</p>
          </div>
        )}
      </main>
    </div>
  );
}

function EntityTypeSection({
  title,
  entities,
  emptyMessage,
}: {
  title: string;
  entities: Array<{
    id: string;
    name: string;
    type: string;
    aliases: string[];
    active: boolean;
    _count: { links: number };
  }>;
  emptyMessage: string;
}) {
  if (entities.length === 0) {
    return (
      <div>
        <h3
          className="text-xs uppercase tracking-wide mb-4 pb-2"
          style={{
            color: "var(--muted)",
            fontFamily: "var(--font-mono)",
            borderBottom: "1px solid var(--border)",
          }}
        >
          {title}
        </h3>
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          {emptyMessage}
        </p>
      </div>
    );
  }

  return (
    <div>
      <h3
        className="text-xs uppercase tracking-wide mb-4 pb-2"
        style={{
          color: "var(--muted)",
          fontFamily: "var(--font-mono)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        {title}
      </h3>
      <div className="flex flex-wrap gap-2">
        {entities.map((entity) => (
          <div
            key={entity.id}
            className="group inline-flex items-center gap-2 px-3 py-2 transition-opacity"
            style={{
              background: entity.active ? "#fff" : "var(--surface-cream)",
              border: "1px solid var(--border)",
              opacity: entity.active ? 1 : 0.6,
            }}
          >
            <span style={{ color: "var(--ink)", fontWeight: 500 }}>{entity.name}</span>
            <span
              className="text-xs tabular-nums"
              style={{ fontFamily: "var(--font-mono)", color: "var(--muted)" }}
            >
              {entity._count.links}
            </span>
            {entity.aliases.length > 0 && (
              <span
                className="text-xs hidden group-hover:inline"
                style={{ color: "var(--muted)" }}
              >
                ({entity.aliases.join(", ")})
              </span>
            )}
            <form action={`/api/admin/entities/${entity.id}`} method="POST" className="contents">
              <input type="hidden" name="active" value={entity.active ? "false" : "true"} />
              <button
                type="submit"
                className="text-xs ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{
                  fontFamily: "var(--font-mono)",
                  color: entity.active ? "var(--status-error)" : "var(--status-success)",
                  background: "none",
                  border: "none",
                  padding: 0,
                }}
              >
                {entity.active ? "×" : "✓"}
              </button>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}
