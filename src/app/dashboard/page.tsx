/**
 * Dashboard - Latest Feed
 *
 * Chronological view with velocity + category filters.
 * Shows rising entities for trend tracking.
 */

import prisma from "@/lib/db";
import { getDisplayTitle } from "@/lib/title-utils";
import { getRisingEntities } from "@/lib/trends";
import { DashboardClient } from "./DashboardClient";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // Fetch links and entities in parallel
  const [latestLinks, risingEntitiesData] = await Promise.all([
    prisma.link.findMany({
    where: {
      isBlocked: false,
      firstSeenAt: { gte: twentyFourHoursAgo },
      OR: [
        { title: { not: null } },
        { fallbackTitle: { not: null } },
      ],
    },
    include: {
      mentions: {
        include: {
          source: {
            select: { name: true, showOnDashboard: true },
          },
        },
        orderBy: { seenAt: "desc" },
      },
      category: { select: { name: true } },
    },
      orderBy: { firstSeenAt: "desc" },
      take: 150,
    }),
    getRisingEntities(10),
  ]);

  // Process links
  const links = latestLinks.map((link) => {
    const sources = [...new Set(
      link.mentions
        .filter((m) => m.source.showOnDashboard)
        .map((m) => m.source.name)
    )];

    return {
      id: link.id,
      title: getDisplayTitle({
        title: link.title,
        fallbackTitle: link.fallbackTitle,
        canonicalUrl: link.canonicalUrl,
        domain: link.domain,
      }).text,
      canonicalUrl: link.canonicalUrl,
      domain: link.domain,
      category: link.category?.name || null,
      velocity: sources.length,
      sources,
      firstSeenAt: link.firstSeenAt.toISOString(),
      mediaType: link.mediaType,
    };
  });

  // Get unique categories that have links
  const categories = [...new Set(links.map((l) => l.category).filter(Boolean))] as string[];

  // Format entities
  const entities = risingEntitiesData.map((e) => ({
    id: e.id,
    name: e.name,
    type: e.type,
    velocityWeek: e.velocityWeek,
  }));

  return <DashboardClient links={links} categories={categories} entities={entities} />;
}
