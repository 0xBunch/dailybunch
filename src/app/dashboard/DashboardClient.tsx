"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

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

interface LinkItem {
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
  links: LinkItem[];
  categories: string[];
  entities: Entity[];
}

type VelocityFilter = "all" | "v2+" | "v5+";

const velocityLabels: Record<VelocityFilter, string> = {
  all: "All",
  "v2+": "2+",
  "v5+": "5+",
};

export function DashboardClient({ stories, links, categories, entities }: DashboardClientProps) {
  const [velocityFilter, setVelocityFilter] = useState<VelocityFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [entityFilter, setEntityFilter] = useState<string | null>(null);
  const [expandedStories, setExpandedStories] = useState<Set<string>>(new Set());

  const filteredStories = useMemo(() => {
    return stories.filter((story) => {
      if (velocityFilter === "v2+" && story.combinedVelocity < 2) return false;
      if (velocityFilter === "v5+" && story.combinedVelocity < 5) return false;
      return true;
    });
  }, [stories, velocityFilter]);

  const filteredLinks = useMemo(() => {
    return links.filter((link) => {
      if (velocityFilter === "v2+" && link.velocity < 2) return false;
      if (velocityFilter === "v5+" && link.velocity < 5) return false;
      if (categoryFilter && link.category !== categoryFilter) return false;
      if (entityFilter && !link.entityIds.includes(entityFilter)) return false;
      return true;
    });
  }, [links, velocityFilter, categoryFilter, entityFilter]);

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

  const visibleEntities = entities.slice(0, 5);
  const hiddenEntityCount = Math.max(0, entities.length - 5);
  const selectedEntity = entities.find((e) => e.id === entityFilter);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--background)" }}>
      {/* Header */}
      <header
        className="sticky top-0 z-10 border-b"
        style={{ background: "var(--background)", borderColor: "var(--border)" }}
      >
        <div className="mx-auto max-w-3xl px-6 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="text-lg tracking-tight link-plain"
            style={{ fontFamily: "var(--font-headline)", fontWeight: 600 }}
          >
            Daily Bunch
          </Link>
          <nav className="flex items-center gap-6 text-sm">
            <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>Trending</span>
            <Link href="/links" className="link-muted">Latest</Link>
            <Link href="/admin" className="link-muted">Admin</Link>
          </nav>
        </div>
      </header>

      {/* Filter bar */}
      <div
        className="border-b"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <div className="mx-auto max-w-3xl px-6 py-3 flex items-center gap-8">
          {/* Velocity */}
          <div className="flex items-center gap-1">
            <span
              className="text-xs mr-2"
              style={{ color: "var(--text-faint)", fontFamily: "var(--font-mono)" }}
            >
              SOURCES
            </span>
            {(["all", "v2+", "v5+"] as VelocityFilter[]).map((filter) => {
              const isActive = velocityFilter === filter;
              return (
                <button
                  key={filter}
                  onClick={() => setVelocityFilter(filter)}
                  className="filter-btn"
                  data-active={isActive}
                >
                  {velocityLabels[filter]}
                </button>
              );
            })}
          </div>

          {/* Categories */}
          <div className="flex items-center gap-1">
            <span
              className="text-xs mr-2"
              style={{ color: "var(--text-faint)", fontFamily: "var(--font-mono)" }}
            >
              CATEGORY
            </span>
            <button
              onClick={() => setCategoryFilter(null)}
              className="filter-btn"
              data-active={categoryFilter === null}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(categoryFilter === cat ? null : cat)}
                className="filter-btn"
                data-active={categoryFilter === cat}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Entities bar */}
      {entities.length > 0 && (
        <div
          className="border-b"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="mx-auto max-w-3xl px-6 py-3 flex items-center gap-4">
            <span
              className="text-xs"
              style={{ color: "var(--text-faint)", fontFamily: "var(--font-mono)" }}
            >
              TRENDING
            </span>
            <div className="flex items-center gap-4">
              {visibleEntities.map((entity, i) => {
                const isActive = entityFilter === entity.id;
                return (
                  <button
                    key={entity.id}
                    onClick={() => setEntityFilter(isActive ? null : entity.id)}
                    className="entity-btn"
                    data-active={isActive}
                    data-first={i === 0}
                  >
                    {entity.name}
                  </button>
                );
              })}
              {hiddenEntityCount > 0 && (
                <span className="text-xs" style={{ color: "var(--text-faint)" }}>
                  +{hiddenEntityCount}
                </span>
              )}
            </div>
            {selectedEntity && (
              <button
                onClick={() => setEntityFilter(null)}
                className="ml-auto text-xs"
                style={{ color: "var(--accent)" }}
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 mx-auto max-w-3xl w-full px-6 py-8">
        {/* Stories */}
        {filteredStories.length > 0 && (
          <section className="mb-12">
            <h2 className="section-header">Stories</h2>
            <div className="space-y-1">
              {filteredStories.map((story) => {
                const isExpanded = expandedStories.has(story.id);
                const isHot = story.combinedVelocity >= 5;

                return (
                  <article key={story.id} className="feed-item story-item" data-hot={isHot}>
                    <div
                      className="story-header"
                      onClick={() => toggleStory(story.id)}
                    >
                      <div className="story-meta">
                        <span className="story-count" data-hot={isHot}>
                          {story.combinedVelocity}
                        </span>
                      </div>
                      <div className="story-content">
                        <h3 className="story-title">{story.title}</h3>
                        <div className="story-subtitle">
                          {story.linkCount} articles
                        </div>
                      </div>
                      <div className="story-time">{formatTime(story.lastLinkAt)}</div>
                      <div className="story-chevron" data-expanded={isExpanded}>
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M2 4L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="story-links">
                        {story.links.map((link) => (
                          <a
                            key={link.id}
                            href={link.canonicalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="story-link"
                          >
                            <span className="story-link-domain">{link.domain}</span>
                            <span className="story-link-title">{link.title}</span>
                          </a>
                        ))}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {/* Links */}
        {filteredLinks.length > 0 && (
          <section>
            <h2 className="section-header">Latest</h2>
            <div>
              {filteredLinks.map((link) => {
                const isHot = link.velocity >= 5;
                return (
                  <article key={link.id} className="feed-item link-item" data-hot={isHot}>
                    <time className="link-time">{formatTime(link.firstSeenAt)}</time>
                    <div className="link-content">
                      <a
                        href={link.canonicalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="link-title"
                      >
                        {link.title}
                      </a>
                      <div className="link-meta">
                        <span>{link.domain}</span>
                        <span className="link-sources" data-hot={isHot}>
                          {link.velocity} {link.velocity === 1 ? "source" : "sources"}
                        </span>
                        {link.sources[0] && <span>{link.sources[0]}</span>}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {filteredStories.length === 0 && filteredLinks.length === 0 && (
          <div className="py-16 text-center" style={{ color: "var(--text-faint)" }}>
            No results match the current filters.
          </div>
        )}
      </main>

      {/* Footer */}
      <footer
        className="border-t mt-auto"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="mx-auto max-w-3xl px-6 py-6 text-center">
          <p className="text-xs" style={{ color: "var(--text-faint)", fontFamily: "var(--font-mono)" }}>
            Daily Bunch tracks what tastemakers are pointing at.
          </p>
        </div>
      </footer>
    </div>
  );
}
