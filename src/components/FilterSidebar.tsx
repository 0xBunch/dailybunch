"use client";

/**
 * FilterSidebar Component
 *
 * Mission Control sidebar with views, filters, and entity tracking.
 * - Desktop: static sidebar visible by default
 * - Mobile: bottom sheet activated by button
 */

import { useState, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";

type ViewType = "all" | "trending" | "hidden-gems" | "videos" | "podcasts" | "saved";
type TimeFilter = "6h" | "24h" | "7d" | "30d" | "all";
type VelocityFilter = "any" | "2" | "3" | "5";

interface Category {
  name: string;
  slug: string;
  count: number;
}

interface RisingEntity {
  name: string;
  slug: string;
  type: string;
  trend: "rising" | "stable" | "falling";
  count: number;
}

interface FilterSidebarProps {
  categories?: Category[];
  risingEntities?: RisingEntity[];
  counts?: {
    all?: number;
    trending?: number;
    hiddenGems?: number;
    videos?: number;
    podcasts?: number;
    saved?: number;
  };
}

export function FilterSidebar({
  categories = [],
  risingEntities = [],
  counts = {},
}: FilterSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);

  // Get current filter state from URL
  const currentView = (searchParams.get("view") as ViewType) || "all";
  const currentTime = (searchParams.get("time") as TimeFilter) || "7d";
  const currentVelocity = (searchParams.get("velocity") as VelocityFilter) || "any";
  const currentCategory = searchParams.get("category");
  const currentEntity = searchParams.get("entity");

  // Update URL with filters
  const updateFilter = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === null || value === "all" || value === "any") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setIsOpen(false);
  }, [pathname, searchParams]);

  const closeSidebar = () => setIsOpen(false);

  const views = [
    { id: "all" as ViewType, label: "All Signal", count: counts.all },
    { id: "trending" as ViewType, label: "Trending Now", count: counts.trending },
    { id: "hidden-gems" as ViewType, label: "Hidden Gems", count: counts.hiddenGems },
    { id: "videos" as ViewType, label: "Videos", count: counts.videos },
    { id: "podcasts" as ViewType, label: "Podcasts", count: counts.podcasts },
  ];

  const timeOptions = [
    { value: "6h" as TimeFilter, label: "6h" },
    { value: "24h" as TimeFilter, label: "24h" },
    { value: "7d" as TimeFilter, label: "7d" },
    { value: "30d" as TimeFilter, label: "30d" },
  ];

  const velocityOptions = [
    { value: "any" as VelocityFilter, label: "Any" },
    { value: "2" as VelocityFilter, label: "2+" },
    { value: "3" as VelocityFilter, label: "3+" },
    { value: "5" as VelocityFilter, label: "5+" },
  ];

  const FilterContent = () => (
    <div className="space-y-6">
      {/* Brand */}
      <div className="hidden md:block">
        <Link
          href="/"
          className="text-lg hover:opacity-70 transition-opacity"
          style={{
            color: "var(--text-primary)",
            textDecoration: "none",
            fontFamily: "var(--font-headline)",
            textTransform: "uppercase",
          }}
        >
          Daily Bunch
        </Link>
      </div>

      {/* Views */}
      <div>
        <div
          className="mb-2 text-[10px] uppercase tracking-wider"
          style={{ color: "var(--text-faint)", fontFamily: "var(--font-mono)" }}
        >
          Views
        </div>
        <div className="space-y-0.5">
          {views.map((view) => (
            <button
              key={view.id}
              onClick={() => updateFilter("view", view.id === "all" ? null : view.id)}
              className="flex w-full items-center justify-between px-2 py-1.5 text-sm transition-colors"
              style={{
                background: currentView === view.id ? "var(--accent-subtle)" : "transparent",
                color: currentView === view.id ? "var(--accent)" : "var(--text-secondary)",
                border: "none",
                textAlign: "left",
              }}
            >
              <span className="flex items-center gap-2">
                {currentView === view.id && <span>●</span>}
                <span>{view.label}</span>
              </span>
              {view.count !== undefined && (
                <span
                  className="text-xs tabular-nums"
                  style={{ color: "var(--text-faint)" }}
                >
                  {view.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Time Filter */}
      <div>
        <div
          className="mb-2 text-[10px] uppercase tracking-wider"
          style={{ color: "var(--text-faint)", fontFamily: "var(--font-mono)" }}
        >
          Time
        </div>
        <div className="flex gap-1">
          {timeOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => updateFilter("time", opt.value)}
              className="flex-1 px-2 py-1.5 text-xs transition-colors"
              style={{
                background: currentTime === opt.value ? "var(--text-primary)" : "transparent",
                color: currentTime === opt.value ? "var(--background)" : "var(--text-muted)",
                border: "1px solid var(--border)",
                fontFamily: "var(--font-mono)",
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Velocity Filter */}
      <div>
        <div
          className="mb-2 text-[10px] uppercase tracking-wider"
          style={{ color: "var(--text-faint)", fontFamily: "var(--font-mono)" }}
        >
          Velocity
        </div>
        <div className="flex gap-1">
          {velocityOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => updateFilter("velocity", opt.value)}
              className="flex-1 px-2 py-1.5 text-xs transition-colors"
              style={{
                background: currentVelocity === opt.value ? "var(--text-primary)" : "transparent",
                color: currentVelocity === opt.value ? "var(--background)" : "var(--text-muted)",
                border: "1px solid var(--border)",
                fontFamily: "var(--font-mono)",
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Categories */}
      {categories.length > 0 && (
        <div>
          <div
            className="mb-2 text-[10px] uppercase tracking-wider"
            style={{ color: "var(--text-faint)", fontFamily: "var(--font-mono)" }}
          >
            Topics
          </div>
          <div className="space-y-0.5">
            {categories.map((cat) => (
              <button
                key={cat.slug}
                onClick={() =>
                  updateFilter("category", currentCategory === cat.slug ? null : cat.slug)
                }
                className="flex w-full items-center justify-between px-2 py-1.5 text-sm transition-colors"
                style={{
                  background:
                    currentCategory === cat.slug ? "var(--accent-subtle)" : "transparent",
                  color: currentCategory === cat.slug ? "var(--accent)" : "var(--text-secondary)",
                  border: "none",
                  textAlign: "left",
                }}
              >
                <span className="flex items-center gap-2">
                  {currentCategory === cat.slug && <span>☑</span>}
                  {currentCategory !== cat.slug && <span>☐</span>}
                  <span>{cat.name}</span>
                </span>
                <span
                  className="text-xs tabular-nums"
                  style={{ color: "var(--text-faint)" }}
                >
                  {cat.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Rising Entities */}
      {risingEntities.length > 0 && (
        <div>
          <div
            className="mb-2 text-[10px] uppercase tracking-wider"
            style={{ color: "var(--text-faint)", fontFamily: "var(--font-mono)" }}
          >
            Rising Entities
          </div>
          <div className="space-y-1">
            {risingEntities.map((entity) => (
              <button
                key={entity.slug}
                onClick={() =>
                  updateFilter("entity", currentEntity === entity.slug ? null : entity.slug)
                }
                className="flex w-full items-center gap-2 px-2 py-1 text-sm transition-colors"
                style={{
                  background:
                    currentEntity === entity.slug ? "var(--accent-subtle)" : "transparent",
                  color:
                    currentEntity === entity.slug ? "var(--accent)" : "var(--text-secondary)",
                  border: "none",
                  textAlign: "left",
                }}
              >
                <span style={{ color: "var(--status-success)" }}>
                  {entity.trend === "rising" && "↑"}
                  {entity.trend === "stable" && "●"}
                  {entity.trend === "falling" && "↓"}
                </span>
                <span>
                  {entity.type === "person" && "@"}
                  {entity.type === "organization" && "+"}
                  {entity.type === "product" && "#"}
                  {entity.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Keyboard shortcut hint */}
      <div
        className="hidden pt-4 text-xs md:block"
        style={{
          borderTop: "1px solid var(--border)",
          color: "var(--text-faint)",
          fontFamily: "var(--font-mono)",
        }}
      >
        <div className="flex items-center gap-2">
          <kbd
            className="px-1.5 py-0.5"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            ⌘K
          </kbd>
          <span>Command palette</span>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <kbd
            className="px-1.5 py-0.5"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            ?
          </kbd>
          <span>Shortcuts</span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile filter button - bottom sheet trigger */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-40 flex items-center gap-2 px-4 py-3 text-sm md:hidden"
        style={{
          background: "var(--text-primary)",
          color: "var(--background)",
          fontFamily: "var(--font-mono)",
        }}
        aria-label="Open filters"
      >
        <span>☰</span>
        <span>Filters</span>
        {(currentCategory || currentEntity || currentView !== "all") && (
          <span
            className="size-2"
            style={{ background: "var(--accent)", borderRadius: "50%" }}
          />
        )}
      </button>

      {/* Mobile bottom sheet */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            onClick={closeSidebar}
          />

          {/* Bottom sheet */}
          <div
            className="fixed inset-x-0 bottom-0 z-50 max-h-[80vh] overflow-y-auto p-4 md:hidden"
            style={{
              background: "var(--background)",
              borderTop: "1px solid var(--border)",
            }}
          >
            <div className="mb-4 flex items-center justify-between">
              <span
                className="text-xs uppercase tracking-wider"
                style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}
              >
                Filters
              </span>
              <button
                onClick={closeSidebar}
                className="px-2 py-1 text-sm"
                style={{ color: "var(--text-muted)", background: "transparent", border: "none" }}
              >
                Done
              </button>
            </div>
            <FilterContent />
          </div>
        </>
      )}

      {/* Desktop sidebar */}
      <aside
        className="hidden w-56 shrink-0 overflow-y-auto p-4 md:block"
        style={{
          borderRight: "1px solid var(--border)",
          background: "var(--surface-cream)",
        }}
      >
        <FilterContent />
      </aside>
    </>
  );
}
