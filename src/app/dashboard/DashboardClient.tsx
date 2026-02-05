"use client";

import { useState, useMemo } from "react";

interface StoryLink {
  id: string;
  title: string;
  domain: string;
  canonicalUrl: string;
  velocity: number;
}

interface Story {
  id: string;
  title: string;
  linkCount: number;
  combinedVelocity: number;
  domains: string[];
  primaryLink: StoryLink;
  links: StoryLink[];
  lastLinkAt: string;
}

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
  entityIds: string[];
}

interface Entity {
  id: string;
  name: string;
  type: string;
  velocityWeek: number;
}

interface DashboardClientProps {
  stories: Story[];
  links: Link[];
  categories: string[];
  entities: Entity[];
}

type VelocityFilter = "all" | "v2+" | "v5+";

const velocityLabels: Record<VelocityFilter, string> = {
  all: "All",
  "v2+": "2+ sources",
  "v5+": "5+ sources",
};

export function DashboardClient({ stories, links, categories, entities }: DashboardClientProps) {
  const [velocityFilter, setVelocityFilter] = useState<VelocityFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [entityFilter, setEntityFilter] = useState<string | null>(null);
  const [expandedStories, setExpandedStories] = useState<Set<string>>(new Set());

  // Filter stories by velocity
  const filteredStories = useMemo(() => {
    return stories.filter((story) => {
      if (velocityFilter === "v2+" && story.combinedVelocity < 2) return false;
      if (velocityFilter === "v5+" && story.combinedVelocity < 5) return false;
      return true;
    });
  }, [stories, velocityFilter]);

  // Filter links
  const filteredLinks = useMemo(() => {
    return links.filter((link) => {
      if (velocityFilter === "v2+" && link.velocity < 2) return false;
      if (velocityFilter === "v5+" && link.velocity < 5) return false;
      if (categoryFilter && link.category !== categoryFilter) return false;
      if (entityFilter && !link.entityIds.includes(entityFilter)) return false;
      return true;
    });
  }, [links, velocityFilter, categoryFilter, entityFilter]);

  // Format relative time
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const mins = Math.floor((Date.now() - date.getTime()) / 60000);
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
  };

  const toggleStory = (storyId: string) => {
    setExpandedStories((prev) => {
      const next = new Set(prev);
      if (next.has(storyId)) {
        next.delete(storyId);
      } else {
        next.add(storyId);
      }
      return next;
    });
  };

  // Visible entities (top 5)
  const visibleEntities = entities.slice(0, 5);
  const hiddenEntityCount = Math.max(0, entities.length - 5);

  return (
    <div
      className="min-h-screen"
      style={{ background: "var(--background)", color: "var(--text-primary)" }}
    >
      {/* Header - Site identity */}
      <header
        className="sticky top-0 z-10 border-b"
        style={{ background: "var(--background)", borderColor: "var(--border)" }}
      >
        <div className="mx-auto max-w-3xl px-6 py-5">
          <h1
            className="text-lg tracking-tight"
            style={{ fontFamily: "var(--font-headline)", fontWeight: 600 }}
          >
            Daily Bunch
          </h1>
        </div>

        {/* Filter bar - separate concern */}
        <div
          className="border-t"
          style={{ background: "var(--surface-dim)", borderColor: "var(--border)" }}
        >
          <div className="mx-auto max-w-3xl px-6 py-3 flex items-center gap-6">
            {/* Velocity filter group */}
            <div
              className="flex items-center p-1"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              {(["all", "v2+", "v5+"] as VelocityFilter[]).map((filter) => {
                const isActive = velocityFilter === filter;
                return (
                  <button
                    key={filter}
                    onClick={() => setVelocityFilter(filter)}
                    className="px-3 py-1.5 text-xs transition-colors"
                    style={{
                      background: isActive ? "var(--background)" : "transparent",
                      color: isActive ? "var(--text-primary)" : "var(--text-muted)",
                      fontFamily: "var(--font-mono)",
                      fontWeight: isActive ? 500 : 400,
                    }}
                  >
                    {velocityLabels[filter]}
                  </button>
                );
              })}
            </div>

            {/* Divider */}
            <div style={{ width: 1, height: 20, background: "var(--border)" }} />

            {/* Category pills */}
            <div className="flex-1 overflow-x-auto flex items-center gap-2">
              <button
                onClick={() => setCategoryFilter(null)}
                className="px-2.5 py-1 text-xs transition-colors whitespace-nowrap"
                style={{
                  color: categoryFilter === null ? "var(--text-primary)" : "var(--text-muted)",
                  fontWeight: categoryFilter === null ? 500 : 400,
                }}
              >
                All
              </button>
              {categories.map((cat) => {
                const isActive = categoryFilter === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(isActive ? null : cat)}
                    className="px-2.5 py-1 text-xs transition-colors whitespace-nowrap"
                    style={{
                      color: isActive ? "var(--text-primary)" : "var(--text-muted)",
                      fontWeight: isActive ? 500 : 400,
                    }}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </header>

      {/* Trending Entities - simplified */}
      {entities.length > 0 && (
        <div
          className="border-b"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="mx-auto max-w-3xl px-6 py-3">
            <div className="flex items-center gap-4">
              <span
                className="text-xs tracking-wide"
                style={{ color: "var(--text-faint)", fontFamily: "var(--font-mono)" }}
              >
                Trending
              </span>
              <div className="flex items-center gap-3">
                {visibleEntities.map((entity, i) => {
                  const isActive = entityFilter === entity.id;
                  return (
                    <button
                      key={entity.id}
                      onClick={() => setEntityFilter(isActive ? null : entity.id)}
                      className="text-sm transition-colors"
                      style={{
                        color: isActive
                          ? "var(--accent)"
                          : i === 0
                            ? "var(--text-primary)"
                            : "var(--text-secondary)",
                        fontWeight: isActive || i === 0 ? 500 : 400,
                      }}
                    >
                      <span style={{ color: "var(--text-faint)", marginRight: 2 }}>
                        {entity.type === "person" || entity.type === "athlete" ? "@" : "#"}
                      </span>
                      {entity.name}
                    </button>
                  );
                })}
                {hiddenEntityCount > 0 && (
                  <span
                    className="text-xs"
                    style={{ color: "var(--text-faint)" }}
                  >
                    +{hiddenEntityCount} more
                  </span>
                )}
                {entityFilter && (
                  <button
                    onClick={() => setEntityFilter(null)}
                    className="text-xs transition-colors"
                    style={{ color: "var(--accent)" }}
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-3xl px-6 py-8">
        {/* Stories Section */}
        {filteredStories.length > 0 && (
          <section className="mb-12">
            <h2
              className="text-xs tracking-wide mb-6 pb-3 border-b"
              style={{
                color: "var(--text-faint)",
                fontFamily: "var(--font-mono)",
                borderColor: "var(--border)",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              Stories
            </h2>
            <div
              className="p-6"
              style={{ background: "var(--surface-cream)" }}
            >
              <div className="space-y-6">
                {filteredStories.map((story, storyIndex) => {
                  const isExpanded = expandedStories.has(story.id);
                  const isHighVelocity = story.combinedVelocity >= 5;

                  return (
                    <article
                      key={story.id}
                      className="feed-item"
                      style={{
                        borderLeft: "2px solid var(--border)",
                        paddingLeft: "1.5rem",
                      }}
                    >
                      <div
                        className="cursor-pointer"
                        onClick={() => toggleStory(story.id)}
                      >
                        {/* Title */}
                        <h3
                          className="text-base leading-relaxed"
                          style={{
                            color: "var(--text-primary)",
                            fontFamily: "var(--font-body)",
                            fontWeight: isHighVelocity ? 600 : 500,
                          }}
                        >
                          {story.title}
                        </h3>

                        {/* Meta */}
                        <div
                          className="mt-2 flex items-center gap-2 text-xs"
                          style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}
                        >
                          <span
                            className="tabular-nums"
                            style={{ color: isHighVelocity ? "var(--accent)" : "var(--text-muted)" }}
                          >
                            {story.linkCount} articles
                          </span>
                          <span style={{ color: "var(--border)" }}>·</span>
                          <span className="tabular-nums">
                            {story.combinedVelocity} sources
                          </span>
                          <span style={{ color: "var(--border)" }}>·</span>
                          <span className="tabular-nums">
                            {formatTime(story.lastLinkAt)}
                          </span>
                          <span
                            className="ml-auto transition-transform"
                            style={{
                              transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                              color: "var(--text-faint)",
                            }}
                          >
                            ▼
                          </span>
                        </div>
                      </div>

                      {/* Expanded Links */}
                      {isExpanded && (
                        <div className="mt-4 space-y-2">
                          {story.links.map((link) => (
                            <a
                              key={link.id}
                              href={link.canonicalUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-baseline gap-3 py-1.5 transition-colors hover:text-accent"
                              style={{ textDecoration: "none" }}
                            >
                              <span
                                className="text-xs tabular-nums shrink-0"
                                style={{
                                  color: "var(--text-faint)",
                                  fontFamily: "var(--font-mono)",
                                  width: "5rem",
                                }}
                              >
                                {link.domain}
                              </span>
                              <span
                                className="text-sm truncate"
                                style={{ color: "var(--text-secondary)" }}
                              >
                                {link.title}
                              </span>
                            </a>
                          ))}
                        </div>
                      )}

                      {/* Separator between stories */}
                      {storyIndex < filteredStories.length - 1 && (
                        <div
                          className="mt-6"
                          style={{ borderTop: "1px dashed var(--border)" }}
                        />
                      )}
                    </article>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* Latest Links Section */}
        {filteredLinks.length > 0 && (
          <section>
            <h2
              className="text-xs tracking-wide mb-6 pb-3 border-b"
              style={{
                color: "var(--text-faint)",
                fontFamily: "var(--font-mono)",
                borderColor: "var(--border)",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              Latest
            </h2>
            <div className="divide-y" style={{ borderColor: "var(--border-subtle)" }}>
              {filteredLinks.map((link, index) => {
                const isHighVelocity = link.velocity >= 5;
                return (
                  <article
                    key={link.id}
                    className="feed-item py-5"
                    style={{
                      borderColor: "var(--border-subtle)",
                    }}
                  >
                    <div className="flex items-baseline gap-4">
                      {/* Time */}
                      <time
                        className="w-12 shrink-0 text-xs tabular-nums"
                        style={{ color: "var(--text-faint)", fontFamily: "var(--font-mono)" }}
                      >
                        {formatTime(link.firstSeenAt)}
                      </time>

                      {/* Content */}
                      <div className="min-w-0 flex-1">
                        <a
                          href={link.canonicalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-base leading-snug transition-colors"
                          style={{
                            color: "var(--text-primary)",
                            textDecoration: "none",
                            fontFamily: "var(--font-body)",
                            fontWeight: isHighVelocity ? 500 : 400,
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--accent)")}
                          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-primary)")}
                        >
                          {link.title}
                        </a>
                        <div
                          className="mt-1.5 flex items-center gap-2 text-xs"
                          style={{ color: "var(--text-faint)", fontFamily: "var(--font-mono)" }}
                        >
                          <span>{link.domain}</span>
                          <span>·</span>
                          <span
                            className="tabular-nums"
                            style={{ color: isHighVelocity ? "var(--accent)" : "var(--text-faint)" }}
                          >
                            {link.velocity} {link.velocity === 1 ? "source" : "sources"}
                          </span>
                          {link.sources[0] && (
                            <>
                              <span>·</span>
                              <span>via {link.sources[0]}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {filteredStories.length === 0 && filteredLinks.length === 0 && (
          <div
            className="py-16 text-center"
            style={{ color: "var(--text-faint)" }}
          >
            <p style={{ fontFamily: "var(--font-body)" }}>
              No stories or links match the current filters.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
