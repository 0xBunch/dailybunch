import { prisma } from "@/lib/prisma";
import { enrichLink as aiEnrichLink } from "@/lib/anthropic";
import { slugify } from "@/lib/utils";

interface EnrichmentResult {
  linkId: string;
  success: boolean;
  error?: string;
}

// Enrich a single link with AI
export async function enrichSingleLink(linkId: string): Promise<EnrichmentResult> {
  try {
    const link = await prisma.link.findUnique({
      where: { id: linkId },
    });

    if (!link) {
      return { linkId, success: false, error: "Link not found" };
    }

    // Call AI enrichment
    const enrichment = await aiEnrichLink(
      link.url,
      link.title,
      link.description || undefined
    );

    // Update link with enriched data
    await prisma.link.update({
      where: { id: linkId },
      data: {
        aiSummary: enrichment.summary,
      },
    });

    // Add tags if they don't exist
    for (const tagName of enrichment.tags) {
      const slug = slugify(tagName);

      // Upsert tag
      const tag = await prisma.tag.upsert({
        where: { slug },
        create: {
          name: tagName,
          slug,
        },
        update: {},
      });

      // Link tag to link
      await prisma.tagsOnLinks.upsert({
        where: {
          linkId_tagId: {
            linkId,
            tagId: tag.id,
          },
        },
        create: {
          linkId,
          tagId: tag.id,
        },
        update: {},
      });
    }

    return { linkId, success: true };
  } catch (error) {
    console.error(`Error enriching link ${linkId}:`, error);
    return {
      linkId,
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Enrich pending links in batches
export async function enrichPendingLinks(batchSize = 10): Promise<{
  processed: number;
  successful: number;
  failed: number;
  results: EnrichmentResult[];
}> {
  // Find links without AI summary
  const links = await prisma.link.findMany({
    where: {
      aiSummary: null,
      status: { in: ["APPROVED", "FEATURED", "PENDING"] },
    },
    orderBy: { createdAt: "asc" },
    take: batchSize,
  });

  const results: EnrichmentResult[] = [];

  for (const link of links) {
    const result = await enrichSingleLink(link.id);
    results.push(result);

    // Add delay between API calls
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  return {
    processed: results.length,
    successful: results.filter((r) => r.success).length,
    failed: results.filter((r) => !r.success).length,
    results,
  };
}

// Get enrichment status
export async function getEnrichmentStatus() {
  const [total, enriched, pending] = await Promise.all([
    prisma.link.count(),
    prisma.link.count({ where: { aiSummary: { not: null } } }),
    prisma.link.count({ where: { aiSummary: null } }),
  ]);

  return {
    total,
    enriched,
    pending,
    percentComplete: total > 0 ? Math.round((enriched / total) * 100) : 0,
  };
}
