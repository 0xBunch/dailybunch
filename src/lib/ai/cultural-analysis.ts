/**
 * Cultural Analysis Service
 *
 * Layer 2 AI intelligence: Uses Claude Sonnet to analyze WHY links are trending.
 * Triggered when a link reaches velocity >= 3.
 */

import Anthropic from "@anthropic-ai/sdk";
import prisma from "@/lib/db";
import { log } from "@/lib/logger";
import { getCulturalAnalysisPrompt, type CulturalAnalysisResult } from "./prompts";
import { getTrendingLinks } from "@/lib/queries";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Minimum velocity to trigger cultural analysis
const MIN_VELOCITY_FOR_ANALYSIS = 3;

// Max retries for API calls
const MAX_RETRIES = 3;

interface AnalysisContext {
  title: string;
  url: string;
  summary?: string;
  velocity: number;
  sourceNames: string[];
  firstSeenAt: Date;
  categories?: string[];
  entities?: {
    people?: string[];
    organizations?: string[];
    products?: string[];
  };
  otherTrendingLinks?: Array<{
    title: string;
    velocity: number;
    categories?: string[];
  }>;
}

/**
 * Analyze a single link for cultural context
 */
export async function analyzeLinkCulturally(
  linkId: string,
  context?: AnalysisContext
): Promise<CulturalAnalysisResult | null> {
  const opContext = { service: "cultural-analysis", operation: "analyzeLinkCulturally", linkId };
  const op = log.operationStart("cultural-analysis", "analyzeLinkCulturally", { linkId });

  if (!process.env.ANTHROPIC_API_KEY) {
    log.warn("ANTHROPIC_API_KEY not configured", opContext);
    op.end({ status: "skipped", reason: "no_api_key" });
    return null;
  }

  try {
    // Get link with context if not provided
    let analysisContext = context;
    if (!analysisContext) {
      const link = await prisma.link.findUnique({
        where: { id: linkId },
        include: {
          mentions: {
            include: { source: true },
          },
          entities: {
            include: { entity: true },
          },
          category: true,
        },
      });

      if (!link) {
        log.warn("Link not found", opContext);
        op.end({ status: "failed", reason: "link_not_found" });
        return null;
      }

      // Get other trending links for context
      const otherTrending = await getTrendingLinks({ limit: 10 });

      // Build entities object
      const entities: AnalysisContext["entities"] = {
        people: [],
        organizations: [],
        products: [],
      };
      for (const le of link.entities) {
        const type = le.entity.type as "person" | "organization" | "product";
        if (type === "person") entities.people?.push(le.entity.name);
        else if (type === "organization") entities.organizations?.push(le.entity.name);
        else if (type === "product") entities.products?.push(le.entity.name);
      }

      analysisContext = {
        title: link.title || link.fallbackTitle || "Untitled",
        url: link.canonicalUrl,
        summary: link.aiSummary || link.description || undefined,
        velocity: link.mentions.length,
        sourceNames: link.mentions.map((m) => m.source.name),
        firstSeenAt: link.firstSeenAt,
        categories: link.category ? [link.category.name] : undefined,
        entities,
        otherTrendingLinks: otherTrending
          .filter((l) => l.id !== linkId)
          .map((l) => ({
            title: l.title || l.fallbackTitle || "Untitled",
            velocity: l.velocity,
            categories: l.categoryName ? [l.categoryName] : undefined,
          })),
      };
    }

    // Check velocity threshold
    if (analysisContext.velocity < MIN_VELOCITY_FOR_ANALYSIS) {
      log.info("Link below velocity threshold", {
        ...opContext,
        velocity: analysisContext.velocity,
        threshold: MIN_VELOCITY_FOR_ANALYSIS,
      });
      op.end({ status: "skipped", reason: "below_threshold" });
      return null;
    }

    // Generate prompt and call Claude
    const prompt = getCulturalAnalysisPrompt(analysisContext);

    let lastError: Error | null = null;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const response = await anthropic.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1500,
          messages: [{ role: "user", content: prompt }],
        });

        const text = response.content[0].type === "text" ? response.content[0].text : "";

        // Parse JSON response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error("No JSON found in response");
        }

        const result: CulturalAnalysisResult = JSON.parse(jsonMatch[0]);

        // Update the link with analysis results
        await prisma.link.update({
          where: { id: linkId },
          data: {
            culturalWhyNow: result.whyNow,
            culturalTension: result.tension,
            culturalThread: result.thread,
            culturalPrediction: result.prediction,
            culturalPredictionReason: result.predictionReason,
            culturalContrarian: result.contrarian,
            culturalAnalyzedAt: new Date(),
          },
        });

        log.info("Cultural analysis completed", {
          ...opContext,
          prediction: result.prediction,
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
        });

        op.end({ status: "success", prediction: result.prediction });
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Check if retryable
        const errorMessage = lastError.message;
        if (errorMessage.includes("429") || errorMessage.includes("overloaded")) {
          // Rate limited - wait and retry
          await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000));
          continue;
        }

        // Non-retryable error
        break;
      }
    }

    log.error("Cultural analysis failed", { ...opContext, error: lastError?.message });
    op.end({ status: "failed", error: lastError?.message });
    return null;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log.error("Cultural analysis error", { ...opContext, error: message });
    op.end({ status: "error", error: message });
    return null;
  }
}

/**
 * Analyze all high-velocity links that haven't been analyzed yet
 */
export async function analyzeHighVelocityLinks(limit = 20): Promise<{
  analyzed: number;
  skipped: number;
  failed: number;
}> {
  const op = log.operationStart("cultural-analysis", "analyzeHighVelocityLinks", { limit });

  // Get trending links that haven't been culturally analyzed
  const trendingLinks = await getTrendingLinks({ limit: limit * 2, minVelocity: MIN_VELOCITY_FOR_ANALYSIS });

  // Filter to those without cultural analysis
  const linksToAnalyze = [];
  for (const link of trendingLinks) {
    const fullLink = await prisma.link.findUnique({
      where: { id: link.id },
      select: { culturalAnalyzedAt: true },
    });

    if (!fullLink?.culturalAnalyzedAt) {
      linksToAnalyze.push(link);
    }

    if (linksToAnalyze.length >= limit) break;
  }

  if (linksToAnalyze.length === 0) {
    op.end({ analyzed: 0, skipped: 0, failed: 0 });
    return { analyzed: 0, skipped: 0, failed: 0 };
  }

  // Get other trending for context (shared across all analyses)
  const otherTrending = trendingLinks.map((l) => ({
    title: l.title || l.fallbackTitle || "Untitled",
    velocity: l.velocity,
    categories: l.categoryName ? [l.categoryName] : undefined,
  }));

  let analyzed = 0;
  let skipped = 0;
  let failed = 0;

  // Process sequentially to respect rate limits
  for (const link of linksToAnalyze) {
    const context: AnalysisContext = {
      title: link.title || link.fallbackTitle || "Untitled",
      url: link.canonicalUrl,
      summary: link.aiSummary || undefined,
      velocity: link.velocity,
      sourceNames: link.sourceNames,
      firstSeenAt: link.firstSeenAt,
      categories: link.categoryName ? [link.categoryName] : undefined,
      otherTrendingLinks: otherTrending.filter((l) => l.title !== (link.title || link.fallbackTitle)),
    };

    const result = await analyzeLinkCulturally(link.id, context);

    if (result) {
      analyzed++;
    } else {
      failed++;
    }

    // Small delay between calls to be nice to the API
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  log.batchSummary("cultural-analysis", "analyzeHighVelocityLinks", {
    total: linksToAnalyze.length,
    succeeded: analyzed,
    failed,
  });

  op.end({ analyzed, skipped, failed });
  return { analyzed, skipped, failed };
}
