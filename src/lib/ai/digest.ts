/**
 * Digest Generation Service
 *
 * Creates AI-generated digests using Claude with the Daily Bunch voice.
 */

import Anthropic from "@anthropic-ai/sdk";
import prisma from "@/lib/db";
import { log } from "@/lib/logger";
import { getDigestPrompt, type DigestContext } from "./prompts";
import { getTrendingLinks } from "@/lib/queries";
import { getRisingLinks, getTopEntities } from "@/lib/trends";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Max retries for API calls
const MAX_RETRIES = 3;

/**
 * Gather context for digest generation
 */
export async function gatherDigestContext(
  periodStart: Date,
  periodEnd: Date
): Promise<DigestContext> {
  // Get trending links from the period
  const trendingLinks = await getTrendingLinks({ limit: 15, minVelocity: 2 });

  // Get rising links (accelerating)
  const risingLinks = await getRisingLinks(5);

  // Get entity trends
  const entityTrends = await getTopEntities("week", 10);

  // Enhance trending links with cultural analysis data
  const topLinks = await Promise.all(
    trendingLinks.slice(0, 10).map(async (link) => {
      const fullLink = await prisma.link.findUnique({
        where: { id: link.id },
        select: {
          aiSummary: true,
          culturalWhyNow: true,
          culturalThread: true,
        },
      });

      return {
        title: link.title || link.fallbackTitle || "Untitled",
        url: link.canonicalUrl,
        velocity: link.velocity,
        sourceNames: link.sourceNames,
        categoryName: link.categoryName || undefined,
        aiSummary: fullLink?.aiSummary || undefined,
        culturalWhyNow: fullLink?.culturalWhyNow || undefined,
        culturalThread: fullLink?.culturalThread || undefined,
      };
    })
  );

  return {
    topLinks,
    risingLinks: risingLinks.map((link) => ({
      title: link.title || link.fallbackTitle || "Untitled",
      url: link.canonicalUrl,
      recentVelocity: link.recentVelocity,
      categoryName: link.categoryName || undefined,
    })),
    entityTrends: entityTrends.map((e) => ({
      name: e.name,
      type: e.type,
      velocity: e.velocity,
      trend: e.trend || "stable",
    })),
    periodStart,
    periodEnd,
  };
}

/**
 * Generate a digest using Claude
 */
export async function generateDigest(
  periodStart: Date,
  periodEnd: Date
): Promise<{
  success: boolean;
  content?: string;
  error?: string;
  inputTokens?: number;
  outputTokens?: number;
}> {
  const opContext = { service: "digest", operation: "generateDigest" };
  const op = log.operationStart("digest", "generateDigest", {
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
  });

  if (!process.env.ANTHROPIC_API_KEY) {
    log.warn("ANTHROPIC_API_KEY not configured", opContext);
    op.end({ status: "skipped", reason: "no_api_key" });
    return { success: false, error: "ANTHROPIC_API_KEY not configured" };
  }

  try {
    // Gather context
    const context = await gatherDigestContext(periodStart, periodEnd);

    if (context.topLinks.length === 0) {
      log.warn("No links found for digest period", opContext);
      op.end({ status: "skipped", reason: "no_links" });
      return { success: false, error: "No trending links found for this period" };
    }

    // Generate prompt
    const prompt = getDigestPrompt(context);

    // Call Claude with retries
    let lastError: Error | null = null;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const response = await anthropic.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 2000,
          messages: [{ role: "user", content: prompt }],
        });

        const content =
          response.content[0].type === "text" ? response.content[0].text.trim() : "";

        if (!content) {
          throw new Error("Empty response from Claude");
        }

        log.info("Digest generated", {
          ...opContext,
          contentLength: content.length,
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
        });

        op.end({ status: "success" });

        return {
          success: true,
          content,
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        const errorMessage = lastError.message;
        if (errorMessage.includes("429") || errorMessage.includes("overloaded")) {
          await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000));
          continue;
        }

        break;
      }
    }

    log.error("Digest generation failed", { ...opContext, error: lastError?.message });
    op.end({ status: "failed", error: lastError?.message });
    return { success: false, error: lastError?.message || "Unknown error" };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log.error("Digest error", { ...opContext, error: message });
    op.end({ status: "error", error: message });
    return { success: false, error: message };
  }
}

/**
 * Create and save a new digest
 */
export async function createDigest(
  headline: string,
  linkIds: string[]
): Promise<{ success: boolean; digestId?: string; error?: string }> {
  try {
    // Create the digest
    const digest = await prisma.digest.create({
      data: {
        headline,
        status: "draft",
        items: {
          create: linkIds.map((linkId, index) => ({
            linkId,
            position: index + 1,
          })),
        },
      },
    });

    return { success: true, digestId: digest.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: message };
  }
}
