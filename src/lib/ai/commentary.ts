/**
 * Commentary Engine
 *
 * Generates brief contextual commentary for link detail pages.
 * Uses Claude with rotating personas for variety.
 */

import Anthropic from "@anthropic-ai/sdk";
import prisma from "@/lib/db";
import { log } from "@/lib/logger";
import { getCommentaryPrompt, PERSONAS } from "./prompts";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

type PersonaKey = keyof typeof PERSONAS;
const PERSONA_KEYS: PersonaKey[] = ["connector", "historian", "skeptic", "scout"];

// Max retries for API calls
const MAX_RETRIES = 3;

/**
 * Select a persona based on link characteristics
 */
function selectPersona(link: {
  velocity: number;
  categoryName?: string | null;
  culturalPrediction?: string | null;
}): PersonaKey {
  // Scout for growing stories
  if (link.culturalPrediction === "growing") {
    return "scout";
  }

  // Skeptic for very high velocity (consensus forming)
  if (link.velocity >= 5) {
    return "skeptic";
  }

  // Historian for politics, business, media
  if (
    link.categoryName &&
    ["politics", "business", "media"].includes(link.categoryName.toLowerCase())
  ) {
    return "historian";
  }

  // Default to connector (finding unexpected links)
  return "connector";
}

/**
 * Generate commentary for a single link
 */
export async function generateCommentary(
  linkId: string,
  forcedPersona?: PersonaKey
): Promise<string | null> {
  const opContext = { service: "commentary", operation: "generateCommentary", linkId };
  const op = log.operationStart("commentary", "generateCommentary", { linkId });

  if (!process.env.ANTHROPIC_API_KEY) {
    log.warn("ANTHROPIC_API_KEY not configured", opContext);
    op.end({ status: "skipped", reason: "no_api_key" });
    return null;
  }

  try {
    // Get link with full context
    const link = await prisma.link.findUnique({
      where: { id: linkId },
      include: {
        mentions: {
          include: { source: true },
        },
        category: true,
      },
    });

    if (!link) {
      log.warn("Link not found", opContext);
      op.end({ status: "failed", reason: "link_not_found" });
      return null;
    }

    // Select persona
    const persona = forcedPersona || selectPersona({
      velocity: link.mentions.length,
      categoryName: link.category?.name,
      culturalPrediction: link.culturalPrediction,
    });

    // Build context for prompt
    const context = {
      title: link.title || link.fallbackTitle || "Untitled",
      url: link.canonicalUrl,
      summary: link.aiSummary || link.description || undefined,
      velocity: link.mentions.length,
      sourceNames: link.mentions.map((m) => m.source.name),
      firstSeenAt: link.firstSeenAt,
      categories: link.category ? [link.category.name] : undefined,
    };

    const prompt = getCommentaryPrompt(context, persona);

    let lastError: Error | null = null;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const response = await anthropic.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 300,
          messages: [{ role: "user", content: prompt }],
        });

        const commentary =
          response.content[0].type === "text" ? response.content[0].text.trim() : "";

        if (!commentary) {
          throw new Error("Empty commentary returned");
        }

        // Update the link with commentary
        await prisma.link.update({
          where: { id: linkId },
          data: {
            commentary,
            commentaryPersona: persona,
            commentaryGeneratedAt: new Date(),
          },
        });

        log.info("Commentary generated", {
          ...opContext,
          persona,
          length: commentary.length,
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
        });

        op.end({ status: "success", persona });
        return commentary;
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

    log.error("Commentary generation failed", { ...opContext, error: lastError?.message });
    op.end({ status: "failed", error: lastError?.message });
    return null;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log.error("Commentary error", { ...opContext, error: message });
    op.end({ status: "error", error: message });
    return null;
  }
}

/**
 * Generate commentary for links missing it (high velocity first)
 */
export async function generateMissingCommentary(limit = 20): Promise<{
  generated: number;
  failed: number;
}> {
  const op = log.operationStart("commentary", "generateMissingCommentary", { limit });

  // Find high-velocity links without commentary
  const links = await prisma.link.findMany({
    where: {
      commentary: null,
      isBlocked: false,
      OR: [
        { title: { not: null } },
        { fallbackTitle: { not: null } },
      ],
    },
    include: {
      mentions: true,
    },
    orderBy: {
      firstSeenAt: "desc",
    },
    take: limit * 2, // Get more than needed, filter by velocity
  });

  // Sort by velocity and take top N
  const sortedLinks = links
    .map((l) => ({ ...l, velocity: l.mentions.length }))
    .filter((l) => l.velocity >= 2) // At least 2 sources
    .sort((a, b) => b.velocity - a.velocity)
    .slice(0, limit);

  if (sortedLinks.length === 0) {
    op.end({ generated: 0, failed: 0 });
    return { generated: 0, failed: 0 };
  }

  let generated = 0;
  let failed = 0;

  for (const link of sortedLinks) {
    const result = await generateCommentary(link.id);

    if (result) {
      generated++;
    } else {
      failed++;
    }

    // Small delay between calls
    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  log.batchSummary("commentary", "generateMissingCommentary", {
    total: sortedLinks.length,
    succeeded: generated,
    failed,
  });

  op.end({ generated, failed });
  return { generated, failed };
}

/**
 * Regenerate commentary for a link (e.g., when context has changed significantly)
 */
export async function regenerateCommentary(
  linkId: string,
  persona?: PersonaKey
): Promise<string | null> {
  // Clear existing commentary first
  await prisma.link.update({
    where: { id: linkId },
    data: {
      commentary: null,
      commentaryPersona: null,
      commentaryGeneratedAt: null,
    },
  });

  return generateCommentary(linkId, persona);
}
