"use client";

/**
 * Newsroom Client
 *
 * Three-column layout: Filters | Feed Wall | Trending Entities
 * All state managed client-side with URL-driven filters.
 */

import { useState, useMemo, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";

// Types
interface Source {
  id: string;
  name: string;
  tier: string;
}

interface Mention {
  id: string;
  sourceId: string;
  seenAt: string;
  source: { id: string; name: string; tier: string };
}

interface LinkEntity {
  id: string;
  entityId: string;
  entity: { id: string; name: string; type: string };
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface Link {
  id: string;
  canonicalUrl: string;
  domain: string;
  title: string | null;
  description: string | null;
  aiSummary: string | null;
  mediaType: string | null;
  categoryId: string | null;
  category: Category | null;
  firstSeenAt: string;
  velocity: number;
  promoted: boolean;
  hidden: boolean;
  annotation: string | null;
  mentions: Mention[];
  entities: LinkEntity[];
  // Cultural analysis
  culturalWhyNow: string | null;
  culturalTension: string | null;
  culturalThread: string | null;
  culturalPrediction: string | null;
}

interface Entity {
  id: string;
  name: string;
  type: string;
  velocityWeek: number;
  velocityTrend: string | null;
}

interface Props {
  links: Link[];
  categories: Category[];
  sources: { id: string; name: string }[];
  entities: Entity[];
}

// Helpers
function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export function NewsroomClient({ links, categories, sources, entities }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Filter state from URL
  const velocityFilter = searchParams.get("v") || "all";
  const categoryFilter = searchParams.get("cat") || "";
  const sourceFilter = searchParams.get("src") || "";
  const dateFilter = searchParams.get("date") || "7d";
  const entityFilter = searchParams.get("entity") || "";
  const showHidden = searchParams.get("hidden") === "1";

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Detail panel state
  const [detailLink, setDetailLink] = useState<Link | null>(null);

  // Update URL params
  const setFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      router.push(`/newsroom?${params.toString()}`);
    },
    [searchParams, router]
  );

  // Filter links
  const filteredLinks = useMemo(() => {
    return links.filter((link) => {
      // Hidden filter
      if (!showHidden && link.hidden) return false;

      // Velocity filter
      if (velocityFilter === "2+" && link.velocity < 2) return false;
      if (velocityFilter === "5+" && link.velocity < 5) return false;

      // Category filter
      if (categoryFilter && link.categoryId !== categoryFilter) return false;

      // Source filter
      if (sourceFilter) {
        const hasSource = link.mentions.some((m) => m.sourceId === sourceFilter);
        if (!hasSource) return false;
      }

      // Entity filter
      if (entityFilter) {
        const hasEntity = link.entities.some((e) => e.entityId === entityFilter);
        if (!hasEntity) return false;
      }

      // Date filter
      const linkDate = new Date(link.firstSeenAt);
      const now = new Date();
      if (dateFilter === "today") {
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        if (linkDate < todayStart) return false;
      } else if (dateFilter === "3d") {
        const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
        if (linkDate < threeDaysAgo) return false;
      }
      // 7d is default, already filtered on server

      return true;
    });
  }, [links, velocityFilter, categoryFilter, sourceFilter, dateFilter, entityFilter, showHidden]);

  // Selection handlers
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => setSelectedIds(new Set(filteredLinks.map((l) => l.id)));
  const clearSelection = () => setSelectedIds(new Set());

  // Bulk actions
  const handleBulkAction = async (action: "promote" | "hide" | "unhide") => {
    const res = await fetch("/api/admin/links/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        linkIds: Array.from(selectedIds),
        action,
      }),
    });
    if (res.ok) {
      clearSelection();
      router.refresh();
    }
  };

  // Group entities by type
  const entityGroups = useMemo(() => {
    const groups: Record<string, Entity[]> = { person: [], organization: [], product: [] };
    for (const entity of entities) {
      const type = entity.type || "organization";
      if (!groups[type]) groups[type] = [];
      groups[type].push(entity);
    }
    return groups;
  }, [entities]);

  return (
    <div className="flex h-[calc(100dvh-57px)]">
      {/* Left Sidebar - Filters */}
      <aside
        className="w-60 shrink-0 border-r overflow-y-auto p-4"
        style={{ borderColor: "var(--border)", background: "#fff" }}
      >
        {/* Velocity Filter */}
        <div className="mb-6">
          <h3
            className="text-xs uppercase tracking-wide mb-3"
            style={{ color: "var(--muted)", fontFamily: "var(--font-mono)" }}
          >
            Velocity
          </h3>
          <div className="space-y-1">
            {[
              { value: "all", label: "All" },
              { value: "2+", label: "2+ sources" },
              { value: "5+", label: "5+ sources" },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => setFilter("v", opt.value === "all" ? "" : opt.value)}
                className="block w-full text-left px-2 py-1 text-sm"
                style={{
                  background: velocityFilter === opt.value || (opt.value === "all" && !velocityFilter) ? "var(--surface-cream)" : "transparent",
                  color: "var(--ink)",
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Date Filter */}
        <div className="mb-6">
          <h3
            className="text-xs uppercase tracking-wide mb-3"
            style={{ color: "var(--muted)", fontFamily: "var(--font-mono)" }}
          >
            Date Range
          </h3>
          <select
            value={dateFilter}
            onChange={(e) => setFilter("date", e.target.value)}
            className="w-full px-2 py-1 text-sm"
            style={{ border: "1px solid var(--border)", background: "var(--surface-cream)" }}
          >
            <option value="today">Today</option>
            <option value="3d">Last 3 days</option>
            <option value="7d">Last 7 days</option>
          </select>
        </div>

        {/* Category Filter */}
        <div className="mb-6">
          <h3
            className="text-xs uppercase tracking-wide mb-3"
            style={{ color: "var(--muted)", fontFamily: "var(--font-mono)" }}
          >
            Categories
          </h3>
          <div className="space-y-1">
            <button
              onClick={() => setFilter("cat", "")}
              className="block w-full text-left px-2 py-1 text-sm"
              style={{
                background: !categoryFilter ? "var(--surface-cream)" : "transparent",
                color: "var(--ink)",
              }}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setFilter("cat", cat.id)}
                className="block w-full text-left px-2 py-1 text-sm"
                style={{
                  background: categoryFilter === cat.id ? "var(--surface-cream)" : "transparent",
                  color: "var(--ink)",
                }}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Source Filter */}
        <div className="mb-6">
          <h3
            className="text-xs uppercase tracking-wide mb-3"
            style={{ color: "var(--muted)", fontFamily: "var(--font-mono)" }}
          >
            Sources
          </h3>
          <select
            value={sourceFilter}
            onChange={(e) => setFilter("src", e.target.value)}
            className="w-full px-2 py-1 text-sm"
            style={{ border: "1px solid var(--border)", background: "var(--surface-cream)" }}
          >
            <option value="">All Sources</option>
            {sources.map((src) => (
              <option key={src.id} value={src.id}>
                {src.name}
              </option>
            ))}
          </select>
        </div>

        {/* Entity Filter (if active) */}
        {entityFilter && (
          <div className="mb-6 p-2" style={{ background: "var(--surface-cream)" }}>
            <div className="flex items-center justify-between">
              <span className="text-xs" style={{ color: "var(--muted)" }}>
                Filtering by entity
              </span>
              <button
                onClick={() => setFilter("entity", "")}
                className="text-xs"
                style={{ color: "var(--status-error)" }}
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {/* Show Hidden */}
        <label className="flex items-center gap-2 text-sm" style={{ color: "var(--muted)" }}>
          <input
            type="checkbox"
            checked={showHidden}
            onChange={(e) => setFilter("hidden", e.target.checked ? "1" : "")}
          />
          Show hidden
        </label>
      </aside>

      {/* Main Content - Feed Wall */}
      <main className="flex-1 overflow-y-auto">
        {/* Stats Bar */}
        <div
          className="sticky top-0 z-10 px-4 py-2 flex items-center justify-between"
          style={{ background: "var(--surface-cream)", borderBottom: "1px solid var(--border)" }}
        >
          <span className="text-sm" style={{ color: "var(--muted)", fontFamily: "var(--font-mono)" }}>
            {filteredLinks.length} links
          </span>
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm" style={{ fontFamily: "var(--font-mono)" }}>
                {selectedIds.size} selected
              </span>
              <button
                onClick={() => handleBulkAction("promote")}
                className="text-xs px-2 py-1"
                style={{ background: "var(--accent-warm)", color: "#fff" }}
              >
                Promote
              </button>
              <button
                onClick={() => handleBulkAction("hide")}
                className="text-xs px-2 py-1"
                style={{ background: "var(--muted)", color: "#fff" }}
              >
                Hide
              </button>
              <button onClick={clearSelection} className="text-xs px-2 py-1" style={{ color: "var(--muted)" }}>
                Clear
              </button>
            </div>
          )}
          {selectedIds.size === 0 && (
            <button onClick={selectAll} className="text-xs" style={{ color: "var(--muted)" }}>
              Select All
            </button>
          )}
        </div>

        {/* Links List */}
        <div>
          {filteredLinks.map((link) => {
            const isHot = link.velocity >= 5;
            const isSelected = selectedIds.has(link.id);

            return (
              <div
                key={link.id}
                className="px-4 py-3 cursor-pointer transition-colors"
                style={{
                  borderBottom: "1px solid var(--border)",
                  borderLeft: isHot ? "3px solid var(--accent-warm)" : "3px solid transparent",
                  background: isSelected ? "rgba(0,0,0,0.02)" : "transparent",
                  opacity: link.hidden ? 0.5 : 1,
                }}
                onClick={() => setDetailLink(link)}
              >
                {/* Row 1: Checkbox + Velocity + Title */}
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => {
                      e.stopPropagation();
                      toggleSelect(link.id);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="mt-1"
                  />
                  <span
                    className="text-xs px-1.5 py-0.5 shrink-0"
                    style={{
                      fontFamily: "var(--font-mono)",
                      background: isHot ? "var(--accent-warm)" : "var(--surface-cream)",
                      color: isHot ? "#fff" : "var(--muted)",
                    }}
                  >
                    {link.velocity}
                  </span>
                  <span
                    className="text-sm leading-snug line-clamp-1"
                    style={{ color: "var(--ink)" }}
                  >
                    {link.title || link.canonicalUrl}
                  </span>
                </div>

                {/* Row 2: Meta */}
                <div
                  className="mt-1 ml-14 text-xs flex items-center gap-2"
                  style={{ color: "var(--muted)", fontFamily: "var(--font-mono)" }}
                >
                  <span>{link.domain}</span>
                  {link.category && (
                    <>
                      <span style={{ opacity: 0.5 }}>·</span>
                      <span>{link.category.name}</span>
                    </>
                  )}
                  <span style={{ opacity: 0.5 }}>·</span>
                  <span>{link.mentions.length} sources</span>
                  <span style={{ opacity: 0.5 }}>·</span>
                  <span>{formatTimeAgo(link.firstSeenAt)}</span>
                  {link.promoted && (
                    <>
                      <span style={{ opacity: 0.5 }}>·</span>
                      <span style={{ color: "var(--accent-warm)" }}>PROMOTED</span>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Right Sidebar - Trending Entities */}
      <aside
        className="w-64 shrink-0 border-l overflow-y-auto p-4"
        style={{ borderColor: "var(--border)", background: "#fff" }}
      >
        <h3
          className="text-xs uppercase tracking-wide mb-4"
          style={{ color: "var(--muted)", fontFamily: "var(--font-mono)" }}
        >
          Trending
        </h3>

        {/* People */}
        {entityGroups.person?.length > 0 && (
          <div className="mb-6">
            <h4 className="text-xs mb-2" style={{ color: "var(--muted)" }}>
              People
            </h4>
            <div className="space-y-1">
              {entityGroups.person.slice(0, 10).map((entity) => (
                <button
                  key={entity.id}
                  onClick={() => setFilter("entity", entity.id)}
                  className="block w-full text-left text-sm py-1 hover:opacity-70"
                  style={{
                    color: entityFilter === entity.id ? "var(--accent-warm)" : "var(--ink)",
                  }}
                >
                  <span>@{entity.name}</span>
                  <span
                    className="ml-2 text-xs"
                    style={{ color: "var(--muted)", fontFamily: "var(--font-mono)" }}
                  >
                    {entity.velocityWeek}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Organizations */}
        {entityGroups.organization?.length > 0 && (
          <div className="mb-6">
            <h4 className="text-xs mb-2" style={{ color: "var(--muted)" }}>
              Organizations
            </h4>
            <div className="space-y-1">
              {entityGroups.organization.slice(0, 10).map((entity) => (
                <button
                  key={entity.id}
                  onClick={() => setFilter("entity", entity.id)}
                  className="block w-full text-left text-sm py-1 hover:opacity-70"
                  style={{
                    color: entityFilter === entity.id ? "var(--accent-warm)" : "var(--ink)",
                  }}
                >
                  <span>+{entity.name}</span>
                  <span
                    className="ml-2 text-xs"
                    style={{ color: "var(--muted)", fontFamily: "var(--font-mono)" }}
                  >
                    {entity.velocityWeek}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Products */}
        {entityGroups.product?.length > 0 && (
          <div>
            <h4 className="text-xs mb-2" style={{ color: "var(--muted)" }}>
              Products
            </h4>
            <div className="space-y-1">
              {entityGroups.product.slice(0, 10).map((entity) => (
                <button
                  key={entity.id}
                  onClick={() => setFilter("entity", entity.id)}
                  className="block w-full text-left text-sm py-1 hover:opacity-70"
                  style={{
                    color: entityFilter === entity.id ? "var(--accent-warm)" : "var(--ink)",
                  }}
                >
                  <span>#{entity.name}</span>
                  <span
                    className="ml-2 text-xs"
                    style={{ color: "var(--muted)", fontFamily: "var(--font-mono)" }}
                  >
                    {entity.velocityWeek}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </aside>

      {/* Detail Panel */}
      {detailLink && (
        <DetailPanel link={detailLink} onClose={() => setDetailLink(null)} />
      )}
    </div>
  );
}

// Detail Panel Component
function DetailPanel({ link, onClose }: { link: Link; onClose: () => void }) {
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{ background: "rgba(0,0,0,0.3)" }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="fixed top-0 right-0 bottom-0 w-[480px] z-50 overflow-y-auto"
        style={{ background: "#fff", borderLeft: "1px solid var(--border)" }}
      >
        {/* Header */}
        <div
          className="sticky top-0 px-6 py-4 flex items-center justify-between"
          style={{ background: "#fff", borderBottom: "1px solid var(--border)" }}
        >
          <button onClick={onClose} className="text-sm" style={{ color: "var(--muted)" }}>
            ← Back
          </button>
          <a
            href={link.canonicalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm px-3 py-1"
            style={{
              background: "var(--ink)",
              color: "#fff",
              textDecoration: "none",
            }}
          >
            Open →
          </a>
        </div>

        <div className="p-6 space-y-6">
          {/* Title */}
          <div>
            <h2 className="text-lg font-medium leading-snug" style={{ color: "var(--ink)" }}>
              {link.title || "Untitled"}
            </h2>
          </div>

          {/* Meta */}
          <div className="space-y-2">
            <h3
              className="text-xs uppercase tracking-wide"
              style={{ color: "var(--muted)", fontFamily: "var(--font-mono)" }}
            >
              Meta
            </h3>
            <div className="text-sm space-y-1" style={{ color: "var(--ink)" }}>
              <p>
                <span style={{ color: "var(--muted)" }}>Domain:</span> {link.domain}
              </p>
              {link.category && (
                <p>
                  <span style={{ color: "var(--muted)" }}>Category:</span> {link.category.name}
                </p>
              )}
              {link.mediaType && (
                <p>
                  <span style={{ color: "var(--muted)" }}>Type:</span> {link.mediaType}
                </p>
              )}
              <p>
                <span style={{ color: "var(--muted)" }}>Velocity:</span> {link.velocity}
              </p>
              <p>
                <span style={{ color: "var(--muted)" }}>First Seen:</span>{" "}
                {new Date(link.firstSeenAt).toLocaleString()}
              </p>
            </div>
          </div>

          {/* AI Summary */}
          {link.aiSummary && (
            <div className="space-y-2">
              <h3
                className="text-xs uppercase tracking-wide"
                style={{ color: "var(--muted)", fontFamily: "var(--font-mono)" }}
              >
                AI Summary
              </h3>
              <p className="text-sm" style={{ color: "var(--ink)" }}>
                {link.aiSummary}
              </p>
            </div>
          )}

          {/* Cultural Analysis */}
          {link.culturalWhyNow && (
            <div className="space-y-2">
              <h3
                className="text-xs uppercase tracking-wide"
                style={{ color: "var(--muted)", fontFamily: "var(--font-mono)" }}
              >
                Cultural Analysis
              </h3>
              <div className="text-sm space-y-3" style={{ color: "var(--ink)" }}>
                {link.culturalWhyNow && (
                  <p>
                    <span style={{ color: "var(--accent-warm)" }}>Why Now:</span>{" "}
                    {link.culturalWhyNow}
                  </p>
                )}
                {link.culturalTension && (
                  <p>
                    <span style={{ color: "var(--accent-warm)" }}>Tension:</span>{" "}
                    {link.culturalTension}
                  </p>
                )}
                {link.culturalThread && (
                  <p>
                    <span style={{ color: "var(--accent-warm)" }}>Thread:</span>{" "}
                    {link.culturalThread}
                  </p>
                )}
                {link.culturalPrediction && (
                  <p>
                    <span style={{ color: "var(--accent-warm)" }}>Prediction:</span>{" "}
                    {link.culturalPrediction}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Entities */}
          {link.entities.length > 0 && (
            <div className="space-y-2">
              <h3
                className="text-xs uppercase tracking-wide"
                style={{ color: "var(--muted)", fontFamily: "var(--font-mono)" }}
              >
                Entities
              </h3>
              <div className="flex flex-wrap gap-2">
                {link.entities.map((le) => (
                  <span
                    key={le.id}
                    className="text-xs px-2 py-1"
                    style={{ background: "var(--surface-cream)", color: "var(--ink)" }}
                  >
                    {le.entity.type === "person" && "@"}
                    {le.entity.type === "organization" && "+"}
                    {le.entity.type === "product" && "#"}
                    {le.entity.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Sources (Provenance) */}
          <div className="space-y-2">
            <h3
              className="text-xs uppercase tracking-wide"
              style={{ color: "var(--muted)", fontFamily: "var(--font-mono)" }}
            >
              Sources ({link.mentions.length})
            </h3>
            <div className="space-y-1">
              {link.mentions.map((m) => (
                <div
                  key={m.id}
                  className="text-sm flex items-center justify-between"
                  style={{ color: "var(--ink)" }}
                >
                  <span>{m.source.name}</span>
                  <span className="text-xs" style={{ color: "var(--muted)", fontFamily: "var(--font-mono)" }}>
                    {new Date(m.seenAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Status Badges */}
          <div className="flex items-center gap-2 pt-4" style={{ borderTop: "1px solid var(--border)" }}>
            {link.promoted && (
              <span
                className="text-xs px-2 py-1"
                style={{ background: "var(--accent-warm)", color: "#fff" }}
              >
                PROMOTED
              </span>
            )}
            {link.hidden && (
              <span
                className="text-xs px-2 py-1"
                style={{ background: "var(--muted)", color: "#fff" }}
              >
                HIDDEN
              </span>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
