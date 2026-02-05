/**
 * Story Clustering Service
 *
 * Groups related links into stories using embedding similarity.
 * Stories represent a single narrative with multiple sources/perspectives.
 */

import prisma from "@/lib/db";
import { log } from "@/lib/logger";
import { decodeHtmlEntities, stripPublicationSuffix } from "@/lib/title-utils";

/**
 * Cosine similarity between two embedding vectors
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? 0 : dotProduct / denominator;
}

/**
 * Parse embedding from JSON string
 */
function parseEmbedding(embeddingJson: string | null): number[] | null {
  if (!embeddingJson) return null;
  try {
    const parsed = JSON.parse(embeddingJson);
    if (Array.isArray(parsed) && parsed.every((n) => typeof n === "number")) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

interface ClusterableLink {
  id: string;
  title: string;
  embedding: number[];
  velocity: number;
  firstSeenAt: Date;
}

interface LinkCluster {
  links: ClusterableLink[];
  centroid: number[];
  representativeTitle: string;
}

/**
 * Single-linkage clustering with similarity threshold
 */
function clusterLinks(
  links: ClusterableLink[],
  similarityThreshold: number = 0.8
): LinkCluster[] {
  const clusters: LinkCluster[] = [];
  const assigned = new Set<string>();

  // Sort by velocity (high velocity links are cluster seeds)
  const sortedLinks = [...links].sort((a, b) => b.velocity - a.velocity);

  for (const link of sortedLinks) {
    if (assigned.has(link.id)) continue;

    // Start a new cluster with this link
    const cluster: ClusterableLink[] = [link];
    assigned.add(link.id);

    // Find all similar unassigned links
    for (const other of sortedLinks) {
      if (assigned.has(other.id)) continue;

      // Check similarity with any link in the cluster
      for (const clusterLink of cluster) {
        const similarity = cosineSimilarity(clusterLink.embedding, other.embedding);
        if (similarity >= similarityThreshold) {
          cluster.push(other);
          assigned.add(other.id);
          break;
        }
      }
    }

    // Only create cluster if it has 2+ links
    if (cluster.length >= 2) {
      // Calculate centroid
      const centroid = new Array(cluster[0].embedding.length).fill(0);
      for (const l of cluster) {
        for (let i = 0; i < l.embedding.length; i++) {
          centroid[i] += l.embedding[i] / cluster.length;
        }
      }

      clusters.push({
        links: cluster,
        centroid,
        representativeTitle: stripPublicationSuffix(decodeHtmlEntities(cluster[0].title)), // Clean title from highest velocity link
      });
    }
  }

  return clusters;
}

/**
 * Run clustering on recent links and update Story model
 */
export async function runClustering(): Promise<{
  processed: number;
  clustersCreated: number;
  linksGrouped: number;
}> {
  const op = log.operationStart("clustering", "runClustering");

  // Get recent links with embeddings (last 7 days)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const links = await prisma.link.findMany({
    where: {
      isBlocked: false,
      embedding: { not: null },
      firstSeenAt: { gte: sevenDaysAgo },
      OR: [{ title: { not: null } }, { fallbackTitle: { not: null } }],
    },
    select: {
      id: true,
      title: true,
      fallbackTitle: true,
      embedding: true,
      firstSeenAt: true,
    },
  });

  // Get velocity (mention count) for each link
  const mentionCounts = await prisma.mention.groupBy({
    by: ["linkId"],
    where: { linkId: { in: links.map((l) => l.id) } },
    _count: { id: true },
  });

  const velocityMap = new Map(mentionCounts.map((m) => [m.linkId, m._count.id]));

  // Filter to links with valid embeddings
  const clusterableLinks: ClusterableLink[] = links
    .map((l) => ({
      id: l.id,
      title: l.title || l.fallbackTitle || "",
      embedding: parseEmbedding(l.embedding),
      velocity: velocityMap.get(l.id) || 1,
      firstSeenAt: l.firstSeenAt,
    }))
    .filter((l): l is ClusterableLink => l.embedding !== null && l.title !== "");

  if (clusterableLinks.length < 2) {
    op.end({ processed: 0, clustersCreated: 0, linksGrouped: 0 });
    return { processed: 0, clustersCreated: 0, linksGrouped: 0 };
  }

  // Run clustering
  const clusters = clusterLinks(clusterableLinks, 0.8);

  let clustersCreated = 0;
  let linksGrouped = 0;

  // Create/update stories
  for (const cluster of clusters) {
    // Check if any links in this cluster are already in a story
    const existingStoryLinks = await prisma.storyLink.findMany({
      where: { linkId: { in: cluster.links.map((l) => l.id) } },
      select: { storyId: true, linkId: true },
    });

    const existingStoryIds = [...new Set(existingStoryLinks.map((sl) => sl.storyId))];
    const alreadyAssigned = new Set(existingStoryLinks.map((sl) => sl.linkId));

    // New links that need assignment
    const newLinks = cluster.links.filter((l) => !alreadyAssigned.has(l.id));

    if (newLinks.length === 0) continue;

    let storyId: string;

    if (existingStoryIds.length > 0) {
      // Add to existing story
      storyId = existingStoryIds[0];

      // Update story timestamps
      const firstLinkAt = new Date(
        Math.min(...cluster.links.map((l) => l.firstSeenAt.getTime()))
      );
      const lastLinkAt = new Date(
        Math.max(...cluster.links.map((l) => l.firstSeenAt.getTime()))
      );

      await prisma.story.update({
        where: { id: storyId },
        data: {
          firstLinkAt: { set: firstLinkAt },
          lastLinkAt,
        },
      });
    } else {
      // Create new story
      const firstLinkAt = new Date(
        Math.min(...cluster.links.map((l) => l.firstSeenAt.getTime()))
      );
      const lastLinkAt = new Date(
        Math.max(...cluster.links.map((l) => l.firstSeenAt.getTime()))
      );

      const story = await prisma.story.create({
        data: {
          title: cluster.representativeTitle,
          status: "active",
          firstLinkAt,
          lastLinkAt,
        },
      });

      storyId = story.id;
      clustersCreated++;
    }

    // Add new links to story
    for (const link of newLinks) {
      try {
        await prisma.storyLink.create({
          data: {
            storyId,
            linkId: link.id,
          },
        });
        linksGrouped++;
      } catch {
        // Link might already be in another story (unique constraint)
      }
    }
  }

  log.info("Clustering complete", {
    service: "clustering",
    operation: "runClustering",
    processed: clusterableLinks.length,
    clustersCreated,
    linksGrouped,
  });

  op.end({ processed: clusterableLinks.length, clustersCreated, linksGrouped });
  return { processed: clusterableLinks.length, clustersCreated, linksGrouped };
}

/**
 * Get stories with their links
 */
export async function getStories(limit = 20): Promise<
  Array<{
    id: string;
    title: string;
    narrative: string | null;
    linkCount: number;
    combinedVelocity: number;
    firstLinkAt: Date;
    lastLinkAt: Date;
    links: Array<{
      id: string;
      title: string | null;
      domain: string;
      velocity: number;
    }>;
  }>
> {
  const stories = await prisma.story.findMany({
    where: { status: "active" },
    orderBy: { lastLinkAt: "desc" },
    take: limit,
    include: {
      links: {
        include: {
          link: {
            select: {
              id: true,
              title: true,
              fallbackTitle: true,
              domain: true,
              canonicalUrl: true,
            },
          },
        },
      },
    },
  });

  // Get velocity for each link
  const allLinkIds = stories.flatMap((s) => s.links.map((sl) => sl.linkId));
  const mentionCounts = await prisma.mention.groupBy({
    by: ["linkId"],
    where: { linkId: { in: allLinkIds } },
    _count: { id: true },
  });

  const velocityMap = new Map(mentionCounts.map((m) => [m.linkId, m._count.id]));

  return stories.map((story) => {
    const links = story.links.map((sl) => ({
      id: sl.link.id,
      title: sl.link.title || sl.link.fallbackTitle,
      domain: sl.link.domain,
      velocity: velocityMap.get(sl.linkId) || 1,
    }));

    return {
      id: story.id,
      title: story.title,
      narrative: story.narrative,
      linkCount: links.length,
      combinedVelocity: links.reduce((sum, l) => sum + l.velocity, 0),
      firstLinkAt: story.firstLinkAt,
      lastLinkAt: story.lastLinkAt,
      links,
    };
  });
}
