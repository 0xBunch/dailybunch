/**
 * Dashboard - Latest Feed
 *
 * Chronological view with velocity + category filters.
 */

import prisma from "@/lib/db";
import { getDisplayTitle } from "@/lib/title-utils";
import { DashboardClient } from "./DashboardClient";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // Get latest links with their sources
  const latestLinks = await prisma.link.findMany({
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
  });

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

  return <DashboardClient links={links} categories={categories} />;
}
