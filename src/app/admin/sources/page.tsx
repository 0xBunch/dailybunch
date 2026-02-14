/**
 * Sources Admin Page
 *
 * Server component that fetches source data with activity metrics
 * and renders the interactive SourcesClient.
 */

import prisma from "@/lib/db";
import Link from "next/link";
import { SourcesClient } from "./SourcesClient";

export const dynamic = "force-dynamic";

// Calculate health score (0-100)
function calculateHealthScore(source: {
  active: boolean;
  consecutiveErrors: number;
  lastFetchedAt: Date | null;
  recentItemCount: number;
  recentMentionCount: number;
}): number {
  if (!source.active) return 0;

  let score = 100;

  // Error penalty (up to -40)
  score -= Math.min(source.consecutiveErrors * 15, 40);

  // Freshness penalty (up to -30)
  if (source.lastFetchedAt) {
    const hoursSinceLastFetch = (Date.now() - source.lastFetchedAt.getTime()) / (1000 * 60 * 60);
    if (hoursSinceLastFetch > 24) score -= 10;
    if (hoursSinceLastFetch > 72) score -= 10;
    if (hoursSinceLastFetch > 168) score -= 10;
  } else {
    score -= 30;
  }

  // Activity bonus (up to +10) or penalty (up to -20)
  if (source.recentItemCount === 0 && source.recentMentionCount === 0) {
    score -= 20;
  } else if (source.recentMentionCount > 10) {
    score += 10;
  }

  return Math.max(0, Math.min(100, score));
}

export default async function SourcesAdminPage() {
  // Get date ranges for activity calculation
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Fetch sources with counts
  const sources = await prisma.source.findMany({
    orderBy: [{ active: "desc" }, { name: "asc" }],
    include: {
      category: true,
      categories: {
        include: {
          category: true,
        },
      },
      _count: {
        select: { mentions: true, sourceItems: true },
      },
    },
  });

  // Fetch categories
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
  });

  // Fetch recent sourceItems for activity sparklines
  const recentItems = await prisma.sourceItem.findMany({
    where: {
      createdAt: { gte: sevenDaysAgo },
    },
    select: {
      sourceId: true,
      createdAt: true,
    },
  });

  // Group items by source and day
  const activityBySource = new Map<string, number[]>();
  for (const source of sources) {
    activityBySource.set(source.id, [0, 0, 0, 0, 0, 0, 0]);
  }

  for (const item of recentItems) {
    const dayIndex = Math.floor((now.getTime() - item.createdAt.getTime()) / (24 * 60 * 60 * 1000));
    if (dayIndex >= 0 && dayIndex < 7) {
      const activity = activityBySource.get(item.sourceId);
      if (activity) {
        activity[6 - dayIndex]++; // Reverse so most recent is last
      }
    }
  }

  // Fetch recent mention counts for health scoring
  const recentMentions = await prisma.mention.groupBy({
    by: ["sourceId"],
    where: {
      seenAt: { gte: sevenDaysAgo },
    },
    _count: true,
  });

  const mentionCountBySource = new Map<string, number>();
  for (const m of recentMentions) {
    mentionCountBySource.set(m.sourceId, m._count);
  }

  // Process sources with activity and health
  const processedSources = sources.map((source) => {
    const recentActivity = activityBySource.get(source.id) || [0, 0, 0, 0, 0, 0, 0];
    const recentItemCount = recentActivity.reduce((a, b) => a + b, 0);
    const recentMentionCount = mentionCountBySource.get(source.id) || 0;

    const healthScore = calculateHealthScore({
      active: source.active,
      consecutiveErrors: source.consecutiveErrors,
      lastFetchedAt: source.lastFetchedAt,
      recentItemCount,
      recentMentionCount,
    });

    return {
      id: source.id,
      name: source.name,
      type: source.type,
      url: source.url,
      baseDomain: source.baseDomain,
      active: source.active,
      tier: source.tier,
      pollFrequency: source.pollFrequency,
      showOnDashboard: source.showOnDashboard,
      includeOwnLinks: source.includeOwnLinks,
      lastFetchedAt: source.lastFetchedAt?.toISOString() || null,
      lastError: source.lastError,
      consecutiveErrors: source.consecutiveErrors,
      tags: source.tags,
      categoryId: source.categoryId,
      category: source.category,
      categories: source.categories.map((sc) => ({
        id: sc.id,
        categoryId: sc.categoryId,
        category: sc.category,
      })),
      _count: source._count,
      recentActivity,
      healthScore,
    };
  });

  // Calculate stats
  const stats = {
    total: sources.length,
    active: sources.filter((s) => s.active).length,
    errors: sources.filter((s) => s.consecutiveErrors >= 3).length,
    quiet: processedSources.filter(
      (s) => s.active && s.recentActivity.reduce((a, b) => a + b, 0) === 0
    ).length,
  };

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
            <span style={{ color: "var(--ink)", fontWeight: 500 }}>Sources</span>
          </nav>
        </div>
      </header>

      <SourcesClient
        sources={processedSources}
        categories={categories}
        stats={stats}
      />
    </div>
  );
}
