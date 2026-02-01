"use client";

/**
 * Mission Control Client Component
 *
 * Handles client-side interactivity:
 * - Command palette (Cmd+K)
 * - Keyboard navigation
 * - View mode switching
 */

import { useState, Suspense } from "react";
import { CommandPalette, useCommandPalette } from "./CommandPalette";
import {
  useKeyboardNavigation,
  KeyboardShortcutsHelp,
} from "@/hooks/useKeyboardNavigation";
import { FilterSidebar } from "./FilterSidebar";
import { LinkCard, type LinkCardVariant } from "./LinkCard";
import { VideoCard } from "./VideoCard";
import { PodcastCard } from "./PodcastCard";

interface LinkData {
  id: string;
  title: string | null;
  fallbackTitle: string | null;
  canonicalUrl: string;
  domain: string;
  aiSummary: string | null;
  imageUrl?: string | null;
  mediaType?: string | null;
  firstSeenAt: Date;
  categoryName: string | null;
  velocity: number;
  isTrending: boolean;
  sourceNames: string[];
  entities: Array<{ name: string; type: string }>;
  culturalPrediction?: string | null;
  commentary?: string | null;
}

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

interface MissionControlClientProps {
  links: LinkData[];
  categories: Category[];
  risingEntities: RisingEntity[];
  counts: {
    all?: number;
    trending?: number;
    videos?: number;
    podcasts?: number;
  };
  children?: React.ReactNode;
  rightRail?: React.ReactNode;
}

export function MissionControlClient({
  links,
  categories,
  risingEntities,
  counts,
  children,
  rightRail,
}: MissionControlClientProps) {
  const { open: commandPaletteOpen, setOpen: setCommandPaletteOpen } =
    useCommandPalette();

  const [viewMode, setViewMode] = useState<LinkCardVariant>("feed");

  const { selectedIndex, showHelp, setShowHelp } = useKeyboardNavigation({
    itemCount: links.length,
    getItemUrl: (index) => links[index]?.canonicalUrl ?? null,
    enabled: !commandPaletteOpen,
  });

  // Handle view mode shortcuts (1, 2, 3)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "1") setViewMode("feed");
    if (e.key === "2") setViewMode("compact");
    if (e.key === "3") setViewMode("grid");
  };

  return (
    <div
      className="flex min-h-dvh"
      style={{ background: "var(--background)" }}
      onKeyDown={handleKeyDown}
    >
      {/* Sidebar */}
      <Suspense fallback={null}>
        <FilterSidebar
          categories={categories}
          risingEntities={risingEntities}
          counts={counts}
        />
      </Suspense>

      {/* Main content */}
      <main className="min-w-0 flex-1">
        {/* Header */}
        <header
          className="flex items-center justify-between border-b px-4 py-3 md:px-6"
          style={{ borderColor: "var(--border)" }}
        >
          <h1
            className="text-lg md:hidden"
            style={{
              fontFamily: "var(--font-headline)",
              textTransform: "uppercase",
            }}
          >
            Daily Bunch
          </h1>

          <div className="flex items-center gap-4">
            {/* View mode toggle */}
            <div className="hidden items-center gap-1 md:flex">
              <button
                onClick={() => setViewMode("feed")}
                className="px-2 py-1 text-xs"
                style={{
                  background:
                    viewMode === "feed" ? "var(--text-primary)" : "transparent",
                  color:
                    viewMode === "feed"
                      ? "var(--background)"
                      : "var(--text-muted)",
                  border: "1px solid var(--border)",
                  fontFamily: "var(--font-mono)",
                }}
                aria-label="Feed view"
              >
                ≡
              </button>
              <button
                onClick={() => setViewMode("compact")}
                className="px-2 py-1 text-xs"
                style={{
                  background:
                    viewMode === "compact"
                      ? "var(--text-primary)"
                      : "transparent",
                  color:
                    viewMode === "compact"
                      ? "var(--background)"
                      : "var(--text-muted)",
                  border: "1px solid var(--border)",
                  fontFamily: "var(--font-mono)",
                }}
                aria-label="Compact view"
              >
                ☰
              </button>
              <button
                onClick={() => setViewMode("grid")}
                className="px-2 py-1 text-xs"
                style={{
                  background:
                    viewMode === "grid" ? "var(--text-primary)" : "transparent",
                  color:
                    viewMode === "grid"
                      ? "var(--background)"
                      : "var(--text-muted)",
                  border: "1px solid var(--border)",
                  fontFamily: "var(--font-mono)",
                }}
                aria-label="Grid view"
              >
                ⊞
              </button>
            </div>

            {/* Command palette trigger */}
            <button
              onClick={() => setCommandPaletteOpen(true)}
              className="hidden items-center gap-2 px-3 py-1.5 text-xs md:flex"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                color: "var(--text-muted)",
                fontFamily: "var(--font-mono)",
              }}
            >
              <span>⌘K</span>
              <span>Search</span>
            </button>
          </div>
        </header>

        {/* Promoted content sections */}
        {children}

        {/* Main feed */}
        <section className="px-4 py-6 md:px-6">
          <div
            className="mb-4 flex items-center gap-3 border-b pb-3"
            style={{ borderColor: "var(--border)" }}
          >
            <h2
              className="text-xs uppercase tracking-wider"
              style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}
            >
              All Signal
            </h2>
            <span
              className="tabular-nums text-xs"
              style={{ color: "var(--text-faint)", fontFamily: "var(--font-mono)" }}
            >
              {links.length}
            </span>
          </div>

          {links.length === 0 ? (
            <div className="py-16 text-center">
              <p style={{ color: "var(--text-muted)" }}>No links found.</p>
              <p className="mt-1 text-sm" style={{ color: "var(--text-faint)" }}>
                Adjust your filters or check back later.
              </p>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {links.map((link, index) => {
                if (link.mediaType === "video") {
                  return (
                    <VideoCard
                      key={link.id}
                      id={link.id}
                      title={link.title}
                      fallbackTitle={link.fallbackTitle}
                      canonicalUrl={link.canonicalUrl}
                      domain={link.domain}
                      imageUrl={link.imageUrl}
                      category={
                        link.categoryName ? { name: link.categoryName } : null
                      }
                      velocity={link.velocity}
                      sources={link.sourceNames}
                      firstSeenAt={link.firstSeenAt}
                      culturalPrediction={link.culturalPrediction}
                    />
                  );
                }
                return (
                  <LinkCard
                    key={link.id}
                    id={link.id}
                    title={link.title}
                    fallbackTitle={link.fallbackTitle}
                    canonicalUrl={link.canonicalUrl}
                    domain={link.domain}
                    imageUrl={link.imageUrl}
                    category={
                      link.categoryName ? { name: link.categoryName } : null
                    }
                    entities={link.entities.map((e) => ({ entity: e }))}
                    velocity={link.velocity}
                    sources={link.sourceNames}
                    firstSeenAt={link.firstSeenAt}
                    variant="grid"
                    isSelected={selectedIndex === index}
                    feedIndex={index}
                  />
                );
              })}
            </div>
          ) : (
            <div
              className="divide-y"
              style={{ borderColor: "var(--border-subtle)" }}
            >
              {links.map((link, index) => {
                if (link.mediaType === "video") {
                  return (
                    <VideoCard
                      key={link.id}
                      id={link.id}
                      title={link.title}
                      fallbackTitle={link.fallbackTitle}
                      canonicalUrl={link.canonicalUrl}
                      domain={link.domain}
                      imageUrl={link.imageUrl}
                      category={
                        link.categoryName ? { name: link.categoryName } : null
                      }
                      velocity={link.velocity}
                      sources={link.sourceNames}
                      firstSeenAt={link.firstSeenAt}
                      culturalPrediction={link.culturalPrediction}
                    />
                  );
                }
                if (link.mediaType === "podcast") {
                  return (
                    <PodcastCard
                      key={link.id}
                      id={link.id}
                      title={link.title}
                      fallbackTitle={link.fallbackTitle}
                      canonicalUrl={link.canonicalUrl}
                      domain={link.domain}
                      description={link.aiSummary}
                      imageUrl={link.imageUrl}
                      category={
                        link.categoryName ? { name: link.categoryName } : null
                      }
                      velocity={link.velocity}
                      sources={link.sourceNames}
                      firstSeenAt={link.firstSeenAt}
                      culturalPrediction={link.culturalPrediction}
                    />
                  );
                }
                return (
                  <LinkCard
                    key={link.id}
                    id={link.id}
                    title={link.title}
                    fallbackTitle={link.fallbackTitle}
                    canonicalUrl={link.canonicalUrl}
                    domain={link.domain}
                    summary={link.aiSummary}
                    imageUrl={link.imageUrl}
                    category={
                      link.categoryName ? { name: link.categoryName } : null
                    }
                    entities={link.entities.map((e) => ({ entity: e }))}
                    velocity={link.velocity}
                    sources={link.sourceNames}
                    firstSeenAt={link.firstSeenAt}
                    isTrending={link.isTrending}
                    culturalPrediction={link.culturalPrediction}
                    commentary={link.commentary}
                    variant={viewMode}
                    isSelected={selectedIndex === index}
                    feedIndex={index}
                  />
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* Right Rail */}
      {rightRail}

      {/* Command Palette */}
      <CommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
      />

      {/* Keyboard shortcuts help */}
      <KeyboardShortcutsHelp open={showHelp} onClose={() => setShowHelp(false)} />
    </div>
  );
}
