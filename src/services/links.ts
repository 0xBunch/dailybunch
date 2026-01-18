import { prisma } from "@/lib/prisma";
import { canonicalizeUrl, CanonicalizedLink } from "./canonicalize";

export interface ProcessedLink {
  id: string;
  url: string;
  canonicalUrl: string;
  domain: string;
  isNew: boolean;
  isBlacklisted: boolean;
}

/**
 * Process a link - canonicalize, store, and create mention
 */
export async function processLink(
  originalUrl: string,
  sourceId: string,
  context?: string
): Promise<ProcessedLink | null> {
  // Canonicalize the URL
  const canonicalized = await canonicalizeUrl(originalUrl);

  // Skip blacklisted domains
  if (canonicalized.isBlacklisted) {
    return {
      id: "",
      url: originalUrl,
      canonicalUrl: canonicalized.canonicalUrl,
      domain: canonicalized.domain,
      isNew: false,
      isBlacklisted: true,
    };
  }

  // Check if link already exists
  let link = await prisma.link.findUnique({
    where: { canonicalUrl: canonicalized.canonicalUrl },
  });

  const isNew = !link;

  // Create link if new
  if (!link) {
    link = await prisma.link.create({
      data: {
        url: originalUrl,
        canonicalUrl: canonicalized.canonicalUrl,
        domain: canonicalized.domain,
      },
    });
  }

  // Create or update mention (upsert to handle duplicates)
  await prisma.mention.upsert({
    where: {
      linkId_sourceId: {
        linkId: link.id,
        sourceId: sourceId,
      },
    },
    create: {
      linkId: link.id,
      sourceId: sourceId,
      context: context?.slice(0, 500), // Limit context length
    },
    update: {
      seenAt: new Date(),
      context: context?.slice(0, 500),
    },
  });

  return {
    id: link.id,
    url: link.url,
    canonicalUrl: link.canonicalUrl,
    domain: link.domain,
    isNew,
    isBlacklisted: false,
  };
}

/**
 * Process multiple links from a source
 */
export async function processLinksFromSource(
  links: Array<{ url: string; context?: string }>,
  sourceId: string
): Promise<{
  total: number;
  new: number;
  existing: number;
  blacklisted: number;
}> {
  let newCount = 0;
  let existingCount = 0;
  let blacklistedCount = 0;

  for (const { url, context } of links) {
    try {
      const result = await processLink(url, sourceId, context);
      if (result) {
        if (result.isBlacklisted) {
          blacklistedCount++;
        } else if (result.isNew) {
          newCount++;
        } else {
          existingCount++;
        }
      }
    } catch (error) {
      console.error(`Error processing link ${url}:`, error);
    }
  }

  return {
    total: links.length,
    new: newCount,
    existing: existingCount,
    blacklisted: blacklistedCount,
  };
}

/**
 * Get links with velocity scores (mention count in time window)
 */
export async function getLinksWithVelocity(
  options: {
    hours?: number;
    categoryId?: string;
    entityId?: string;
    limit?: number;
    offset?: number;
  } = {}
) {
  const { hours = 24, categoryId, entityId, limit = 50, offset = 0 } = options;

  const since = new Date(Date.now() - hours * 60 * 60 * 1000);

  // Build where clause
  const where: Record<string, unknown> = {
    mentions: {
      some: {
        seenAt: { gte: since },
      },
    },
  };

  if (categoryId) {
    where.categoryId = categoryId;
  }

  if (entityId) {
    where.entities = {
      some: {
        entityId,
      },
    };
  }

  // Get links with mention counts
  const links = await prisma.link.findMany({
    where,
    include: {
      mentions: {
        where: {
          seenAt: { gte: since },
        },
        include: {
          source: {
            select: {
              id: true,
              name: true,
              type: true,
            },
          },
        },
      },
      category: true,
      subcategory: true,
      entities: {
        include: {
          entity: true,
        },
      },
    },
    orderBy: {
      firstSeenAt: "desc",
    },
    take: limit,
    skip: offset,
  });

  // Add velocity score (mention count)
  return links.map((link) => ({
    ...link,
    velocity: link.mentions.length,
    sources: link.mentions.map((m) => m.source),
  }));
}

/**
 * Get link by ID with full details
 */
export async function getLinkById(id: string) {
  return prisma.link.findUnique({
    where: { id },
    include: {
      mentions: {
        include: {
          source: true,
        },
        orderBy: {
          seenAt: "desc",
        },
      },
      category: true,
      subcategory: true,
      entities: {
        include: {
          entity: true,
        },
      },
    },
  });
}
