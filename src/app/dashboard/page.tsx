"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { cn, formatRelativeTime } from "@/lib/utils";
import {
  ExternalLink,
  Check,
  ChevronDown,
  Send,
  RefreshCw,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

interface LinkItem {
  id: string;
  url: string;
  canonicalUrl: string;
  domain: string;
  title: string | null;
  aiSummary: string | null;
  firstSeenAt: string;
  velocity: number;
  category: { id: string; name: string; slug: string } | null;
  entities: Array<{ entity: { id: string; name: string } }>;
  sources: Array<{ id: string; name: string }>;
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface Entity {
  id: string;
  name: string;
  type: string;
}

interface SelectedLink {
  link: LinkItem;
  note: string;
}

export default function DashboardPage() {
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedEntity, setSelectedEntity] = useState<string | null>(null);
  const [timeWindow, setTimeWindow] = useState(24);
  const [selectedLinks, setSelectedLinks] = useState<Map<string, SelectedLink>>(
    new Map()
  );
  const [headline, setHeadline] = useState("");
  const [showDigestPanel, setShowDigestPanel] = useState(false);

  useEffect(() => {
    fetchData();
  }, [selectedCategory, selectedEntity, timeWindow]);

  async function fetchData() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        hours: timeWindow.toString(),
      });
      if (selectedCategory) params.set("categoryId", selectedCategory);
      if (selectedEntity) params.set("entityId", selectedEntity);

      const [linksRes, catsRes, entsRes] = await Promise.all([
        fetch(`/api/links?${params}`),
        fetch("/api/categories"),
        fetch("/api/entities"),
      ]);

      const [linksData, catsData, entsData] = await Promise.all([
        linksRes.json(),
        catsRes.json(),
        entsRes.json(),
      ]);

      setLinks(linksData.links || []);
      setCategories(catsData.categories || []);
      setEntities(entsData.entities || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to fetch links");
    } finally {
      setLoading(false);
    }
  }

  function toggleLinkSelection(link: LinkItem) {
    const newSelected = new Map(selectedLinks);
    if (newSelected.has(link.id)) {
      newSelected.delete(link.id);
    } else {
      newSelected.set(link.id, { link, note: "" });
    }
    setSelectedLinks(newSelected);
    if (newSelected.size > 0) {
      setShowDigestPanel(true);
    }
  }

  function updateNote(linkId: string, note: string) {
    const newSelected = new Map(selectedLinks);
    const item = newSelected.get(linkId);
    if (item) {
      newSelected.set(linkId, { ...item, note });
      setSelectedLinks(newSelected);
    }
  }

  async function createDigest() {
    if (selectedLinks.size === 0) {
      toast.error("Select at least one link");
      return;
    }
    if (!headline.trim()) {
      toast.error("Enter a headline");
      return;
    }

    try {
      const items = Array.from(selectedLinks.values()).map((item, index) => ({
        linkId: item.link.id,
        note: item.note,
        position: index,
      }));

      const res = await fetch("/api/digests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ headline, items }),
      });

      if (!res.ok) throw new Error("Failed to create digest");

      const data = await res.json();
      toast.success("Digest created!");

      // Reset selection
      setSelectedLinks(new Map());
      setHeadline("");
      setShowDigestPanel(false);

      // Redirect to digest preview
      window.location.href = `/admin/digests/${data.digest.id}`;
    } catch (error) {
      console.error("Error creating digest:", error);
      toast.error("Failed to create digest");
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-foreground/10 sticky top-0 bg-background z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-xl font-bold">
              Daily Bunch
            </Link>
            <span className="text-sm text-foreground/50">Dashboard</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={fetchData}
              className="p-2 hover:bg-foreground/5 rounded-lg transition-colors"
              title="Refresh"
            >
              <RefreshCw className={cn("w-5 h-5", loading && "animate-spin")} />
            </button>
            <Link
              href="/admin"
              className="px-4 py-2 text-sm border border-foreground/20 rounded-lg hover:bg-foreground/5 transition-colors"
            >
              Admin
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Sidebar Filters */}
          <aside className="w-64 shrink-0">
            <div className="sticky top-24 space-y-6">
              {/* Time Window */}
              <div>
                <h3 className="text-sm font-medium mb-2 text-foreground/70">
                  Time Window
                </h3>
                <div className="flex gap-2">
                  {[24, 48, 72].map((hours) => (
                    <button
                      key={hours}
                      onClick={() => setTimeWindow(hours)}
                      className={cn(
                        "px-3 py-1.5 text-sm rounded-lg transition-colors",
                        timeWindow === hours
                          ? "bg-foreground text-background"
                          : "bg-foreground/5 hover:bg-foreground/10"
                      )}
                    >
                      {hours}h
                    </button>
                  ))}
                </div>
              </div>

              {/* Categories */}
              <div>
                <h3 className="text-sm font-medium mb-2 text-foreground/70">
                  Category
                </h3>
                <div className="space-y-1">
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className={cn(
                      "w-full text-left px-3 py-2 text-sm rounded-lg transition-colors",
                      !selectedCategory
                        ? "bg-foreground text-background"
                        : "hover:bg-foreground/5"
                    )}
                  >
                    All
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={cn(
                        "w-full text-left px-3 py-2 text-sm rounded-lg transition-colors",
                        selectedCategory === cat.id
                          ? "bg-foreground text-background"
                          : "hover:bg-foreground/5"
                      )}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Entities */}
              <div>
                <h3 className="text-sm font-medium mb-2 text-foreground/70">
                  Entity
                </h3>
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  <button
                    onClick={() => setSelectedEntity(null)}
                    className={cn(
                      "w-full text-left px-3 py-2 text-sm rounded-lg transition-colors",
                      !selectedEntity
                        ? "bg-foreground text-background"
                        : "hover:bg-foreground/5"
                    )}
                  >
                    All
                  </button>
                  {entities.map((ent) => (
                    <button
                      key={ent.id}
                      onClick={() => setSelectedEntity(ent.id)}
                      className={cn(
                        "w-full text-left px-3 py-2 text-sm rounded-lg transition-colors truncate",
                        selectedEntity === ent.id
                          ? "bg-foreground text-background"
                          : "hover:bg-foreground/5"
                      )}
                    >
                      {ent.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            {/* Stats */}
            <div className="flex items-center gap-4 mb-6">
              <div className="text-sm text-foreground/70">
                {links.length} links in the last {timeWindow}h
              </div>
              {selectedLinks.size > 0 && (
                <button
                  onClick={() => setShowDigestPanel(!showDigestPanel)}
                  className="flex items-center gap-2 px-4 py-2 bg-foreground text-background rounded-lg text-sm font-medium"
                >
                  <Check className="w-4 h-4" />
                  {selectedLinks.size} selected
                  <ChevronDown
                    className={cn(
                      "w-4 h-4 transition-transform",
                      showDigestPanel && "rotate-180"
                    )}
                  />
                </button>
              )}
            </div>

            {/* Digest Panel */}
            {showDigestPanel && selectedLinks.size > 0 && (
              <div className="mb-6 p-4 border border-foreground/20 rounded-lg bg-foreground/[0.02]">
                <h3 className="font-medium mb-4">Create Digest</h3>
                <input
                  type="text"
                  placeholder="Headline for today's digest..."
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  className="w-full px-4 py-2 border border-foreground/20 rounded-lg bg-transparent mb-4"
                />
                <div className="space-y-3 mb-4">
                  {Array.from(selectedLinks.values()).map(({ link, note }) => (
                    <div
                      key={link.id}
                      className="flex items-start gap-3 p-3 bg-background rounded-lg border border-foreground/10"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                          {link.title || link.domain}
                        </div>
                        <input
                          type="text"
                          placeholder="Add a note..."
                          value={note}
                          onChange={(e) => updateNote(link.id, e.target.value)}
                          className="w-full mt-2 px-3 py-1.5 text-sm border border-foreground/10 rounded bg-transparent"
                        />
                      </div>
                      <button
                        onClick={() => toggleLinkSelection(link)}
                        className="p-1 text-foreground/50 hover:text-foreground"
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  onClick={createDigest}
                  className="flex items-center gap-2 px-4 py-2 bg-foreground text-background rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  <Send className="w-4 h-4" />
                  Create Digest
                </button>
              </div>
            )}

            {/* Link List */}
            {loading ? (
              <div className="text-center py-12 text-foreground/50">
                Loading...
              </div>
            ) : links.length === 0 ? (
              <div className="text-center py-12 text-foreground/50">
                No links found. Try fetching RSS feeds first.
              </div>
            ) : (
              <div className="space-y-3">
                {links.map((link) => (
                  <LinkCard
                    key={link.id}
                    link={link}
                    isSelected={selectedLinks.has(link.id)}
                    onToggle={() => toggleLinkSelection(link)}
                  />
                ))}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

function LinkCard({
  link,
  isSelected,
  onToggle,
}: {
  link: LinkItem;
  isSelected: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className={cn(
        "p-4 border rounded-lg transition-colors",
        isSelected
          ? "border-foreground bg-foreground/[0.02]"
          : "border-foreground/10 hover:border-foreground/20"
      )}
    >
      <div className="flex items-start gap-4">
        {/* Checkbox */}
        <button
          onClick={onToggle}
          className={cn(
            "w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-1 transition-colors",
            isSelected
              ? "bg-foreground border-foreground text-background"
              : "border-foreground/30 hover:border-foreground/50"
          )}
        >
          {isSelected && <Check className="w-3 h-3" />}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h3 className="font-medium text-base leading-tight">
                {link.title || link.domain}
              </h3>
              <div className="flex items-center gap-2 mt-1 text-sm text-foreground/50">
                <span>{link.domain}</span>
                <span>&middot;</span>
                <span>{formatRelativeTime(link.firstSeenAt)}</span>
                {link.category && (
                  <>
                    <span>&middot;</span>
                    <span className="px-2 py-0.5 bg-foreground/5 rounded text-xs">
                      {link.category.name}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Velocity Badge */}
            <div className="flex items-center gap-1 px-2 py-1 bg-foreground/5 rounded text-sm shrink-0">
              <Zap className="w-3.5 h-3.5" />
              {link.velocity}
            </div>
          </div>

          {/* Summary */}
          {link.aiSummary && (
            <p className="mt-2 text-sm text-foreground/70 line-clamp-2">
              {link.aiSummary}
            </p>
          )}

          {/* Entities & Sources */}
          <div className="flex items-center gap-4 mt-3">
            {link.entities.length > 0 && (
              <div className="flex items-center gap-1">
                {link.entities.slice(0, 3).map(({ entity }) => (
                  <span
                    key={entity.id}
                    className="px-2 py-0.5 bg-foreground/10 rounded text-xs"
                  >
                    {entity.name}
                  </span>
                ))}
                {link.entities.length > 3 && (
                  <span className="text-xs text-foreground/50">
                    +{link.entities.length - 3}
                  </span>
                )}
              </div>
            )}
            <div className="flex items-center gap-1 text-xs text-foreground/50">
              {link.sources.slice(0, 2).map((source, i) => (
                <span key={source.id}>
                  {i > 0 && ", "}
                  {source.name}
                </span>
              ))}
              {link.sources.length > 2 && (
                <span>+{link.sources.length - 2} more</span>
              )}
            </div>
          </div>
        </div>

        {/* External Link */}
        <a
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 text-foreground/30 hover:text-foreground transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
}
