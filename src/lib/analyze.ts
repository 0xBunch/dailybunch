/**
 * AI Link Analysis Service
 *
 * Uses Claude to:
 * 1. Categorize links
 * 2. Extract mentioned entities
 * 3. Generate summaries
 * 4. Suggest new entities (queued for approval)
 *
 * Error Handling:
 * - Retry on rate limits and transient failures
 * - Store failed links for cron retry
 * - Never blocks ingestion on AI failure
 */

import Anthropic from "@anthropic-ai/sdk";
import prisma from "@/lib/db";
import { Errors, ServiceError, wrapError } from "./errors";
import { log } from "./logger";
import { withRetry, RetryPresets } from "./retry";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Max retries before marking as failed
const MAX_AI_RETRIES = 3;

// Get all categories and subcategories for the prompt
async function getTaxonomy(): Promise<string> {
  const categories = await prisma.category.findMany({
    include: { subcategories: true },
  });

  return categories
    .map((cat) => {
      const subs = cat.subcategories.map((s) => s.name).join(", ");
      return `- ${cat.name}: ${subs || "General"}`;
    })
    .join("\n");
}

// Get all entities for matching
async function getEntities(): Promise<
  Array<{ id: string; name: string; aliases: string[]; type: string }>
> {
  return prisma.entity.findMany({
    where: { active: true },
    select: { id: true, name: true, aliases: true, type: true },
  });
}

export interface AnalysisResult {
  categorySlug: string;
  subcategorySlug?: string;
  summary: string;
  matchedEntityIds: string[];
  suggestedEntities: Array<{
    name: string;
    type: "person" | "organization" | "product";
    aliases: string[];
  }>;
}

/**
 * Call Claude API with retry logic
 */
async function callClaudeWithRetry(
  prompt: string,
  context: { service: string; operation: string; linkId?: string; url?: string }
): Promise<string> {
  return withRetry(
    async () => {
      const startTime = performance.now();

      try {
        const message = await anthropic.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1024,
          messages: [{ role: "user", content: prompt }],
        });

        const durationMs = Math.round(performance.now() - startTime);
        log.externalCall("claude", "POST", "messages.create", durationMs, 200);

        // Extract text from response
        const responseText =
          message.content[0].type === "text" ? message.content[0].text : "";

        return responseText;
      } catch (error) {
        const durationMs = Math.round(performance.now() - startTime);

        // Check for rate limit
        if (error instanceof Anthropic.RateLimitError) {
          log.externalCall("claude", "POST", "messages.create", durationMs, 429);
          throw Errors.rateLimit(context);
        }

        // Check for auth errors
        if (error instanceof Anthropic.AuthenticationError) {
          log.externalCall("claude", "POST", "messages.create", durationMs, 401);
          throw Errors.authFailed(context);
        }

        // Check for bad request
        if (error instanceof Anthropic.BadRequestError) {
          log.externalCall("claude", "POST", "messages.create", durationMs, 400);
          throw Errors.badRequest(context, error.message);
        }

        // Server errors are retryable
        if (error instanceof Anthropic.InternalServerError) {
          log.externalCall("claude", "POST", "messages.create", durationMs, 500);
          throw Errors.serverError(context, error);
        }

        // Wrap other errors
        log.externalCall("claude", "POST", "messages.create", durationMs, "error");
        throw wrapError(error, context);
      }
    },
    context,
    RetryPresets.claude
  );
}

/**
 * Parse Claude's JSON response with error handling
 */
function parseAnalysisResponse(
  responseText: string,
  context: { service: string; operation: string; url?: string }
): {
  category: string;
  subcategory?: string;
  summary: string;
  matchedEntities: string[];
  suggestedEntities: Array<{ name: string; type: string; aliases: string[] }>;
} {
  try {
    // Try to extract JSON from response (handle markdown code blocks)
    let jsonStr = responseText;
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }

    return JSON.parse(jsonStr);
  } catch (error) {
    const parseError = Errors.jsonParseFailed(
      { ...context, input: responseText.slice(0, 200) },
      error instanceof Error ? error : undefined
    );
    log.error(parseError);
    throw parseError;
  }
}

export async function analyzeLink(
  url: string,
  title?: string | null,
  description?: string | null,
  linkId?: string
): Promise<AnalysisResult | null> {
  const context = { service: "analyze", operation: "analyzeLink", url, linkId };
  const op = log.operationStart("analyze", "analyzeLink", { url: url.slice(0, 100), linkId });

  try {
    const [taxonomy, entities] = await Promise.all([
      getTaxonomy(),
      getEntities(),
    ]);

    const entityList = entities
      .map((e) => `- ${e.name} (${e.type})${e.aliases.length ? ` [aliases: ${e.aliases.join(", ")}]` : ""}`)
      .join("\n");

    const prompt = `Analyze this link and provide structured data.

URL: ${url}
Title: ${title || "Unknown"}
Description: ${description || "None provided"}

TAXONOMY (pick the best fit):
${taxonomy}

KNOWN ENTITIES (match any that are relevant):
${entityList}

Respond with valid JSON only, no markdown:
{
  "category": "CATEGORY_NAME",
  "subcategory": "subcategory_name or null",
  "summary": "2-3 sentence summary of what this link is about",
  "matchedEntities": ["Entity Name 1", "Entity Name 2"],
  "suggestedEntities": [
    {"name": "New Person/Company", "type": "person|organization|product", "aliases": ["alias1"]}
  ]
}

Rules:
- Only match entities if they are clearly relevant to the content
- Only suggest new entities if they are notable figures, companies, or products worth tracking
- Keep summary concise and factual
- If unsure about category, use CULTURE as default`;

    // Call Claude with retry
    const responseText = await callClaudeWithRetry(prompt, context);

    // Parse response
    const parsed = parseAnalysisResponse(responseText, context);

    // Map category name to slug
    const category = await prisma.category.findFirst({
      where: { name: { equals: parsed.category, mode: "insensitive" } },
      include: { subcategories: true },
    });

    const categorySlug = category?.slug || "culture";

    // Map subcategory name to slug
    let subcategorySlug: string | undefined;
    if (parsed.subcategory && category) {
      const sub = category.subcategories.find(
        (s) => s.name.toLowerCase() === parsed.subcategory?.toLowerCase()
      );
      subcategorySlug = sub?.slug;
    }

    // Map matched entity names to IDs
    const matchedEntityIds: string[] = [];
    for (const entityName of parsed.matchedEntities || []) {
      const entity = entities.find(
        (e) =>
          e.name.toLowerCase() === entityName.toLowerCase() ||
          e.aliases.some((a) => a.toLowerCase() === entityName.toLowerCase())
      );
      if (entity) {
        matchedEntityIds.push(entity.id);
      }
    }

    op.end({ status: "success", categorySlug, entityCount: matchedEntityIds.length });

    return {
      categorySlug,
      subcategorySlug,
      summary: parsed.summary || "",
      matchedEntityIds,
      suggestedEntities: (parsed.suggestedEntities || []).map((e) => ({
        name: e.name,
        type: e.type as "person" | "organization" | "product",
        aliases: e.aliases || [],
      })),
    };
  } catch (error) {
    const serviceError = error instanceof ServiceError ? error : wrapError(error, context);
    op.end({ status: "failed", errorCode: serviceError.code });
    throw serviceError;
  }
}

/**
 * Analyze a link and update the database
 *
 * On failure:
 * - Increments aiRetryCount
 * - Sets aiStatus to 'failed' after MAX_AI_RETRIES
 * - Stores error message in aiError
 */
export async function analyzeAndUpdateLink(linkId: string): Promise<boolean> {
  const context = { service: "analyze", operation: "analyzeAndUpdateLink", linkId };

  try {
    const link = await prisma.link.findUnique({
      where: { id: linkId },
    });

    if (!link) {
      log.warn("Link not found for analysis", context);
      return false;
    }

    // Skip if already successfully analyzed
    if (link.aiStatus === "success") {
      return true;
    }

    // Skip if permanently failed (too many retries)
    if (link.aiStatus === "failed" && link.aiRetryCount >= MAX_AI_RETRIES) {
      log.warn("Link exceeded max AI retries", { ...context, retryCount: link.aiRetryCount });
      return false;
    }

    // Attempt analysis
    const result = await analyzeLink(
      link.canonicalUrl,
      link.title,
      link.description,
      linkId
    );

    if (!result) {
      // Increment retry count
      await prisma.link.update({
        where: { id: linkId },
        data: {
          aiRetryCount: { increment: 1 },
          aiStatus: link.aiRetryCount + 1 >= MAX_AI_RETRIES ? "failed" : "pending",
          aiError: "Analysis returned no result",
        },
      });
      return false;
    }

    // Get category and subcategory IDs
    const category = await prisma.category.findUnique({
      where: { slug: result.categorySlug },
    });

    let subcategoryId: string | null = null;
    if (result.subcategorySlug && category) {
      const subcategory = await prisma.subcategory.findFirst({
        where: {
          slug: result.subcategorySlug,
          categoryId: category.id,
        },
      });
      subcategoryId = subcategory?.id || null;
    }

    // Update the link with success
    await prisma.link.update({
      where: { id: linkId },
      data: {
        categoryId: category?.id || null,
        subcategoryId,
        aiSummary: result.summary,
        aiAnalyzedAt: new Date(),
        aiStatus: "success",
        aiError: null,
      },
    });

    // Create entity associations
    for (const entityId of result.matchedEntityIds) {
      await prisma.linkEntity.upsert({
        where: {
          linkId_entityId: { linkId, entityId },
        },
        update: {},
        create: { linkId, entityId },
      });
    }

    // Queue suggested entities for approval
    for (const suggestion of result.suggestedEntities) {
      await prisma.entitySuggestion.create({
        data: {
          name: suggestion.name,
          type: suggestion.type,
          aliases: suggestion.aliases,
          linkId,
          status: "pending",
        },
      });
    }

    return true;
  } catch (error) {
    const serviceError = error instanceof ServiceError ? error : wrapError(error, context);

    // Update link with error info
    try {
      const link = await prisma.link.findUnique({ where: { id: linkId } });
      if (link) {
        const newRetryCount = link.aiRetryCount + 1;
        await prisma.link.update({
          where: { id: linkId },
          data: {
            aiRetryCount: newRetryCount,
            aiStatus: newRetryCount >= MAX_AI_RETRIES ? "failed" : "pending",
            aiError: serviceError.message,
          },
        });
      }
    } catch (dbError) {
      log.error("Failed to update link error status", {
        ...context,
        dbError: dbError instanceof Error ? dbError.message : String(dbError),
      });
    }

    log.error(serviceError);
    return false;
  }
}

/**
 * Batch analyze unanalyzed links (for cron job)
 *
 * Only processes links with aiStatus='pending' that haven't exceeded retries.
 * Each link is processed independently - failures don't stop the batch.
 */
export async function analyzeUnanalyzedLinks(limit = 10): Promise<{
  analyzed: number;
  failed: number;
  skipped: number;
}> {
  const op = log.operationStart("analyze", "analyzeUnanalyzedLinks", { limit });

  const links = await prisma.link.findMany({
    where: {
      aiStatus: "pending",
      aiRetryCount: { lt: MAX_AI_RETRIES },
      title: { not: null }, // Only analyze links with titles
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  let analyzed = 0;
  let failed = 0;
  let skipped = 0;

  for (const link of links) {
    // Skip if no title (shouldn't happen with query, but double-check)
    if (!link.title) {
      skipped++;
      continue;
    }

    try {
      const success = await analyzeAndUpdateLink(link.id);
      if (success) {
        analyzed++;
      } else {
        failed++;
      }
    } catch {
      // analyzeAndUpdateLink should never throw, but just in case
      failed++;
    }

    // Delay between requests to avoid rate limiting
    if (links.indexOf(link) < links.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  log.batchSummary("analyze", "analyzeUnanalyzedLinks", {
    total: links.length,
    succeeded: analyzed,
    failed,
  }, { skipped });

  op.end({ analyzed, failed, skipped });

  return { analyzed, failed, skipped };
}

/**
 * Retry failed AI analyses (for recovery cron job)
 *
 * Re-attempts links that failed but haven't exceeded max retries.
 */
export async function retryFailedAnalyses(limit = 5): Promise<{
  retried: number;
  succeeded: number;
  failed: number;
}> {
  const op = log.operationStart("analyze", "retryFailedAnalyses", { limit });

  // Find links that failed but can still be retried
  const links = await prisma.link.findMany({
    where: {
      aiStatus: "pending",
      aiRetryCount: { gt: 0, lt: MAX_AI_RETRIES },
      title: { not: null },
    },
    orderBy: { aiRetryCount: "asc" }, // Prioritize fewer retries
    take: limit,
  });

  let succeeded = 0;
  let failed = 0;

  for (const link of links) {
    const success = await analyzeAndUpdateLink(link.id);
    if (success) {
      succeeded++;
    } else {
      failed++;
    }

    // Longer delay for retries
    if (links.indexOf(link) < links.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  op.end({ retried: links.length, succeeded, failed });

  return { retried: links.length, succeeded, failed };
}
