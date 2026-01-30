/**
 * Mercury Parser Integration
 *
 * Free, self-hosted article extraction using Postlight's Mercury Parser.
 * Handles ~70% of standard article URLs without external API calls.
 */

import Parser from "@postlight/parser";

export interface MercuryResult {
  title: string | null;
  description: string | null;
  author: string | null;
  imageUrl: string | null;
  publishedAt: Date | null;
  content: string | null;
  wordCount: number | null;
}

/**
 * Extract article metadata using Mercury Parser.
 * Returns null if extraction fails completely.
 */
export async function extractWithMercury(url: string): Promise<MercuryResult | null> {
  try {
    const result = await Parser.parse(url, {
      // Don't fetch custom headers - use defaults
    });

    // Mercury returns empty strings for missing fields, normalize to null
    const title = result.title?.trim() || null;
    const excerpt = result.excerpt?.trim() || null;
    const author = result.author?.trim() || null;
    const leadImage = result.lead_image_url?.trim() || null;
    const content = result.content?.trim() || null;
    const wordCount = result.word_count || null;

    // Parse published date if available
    let publishedAt: Date | null = null;
    if (result.date_published) {
      try {
        publishedAt = new Date(result.date_published);
        // Validate the date
        if (isNaN(publishedAt.getTime())) {
          publishedAt = null;
        }
      } catch {
        publishedAt = null;
      }
    }

    // If we got absolutely nothing useful, return null
    if (!title && !excerpt && !content) {
      return null;
    }

    return {
      title,
      description: excerpt,
      author,
      imageUrl: leadImage,
      publishedAt,
      content,
      wordCount,
    };
  } catch (error) {
    // Mercury can throw on network errors, invalid URLs, etc.
    // Log for debugging but return null to allow fallback
    console.warn(`Mercury Parser failed for ${url}:`, error instanceof Error ? error.message : "Unknown error");
    return null;
  }
}

/**
 * Test Mercury Parser with a known URL.
 * Useful for debugging and smoke tests.
 */
export async function testMercury(url: string): Promise<void> {
  console.log(`Testing Mercury Parser with: ${url}\n`);

  const result = await extractWithMercury(url);

  if (result) {
    console.log("Success!");
    console.log(`  Title: ${result.title}`);
    console.log(`  Description: ${result.description?.substring(0, 100)}...`);
    console.log(`  Author: ${result.author}`);
    console.log(`  Image: ${result.imageUrl}`);
    console.log(`  Published: ${result.publishedAt}`);
    console.log(`  Word count: ${result.wordCount}`);
  } else {
    console.log("Failed - no data extracted");
  }
}
