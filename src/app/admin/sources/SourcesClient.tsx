"use client";

/**
 * Sources Client Component
 *
 * Redesigned sources admin with:
 * - Category grouping with collapsible sections
 * - Bulk selection and actions
 * - 7-day activity sparklines
 * - Health scoring
 * - Feed preview modal
 * - OPML import
 */

import { useState, useCallback, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";

// Types
interface SourceCategory {
  id: string;
  categoryId: string;
  category: { id: string; name: string; slug: string };
}

interface Source {
  id: string;
  name: string;
  type: string;
  url: string | null;
  baseDomain: string | null;
  active: boolean;
  tier: string;
  pollFrequency: string;
  showOnDashboard: boolean;
  includeOwnLinks: boolean;
  lastFetchedAt: string | null;
  lastError: string | null;
  consecutiveErrors: number;
  tags: string[];
  categoryId: string | null;
  category: { id: string; name: string } | null;
  categories: SourceCategory[];
  _count: { mentions: number; sourceItems: number };
  recentActivity: number[]; // 7-day item counts
  healthScore: number;
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface Props {
  sources: Source[];
  categories: Category[];
  stats: {
    total: number;
    active: number;
    errors: number;
    quiet: number;
  };
}

// Health score calculation
function getHealthGrade(score: number): { grade: string; color: string } {
  if (score >= 90) return { grade: "A", color: "var(--status-success)" };
  if (score >= 75) return { grade: "B", color: "#6b8e23" };
  if (score >= 60) return { grade: "C", color: "var(--accent-warm)" };
  if (score >= 40) return { grade: "D", color: "#d4a574" };
  return { grade: "F", color: "var(--status-error)" };
}

// Time formatting
function formatTimeAgo(dateStr: string | null): string {
  if (!dateStr) return "never";
  const date = new Date(dateStr);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

// Sparkline component
function Sparkline({ data, width = 56, height = 16 }: { data: number[]; width?: number; height?: number }) {
  if (data.length === 0 || data.every((d) => d === 0)) {
    return (
      <div
        className="flex items-center justify-center"
        style={{
          width,
          height,
          background: "var(--surface-cream)",
          border: "1px solid var(--border)",
        }}
      >
        <span className="text-[8px]" style={{ color: "var(--muted)" }}>—</span>
      </div>
    );
  }

  const max = Math.max(...data, 1);
  const barWidth = (width - 2) / data.length;

  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      <rect x={0} y={0} width={width} height={height} fill="var(--surface-cream)" />
      {data.map((value, i) => {
        const barHeight = (value / max) * (height - 2);
        return (
          <rect
            key={i}
            x={1 + i * barWidth}
            y={height - 1 - barHeight}
            width={barWidth - 1}
            height={barHeight}
            fill={value > 0 ? "var(--ink)" : "transparent"}
            opacity={0.6}
          />
        );
      })}
    </svg>
  );
}

// Feed Preview Modal
interface PreviewData {
  feedTitle: string;
  feedUrl: string;
  domain: string;
  itemCount: number;
  sampleItems: Array<{
    title: string;
    link: string;
    pubDate: string | null;
    linkCount: number;
  }>;
  duplicates: {
    exactMatch: { id: string; name: string; url: string } | null;
    domainMatches: Array<{ id: string; name: string; url: string }>;
  };
}

function FeedPreviewModal({
  isOpen,
  onClose,
  onConfirm,
  preview,
  isLoading,
  error,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (name: string) => void;
  preview: PreviewData | null;
  isLoading: boolean;
  error: string | null;
}) {
  const [name, setName] = useState("");

  if (!isOpen) return null;

  const hasDuplicates = preview?.duplicates.exactMatch || (preview?.duplicates.domainMatches.length ?? 0) > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.5)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-xl max-h-[80vh] overflow-auto"
        style={{ background: "#fff", border: "1px solid var(--border)" }}
      >
        <div className="p-4 border-b" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium" style={{ fontFamily: "var(--font-mono)" }}>
              FEED PREVIEW
            </h3>
            <button onClick={onClose} className="text-lg leading-none" style={{ color: "var(--muted)" }}>
              ×
            </button>
          </div>
        </div>

        <div className="p-4">
          {isLoading && (
            <div className="text-center py-8" style={{ color: "var(--muted)" }}>
              Fetching feed...
            </div>
          )}

          {error && (
            <div className="p-3 mb-4" style={{ background: "rgba(166,84,84,0.1)", color: "var(--status-error)" }}>
              <p className="text-sm font-medium">Failed to fetch feed</p>
              <p className="text-xs mt-1" style={{ fontFamily: "var(--font-mono)" }}>{error}</p>
            </div>
          )}

          {preview && (
            <>
              {/* Duplicate warnings */}
              {hasDuplicates && (
                <div className="p-3 mb-4" style={{ background: "rgba(196,93,44,0.1)" }}>
                  <p className="text-sm font-medium" style={{ color: "var(--accent-warm)" }}>
                    ⚠ Potential duplicates detected
                  </p>
                  {preview.duplicates.exactMatch && (
                    <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
                      Exact URL match: {preview.duplicates.exactMatch.name}
                    </p>
                  )}
                  {preview.duplicates.domainMatches.map((m) => (
                    <p key={m.id} className="text-xs mt-1" style={{ color: "var(--muted)" }}>
                      Same domain: {m.name}
                    </p>
                  ))}
                </div>
              )}

              {/* Feed info */}
              <div className="mb-4">
                <label className="block text-xs uppercase mb-1" style={{ color: "var(--muted)", fontFamily: "var(--font-mono)" }}>
                  Feed Title
                </label>
                <p className="text-sm font-medium">{preview.feedTitle || "Untitled"}</p>
                <p className="text-xs mt-1" style={{ color: "var(--muted)", fontFamily: "var(--font-mono)" }}>
                  {preview.domain} · {preview.itemCount} items
                </p>
              </div>

              {/* Name input */}
              <div className="mb-4">
                <label className="block text-xs uppercase mb-1" style={{ color: "var(--muted)", fontFamily: "var(--font-mono)" }}>
                  Source Name
                </label>
                <input
                  type="text"
                  value={name || preview.feedTitle}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-sm"
                  style={{ border: "1px solid var(--border)", background: "var(--surface-cream)" }}
                />
              </div>

              {/* Sample items */}
              <div>
                <label className="block text-xs uppercase mb-2" style={{ color: "var(--muted)", fontFamily: "var(--font-mono)" }}>
                  Recent Items
                </label>
                <div className="space-y-2">
                  {preview.sampleItems.map((item, i) => (
                    <div key={i} className="p-2" style={{ background: "var(--surface-cream)" }}>
                      <p className="text-sm line-clamp-1">{item.title}</p>
                      <p className="text-xs mt-1" style={{ color: "var(--muted)", fontFamily: "var(--font-mono)" }}>
                        {item.linkCount} links · {item.pubDate ? formatTimeAgo(item.pubDate) : "no date"}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="mt-6 flex items-center justify-end gap-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm"
                  style={{ border: "1px solid var(--border)", background: "var(--surface-cream)" }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => onConfirm(name || preview.feedTitle)}
                  disabled={!!preview.duplicates.exactMatch}
                  className="px-4 py-2 text-sm disabled:opacity-50"
                  style={{ background: "var(--ink)", color: "#fff" }}
                >
                  Add Source
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Main component
export function SourcesClient({ sources, categories, stats }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Filter state
  const [filter, setFilter] = useState<"all" | "active" | "inactive" | "errors" | "quiet">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Collapsed sections
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  // Feed preview modal
  const [previewUrl, setPreviewUrl] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // OPML import
  const opmlInputRef = useRef<HTMLInputElement>(null);
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number } | null>(null);

  // Quick add URL input
  const [quickAddUrl, setQuickAddUrl] = useState("");

  // Filter sources
  const filteredSources = sources.filter((source) => {
    // Status filter
    if (filter === "active" && !source.active) return false;
    if (filter === "inactive" && source.active) return false;
    if (filter === "errors" && source.consecutiveErrors < 3) return false;
    if (filter === "quiet" && (source.recentActivity.reduce((a, b) => a + b, 0) > 0 || !source.active)) return false;

    // Category filter
    if (categoryFilter !== "all") {
      const hasCategory = source.categories.some((sc) => sc.categoryId === categoryFilter) ||
        source.categoryId === categoryFilter;
      if (!hasCategory) return false;
    }

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchesName = source.name.toLowerCase().includes(q);
      const matchesDomain = source.baseDomain?.toLowerCase().includes(q);
      const matchesTags = source.tags.some((t) => t.toLowerCase().includes(q));
      if (!matchesName && !matchesDomain && !matchesTags) return false;
    }

    return true;
  });

  // Group by category
  const uncategorized = filteredSources.filter(
    (s) => !s.categoryId && s.categories.length === 0
  );
  const groupedByCategory = categories
    .map((cat) => ({
      category: cat,
      sources: filteredSources.filter(
        (s) => s.categoryId === cat.id || s.categories.some((sc) => sc.categoryId === cat.id)
      ),
    }))
    .filter((g) => g.sources.length > 0);

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

  const selectAll = () => {
    setSelectedIds(new Set(filteredSources.map((s) => s.id)));
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  // Preview feed
  const previewFeed = async (url: string) => {
    setShowPreview(true);
    setPreviewLoading(true);
    setPreviewError(null);
    setPreviewData(null);

    try {
      const res = await fetch("/api/admin/sources/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPreviewError(data.error || "Failed to fetch feed");
        if (data.duplicates) {
          setPreviewData({ ...data, feedTitle: "", feedUrl: url, domain: "", itemCount: 0, sampleItems: [] });
        }
      } else {
        setPreviewData(data);
      }
    } catch (err) {
      setPreviewError("Network error");
    } finally {
      setPreviewLoading(false);
    }
  };

  // Add source after preview
  const addSource = async (name: string) => {
    if (!previewData) return;

    const formData = new FormData();
    formData.append("name", name);
    formData.append("url", previewData.feedUrl);

    await fetch("/api/admin/sources", { method: "POST", body: formData });
    setShowPreview(false);
    setQuickAddUrl("");
    startTransition(() => router.refresh());
  };

  // OPML import
  const handleOPMLImport = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/admin/sources/import-opml", {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    if (data.success) {
      setImportResult({ imported: data.imported, skipped: data.skipped });
      startTransition(() => router.refresh());
    }
  };

  // Bulk actions
  const executeBulkAction = async (action: string, extraData?: Record<string, unknown>) => {
    const res = await fetch("/api/admin/sources/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sourceIds: Array.from(selectedIds),
        action,
        ...extraData,
      }),
    });
    if (res.ok) {
      clearSelection();
      startTransition(() => router.refresh());
    }
  };

  // Toggle category collapse
  const toggleCategory = (catId: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(catId)) {
        next.delete(catId);
      } else {
        next.add(catId);
      }
      return next;
    });
  };

  return (
    <>
      {/* Stats Bar */}
      <div
        className="border-b px-6 py-3"
        style={{ borderColor: "var(--border)", background: "var(--ink)" }}
      >
        <div className="max-w-6xl mx-auto flex items-center gap-8">
          <StatBadge value={stats.active} label="Active" />
          <Divider />
          <StatBadge value={stats.total} label="Total" />
          {stats.errors > 0 && (
            <>
              <Divider />
              <StatBadge value={stats.errors} label="Errors" color="var(--status-error)" />
            </>
          )}
          {stats.quiet > 0 && (
            <>
              <Divider />
              <StatBadge value={stats.quiet} label="Quiet" color="var(--muted)" />
            </>
          )}
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Quick Add + Import Row */}
        <div className="flex flex-wrap items-end gap-4 mb-6">
          {/* Quick Add */}
          <div className="flex-1 min-w-[300px]">
            <label
              className="block text-xs uppercase tracking-wide mb-2"
              style={{ color: "var(--muted)", fontFamily: "var(--font-mono)" }}
            >
              Add Feed
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={quickAddUrl}
                onChange={(e) => setQuickAddUrl(e.target.value)}
                placeholder="https://example.com/feed.xml"
                className="flex-1 px-3 py-2 text-sm"
                style={{ border: "1px solid var(--border)", background: "#fff" }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && quickAddUrl) {
                    previewFeed(quickAddUrl);
                  }
                }}
              />
              <button
                onClick={() => quickAddUrl && previewFeed(quickAddUrl)}
                className="px-4 py-2 text-sm"
                style={{ background: "var(--ink)", color: "#fff" }}
              >
                Preview
              </button>
            </div>
          </div>

          {/* OPML Import */}
          <div>
            <input
              ref={opmlInputRef}
              type="file"
              accept=".opml,.xml"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleOPMLImport(file);
              }}
            />
            <button
              onClick={() => opmlInputRef.current?.click()}
              className="px-4 py-2 text-sm"
              style={{ border: "1px solid var(--border)", background: "#fff" }}
            >
              Import OPML
            </button>
          </div>
        </div>

        {/* Import result */}
        {importResult && (
          <div
            className="p-3 mb-6 flex items-center justify-between"
            style={{ background: "rgba(46,125,50,0.1)" }}
          >
            <span className="text-sm" style={{ color: "var(--status-success)" }}>
              Imported {importResult.imported} feeds ({importResult.skipped} skipped as duplicates)
            </span>
            <button onClick={() => setImportResult(null)} className="text-lg leading-none" style={{ color: "var(--muted)" }}>
              ×
            </button>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          {/* Status filter */}
          <div className="flex gap-1">
            {(["all", "active", "inactive", "errors", "quiet"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="px-3 py-1 text-xs uppercase"
                style={{
                  fontFamily: "var(--font-mono)",
                  background: filter === f ? "var(--ink)" : "var(--surface-cream)",
                  color: filter === f ? "#fff" : "var(--muted)",
                  border: "1px solid var(--border)",
                }}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Category filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-2 py-1 text-sm"
            style={{
              fontFamily: "var(--font-mono)",
              border: "1px solid var(--border)",
              background: "#fff",
            }}
          >
            <option value="all">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>

          {/* Search */}
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..."
            className="px-3 py-1 text-sm w-48"
            style={{ border: "1px solid var(--border)", background: "#fff" }}
          />

          {/* Bulk select */}
          {filteredSources.length > 0 && (
            <button
              onClick={selectedIds.size === filteredSources.length ? clearSelection : selectAll}
              className="px-3 py-1 text-xs"
              style={{
                fontFamily: "var(--font-mono)",
                border: "1px solid var(--border)",
                background: "#fff",
                color: "var(--muted)",
              }}
            >
              {selectedIds.size === filteredSources.length ? "Deselect All" : "Select All"}
            </button>
          )}
        </div>

        {/* Bulk Actions Bar */}
        {selectedIds.size > 0 && (
          <div
            className="sticky top-0 z-10 flex items-center gap-4 p-3 mb-4"
            style={{ background: "var(--ink)", color: "#fff" }}
          >
            <span className="text-sm tabular-nums" style={{ fontFamily: "var(--font-mono)" }}>
              {selectedIds.size} selected
            </span>

            <select
              onChange={(e) => {
                if (e.target.value) {
                  executeBulkAction("setTier", { tier: e.target.value });
                }
              }}
              className="px-2 py-1 text-xs"
              style={{ background: "#333", color: "#fff", border: "1px solid #555" }}
              defaultValue=""
            >
              <option value="">Set Tier...</option>
              <option value="TIER_1">T1</option>
              <option value="TIER_2">T2</option>
              <option value="TIER_3">T3</option>
              <option value="TIER_4">T4</option>
            </select>

            <select
              onChange={(e) => {
                if (e.target.value) {
                  executeBulkAction("setPollFrequency", { frequency: e.target.value });
                }
              }}
              className="px-2 py-1 text-xs"
              style={{ background: "#333", color: "#fff", border: "1px solid #555" }}
              defaultValue=""
            >
              <option value="">Set Poll...</option>
              <option value="realtime">15min</option>
              <option value="hourly">Hourly</option>
              <option value="daily">Daily</option>
            </select>

            <button
              onClick={() => executeBulkAction("activate")}
              className="px-3 py-1 text-xs"
              style={{ background: "var(--status-success)", color: "#fff" }}
            >
              Activate
            </button>
            <button
              onClick={() => executeBulkAction("deactivate")}
              className="px-3 py-1 text-xs"
              style={{ background: "#666", color: "#fff" }}
            >
              Deactivate
            </button>
            <button
              onClick={() => {
                if (confirm(`Delete ${selectedIds.size} sources?`)) {
                  executeBulkAction("delete");
                }
              }}
              className="px-3 py-1 text-xs"
              style={{ background: "var(--status-error)", color: "#fff" }}
            >
              Delete
            </button>

            <button
              onClick={clearSelection}
              className="ml-auto text-xs"
              style={{ color: "#aaa" }}
            >
              Clear
            </button>
          </div>
        )}

        {/* Source Groups */}
        <div className="space-y-4">
          {groupedByCategory.map(({ category, sources: groupSources }) => {
            const isCollapsed = collapsedCategories.has(category.id);
            return (
              <div key={category.id}>
                <button
                  onClick={() => toggleCategory(category.id)}
                  className="w-full flex items-center gap-2 py-2 text-left"
                  style={{ borderBottom: "1px solid var(--border)" }}
                >
                  <span className="text-xs" style={{ color: "var(--muted)" }}>
                    {isCollapsed ? "▶" : "▼"}
                  </span>
                  <span
                    className="text-xs uppercase tracking-wide font-medium"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    {category.name}
                  </span>
                  <span className="text-xs" style={{ color: "var(--muted)" }}>
                    ({groupSources.length})
                  </span>
                </button>
                {!isCollapsed && (
                  <div className="space-y-1 mt-1">
                    {groupSources.map((source) => (
                      <SourceRow
                        key={source.id}
                        source={source}
                        isSelected={selectedIds.has(source.id)}
                        onToggleSelect={() => toggleSelect(source.id)}
                        onRefresh={() => startTransition(() => router.refresh())}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Uncategorized */}
          {uncategorized.length > 0 && (
            <div>
              <button
                onClick={() => toggleCategory("uncategorized")}
                className="w-full flex items-center gap-2 py-2 text-left"
                style={{ borderBottom: "1px solid var(--border)" }}
              >
                <span className="text-xs" style={{ color: "var(--muted)" }}>
                  {collapsedCategories.has("uncategorized") ? "▶" : "▼"}
                </span>
                <span
                  className="text-xs uppercase tracking-wide font-medium"
                  style={{ fontFamily: "var(--font-mono)", color: "var(--muted)" }}
                >
                  Uncategorized
                </span>
                <span className="text-xs" style={{ color: "var(--muted)" }}>
                  ({uncategorized.length})
                </span>
              </button>
              {!collapsedCategories.has("uncategorized") && (
                <div className="space-y-1 mt-1">
                  {uncategorized.map((source) => (
                    <SourceRow
                      key={source.id}
                      source={source}
                      isSelected={selectedIds.has(source.id)}
                      onToggleSelect={() => toggleSelect(source.id)}
                      onRefresh={() => startTransition(() => router.refresh())}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {filteredSources.length === 0 && (
          <div className="text-center py-12" style={{ color: "var(--muted)" }}>
            No sources match the current filters.
          </div>
        )}
      </main>

      {/* Feed Preview Modal */}
      <FeedPreviewModal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        onConfirm={addSource}
        preview={previewData}
        isLoading={previewLoading}
        error={previewError}
      />
    </>
  );
}

// Source Row Component
function SourceRow({
  source,
  isSelected,
  onToggleSelect,
  onRefresh,
}: {
  source: Source;
  isSelected: boolean;
  onToggleSelect: () => void;
  onRefresh: () => void;
}) {
  const hasError = source.consecutiveErrors >= 3;
  const isQuiet = source.recentActivity.reduce((a, b) => a + b, 0) === 0 && source.active;
  const { grade, color } = getHealthGrade(source.healthScore);

  const statusIcon = hasError ? "!" : source.active ? "●" : "○";
  const statusColor = hasError ? "var(--status-error)" : source.active ? "var(--status-success)" : "var(--muted)";

  return (
    <div
      className="flex items-center gap-3 px-3 py-2"
      style={{
        background: isSelected ? "rgba(0,0,0,0.03)" : "#fff",
        borderBottom: "1px solid var(--border)",
        opacity: !source.active ? 0.6 : 1,
      }}
    >
      {/* Checkbox */}
      <input
        type="checkbox"
        checked={isSelected}
        onChange={onToggleSelect}
        className="size-4"
      />

      {/* Status */}
      <span
        className="text-sm w-4 text-center"
        style={{ color: statusColor, fontFamily: "var(--font-mono)" }}
      >
        {statusIcon}
      </span>

      {/* Name */}
      <span
        className="flex-1 text-sm font-medium truncate min-w-0"
        style={{ color: "var(--ink)" }}
        title={source.name}
      >
        {source.name}
      </span>

      {/* Tier */}
      <span
        className="text-xs px-1.5 py-0.5 shrink-0"
        style={{
          fontFamily: "var(--font-mono)",
          background:
            source.tier === "TIER_1"
              ? "var(--accent-warm)"
              : source.tier === "TIER_2"
                ? "var(--status-success)"
                : "var(--surface-cream)",
          color:
            source.tier === "TIER_1" || source.tier === "TIER_2" ? "#fff" : "var(--muted)",
        }}
      >
        T{source.tier.replace("TIER_", "")}
      </span>

      {/* Sparkline */}
      <div className="shrink-0">
        <Sparkline data={source.recentActivity} />
      </div>

      {/* Domain */}
      <span
        className="text-xs w-32 truncate text-right shrink-0"
        style={{ fontFamily: "var(--font-mono)", color: "var(--muted)" }}
        title={source.baseDomain || ""}
      >
        {source.baseDomain || "—"}
      </span>

      {/* Status / Time */}
      <span
        className="text-xs w-16 text-right shrink-0"
        style={{
          fontFamily: "var(--font-mono)",
          color: hasError ? "var(--status-error)" : isQuiet ? "var(--accent-warm)" : "var(--muted)",
        }}
      >
        {hasError ? "ERROR" : isQuiet ? "QUIET" : formatTimeAgo(source.lastFetchedAt)}
      </span>

      {/* Health */}
      <span
        className="text-xs w-6 text-center font-medium shrink-0"
        style={{ fontFamily: "var(--font-mono)", color }}
      >
        {grade}
      </span>

      {/* Quick actions */}
      <div className="flex items-center gap-1 shrink-0">
        <form action={`/api/admin/sources/${source.id}/fetch`} method="POST">
          <button
            type="submit"
            className="text-xs px-2 py-1"
            style={{ fontFamily: "var(--font-mono)", color: "var(--muted)", border: "1px solid var(--border)" }}
            title="Fetch now"
          >
            ↻
          </button>
        </form>
      </div>
    </div>
  );
}

// Helper components
function StatBadge({ value, label, color = "#fff" }: { value: number; label: string; color?: string }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="text-2xl font-medium tabular-nums"
        style={{ fontFamily: "var(--font-mono)", color }}
      >
        {value}
      </span>
      <span className="text-xs uppercase tracking-wide" style={{ color: "#888" }}>
        {label}
      </span>
    </div>
  );
}

function Divider() {
  return <div className="w-px h-6" style={{ background: "rgba(255,255,255,0.2)" }} />;
}
