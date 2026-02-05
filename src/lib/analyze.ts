/**
 * AI Link Analysis Service
 *
 * Uses Gemini Flash to:
 * 1. Categorize links
 * 2. Extract mentioned entities
 * 3. Generate summaries (with Daily Bunch voice)
 * 4. Suggest new entities (queued for approval)
 *
 * Gemini Flash chosen for:
 * - 1000+ RPM rate limits (vs Claude's ~60 RPM)
 * - 40x cheaper than Claude Sonnet
 * - Sub-second response times
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import prisma from "@/lib/db";
import { Errors, ServiceError, wrapError } from "./errors";
import { log } from "./logger";
import { withRetry, RetryPresets } from "./retry";
import { getEnrichmentPrompt, type EnrichmentContext, type EntityType } from "./ai/prompts";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

// Max retries before marking as failed
const MAX_AI_RETRIES = 3;

// Concurrency for parallel processing
const PARALLEL_CONCURRENCY = 10;

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
    type: EntityType;
    aliases: string[];
  }>;
}

/**
 * Call Gemini API with retry logic
 */
async function callGeminiWithRetry(
  prompt: string,
  context: { service: string; operation: string; linkId?: string; url?: string }
): Promise<string> {
  return withRetry(
    async () => {
      const startTime = performance.now();

      try {
        const result = await model.generateContent(prompt);
        const response = result.response;
        const responseText = response.text();

        const durationMs = Math.round(performance.now() - startTime);
        log.externalCall("gemini", "POST", "generateContent", durationMs, 200);

        return responseText;
      } catch (error) {
        const durationMs = Math.round(performance.now() - startTime);

        // Check for specific error types
        const errorMessage = error instanceof Error ? error.message : String(error);

        if (errorMessage.includes("429") || errorMessage.includes("RESOURCE_EXHAUSTED")) {
          log.externalCall("gemini", "POST", "generateContent", durationMs, 429);
          throw Errors.rateLimit(context);
        }

        if (errorMessage.includes("401") || errorMessage.includes("UNAUTHENTICATED")) {
          log.externalCall("gemini", "POST", "generateContent", durationMs, 401);
          throw Errors.authFailed(context);
        }

        if (errorMessage.includes("400") || errorMessage.includes("INVALID_ARGUMENT")) {
          log.externalCall("gemini", "POST", "generateContent", durationMs, 400);
          throw Errors.badRequest(context, errorMessage);
        }

        if (errorMessage.includes("500") || errorMessage.includes("INTERNAL")) {
          log.externalCall("gemini", "POST", "generateContent", durationMs, 500);
          throw Errors.serverError(context, error instanceof Error ? error : new Error(errorMessage));
        }

        // Wrap other errors
        log.externalCall("gemini", "POST", "generateContent", durationMs, "error");
        throw wrapError(error, context);
      }
    },
    context,
    RetryPresets.claude // Reuse retry config, works fine for Gemini
  );
}

/**
 * Parse Gemini's JSON response with error handling
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
  linkId?: string,
  cachedContext?: { taxonomy: string; entities: Array<{ id: string; name: string; aliases: string[]; type: string }> }
): Promise<AnalysisResult | null> {
  const context = { service: "analyze", operation: "analyzeLink", url, linkId };
  const op = log.operationStart("analyze", "analyzeLink", { url: url.slice(0, 100), linkId });

  try {
    // Use cached context if provided, otherwise fetch fresh
    const taxonomy = cachedContext?.taxonomy || await getTaxonomy();
    const entities = cachedContext?.entities || await getEntities();

    // Build context for voice-guided enrichment prompt
    const enrichmentContext: EnrichmentContext = {
      url,
      title: title || undefined,
      description: description || undefined,
      taxonomy,
      entities: entities.map((e) => ({
        name: e.name,
        type: e.type,
        aliases: e.aliases,
      })),
    };

    const prompt = getEnrichmentPrompt(enrichmentContext);

    // Call Gemini with retry
    const responseText = await callGeminiWithRetry(prompt, context);

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
export async function analyzeAndUpdateLink(
  linkId: string,
  cachedContext?: { taxonomy: string; entities: Array<{ id: string; name: string; aliases: string[]; type: string }> }
): Promise<boolean> {
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
      linkId,
      cachedContext
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

    // Queue suggested entities for approval (de-dupe: skip if pending suggestion exists)
    // Also skip if the name is on the blocklist
    for (const suggestion of result.suggestedEntities) {
      // Check blocklist
      const isBlocked = await prisma.entityBlocklist.findFirst({
        where: { name: { equals: suggestion.name, mode: "insensitive" } },
      });

      if (isBlocked) {
        continue; // Skip blocked names
      }

      const existingSuggestion = await prisma.entitySuggestion.findFirst({
        where: {
          name: { equals: suggestion.name, mode: "insensitive" },
          type: suggestion.type,
          status: "pending",
        },
      });

      if (!existingSuggestion) {
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
 * Process a chunk of links in parallel
 */
async function processChunk(
  links: Array<{ id: string }>,
  cachedContext: { taxonomy: string; entities: Array<{ id: string; name: string; aliases: string[]; type: string }> }
): Promise<{ analyzed: number; failed: number }> {
  const results = await Promise.allSettled(
    links.map((link) => analyzeAndUpdateLink(link.id, cachedContext))
  );

  let analyzed = 0;
  let failed = 0;

  for (const result of results) {
    if (result.status === "fulfilled" && result.value) {
      analyzed++;
    } else {
      failed++;
    }
  }

  return { analyzed, failed };
}

/**
 * Batch analyze unanalyzed links with parallel processing
 *
 * Uses Gemini's high rate limits to process multiple links concurrently.
 * Pre-caches taxonomy and entities to avoid redundant DB queries.
 */
export async function analyzeUnanalyzedLinks(limit = 100): Promise<{
  analyzed: number;
  failed: number;
  skipped: number;
}> {
  const op = log.operationStart("analyze", "analyzeUnanalyzedLinks", { limit });

  // Pre-cache taxonomy and entities once
  const [taxonomy, entities] = await Promise.all([
    getTaxonomy(),
    getEntities(),
  ]);
  const cachedContext = { taxonomy, entities };

  const links = await prisma.link.findMany({
    where: {
      aiStatus: "pending",
      aiRetryCount: { lt: MAX_AI_RETRIES },
      title: { not: null }, // Only analyze links with titles
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { id: true, title: true },
  });

  // Filter out any without titles (shouldn't happen, but safety check)
  const validLinks = links.filter((l) => l.title);
  const skipped = links.length - validLinks.length;

  if (validLinks.length === 0) {
    op.end({ analyzed: 0, failed: 0, skipped });
    return { analyzed: 0, failed: 0, skipped };
  }

  // Process in parallel chunks
  let totalAnalyzed = 0;
  let totalFailed = 0;

  for (let i = 0; i < validLinks.length; i += PARALLEL_CONCURRENCY) {
    const chunk = validLinks.slice(i, i + PARALLEL_CONCURRENCY);
    const { analyzed, failed } = await processChunk(chunk, cachedContext);
    totalAnalyzed += analyzed;
    totalFailed += failed;

    // Log progress for large batches
    if (validLinks.length > PARALLEL_CONCURRENCY) {
      log.info("Batch progress", {
        service: "analyze",
        operation: "analyzeUnanalyzedLinks",
        processed: i + chunk.length,
        total: validLinks.length,
        analyzed: totalAnalyzed,
        failed: totalFailed,
      });
    }
  }

  log.batchSummary("analyze", "analyzeUnanalyzedLinks", {
    total: validLinks.length,
    succeeded: totalAnalyzed,
    failed: totalFailed,
  }, { skipped });

  op.end({ analyzed: totalAnalyzed, failed: totalFailed, skipped });

  return { analyzed: totalAnalyzed, failed: totalFailed, skipped };
}

/**
 * Retry failed AI analyses (for recovery cron job)
 *
 * Re-attempts links that failed but haven't exceeded max retries.
 */
export async function retryFailedAnalyses(limit = 50): Promise<{
  retried: number;
  succeeded: number;
  failed: number;
}> {
  const op = log.operationStart("analyze", "retryFailedAnalyses", { limit });

  // Pre-cache taxonomy and entities
  const [taxonomy, entities] = await Promise.all([
    getTaxonomy(),
    getEntities(),
  ]);
  const cachedContext = { taxonomy, entities };

  // Find links that failed but can still be retried
  const links = await prisma.link.findMany({
    where: {
      aiStatus: "pending",
      aiRetryCount: { gt: 0, lt: MAX_AI_RETRIES },
      title: { not: null },
    },
    orderBy: { aiRetryCount: "asc" }, // Prioritize fewer retries
    take: limit,
    select: { id: true },
  });

  if (links.length === 0) {
    op.end({ retried: 0, succeeded: 0, failed: 0 });
    return { retried: 0, succeeded: 0, failed: 0 };
  }

  // Process in parallel
  const { analyzed: succeeded, failed } = await processChunk(links, cachedContext);

  op.end({ retried: links.length, succeeded, failed });

  return { retried: links.length, succeeded, failed };
}
