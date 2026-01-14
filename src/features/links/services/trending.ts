import { prisma } from "@/lib/prisma";
import type { FeedItem, TrendingPeriod } from "@/types";
import type { LinkStatus } from "@prisma/client";

interface TrendingOptions {
  period?: TrendingPeriod;
  limit?: number;
  offset?: number;
  category?: string;
  domain?: string;
}

interface TrendingResult {
  items: FeedItem[];
  total: number;
  hasMore: boolean;
}

// Get date threshold based on period
function getDateThreshold(period: TrendingPeriod): Date | null {
  const now = new Date();

  switch (period) {
    case "day":
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    case "week":
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case "month":
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case "all":
    default:
      return null;
  }
}

// Calculate recency weight for scoring
function getRecencyWeight(createdAt: Date): number {
  const now = new Date();
  const ageMs = now.getTime() - createdAt.getTime();
  const ageHours = ageMs / (1000 * 60 * 60);

  if (ageHours < 24) return 3; // 3x for last 24 hours
  if (ageHours < 168) return 1.5; // 1.5x for last week
  return 1;
}

export async function getTrendingLinks(
  options: TrendingOptions = {}
): Promise<TrendingResult> {
  const {
    period = "day",
    limit = 20,
    offset = 0,
    category,
    domain,
  } = options;

  const dateThreshold = getDateThreshold(period);

  const approvedStatuses: LinkStatus[] = ["APPROVED", "FEATURED"];
  const where = {
    status: { in: approvedStatuses },
    ...(dateThreshold && { createdAt: { gte: dateThreshold } }),
    ...(domain && { domain }),
  };

  const [links, total] = await Promise.all([
    prisma.link.findMany({
      where,
      include: {
        submitter: {
          select: { id: true, name: true },
        },
        tags: {
          include: { tag: true },
        },
        _count: {
          select: { comments: true, mentions: true, votes: true },
        },
      },
      orderBy: [{ score: "desc" }, { createdAt: "desc" }],
      skip: offset,
      take: limit,
    }),
    prisma.link.count({ where }),
  ]);

  // Apply recency weighting to sort
  const weightedLinks = links
    .map((link) => ({
      link,
      weightedScore: link.score * getRecencyWeight(link.createdAt),
    }))
    .sort((a, b) => b.weightedScore - a.weightedScore);

  const items: FeedItem[] = weightedLinks.map(({ link }) => ({
    id: link.id,
    url: link.url,
    title: link.title,
    description: link.description,
    domain: link.domain,
    aiSummary: link.aiSummary,
    score: link.score,
    status: link.status,
    firstSeenAt: link.firstSeenAt,
    createdAt: link.createdAt,
    submitter: link.submitter,
    tags: link.tags.map((t) => t.tag.name),
    commentCount: link._count.comments,
    mentionCount: link._count.mentions,
  }));

  return {
    items,
    total,
    hasMore: offset + limit < total,
  };
}

export async function getTopDomains(period: TrendingPeriod = "week", limit = 10) {
  const dateThreshold = getDateThreshold(period);
  const approvedStatuses: LinkStatus[] = ["APPROVED", "FEATURED"];

  const links = await prisma.link.groupBy({
    by: ["domain"],
    where: {
      status: { in: approvedStatuses },
      ...(dateThreshold && { createdAt: { gte: dateThreshold } }),
    },
    _count: { id: true },
    _sum: { score: true },
    orderBy: { _count: { id: "desc" } },
    take: limit,
  });

  return links.map((item) => ({
    domain: item.domain,
    linkCount: item._count.id,
    totalScore: item._sum.score || 0,
  }));
}

export async function searchLinks(
  query: string,
  options: { limit?: number; offset?: number } = {}
): Promise<TrendingResult> {
  const { limit = 20, offset = 0 } = options;
  const approvedStatuses: LinkStatus[] = ["APPROVED", "FEATURED"];

  const where = {
    status: { in: approvedStatuses },
    OR: [
      { title: { contains: query, mode: "insensitive" as const } },
      { description: { contains: query, mode: "insensitive" as const } },
      { aiSummary: { contains: query, mode: "insensitive" as const } },
      { domain: { contains: query, mode: "insensitive" as const } },
    ],
  };

  const [links, total] = await Promise.all([
    prisma.link.findMany({
      where,
      include: {
        submitter: {
          select: { id: true, name: true },
        },
        tags: {
          include: { tag: true },
        },
        _count: {
          select: { comments: true, mentions: true },
        },
      },
      orderBy: [{ score: "desc" }, { createdAt: "desc" }],
      skip: offset,
      take: limit,
    }),
    prisma.link.count({ where }),
  ]);

  const items: FeedItem[] = links.map((link) => ({
    id: link.id,
    url: link.url,
    title: link.title,
    description: link.description,
    domain: link.domain,
    aiSummary: link.aiSummary,
    score: link.score,
    status: link.status,
    firstSeenAt: link.firstSeenAt,
    createdAt: link.createdAt,
    submitter: link.submitter,
    tags: link.tags.map((t) => t.tag.name),
    commentCount: link._count.comments,
    mentionCount: link._count.mentions,
  }));

  return {
    items,
    total,
    hasMore: offset + limit < total,
  };
}

// Recalculate all link scores based on mentions
export async function recalculateScores(): Promise<number> {
  const links = await prisma.link.findMany({
    include: {
      _count: {
        select: { mentions: true, votes: true },
      },
    },
  });

  let updated = 0;

  for (const link of links) {
    // Base score from votes + bonus from mentions
    const mentionBonus = link._count.mentions * 2;
    const recencyWeight = getRecencyWeight(link.createdAt);
    const newScore = Math.max(1, link.score) + mentionBonus;

    await prisma.link.update({
      where: { id: link.id },
      data: { score: newScore },
    });

    updated++;
  }

  return updated;
}
