/**
 * Link Enrichment Orchestrator
 *
 * Multi-tier metadata extraction pipeline:
 * 1. Mercury Parser (free, fast, handles ~70%)
 * 2. Jina AI Reader (free tier, JS rendering)
 * 3. Firecrawl (paid, paywalls)
 * 4. AI Title Generation (Claude)
 * 5. URL Path Conversion (final fallback)
 *
 * Guarantees: Every link gets SOME title. Never returns empty.
 */

import Anthropic from "@anthropic-ai/sdk";
import { extractWithMercury } from "./mercury";
import { extractWithJina } from "./jina";
import { fetchMetadataWithFirecrawl, isFirecrawlConfigured } from "./firecrawl";
import { formatUrlAsTitle } from "./title-utils";

export type EnrichmentStatus = "success" | "fallback" | "failed";
export type EnrichmentSource =
  | "mercury"
  | "jina"
  | "firecrawl"
  | "html"
  | "ai"
  | "url_path";

export interface EnrichmentResult {
  status: EnrichmentStatus;
  source: EnrichmentSource;
  title: string | null;
  description: string | null;
  author: string | null;
  imageUrl: string | null;
  publishedAt: Date | null;
  error?: string;
}

export interface LinkToEnrich {
  id: string;
  canonicalUrl: string;
  domain: string;
  title: string | null;
  description: string | null;
}

/**
 * Enrich a link using the multi-tier pipeline.
 * Guarantees a title will be returned (at minimum, from URL).
 */
export async function enrichLink(link: LinkToEnrich): Promise<EnrichmentResult> {
  const { canonicalUrl, domain } = link;

  // If link already has a good title, just return success
  if (link.title && link.title.trim()) {
    return {
      status: "success",
      source: "html", // Assume it came from original ingest
      title: link.title,
      description: link.description,
      author: null,
      imageUrl: null,
      publishedAt: null,
    };
  }

  // Tier 1: Mercury Parser (free, fast)
  try {
    const mercury = await extractWithMercury(canonicalUrl);
    if (mercury?.title) {
      console.log(`[Enrich] Mercury success for ${domain}`);
      return {
        status: "success",
        source: "mercury",
        title: mercury.title,
        description: mercury.description,
        author: mercury.author,
        imageUrl: mercury.imageUrl,
        publishedAt: mercury.publishedAt,
      };
    }
  } catch (error) {
    console.warn(`[Enrich] Mercury error for ${domain}:`, error);
  }

  // Tier 2: Jina AI Reader (free, JS rendering)
  try {
    const jina = await extractWithJina(canonicalUrl);
    if (jina?.title) {
      console.log(`[Enrich] Jina success for ${domain}`);
      return {
        status: "success",
        source: "jina",
        title: jina.title,
        description: jina.description,
        author: null,
        imageUrl: null,
        publishedAt: null,
      };
    }
  } catch (error) {
    console.warn(`[Enrich] Jina error for ${domain}:`, error);
  }

  // Tier 3: Firecrawl (paid, paywalls) - only if configured
  if (isFirecrawlConfigured()) {
    try {
      const firecrawl = await fetchMetadataWithFirecrawl(canonicalUrl);
      if (firecrawl?.title) {
        console.log(`[Enrich] Firecrawl success for ${domain}`);
        return {
          status: "success",
          source: "firecrawl",
          title: firecrawl.title,
          description: firecrawl.description ?? null,
          author: firecrawl.author ?? null,
          imageUrl: firecrawl.imageUrl ?? null,
          publishedAt: firecrawl.publishedAt ?? null,
        };
      }
    } catch (error) {
      console.warn(`[Enrich] Firecrawl error for ${domain}:`, error);
    }
  }

  // Tier 4: AI Title Generation
  try {
    const aiTitle = await generateTitleWithAI(canonicalUrl, domain);
    if (aiTitle) {
      console.log(`[Enrich] AI title generated for ${domain}`);
      return {
        status: "fallback",
        source: "ai",
        title: aiTitle,
        description: null,
        author: null,
        imageUrl: null,
        publishedAt: null,
      };
    }
  } catch (error) {
    console.warn(`[Enrich] AI title error for ${domain}:`, error);
  }

  // Tier 5: URL Path Conversion (final fallback - always succeeds)
  const urlTitle = formatUrlAsTitle(canonicalUrl, domain);
  console.log(`[Enrich] URL fallback for ${domain}: "${urlTitle}"`);

  return {
    status: "fallback",
    source: "url_path",
    title: urlTitle,
    description: null,
    author: null,
    imageUrl: null,
    publishedAt: null,
  };
}

/**
 * Generate a title using Claude AI.
 * Used when all extraction methods fail.
 */
async function generateTitleWithAI(
  url: string,
  domain: string
): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return null;
  }

  try {
    const anthropic = new Anthropic({ apiKey });

    const response = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 100,
      messages: [
        {
          role: "user",
          content: `Generate a concise, accurate headline (5-12 words) for this webpage based on the URL.

URL: ${url}
Domain: ${domain}

Rules:
- Return ONLY the headline, nothing else
- Make it informative and specific
- Do not include the domain name in the headline
- If you cannot determine a reasonable headline, respond with exactly "UNKNOWN"

Headline:`,
        },
      ],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text.trim() : "";

    // Check if AI gave up
    if (text === "UNKNOWN" || text.length < 3) {
      return null;
    }

    // Clean up any quotes or extra formatting
    return text.replace(/^["']|["']$/g, "").trim();
  } catch (error) {
    console.warn(
      `[Enrich] AI title generation failed:`,
      error instanceof Error ? error.message : "Unknown error"
    );
    return null;
  }
}

/**
 * Batch enrich multiple links.
 * Returns results in the same order as input.
 */
export async function enrichLinks(
  links: LinkToEnrich[]
): Promise<EnrichmentResult[]> {
  const results: EnrichmentResult[] = [];

  for (const link of links) {
    const result = await enrichLink(link);
    results.push(result);

    // Small delay between requests to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return results;
}
