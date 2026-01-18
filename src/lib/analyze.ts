import Anthropic from "@anthropic-ai/sdk";
import prisma from "@/lib/db";

/**
 * AI Link Analysis Service
 *
 * Uses Claude to:
 * 1. Categorize links
 * 2. Extract mentioned entities
 * 3. Generate summaries
 * 4. Suggest new entities (queued for approval)
 */

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

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

export async function analyzeLink(
  url: string,
  title?: string | null,
  description?: string | null
): Promise<AnalysisResult | null> {
  try {
    const taxonomy = await getTaxonomy();
    const entities = await getEntities();

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

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    // Extract text from response
    const responseText =
      message.content[0].type === "text" ? message.content[0].text : "";

    // Parse JSON response
    const parsed = JSON.parse(responseText);

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
        (s) => s.name.toLowerCase() === parsed.subcategory.toLowerCase()
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

    return {
      categorySlug,
      subcategorySlug,
      summary: parsed.summary || "",
      matchedEntityIds,
      suggestedEntities: parsed.suggestedEntities || [],
    };
  } catch (error) {
    console.error("AI analysis error:", error);
    return null;
  }
}

/**
 * Analyze a link and update the database
 */
export async function analyzeAndUpdateLink(linkId: string): Promise<boolean> {
  try {
    const link = await prisma.link.findUnique({
      where: { id: linkId },
    });

    if (!link) {
      console.error(`Link not found: ${linkId}`);
      return false;
    }

    // Skip if already analyzed
    if (link.aiAnalyzedAt) {
      return true;
    }

    const result = await analyzeLink(
      link.canonicalUrl,
      link.title,
      link.description
    );

    if (!result) {
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

    // Update the link
    await prisma.link.update({
      where: { id: linkId },
      data: {
        categoryId: category?.id || null,
        subcategoryId,
        aiSummary: result.summary,
        aiAnalyzedAt: new Date(),
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
    console.error("Error analyzing link:", error);
    return false;
  }
}

/**
 * Batch analyze unanalyzed links (for cron job)
 */
export async function analyzeUnanalyzedLinks(limit = 10): Promise<{
  analyzed: number;
  failed: number;
}> {
  const links = await prisma.link.findMany({
    where: {
      aiAnalyzedAt: null,
      title: { not: null }, // Only analyze links with titles
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  let analyzed = 0;
  let failed = 0;

  for (const link of links) {
    const success = await analyzeAndUpdateLink(link.id);
    if (success) {
      analyzed++;
    } else {
      failed++;
    }

    // Small delay to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return { analyzed, failed };
}
