"use client";

import { useState, useMemo } from "react";

interface Link {
  id: string;
  title: string;
  canonicalUrl: string;
  domain: string;
  category: string | null;
  velocity: number;
  sources: string[];
  firstSeenAt: string;
  mediaType: string | null;
}

interface DashboardClientProps {
  links: Link[];
  categories: string[];
}

type VelocityFilter = "all" | "v2+" | "v5+";

export function DashboardClient({ links, categories }: DashboardClientProps) {
  const [velocityFilter, setVelocityFilter] = useState<VelocityFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  // Filter links
  const filteredLinks = useMemo(() => {
    return links.filter((link) => {
      // Velocity filter
      if (velocityFilter === "v2+" && link.velocity < 2) return false;
      if (velocityFilter === "v5+" && link.velocity < 5) return false;

      // Category filter
      if (categoryFilter && link.category !== categoryFilter) return false;

      return true;
    });
  }, [links, velocityFilter, categoryFilter]);

  // Stats
  const stats = useMemo(() => ({
    total: links.length,
    v2Plus: links.filter((l) => l.velocity >= 2).length,
    v5Plus: links.filter((l) => l.velocity >= 5).length,
    showing: filteredLinks.length,
  }), [links, filteredLinks]);

  // Format relative time
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const mins = Math.floor((Date.now() - date.getTime()) / 60000);
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
  };

  return (
    <div
      className="min-h-screen"
      style={{ background: "var(--background)", color: "var(--text-primary)" }}
    >
      {/* Header */}
      <header
        className="sticky top-0 z-10 border-b px-4 py-3 md:px-6"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <div className="flex items-center justify-between">
          <h1
            className="text-lg font-medium"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            DAILY BUNCH
          </h1>
          <div
            className="text-xs tabular-nums"
            style={{ color: "var(--text-faint)", fontFamily: "var(--font-mono)" }}
          >
            {stats.showing} of {stats.total} links
          </div>
        </div>

        {/* Filters */}
        <div className="mt-3 flex flex-wrap items-center gap-3">
          {/* Velocity Filter */}
          <div className="flex items-center gap-1">
            {(["all", "v2+", "v5+"] as VelocityFilter[]).map((filter) => {
              const count = filter === "all" ? stats.total : filter === "v2+" ? stats.v2Plus : stats.v5Plus;
              const isActive = velocityFilter === filter;
              return (
                <button
                  key={filter}
                  onClick={() => setVelocityFilter(filter)}
                  className="px-2 py-1 text-xs transition-colors"
                  style={{
                    background: isActive ? "var(--accent)" : "transparent",
                    color: isActive ? "var(--background)" : "var(--text-secondary)",
                    borderRadius: "4px",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  {filter === "all" ? "ALL" : filter.toUpperCase()} ({count})
                </button>
              );
            })}
          </div>

          {/* Divider */}
          <div style={{ width: 1, height: 16, background: "var(--border)" }} />

          {/* Category Filter */}
          <div className="flex flex-wrap items-center gap-1">
            <button
              onClick={() => setCategoryFilter(null)}
              className="px-2 py-1 text-xs transition-colors"
              style={{
                background: categoryFilter === null ? "var(--surface-hover)" : "transparent",
                color: categoryFilter === null ? "var(--text-primary)" : "var(--text-faint)",
                borderRadius: "4px",
              }}
            >
              All
            </button>
            {categories.map((cat) => {
              const isActive = categoryFilter === cat;
              const count = links.filter((l) => l.category === cat).length;
              return (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(isActive ? null : cat)}
                  className="px-2 py-1 text-xs transition-colors"
                  style={{
                    background: isActive ? "var(--surface-hover)" : "transparent",
                    color: isActive ? "var(--text-primary)" : "var(--text-faint)",
                    borderRadius: "4px",
                  }}
                >
                  {cat} ({count})
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Feed */}
      <main className="mx-auto max-w-4xl px-4 py-4 md:px-6">
        <div className="space-y-0.5">
          {filteredLinks.map((link) => {
            const isHighVelocity = link.velocity >= 5;
            return (
              <article
                key={link.id}
                className="group flex items-start gap-3 rounded px-3 py-2 transition-colors"
                style={{
                  background: isHighVelocity ? "var(--accent-subtle)" : "transparent",
                  borderLeft: isHighVelocity ? "2px solid var(--accent)" : "2px solid transparent",
                }}
              >
                {/* Time */}
                <div
                  className="w-10 flex-shrink-0 pt-0.5 text-xs tabular-nums"
                  style={{ color: "var(--text-faint)", fontFamily: "var(--font-mono)" }}
                >
                  {formatTime(link.firstSeenAt)}
                </div>

                {/* Velocity Badge */}
                <div
                  className="w-8 flex-shrink-0 pt-0.5 text-xs tabular-nums text-center"
                  style={{
                    color: link.velocity >= 5 ? "var(--accent)" : link.velocity >= 2 ? "var(--text-secondary)" : "var(--text-faint)",
                    fontFamily: "var(--font-mono)",
                    fontWeight: link.velocity >= 5 ? 600 : 400,
                  }}
                >
                  v{link.velocity}
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <a
                    href={link.canonicalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-sm leading-snug transition-opacity hover:opacity-70"
                    style={{
                      color: "var(--text-primary)",
                      textDecoration: "none",
                      fontWeight: isHighVelocity ? 500 : 400,
                    }}
                  >
                    {link.title}
                  </a>
                  <div
                    className="mt-0.5 flex items-center gap-2 text-xs"
                    style={{ color: "var(--text-faint)" }}
                  >
                    <span>{link.domain}</span>
                    <span>·</span>
                    <span>{link.sources.slice(0, 2).join(", ")}{link.sources.length > 2 && ` +${link.sources.length - 2}`}</span>
                  </div>
                </div>

                {/* Category */}
                {link.category && (
                  <div
                    className="flex-shrink-0 text-xs"
                    style={{ color: "var(--text-faint)" }}
                  >
                    {link.category}
                  </div>
                )}
              </article>
            );
          })}
        </div>

        {filteredLinks.length === 0 && (
          <div
            className="py-12 text-center text-sm"
            style={{ color: "var(--text-faint)" }}
          >
            No links match the current filters.
          </div>
        )}
      </main>
    </div>
  );
}
