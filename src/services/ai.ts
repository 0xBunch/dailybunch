import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { EntityType } from "@prisma/client";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface LinkAnalysis {
  title: string;
  summary: string;
  categorySlug: string | null;
  subcategorySlug: string | null;
  matchedEntityIds: string[];
  suggestedEntities: Array<{
    name: string;
    type: EntityType;
    reason: string;
  }>;
}

/**
 * Fetch page metadata (title, description) for a URL
 */
async function fetchPageMetadata(url: string): Promise<{
  title?: string;
  description?: string;
}> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; DailyBunch/1.0; +https://dailybunch.com)",
      },
      signal: AbortSignal.timeout(10000),
    });

    const html = await response.text();

    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch?.[1]?.trim();

    // Extract meta description
    const descMatch = html.match(
      /<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i
    );
    const description = descMatch?.[1]?.trim();

    return { title, description };
  } catch {
    return {};
  }
}

/**
 * Analyze a link using Claude AI
 */
export async function analyzeLink(linkId: string): Promise<LinkAnalysis | null> {
  const link = await prisma.link.findUnique({
    where: { id: linkId },
    include: {
      mentions: {
        include: {
          source: {
            include: {
              category: true,
            },
          },
        },
      },
    },
  });

  if (!link) return null;

  // Get categories and entities for context
  const [categories, entities] = await Promise.all([
    prisma.category.findMany({
      include: { subcategories: true },
    }),
    prisma.entity.findMany({
      where: { isActive: true },
    }),
  ]);

  // Fetch page metadata if we don't have a title
  let pageTitle = link.title;
  let pageDescription = link.description;

  if (!pageTitle) {
    const metadata = await fetchPageMetadata(link.url);
    pageTitle = metadata.title ?? null;
    pageDescription = metadata.description ?? null;
  }

  // Build context from mentions
  const mentionContext = link.mentions
    .map((m) => `- Source: ${m.source.name} (${m.source.category.name}), Context: "${m.context || "N/A"}"`)
    .join("\n");

  // Build category list
  const categoryList = categories
    .map((c) => {
      const subs = c.subcategories.map((s) => s.slug).join(", ");
      return `- ${c.slug}${subs ? ` (subcategories: ${subs})` : ""}`;
    })
    .join("\n");

  // Build entity list
  const entityList = entities
    .map((e) => `- ${e.name} (${e.type.toLowerCase()})${e.aliases.length ? ` aliases: ${e.aliases.join(", ")}` : ""}`)
    .join("\n");

  const prompt = `Analyze this link and provide categorization:

URL: ${link.url}
Domain: ${link.domain}
Page Title: ${pageTitle || "Unknown"}
Page Description: ${pageDescription || "Unknown"}

Mentions from sources:
${mentionContext}

Available categories:
${categoryList}

Known entities to match:
${entityList}

Respond with JSON only (no markdown):
{
  "title": "A clean, concise title for this link (use page title if good, or improve it)",
  "summary": "A 1-2 sentence summary of what this link is about",
  "categorySlug": "the best matching category slug or null",
  "subcategorySlug": "the best matching subcategory slug or null",
  "matchedEntityNames": ["List of entity names from the known entities that are relevant to this link"],
  "suggestedEntities": [
    {
      "name": "Name of a new entity worth tracking",
      "type": "PERSON or ORGANIZATION or PRODUCT",
      "reason": "Why this entity should be added"
    }
  ]
}

Only suggest new entities if they are significant and likely to appear in multiple links. Keep suggestions minimal.`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== "text") return null;

    // Parse JSON response
    const analysis = JSON.parse(content.text);

    // Look up entity IDs from names
    const matchedEntityIds: string[] = [];
    for (const name of analysis.matchedEntityNames || []) {
      const entity = entities.find(
        (e) =>
          e.name.toLowerCase() === name.toLowerCase() ||
          e.aliases.some((a) => a.toLowerCase() === name.toLowerCase())
      );
      if (entity) {
        matchedEntityIds.push(entity.id);
      }
    }

    return {
      title: analysis.title,
      summary: analysis.summary,
      categorySlug: analysis.categorySlug,
      subcategorySlug: analysis.subcategorySlug,
      matchedEntityIds,
      suggestedEntities: analysis.suggestedEntities || [],
    };
  } catch (error) {
    console.error("Error analyzing link with AI:", error);
    return null;
  }
}

/**
 * Process AI analysis and update link in database
 */
export async function processLinkAnalysis(linkId: string): Promise<boolean> {
  const analysis = await analyzeLink(linkId);
  if (!analysis) return false;

  // Look up category and subcategory IDs
  let categoryId: string | null = null;
  let subcategoryId: string | null = null;

  if (analysis.categorySlug) {
    const category = await prisma.category.findUnique({
      where: { slug: analysis.categorySlug },
    });
    categoryId = category?.id || null;

    if (categoryId && analysis.subcategorySlug) {
      const subcategory = await prisma.subcategory.findFirst({
        where: {
          categoryId,
          slug: analysis.subcategorySlug,
        },
      });
      subcategoryId = subcategory?.id || null;
    }
  }

  // Update link
  await prisma.link.update({
    where: { id: linkId },
    data: {
      title: analysis.title,
      aiSummary: analysis.summary,
      categoryId,
      subcategoryId,
      aiProcessedAt: new Date(),
    },
  });

  // Create entity links
  for (const entityId of analysis.matchedEntityIds) {
    await prisma.linkEntity.upsert({
      where: {
        linkId_entityId: {
          linkId,
          entityId,
        },
      },
      create: {
        linkId,
        entityId,
      },
      update: {},
    });
  }

  // Create suggested entities
  for (const suggestion of analysis.suggestedEntities) {
    await prisma.suggestedEntity.create({
      data: {
        name: suggestion.name,
        type: suggestion.type,
        reason: suggestion.reason,
        linkId,
      },
    });
  }

  return true;
}

/**
 * Process all unanalyzed links
 */
export async function processUnanalyzedLinks(
  limit: number = 10
): Promise<{ processed: number; errors: number }> {
  const links = await prisma.link.findMany({
    where: {
      aiProcessedAt: null,
    },
    take: limit,
    orderBy: {
      createdAt: "desc",
    },
  });

  let processed = 0;
  let errors = 0;

  for (const link of links) {
    try {
      const success = await processLinkAnalysis(link.id);
      if (success) {
        processed++;
      } else {
        errors++;
      }
      // Rate limit AI calls
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`Error processing link ${link.id}:`, error);
      errors++;
    }
  }

  return { processed, errors };
}
