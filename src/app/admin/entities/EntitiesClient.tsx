"use client";

/**
 * Entities Client Component
 *
 * Interactive entity management with URL-driven search, filter, sort.
 * Filtering/sorting/pagination happen server-side via searchParams.
 */

import Link from "next/link";
import { useState, useEffect, useTransition, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

interface Entity {
  id: string;
  name: string;
  type: string;
  aliases: string[];
  active: boolean;
  showInTrending: boolean;
  linkCount: number;
  velocityWeek: number;
  createdAt: string;
}

interface Suggestion {
  name: string;
  type: string;
  count: number;
}

interface BlocklistEntry {
  id: string;
  name: string;
  reason: string | null;
}

interface Props {
  entities: Entity[];
  suggestions: Suggestion[];
  suggestionTypeCounts: Record<string, number>;
  blocklist: BlocklistEntry[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
  };
  filters: {
    search: string;
    type: string;
    status: string;
    sort: string;
    dir: string;
  };
  stats: {
    total: number;
    active: number;
    hidden: number;
    pending: number;
  };
}

type SortField = "name" | "type" | "linkCount" | "velocityWeek" | "createdAt";

const ENTITY_TYPES = ["person", "organization", "product", "athlete", "brand", "event", "place", "media_outlet"];

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  person: { bg: "#e3f2fd", text: "#1565c0" },
  organization: { bg: "#f3e5f5", text: "#7b1fa2" },
  product: { bg: "#e8f5e9", text: "#2e7d32" },
  athlete: { bg: "#fff3e0", text: "#e65100" },
  brand: { bg: "#fce4ec", text: "#c2185b" },
  event: { bg: "#e0f7fa", text: "#00838f" },
  place: { bg: "#fff8e1", text: "#f57c00" },
  media_outlet: { bg: "#f5f5f5", text: "#424242" },
};

export function EntitiesClient({
  entities,
  suggestions,
  suggestionTypeCounts,
  blocklist,
  pagination,
  filters,
  stats,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Local search input (debounced before pushing to URL)
  const [searchInput, setSearchInput] = useState(filters.search);

  // Edit modal
  const [editingEntity, setEditingEntity] = useState<Entity | null>(null);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<string>("");
  const [bulkType, setBulkType] = useState<string>("person");

  // Import section
  const [showImport, setShowImport] = useState(false);
  const [importJson, setImportJson] = useState("");
  const [importResult, setImportResult] = useState<{ created: number; skipped: number } | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  // URL param helpers
  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === "" || value === "all") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
      if (key !== "page") params.set("page", "1");
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
    },
    [searchParams, pathname, router, startTransition]
  );

  const setPage = useCallback(
    (page: number) => {
      const params = new URLSearchParams(searchParams.toString());
      if (page <= 1) {
        params.delete("page");
      } else {
        params.set("page", String(page));
      }
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
    },
    [searchParams, pathname, router, startTransition]
  );

  // Debounce search input → URL
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (searchInput !== filters.search) {
        updateParam("search", searchInput);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchInput, filters.search, updateParam]);

  // Sync search input when URL changes externally
  useEffect(() => {
    setSearchInput(filters.search);
  }, [filters.search]);

  // Sort handler
  const handleSort = (field: SortField) => {
    const params = new URLSearchParams(searchParams.toString());
    if (filters.sort === field) {
      params.set("dir", filters.dir === "asc" ? "desc" : "asc");
    } else {
      params.set("sort", field);
      params.set("dir", "asc");
    }
    params.set("page", "1");
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  // Entity actions
  const handleToggle = async (id: string, field: "active" | "showInTrending", currentValue: boolean) => {
    const formData = new FormData();
    formData.set(field, (!currentValue).toString());
    await fetch(`/api/admin/entities/${id}`, { method: "POST", body: formData });
    startTransition(() => router.refresh());
  };

  const handleEdit = (entity: Entity) => setEditingEntity(entity);

  const handleSaveEdit = async (id: string, data: { name: string; type: string; aliases: string }) => {
    await fetch(`/api/admin/entities/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setEditingEntity(null);
    startTransition(() => router.refresh());
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this entity? This cannot be undone.")) return;
    await fetch(`/api/admin/entities/${id}`, { method: "DELETE" });
    setEditingEntity(null);
    startTransition(() => router.refresh());
  };

  // Blocklist handlers
  const handleAddToBlocklist = async (name: string, reason?: string) => {
    await fetch("/api/admin/entities/blocklist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, reason }),
    });
    startTransition(() => router.refresh());
  };

  const handleRemoveFromBlocklist = async (id: string) => {
    await fetch(`/api/admin/entities/blocklist/${id}`, { method: "DELETE" });
    startTransition(() => router.refresh());
  };

  // Bulk selection handlers
  const handleSelectAll = () => {
    if (selectedIds.size === entities.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(entities.map((e) => e.id)));
    }
  };

  const handleSelectOne = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedIds(newSelected);
  };

  const handleBulkAction = async () => {
    if (selectedIds.size === 0 || !bulkAction) return;
    const body: { entityIds: string[]; action: string; newType?: string } = {
      entityIds: Array.from(selectedIds),
      action: bulkAction,
    };
    if (bulkAction === "changeType") body.newType = bulkType;
    await fetch("/api/admin/entities/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSelectedIds(new Set());
    setBulkAction("");
    startTransition(() => router.refresh());
  };

  // Import handlers
  const handleImportJson = async () => {
    if (!importJson.trim()) return;
    setIsImporting(true);
    setImportResult(null);
    try {
      const parsed = JSON.parse(importJson);
      const ents = Array.isArray(parsed) ? parsed : [parsed];
      const res = await fetch("/api/admin/entities/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entities: ents, skipDuplicates: true }),
      });
      const result = await res.json();
      setImportResult(result);
      if (result.created > 0) {
        setImportJson("");
        startTransition(() => router.refresh());
      }
    } catch {
      setImportResult({ created: 0, skipped: 0 });
    }
    setIsImporting(false);
  };

  const handlePresetImport = async (preset: string) => {
    setIsImporting(true);
    setImportResult(null);
    const res = await fetch("/api/admin/entities/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ preset, skipDuplicates: true }),
    });
    const result = await res.json();
    setImportResult(result);
    setIsImporting(false);
    if (result.created > 0) startTransition(() => router.refresh());
  };

  // Get unique types from current data for filter dropdown
  const existingTypes = [...new Set(entities.map((e) => e.type))];
  // Merge with all known types for the dropdown
  const allTypes = [...new Set([...ENTITY_TYPES, ...existingTypes])];

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
            <Link href="/links" className="hover:opacity-70 transition-opacity" style={{ color: "var(--muted)", textDecoration: "none" }}>
              Latest
            </Link>
            <Link href="/dashboard" className="hover:opacity-70 transition-opacity" style={{ color: "var(--muted)", textDecoration: "none" }}>
              Trending
            </Link>
            <Link href="/admin" className="hover:opacity-70 transition-opacity" style={{ color: "var(--muted)", textDecoration: "none" }}>
              Admin
            </Link>
          </nav>
        </div>
      </header>

      {/* Stats Bar */}
      <div className="border-b px-6 py-3" style={{ borderColor: "var(--border)", background: "var(--ink)" }}>
        <div className="max-w-6xl mx-auto flex items-center gap-8">
          <StatItem value={stats.active} label="Active" />
          <Divider />
          <StatItem value={stats.total} label="Total" />
          <Divider />
          <StatItem value={stats.hidden} label="Hidden" color="var(--status-warning)" />
          {stats.pending > 0 && (
            <>
              <Divider />
              <StatItem value={stats.pending} label="Pending" color="var(--status-warning)" />
            </>
          )}
          <div className="ml-auto text-sm" style={{ color: "rgba(255,255,255,0.5)", fontFamily: "var(--font-mono)" }}>
            {pagination.totalCount} matching
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Pending Suggestions */}
        {(suggestions.length > 0 || Object.keys(suggestionTypeCounts).length > 0) && (
          <SuggestionsSection
            suggestions={suggestions}
            typeCounts={suggestionTypeCounts}
            onRefresh={() => startTransition(() => router.refresh())}
          />
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6 items-center">
          <div className="flex-1 min-w-[200px] max-w-[300px]">
            <input
              type="text"
              placeholder="Search entities..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full px-3 py-2 text-sm"
              style={{ border: "1px solid var(--border)", background: "#fff" }}
            />
          </div>

          <select
            value={filters.type}
            onChange={(e) => updateParam("type", e.target.value)}
            className="px-3 py-2 text-sm"
            style={{ border: "1px solid var(--border)", background: "#fff" }}
          >
            <option value="all">All Types</option>
            {allTypes.map((type) => (
              <option key={type} value={type}>
                {type.replace("_", " ")}
              </option>
            ))}
          </select>

          <select
            value={filters.status}
            onChange={(e) => updateParam("status", e.target.value)}
            className="px-3 py-2 text-sm"
            style={{ border: "1px solid var(--border)", background: "#fff" }}
          >
            <option value="all">All Status</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
            <option value="hidden">Hidden from Trending</option>
          </select>

          {isPending && (
            <div className="text-sm" style={{ color: "var(--status-warning)", fontFamily: "var(--font-mono)" }}>
              Loading...
            </div>
          )}
        </div>

        {/* Bulk Action Bar */}
        {selectedIds.size > 0 && (
          <div
            className="flex items-center gap-4 mb-4 p-4"
            style={{ background: "var(--ink)", color: "#fff" }}
          >
            <span className="text-sm" style={{ fontFamily: "var(--font-mono)" }}>
              {selectedIds.size} selected
            </span>
            <select
              value={bulkAction}
              onChange={(e) => setBulkAction(e.target.value)}
              className="px-3 py-1 text-sm"
              style={{ border: "none", background: "rgba(255,255,255,0.2)", color: "#fff" }}
            >
              <option value="">Choose action...</option>
              <option value="activate">Activate</option>
              <option value="deactivate">Deactivate</option>
              <option value="show">Show in Trending</option>
              <option value="hide">Hide from Trending</option>
              <option value="changeType">Change Type</option>
              <option value="addToBlocklist">Block + Delete</option>
              <option value="delete">Delete</option>
            </select>
            {bulkAction === "changeType" && (
              <select
                value={bulkType}
                onChange={(e) => setBulkType(e.target.value)}
                className="px-3 py-1 text-sm"
                style={{ border: "none", background: "rgba(255,255,255,0.2)", color: "#fff" }}
              >
                {ENTITY_TYPES.map((t) => (
                  <option key={t} value={t}>{t.replace("_", " ")}</option>
                ))}
              </select>
            )}
            <button
              onClick={handleBulkAction}
              disabled={!bulkAction}
              className="px-4 py-1 text-sm disabled:opacity-50"
              style={{
                fontFamily: "var(--font-mono)",
                background: bulkAction === "delete" || bulkAction === "addToBlocklist" ? "var(--status-error)" : "#fff",
                color: bulkAction === "delete" || bulkAction === "addToBlocklist" ? "#fff" : "var(--ink)",
                border: "none",
              }}
            >
              Apply
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="px-3 py-1 text-sm"
              style={{ fontFamily: "var(--font-mono)", background: "transparent", color: "#fff", border: "1px solid rgba(255,255,255,0.3)" }}
            >
              Clear
            </button>
          </div>
        )}

        {/* Entity Table */}
        <div className="bg-white border" style={{ borderColor: "var(--border)" }}>
          <div
            className="grid gap-4 px-4 py-3 text-xs uppercase tracking-wide border-b items-center"
            style={{
              gridTemplateColumns: "32px 1fr 100px 80px 80px 100px 140px",
              borderColor: "var(--border)",
              background: "var(--surface-cream)",
              color: "var(--muted)",
              fontFamily: "var(--font-mono)",
            }}
          >
            <input
              type="checkbox"
              checked={entities.length > 0 && selectedIds.size === entities.length}
              onChange={handleSelectAll}
              className="w-4 h-4"
              title="Select all"
            />
            <SortHeader field="name" current={filters.sort} direction={filters.dir} onClick={handleSort}>
              Name
            </SortHeader>
            <SortHeader field="type" current={filters.sort} direction={filters.dir} onClick={handleSort}>
              Type
            </SortHeader>
            <SortHeader field="linkCount" current={filters.sort} direction={filters.dir} onClick={handleSort}>
              Links
            </SortHeader>
            <SortHeader field="velocityWeek" current={filters.sort} direction={filters.dir} onClick={handleSort}>
              Velocity
            </SortHeader>
            <div>Status</div>
            <div>Actions</div>
          </div>

          {entities.length === 0 ? (
            <div className="px-4 py-8 text-center" style={{ color: "var(--muted)" }}>
              No entities match your filters.
            </div>
          ) : (
            entities.map((entity) => (
              <EntityRow
                key={entity.id}
                entity={entity}
                selected={selectedIds.has(entity.id)}
                onSelect={handleSelectOne}
                onToggle={handleToggle}
                onEdit={handleEdit}
              />
            ))
          )}
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-4">
            <button
              onClick={() => setPage(pagination.currentPage - 1)}
              disabled={pagination.currentPage === 1}
              className="px-3 py-1 text-sm disabled:opacity-40"
              style={{ border: "1px solid var(--border)", background: "#fff" }}
            >
              Previous
            </button>
            <span className="text-sm" style={{ fontFamily: "var(--font-mono)", color: "var(--muted)" }}>
              Page {pagination.currentPage} of {pagination.totalPages}
            </span>
            <button
              onClick={() => setPage(pagination.currentPage + 1)}
              disabled={pagination.currentPage === pagination.totalPages}
              className="px-3 py-1 text-sm disabled:opacity-40"
              style={{ border: "1px solid var(--border)", background: "#fff" }}
            >
              Next
            </button>
          </div>
        )}

        {/* Add Entity Form */}
        <AddEntityForm existingTypes={ENTITY_TYPES} onSuccess={() => startTransition(() => router.refresh())} />

        {/* Import Section */}
        <ImportSection
          showImport={showImport}
          setShowImport={setShowImport}
          importJson={importJson}
          setImportJson={setImportJson}
          importResult={importResult}
          isImporting={isImporting}
          onImportJson={handleImportJson}
          onPresetImport={handlePresetImport}
        />

        {/* Blocklist Section */}
        <BlocklistSection
          blocklist={blocklist}
          onAdd={handleAddToBlocklist}
          onRemove={handleRemoveFromBlocklist}
        />
      </main>

      {/* Edit Modal */}
      {editingEntity && (
        <EditEntityModal
          entity={editingEntity}
          entityTypes={ENTITY_TYPES}
          onSave={handleSaveEdit}
          onDelete={handleDelete}
          onClose={() => setEditingEntity(null)}
        />
      )}
    </div>
  );
}

/* ── Subcomponents ─────────────────────────────────────────────── */

function StatItem({ value, label, color }: { value: number; label: string; color?: string }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="text-2xl font-medium tabular-nums"
        style={{ fontFamily: "var(--font-mono)", color: color || "#fff" }}
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

function SortHeader({
  field,
  current,
  direction,
  onClick,
  children,
}: {
  field: SortField;
  current: string;
  direction: string;
  onClick: (field: SortField) => void;
  children: React.ReactNode;
}) {
  const isActive = field === current;
  return (
    <button
      onClick={() => onClick(field)}
      className="flex items-center gap-1 text-left hover:opacity-70"
      style={{ background: "none", border: "none", padding: 0, color: isActive ? "var(--ink)" : "inherit" }}
    >
      {children}
      {isActive && <span>{direction === "asc" ? "↑" : "↓"}</span>}
    </button>
  );
}

function EntityRow({
  entity,
  selected,
  onSelect,
  onToggle,
  onEdit,
}: {
  entity: Entity;
  selected: boolean;
  onSelect: (id: string) => void;
  onToggle: (id: string, field: "active" | "showInTrending", currentValue: boolean) => void;
  onEdit: (entity: Entity) => void;
}) {
  const typeColor = TYPE_COLORS[entity.type] || { bg: "#f5f5f5", text: "#424242" };

  return (
    <div
      className="grid gap-4 px-4 py-3 border-b items-center"
      style={{
        gridTemplateColumns: "32px 1fr 100px 80px 80px 100px 140px",
        borderColor: "var(--border)",
        opacity: entity.active ? 1 : 0.6,
        background: selected ? "rgba(0, 100, 200, 0.05)" : "transparent",
      }}
    >
      <input
        type="checkbox"
        checked={selected}
        onChange={() => onSelect(entity.id)}
        className="w-4 h-4"
      />
      <div>
        <div style={{ color: "var(--ink)", fontWeight: 500 }}>{entity.name}</div>
        {entity.aliases.length > 0 && (
          <div className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
            {entity.aliases.join(", ")}
          </div>
        )}
      </div>
      <div>
        <span
          className="text-xs px-2 py-1 inline-block"
          style={{ fontFamily: "var(--font-mono)", background: typeColor.bg, color: typeColor.text }}
        >
          {entity.type.replace("_", " ")}
        </span>
      </div>
      <div className="text-sm tabular-nums" style={{ fontFamily: "var(--font-mono)", color: "var(--muted)" }}>
        {entity.linkCount}
      </div>
      <div className="text-sm tabular-nums" style={{ fontFamily: "var(--font-mono)", color: entity.velocityWeek > 0 ? "var(--status-success)" : "var(--muted)" }}>
        {entity.velocityWeek}
      </div>
      <div className="flex items-center gap-2">
        {!entity.active && (
          <span className="text-xs px-1.5 py-0.5" style={{ background: "var(--status-error)", color: "#fff", fontFamily: "var(--font-mono)" }}>
            inactive
          </span>
        )}
        {!entity.showInTrending && (
          <span className="text-xs px-1.5 py-0.5" style={{ background: "var(--status-warning)", color: "#fff", fontFamily: "var(--font-mono)" }}>
            hidden
          </span>
        )}
        {entity.active && entity.showInTrending && (
          <span className="text-xs" style={{ color: "var(--muted)" }}>—</span>
        )}
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onEdit(entity)}
          className="text-xs px-2 py-1 transition-opacity hover:opacity-70"
          style={{ fontFamily: "var(--font-mono)", border: "1px solid var(--border)", background: "#fff" }}
          title="Edit entity"
        >
          Edit
        </button>
        <button
          onClick={() => onToggle(entity.id, "showInTrending", entity.showInTrending)}
          className="text-xs px-2 py-1 transition-opacity hover:opacity-70"
          style={{
            fontFamily: "var(--font-mono)",
            border: "1px solid var(--border)",
            background: entity.showInTrending ? "#fff" : "var(--surface-cream)",
          }}
          title={entity.showInTrending ? "Hide from trending" : "Show in trending"}
        >
          {entity.showInTrending ? "Hide" : "Show"}
        </button>
        <button
          onClick={() => onToggle(entity.id, "active", entity.active)}
          className="text-xs px-2 py-1 transition-opacity hover:opacity-70"
          style={{
            fontFamily: "var(--font-mono)",
            border: "1px solid var(--border)",
            background: entity.active ? "#fff" : "var(--surface-cream)",
            color: entity.active ? "var(--status-error)" : "var(--status-success)",
          }}
        >
          {entity.active ? "Off" : "On"}
        </button>
      </div>
    </div>
  );
}

function SuggestionsSection({
  suggestions,
  typeCounts,
  onRefresh,
}: {
  suggestions: Suggestion[];
  typeCounts: Record<string, number>;
  onRefresh: () => void;
}) {
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  const handleAction = async (name: string, type: string, action: "approve" | "reject") => {
    setIsProcessing(`${name}-${type}-${action}`);
    const formData = new FormData();
    formData.set("action", action);
    formData.set("name", name);
    formData.set("type", type);
    await fetch("/api/admin/entities/suggestions/bulk", { method: "POST", body: formData });
    setIsProcessing(null);
    onRefresh();
  };

  const handleBulkTypeAction = async (type: string, action: "approve" | "reject") => {
    setIsProcessing(`bulk-${type}-${action}`);
    await fetch("/api/admin/entities/suggestions/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, bulkType: type }),
    });
    setIsProcessing(null);
    onRefresh();
  };

  const totalPending = Object.values(typeCounts).reduce((a, b) => a + b, 0);

  return (
    <div
      className="mb-8 p-6"
      style={{ background: "rgba(181, 135, 44, 0.1)", border: "1px solid var(--status-warning)" }}
    >
      <h3
        className="text-xs uppercase tracking-wide mb-4"
        style={{ color: "var(--status-warning)", fontFamily: "var(--font-mono)" }}
      >
        Pending Suggestions ({totalPending})
      </h3>

      {/* Type-based bulk actions */}
      {Object.keys(typeCounts).length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4 pb-4" style={{ borderBottom: "1px solid var(--border)" }}>
          {Object.entries(typeCounts)
            .sort(([, a], [, b]) => b - a)
            .map(([type, count]) => (
              <div
                key={type}
                className="flex items-center gap-2 px-3 py-2"
                style={{ background: "#fff", border: "1px solid var(--border)" }}
              >
                <span className="text-sm" style={{ fontFamily: "var(--font-mono)" }}>
                  {type.replace("_", " ")}
                </span>
                <span className="text-xs font-medium" style={{ fontFamily: "var(--font-mono)", color: "var(--status-warning)" }}>
                  {count}
                </span>
                <button
                  onClick={() => handleBulkTypeAction(type, "approve")}
                  disabled={isProcessing !== null}
                  className="text-xs px-2 py-0.5 transition-opacity hover:opacity-80 disabled:opacity-50"
                  style={{ fontFamily: "var(--font-mono)", background: "var(--status-success)", color: "#fff", border: "none" }}
                >
                  {isProcessing === `bulk-${type}-approve` ? "..." : "Approve All"}
                </button>
                <button
                  onClick={() => handleBulkTypeAction(type, "reject")}
                  disabled={isProcessing !== null}
                  className="text-xs px-2 py-0.5 transition-opacity hover:opacity-80 disabled:opacity-50"
                  style={{ fontFamily: "var(--font-mono)", background: "var(--status-error)", color: "#fff", border: "none" }}
                >
                  {isProcessing === `bulk-${type}-reject` ? "..." : "Reject All"}
                </button>
              </div>
            ))}
        </div>
      )}

      {/* Individual suggestions */}
      <div className="space-y-2">
        {suggestions.map((suggestion) => (
          <div
            key={`${suggestion.name}-${suggestion.type}`}
            className="flex items-center justify-between p-3 bg-white"
            style={{ border: "1px solid var(--border)" }}
          >
            <div className="flex items-center gap-3">
              <span style={{ color: "var(--ink)", fontWeight: 500 }}>{suggestion.name}</span>
              <span
                className="text-xs px-2 py-0.5"
                style={{ fontFamily: "var(--font-mono)", background: "var(--surface-cream)", color: "var(--muted)" }}
              >
                {suggestion.type}
              </span>
              {suggestion.count > 1 && (
                <span className="text-xs font-medium" style={{ fontFamily: "var(--font-mono)", color: "var(--status-warning)" }}>
                  ×{suggestion.count}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleAction(suggestion.name, suggestion.type, "approve")}
                disabled={isProcessing !== null}
                className="text-xs px-3 py-1 transition-opacity hover:opacity-80 disabled:opacity-50"
                style={{ fontFamily: "var(--font-mono)", background: "var(--status-success)", color: "#fff", border: "none" }}
              >
                Approve
              </button>
              <button
                onClick={() => handleAction(suggestion.name, suggestion.type, "reject")}
                disabled={isProcessing !== null}
                className="text-xs px-3 py-1 transition-opacity hover:opacity-80 disabled:opacity-50"
                style={{ fontFamily: "var(--font-mono)", background: "var(--status-error)", color: "#fff", border: "none" }}
              >
                Reject
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AddEntityForm({
  existingTypes,
  onSuccess,
}: {
  existingTypes: string[];
  onSuccess: () => void;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState("person");
  const [aliases, setAliases] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData();
    formData.set("name", name);
    formData.set("type", type);
    formData.set("aliases", aliases);
    await fetch("/api/admin/entities", { method: "POST", body: formData });
    setName("");
    setAliases("");
    setIsSubmitting(false);
    onSuccess();
  };

  return (
    <div className="mt-12 p-6" style={{ background: "#fff", border: "1px solid var(--border)" }}>
      <h3 className="text-xs uppercase tracking-wide mb-6" style={{ color: "var(--muted)", fontFamily: "var(--font-mono)" }}>
        Add Entity
      </h3>
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label htmlFor="name" className="block text-xs uppercase tracking-wide mb-2" style={{ color: "var(--muted)", fontFamily: "var(--font-mono)" }}>
              Name
            </label>
            <input type="text" id="name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Elon Musk"
              className="w-full px-3 py-2 text-sm" style={{ border: "1px solid var(--border)", background: "var(--surface-cream)" }} />
          </div>
          <div>
            <label htmlFor="type" className="block text-xs uppercase tracking-wide mb-2" style={{ color: "var(--muted)", fontFamily: "var(--font-mono)" }}>
              Type
            </label>
            <select id="type" value={type} onChange={(e) => setType(e.target.value)} required
              className="w-full px-3 py-2 text-sm" style={{ border: "1px solid var(--border)", background: "var(--surface-cream)" }}>
              {existingTypes.map((t) => (
                <option key={t} value={t}>{t.replace("_", " ")}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="aliases" className="block text-xs uppercase tracking-wide mb-2" style={{ color: "var(--muted)", fontFamily: "var(--font-mono)" }}>
              Aliases
            </label>
            <input type="text" id="aliases" value={aliases} onChange={(e) => setAliases(e.target.value)} placeholder="@elonmusk, Tesla CEO"
              className="w-full px-3 py-2 text-sm" style={{ border: "1px solid var(--border)", background: "var(--surface-cream)" }} />
          </div>
        </div>
        <div className="mt-6">
          <button type="submit" disabled={isSubmitting}
            className="px-4 py-2 text-sm transition-opacity hover:opacity-80 disabled:opacity-50"
            style={{ background: "var(--ink)", color: "#fff", border: "none" }}>
            {isSubmitting ? "Adding..." : "Add Entity"}
          </button>
        </div>
      </form>
    </div>
  );
}

function ImportSection({
  showImport,
  setShowImport,
  importJson,
  setImportJson,
  importResult,
  isImporting,
  onImportJson,
  onPresetImport,
}: {
  showImport: boolean;
  setShowImport: (v: boolean) => void;
  importJson: string;
  setImportJson: (v: string) => void;
  importResult: { created: number; skipped: number } | null;
  isImporting: boolean;
  onImportJson: () => void;
  onPresetImport: (preset: string) => void;
}) {
  return (
    <div className="mt-12 p-6" style={{ background: "#fff", border: "1px solid var(--border)" }}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xs uppercase tracking-wide" style={{ color: "var(--muted)", fontFamily: "var(--font-mono)" }}>
          Batch Import
        </h3>
        <button
          onClick={() => setShowImport(!showImport)}
          className="text-xs px-3 py-1 transition-opacity hover:opacity-80"
          style={{ fontFamily: "var(--font-mono)", border: "1px solid var(--border)", background: showImport ? "var(--surface-cream)" : "#fff" }}
        >
          {showImport ? "Close" : "Open"}
        </button>
      </div>

      {showImport && (
        <div className="space-y-6">
          {/* Preset Imports */}
          <div>
            <div className="text-xs uppercase tracking-wide mb-3" style={{ color: "var(--muted)", fontFamily: "var(--font-mono)" }}>
              Sports Teams
            </div>
            <div className="flex flex-wrap gap-3">
              {[
                { preset: "nfl", label: "NFL Teams", count: 32 },
                { preset: "nba", label: "NBA Teams", count: 30 },
                { preset: "mlb", label: "MLB Teams", count: 30 },
              ].map(({ preset, label, count }) => (
                <button
                  key={preset}
                  onClick={() => onPresetImport(preset)}
                  disabled={isImporting}
                  className="px-4 py-2 text-sm transition-opacity hover:opacity-80 disabled:opacity-50"
                  style={{ border: "1px solid var(--border)", background: "var(--surface-cream)", fontFamily: "var(--font-mono)" }}
                >
                  {isImporting ? "Importing..." : `Import ${label} (${count})`}
                </button>
              ))}
            </div>
          </div>

          {/* JSON Import */}
          <div>
            <div className="text-xs uppercase tracking-wide mb-3" style={{ color: "var(--muted)", fontFamily: "var(--font-mono)" }}>
              Custom JSON Import
            </div>
            <textarea
              value={importJson}
              onChange={(e) => setImportJson(e.target.value)}
              placeholder={`[{"name": "Example Corp", "type": "organization", "aliases": ["Example", "EC"]}]`}
              rows={5}
              className="w-full px-3 py-2 text-sm"
              style={{ border: "1px solid var(--border)", background: "var(--surface-cream)", fontFamily: "var(--font-mono)", resize: "vertical" }}
            />
            <button
              onClick={onImportJson}
              disabled={isImporting || !importJson.trim()}
              className="mt-3 px-4 py-2 text-sm transition-opacity hover:opacity-80 disabled:opacity-50"
              style={{ background: "var(--ink)", color: "#fff", border: "none" }}
            >
              {isImporting ? "Importing..." : "Import JSON"}
            </button>
          </div>

          {/* Result */}
          {importResult && (
            <div
              className="p-3 text-sm"
              style={{
                fontFamily: "var(--font-mono)",
                background: importResult.created > 0 ? "rgba(74, 103, 65, 0.1)" : "rgba(148, 68, 68, 0.1)",
                border: `1px solid ${importResult.created > 0 ? "var(--status-success)" : "var(--status-error)"}`,
                color: importResult.created > 0 ? "var(--status-success)" : "var(--status-error)",
              }}
            >
              {importResult.created > 0
                ? `Created ${importResult.created} entities${importResult.skipped > 0 ? `, ${importResult.skipped} skipped (duplicates)` : ""}`
                : importResult.skipped > 0
                  ? `All ${importResult.skipped} entities already exist`
                  : "Import failed — check JSON format"}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function EditEntityModal({
  entity,
  entityTypes,
  onSave,
  onDelete,
  onClose,
}: {
  entity: Entity;
  entityTypes: string[];
  onSave: (id: string, data: { name: string; type: string; aliases: string }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState(entity.name);
  const [type, setType] = useState(entity.type);
  const [aliases, setAliases] = useState(entity.aliases.join(", "));
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    await onSave(entity.id, { name, type, aliases });
    setIsSaving(false);
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    await onDelete(entity.id);
    setIsDeleting(false);
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ background: "rgba(0, 0, 0, 0.5)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md p-6" style={{ background: "#fff", border: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-medium" style={{ color: "var(--ink)" }}>Edit Entity</h2>
          <button onClick={onClose} className="text-xl hover:opacity-70" style={{ background: "none", border: "none", color: "var(--muted)" }}>
            &times;
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="edit-name" className="block text-xs uppercase tracking-wide mb-2" style={{ color: "var(--muted)", fontFamily: "var(--font-mono)" }}>
                Name
              </label>
              <input type="text" id="edit-name" value={name} onChange={(e) => setName(e.target.value)} required
                className="w-full px-3 py-2 text-sm" style={{ border: "1px solid var(--border)", background: "var(--surface-cream)" }} />
            </div>
            <div>
              <label htmlFor="edit-type" className="block text-xs uppercase tracking-wide mb-2" style={{ color: "var(--muted)", fontFamily: "var(--font-mono)" }}>
                Type
              </label>
              <select id="edit-type" value={type} onChange={(e) => setType(e.target.value)} required
                className="w-full px-3 py-2 text-sm" style={{ border: "1px solid var(--border)", background: "var(--surface-cream)" }}>
                {entityTypes.map((t) => (
                  <option key={t} value={t}>{t.replace("_", " ")}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="edit-aliases" className="block text-xs uppercase tracking-wide mb-2" style={{ color: "var(--muted)", fontFamily: "var(--font-mono)" }}>
                Aliases (comma-separated)
              </label>
              <input type="text" id="edit-aliases" value={aliases} onChange={(e) => setAliases(e.target.value)} placeholder="@username, Other Name"
                className="w-full px-3 py-2 text-sm" style={{ border: "1px solid var(--border)", background: "var(--surface-cream)" }} />
            </div>
          </div>
          <div className="flex items-center justify-between mt-6">
            <button type="button" onClick={handleDelete} disabled={isDeleting}
              className="text-xs px-3 py-2 transition-opacity hover:opacity-80 disabled:opacity-50"
              style={{ fontFamily: "var(--font-mono)", background: "var(--status-error)", color: "#fff", border: "none" }}>
              {isDeleting ? "Deleting..." : "Delete"}
            </button>
            <div className="flex items-center gap-2">
              <button type="button" onClick={onClose}
                className="px-4 py-2 text-sm transition-opacity hover:opacity-80"
                style={{ border: "1px solid var(--border)", background: "#fff" }}>
                Cancel
              </button>
              <button type="submit" disabled={isSaving}
                className="px-4 py-2 text-sm transition-opacity hover:opacity-80 disabled:opacity-50"
                style={{ background: "var(--ink)", color: "#fff", border: "none" }}>
                {isSaving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function BlocklistSection({
  blocklist,
  onAdd,
  onRemove,
}: {
  blocklist: BlocklistEntry[];
  onAdd: (name: string, reason?: string) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
}) {
  const [newName, setNewName] = useState("");
  const [newReason, setNewReason] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setIsAdding(true);
    await onAdd(newName.trim(), newReason.trim() || undefined);
    setNewName("");
    setNewReason("");
    setIsAdding(false);
    setShowForm(false);
  };

  return (
    <div className="mt-12 p-6" style={{ background: "#fff", border: "1px solid var(--border)" }}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xs uppercase tracking-wide" style={{ color: "var(--muted)", fontFamily: "var(--font-mono)" }}>
          Entity Blocklist ({blocklist.length})
        </h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-xs px-3 py-1 transition-opacity hover:opacity-80"
          style={{ fontFamily: "var(--font-mono)", border: "1px solid var(--border)", background: showForm ? "var(--surface-cream)" : "#fff" }}
        >
          {showForm ? "Cancel" : "Add"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="mb-6 p-4" style={{ background: "var(--surface-cream)" }}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="blocklist-name" className="block text-xs uppercase tracking-wide mb-2" style={{ color: "var(--muted)", fontFamily: "var(--font-mono)" }}>
                Name to Block
              </label>
              <input type="text" id="blocklist-name" value={newName} onChange={(e) => setNewName(e.target.value)} required placeholder="AI, The, etc."
                className="w-full px-3 py-2 text-sm" style={{ border: "1px solid var(--border)", background: "#fff" }} />
            </div>
            <div>
              <label htmlFor="blocklist-reason" className="block text-xs uppercase tracking-wide mb-2" style={{ color: "var(--muted)", fontFamily: "var(--font-mono)" }}>
                Reason (optional)
              </label>
              <input type="text" id="blocklist-reason" value={newReason} onChange={(e) => setNewReason(e.target.value)} placeholder="Too generic, always trending, etc."
                className="w-full px-3 py-2 text-sm" style={{ border: "1px solid var(--border)", background: "#fff" }} />
            </div>
          </div>
          <button type="submit" disabled={isAdding || !newName.trim()}
            className="mt-4 px-4 py-2 text-sm transition-opacity hover:opacity-80 disabled:opacity-50"
            style={{ background: "var(--ink)", color: "#fff", border: "none" }}>
            {isAdding ? "Adding..." : "Add to Blocklist"}
          </button>
        </form>
      )}

      {blocklist.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          No blocked names. Names on this list will not be extracted as entities.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {blocklist.map((entry) => (
            <div key={entry.id} className="flex items-center gap-2 px-3 py-2"
              style={{ background: "var(--surface-cream)", border: "1px solid var(--border)" }}>
              <span className="text-sm" style={{ color: "var(--ink)" }}>{entry.name}</span>
              {entry.reason && (
                <span className="text-xs" style={{ color: "var(--muted)" }}>({entry.reason})</span>
              )}
              <button onClick={() => onRemove(entry.id)} className="text-xs ml-1 hover:opacity-70"
                style={{ color: "var(--status-error)", background: "none", border: "none" }} title="Remove from blocklist">
                &times;
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
