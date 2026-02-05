/**
 * Link Enrichment Prompts
 *
 * Templates for AI-powered link enrichment (Layer 1: factual extraction)
 * Uses voice-guided summaries to maintain consistent editorial tone.
 */

export interface EnrichmentContext {
  url: string;
  title?: string;
  description?: string;
  content?: string;
  taxonomy?: string;
  entities?: Array<{
    name: string;
    type: string;
    aliases: string[];
  }>;
}

/**
 * Single link enrichment prompt
 *
 * Uses the Daily Bunch voice guide for summaries and supports
 * the existing taxonomy/entity system for categorization.
 */
export function getEnrichmentPrompt(context: EnrichmentContext): string {
  const { url, title, description, content, taxonomy, entities } = context;

  // Format entities for the prompt
  const entityList = entities
    ? entities
        .map(
          (e) =>
            `- ${e.name} (${e.type})${e.aliases.length ? ` [aliases: ${e.aliases.join(", ")}]` : ""}`
        )
        .join("\n")
    : null;

  // Include taxonomy if provided
  const taxonomySection = taxonomy
    ? `
TAXONOMY (pick the best fit):
${taxonomy}
`
    : "";

  // Include entities if provided
  const entitiesSection = entityList
    ? `
KNOWN ENTITIES (match any that are relevant):
${entityList}
`
    : "";

  // Voice guide excerpt for summary writing
  const voiceExcerpt = `
SUMMARY STYLE:
- Be specific: use numbers and concrete details
- Be confident: no hedging ("it seems," "perhaps")
- Be economical: every word earns its place
- Avoid starting with "This article..." or "This piece..."
`.trim();

  return `Analyze this link and provide structured data.

URL: ${url}
Title: ${title || "Unknown"}
${description ? `Description: ${description}` : ""}
${content ? `Content (excerpt): ${content.slice(0, 1500)}` : ""}
${taxonomySection}${entitiesSection}
${voiceExcerpt}

Respond with valid JSON only, no markdown code blocks:
{
  "category": "CATEGORY_NAME",
  "subcategory": "subcategory_name or null",
  "summary": "2-3 sentence summary following the voice guidelines above",
  "matchedEntities": ["Entity Name 1", "Entity Name 2"],
  "suggestedEntities": [
    {"name": "New Person/Company", "type": "person|organization|product|athlete|brand|event|place|media_outlet", "aliases": ["alias1"]}
  ]
}

Rules:
- Only match entities if they are clearly relevant to the content
- Only suggest new entities if they are notable figures, companies, or products worth tracking
- Keep summary concise and factual, following the voice guidelines
- If unsure about category, use CULTURE as default`;
}

/**
 * Batch enrichment prompt for multiple links
 */
export function getBatchEnrichmentPrompt(
  links: Array<{
    id: string;
    url: string;
    title?: string;
    content?: string;
  }>,
  taxonomy?: string,
  entities?: Array<{ name: string; type: string; aliases: string[] }>
): string {
  const linksFormatted = links
    .map(
      (link, i) => `
[${i + 1}] ID: ${link.id}
URL: ${link.url}
${link.title ? `Title: ${link.title}` : ""}
${link.content ? `Content: ${link.content.slice(0, 1500)}` : ""}
`
    )
    .join("\n---\n");

  const taxonomySection = taxonomy ? `\nTAXONOMY:\n${taxonomy}\n` : "";

  const entityList = entities
    ? entities
        .map(
          (e) =>
            `- ${e.name} (${e.type})${e.aliases.length ? ` [aliases: ${e.aliases.join(", ")}]` : ""}`
        )
        .join("\n")
    : null;
  const entitiesSection = entityList
    ? `\nKNOWN ENTITIES:\n${entityList}\n`
    : "";

  return `
Analyze each of these ${links.length} articles and provide structured data.
${taxonomySection}${entitiesSection}
ARTICLES:
${linksFormatted}

For each article, extract:
- id: The article ID (copy exactly from input)
- category: Best fit from taxonomy (or "Culture" if unsure)
- subcategory: If applicable
- summary: 1-2 sentences capturing the key point. Be specific and use numbers where relevant.
- matchedEntities: Array of entity names from the known entities list
- suggestedEntities: Array of notable new entities worth tracking

Respond with a JSON array of ${links.length} objects, in the same order as the input.
IMPORTANT: Respond ONLY with the JSON array, no markdown code blocks, no other text.
`.trim();
}

/**
 * Schema for enrichment response validation
 */
export type EntityType = "person" | "organization" | "product" | "athlete" | "brand" | "event" | "place" | "media_outlet";

export interface EnrichmentResult {
  id?: string;
  category: string;
  subcategory?: string | null;
  summary: string;
  matchedEntities: string[];
  suggestedEntities: Array<{
    name: string;
    type: EntityType;
    aliases: string[];
  }>;
}
