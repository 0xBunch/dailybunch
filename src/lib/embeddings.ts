/**
 * Embedding Generation Service
 *
 * Generates text embeddings using Gemini's embedding model.
 * Used for story clustering - grouping related articles.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import prisma from "@/lib/db";
import { log } from "@/lib/logger";

const genAI = new GoogleGenerativeAI(
  process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || ""
);

// Gemini embedding model
const embeddingModel = genAI.getGenerativeModel({ model: "text-embedding-004" });

/**
 * Generate embedding for a single text
 */
export async function generateEmbedding(text: string): Promise<number[] | null> {
  try {
    const result = await embeddingModel.embedContent(text);
    return result.embedding.values;
  } catch (error) {
    log.error("Failed to generate embedding", {
      service: "embeddings",
      operation: "generateEmbedding",
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * Process links without embeddings
 * Called by cron job to batch generate embeddings
 */
export async function generateMissingEmbeddings(limit = 50): Promise<{
  processed: number;
  success: number;
  failed: number;
}> {
  const op = log.operationStart("embeddings", "generateMissingEmbeddings");

  // Get links without embeddings (have title, not blocked, recent)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const links = await prisma.link.findMany({
    where: {
      embedding: null,
      isBlocked: false,
      firstSeenAt: { gte: sevenDaysAgo },
      OR: [
        { title: { not: null } },
        { fallbackTitle: { not: null } },
      ],
    },
    select: {
      id: true,
      title: true,
      fallbackTitle: true,
      aiSummary: true,
      domain: true,
    },
    orderBy: { firstSeenAt: "desc" },
    take: limit,
  });

  let success = 0;
  let failed = 0;

  for (const link of links) {
    // Create text for embedding: title + summary (if available)
    const title = link.title || link.fallbackTitle || "";
    const text = link.aiSummary ? `${title}\n\n${link.aiSummary}` : title;

    if (!text.trim()) {
      failed++;
      continue;
    }

    const embedding = await generateEmbedding(text);

    if (embedding) {
      await prisma.link.update({
        where: { id: link.id },
        data: {
          embedding: JSON.stringify(embedding),
          embeddingGeneratedAt: new Date(),
        },
      });
      success++;
    } else {
      failed++;
    }

    // Small delay to avoid rate limits
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  log.info("Embedding generation complete", {
    service: "embeddings",
    operation: "generateMissingEmbeddings",
    processed: links.length,
    success,
    failed,
  });

  op.end({ processed: links.length, success, failed });
  return { processed: links.length, success, failed };
}
