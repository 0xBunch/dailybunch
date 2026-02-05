/**
 * Dashboard - Hybrid Stories + Links View
 *
 * Shows AI-clustered Stories prominently at top, ungrouped links below.
 * Stories are grouped by embedding similarity (semantic understanding).
 */

import prisma from "@/lib/db";
import { getDisplayTitle, decodeHtmlEntities, stripPublicationSuffix, isBlockedTitle } from "@/lib/title-utils";
import { getRisingEntities } from "@/lib/trends";

/**
 * Check if a title looks like garbage (random strings, too long, etc.)
 */
function isGarbageTitle(title: string): boolean {
  // Too long (likely garbage data)
  if (title.length > 200) return true;
  // Looks like random alphanumeric string (no spaces, very long)
  if (title.length > 50 && !title.includes(" ")) return true;
  // Contains suspicious patterns
  if (/^[a-z0-9]{30,}$/i.test(title)) return true;
  return false;
}
import { DashboardClient } from "./DashboardClient";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);

  // Fetch stories, links, and entities in parallel
  const [stories, latestLinks, risingEntitiesData] = await Promise.all([
    // Get recent stories with their grouped links
    prisma.story.findMany({
      where: {
        status: "active",
        lastLinkAt: { gte: fortyEightHoursAgo },
      },
      orderBy: { lastLinkAt: "desc" },
      take: 30,
      include: {
        links: {
          include: {
            link: {
              select: {
                id: true,
                title: true,
                fallbackTitle: true,
                canonicalUrl: true,
                domain: true,
                firstSeenAt: true,
                categoryId: true,
              },
            },
          },
        },
      },
    }),
    // Get all recent links (we'll filter out story-grouped ones)
    prisma.link.findMany({
      where: {
        isBlocked: false,
        firstSeenAt: { gte: fortyEightHoursAgo },
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
        entities: {
          select: { entityId: true },
        },
        storyLinks: { select: { storyId: true } },
      },
      orderBy: { firstSeenAt: "desc" },
      take: 300,
    }),
    getRisingEntities(10),
  ]);

  // Get link IDs that are in stories
  const linksInStories = new Set(
    stories.flatMap(s => s.links.map(sl => sl.link.id))
  );

  // Get velocity (source count) for story links
  const storyLinkIds = [...linksInStories];
  const storyMentions = await prisma.mention.groupBy({
    by: ["linkId"],
    where: {
      linkId: { in: storyLinkIds },
      source: { showOnDashboard: true },
    },
    _count: { sourceId: true },
  });
  const storyVelocityMap = new Map(storyMentions.map(m => [m.linkId, m._count.sourceId]));

  // Process stories into display format
  const processedStories = stories
    .map((story) => {
      const storyLinks = story.links.map((sl) => ({
        id: sl.link.id,
        title: getDisplayTitle({
          title: sl.link.title,
          fallbackTitle: sl.link.fallbackTitle,
          canonicalUrl: sl.link.canonicalUrl,
          domain: sl.link.domain,
        }).text,
        domain: sl.link.domain,
        canonicalUrl: sl.link.canonicalUrl,
        velocity: storyVelocityMap.get(sl.link.id) || 1,
      }));

      // Combined velocity = unique sources across all links
      const combinedVelocity = storyLinks.reduce((sum, l) => sum + l.velocity, 0);

      // Clean the story title
      const cleanedTitle = stripPublicationSuffix(decodeHtmlEntities(story.title));

      return {
        id: story.id,
        title: cleanedTitle,
        linkCount: storyLinks.length,
        combinedVelocity,
        domains: [...new Set(storyLinks.map(l => l.domain))],
        primaryLink: storyLinks[0],
        links: storyLinks,
        lastLinkAt: story.lastLinkAt.toISOString(),
      };
    })
    // Filter out stories with garbage or blocked titles
    .filter((story) => {
      if (isBlockedTitle(story.title)) return false;
      if (isGarbageTitle(story.title)) return false;
      return true;
    });

  // Sort stories by combined velocity
  processedStories.sort((a, b) => b.combinedVelocity - a.combinedVelocity);

  // Process ungrouped links (not in any story)
  const ungroupedLinks = latestLinks
    .filter((link) => !linksInStories.has(link.id))
    .map((link) => {
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
        entityIds: link.entities.map((e) => e.entityId),
      };
    });

  // Sort ungrouped by velocity, then recency
  ungroupedLinks.sort((a, b) => {
    if (b.velocity !== a.velocity) return b.velocity - a.velocity;
    return new Date(b.firstSeenAt).getTime() - new Date(a.firstSeenAt).getTime();
  });

  // Get unique categories
  const categories = [...new Set(ungroupedLinks.map((l) => l.category).filter(Boolean))] as string[];

  // Format entities
  const entities = risingEntitiesData.map((e) => ({
    id: e.id,
    name: e.name,
    type: e.type,
    velocityWeek: e.velocityWeek,
  }));

  return (
    <DashboardClient
      stories={processedStories}
      links={ungroupedLinks}
      categories={categories}
      entities={entities}
    />
  );
}
