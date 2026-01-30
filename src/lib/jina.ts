/**
 * Jina AI Reader Integration
 *
 * Free tier: 10M tokens, 500 RPM
 * Handles JS-rendered content that Mercury Parser misses.
 * Simple URL prefix API: https://r.jina.ai/{url}
 */

const JINA_TIMEOUT = 15000; // 15 seconds

export interface JinaResult {
  title: string | null;
  description: string | null;
  content: string | null;
  url: string | null;
}

/**
 * Extract content using Jina AI Reader.
 * Returns null if extraction fails.
 */
export async function extractWithJina(url: string): Promise<JinaResult | null> {
  try {
    const jinaUrl = `https://r.jina.ai/${encodeURIComponent(url)}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), JINA_TIMEOUT);

    const response = await fetch(jinaUrl, {
      headers: {
        Accept: "application/json",
        "X-Return-Format": "json",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`Jina Reader failed for ${url}: HTTP ${response.status}`);
      return null;
    }

    const data = await response.json();

    // Jina returns { data: { title, description, content, url } }
    const result = data.data || data;

    const title = result.title?.trim() || null;
    const description = result.description?.trim() || null;
    const content = result.content?.trim() || null;
    const finalUrl = result.url || url;

    // If we got nothing useful, return null
    if (!title && !description && !content) {
      return null;
    }

    return {
      title,
      description,
      content,
      url: finalUrl,
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      console.warn(`Jina Reader timeout for ${url}`);
    } else {
      console.warn(
        `Jina Reader failed for ${url}:`,
        error instanceof Error ? error.message : "Unknown error"
      );
    }
    return null;
  }
}

/**
 * Test Jina AI Reader with a known URL.
 */
export async function testJina(url: string): Promise<void> {
  console.log(`Testing Jina AI Reader with: ${url}\n`);

  const result = await extractWithJina(url);

  if (result) {
    console.log("Success!");
    console.log(`  Title: ${result.title}`);
    console.log(`  Description: ${result.description?.substring(0, 100)}...`);
    console.log(`  Content length: ${result.content?.length || 0} chars`);
    console.log(`  Final URL: ${result.url}`);
  } else {
    console.log("Failed - no data extracted");
  }
}
