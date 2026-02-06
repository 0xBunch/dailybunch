/**
 * Story Narrative Generator
 *
 * Generates brief AI summaries for story clusters.
 * Uses Claude to synthesize a 1-2 sentence narrative from constituent link titles.
 */

import Anthropic from "@anthropic-ai/sdk";
import prisma from "@/lib/db";
import { log } from "@/lib/logger";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MAX_RETRIES = 3;

/**
 * Generate a narrative for a single story
 */
export async function generateStoryNarrative(
  storyId: string
): Promise<string | null> {
  const opContext = { service: "narrative", operation: "generateStoryNarrative", storyId };
  const op = log.operationStart("narrative", "generateStoryNarrative", { storyId });

  if (!process.env.ANTHROPIC_API_KEY) {
    log.warn("ANTHROPIC_API_KEY not configured", opContext);
    op.end({ status: "skipped", reason: "no_api_key" });
    return null;
  }

  try {
    const story = await prisma.story.findUnique({
      where: { id: storyId },
      include: {
        links: {
          include: {
            link: {
              select: {
                title: true,
                fallbackTitle: true,
                domain: true,
                aiSummary: true,
              },
            },
          },
        },
      },
    });

    if (!story) {
      log.warn("Story not found", opContext);
      op.end({ status: "failed", reason: "story_not_found" });
      return null;
    }

    if (story.narrative) {
      op.end({ status: "skipped", reason: "already_has_narrative" });
      return story.narrative;
    }

    const articles = story.links
      .map((sl) => {
        const title = sl.link.title || sl.link.fallbackTitle || "Untitled";
        const summary = sl.link.aiSummary ? `: ${sl.link.aiSummary}` : "";
        return `- ${title} (${sl.link.domain})${summary}`;
      })
      .join("\n");

    const prompt = `You are a concise news editor. Given a story cluster title and its constituent articles, write 1-2 sentences that explain what this story is about. Be specific and informative. Do not use filler phrases like "In a developing story" or "Multiple outlets report." Just state what is happening.

Story title: ${story.title}

Articles:
${articles}

Write your 1-2 sentence summary:`;

    let lastError: Error | null = null;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const response = await anthropic.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 200,
          messages: [{ role: "user", content: prompt }],
        });

        const narrative =
          response.content[0].type === "text" ? response.content[0].text.trim() : "";

        if (!narrative) {
          throw new Error("Empty narrative returned");
        }

        await prisma.story.update({
          where: { id: storyId },
          data: { narrative },
        });

        log.info("Narrative generated", {
          ...opContext,
          length: narrative.length,
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
        });

        op.end({ status: "success" });
        return narrative;
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

    log.error("Narrative generation failed", { ...opContext, error: lastError?.message });
    op.end({ status: "failed", error: lastError?.message });
    return null;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log.error("Narrative error", { ...opContext, error: message });
    op.end({ status: "error", error: message });
    return null;
  }
}

/**
 * Generate narratives for stories missing them (recent first)
 */
export async function generateMissingNarratives(limit = 30): Promise<{
  generated: number;
  failed: number;
}> {
  const op = log.operationStart("narrative", "generateMissingNarratives", { limit });

  const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);

  const stories = await prisma.story.findMany({
    where: {
      narrative: null,
      status: "active",
      lastLinkAt: { gte: fortyEightHoursAgo },
    },
    orderBy: { lastLinkAt: "desc" },
    take: limit,
    select: { id: true },
  });

  if (stories.length === 0) {
    op.end({ generated: 0, failed: 0 });
    return { generated: 0, failed: 0 };
  }

  let generated = 0;
  let failed = 0;

  for (const story of stories) {
    const result = await generateStoryNarrative(story.id);

    if (result) {
      generated++;
    } else {
      failed++;
    }

    // Small delay between calls
    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  log.batchSummary("narrative", "generateMissingNarratives", {
    total: stories.length,
    succeeded: generated,
    failed,
  });

  op.end({ generated, failed });
  return { generated, failed };
}
