/**
 * Digest Generation Prompts
 *
 * Templates for AI-powered digest generation with Daily Bunch voice.
 */

import { VOICE_GUIDE } from "./voice-guide";

export interface DigestContext {
  topLinks: Array<{
    title: string;
    url: string;
    velocity: number;
    sourceNames: string[];
    categoryName?: string;
    aiSummary?: string;
    culturalWhyNow?: string;
    culturalThread?: string;
  }>;
  risingLinks: Array<{
    title: string;
    url: string;
    recentVelocity: number;
    categoryName?: string;
  }>;
  entityTrends: Array<{
    name: string;
    type: string;
    velocity: number;
    trend: string;
  }>;
  periodStart: Date;
  periodEnd: Date;
}

/**
 * Generate digest content prompt
 */
export function getDigestPrompt(context: DigestContext): string {
  const periodLabel = context.periodStart.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  });

  const topLinksFormatted = context.topLinks
    .map(
      (link, i) => `
${i + 1}. ${link.title}
   URL: ${link.url}
   Velocity: ${link.velocity} sources (${link.sourceNames.slice(0, 3).join(", ")})
   Category: ${link.categoryName || "General"}
   ${link.aiSummary ? `Summary: ${link.aiSummary}` : ""}
   ${link.culturalWhyNow ? `Why Now: ${link.culturalWhyNow}` : ""}
   ${link.culturalThread ? `Thread: ${link.culturalThread}` : ""}
`
    )
    .join("\n");

  const risingFormatted =
    context.risingLinks.length > 0
      ? context.risingLinks
          .map(
            (link) =>
              `- ${link.title} (${link.recentVelocity} sources in 24h, ${link.categoryName || "General"})`
          )
          .join("\n")
      : "No significant acceleration this period.";

  const entityTrendsFormatted =
    context.entityTrends.length > 0
      ? context.entityTrends
          .map(
            (e) =>
              `- ${e.name} (${e.type}): ${e.velocity} mentions, ${e.trend}`
          )
          .join("\n")
      : "No significant entity movements.";

  return `
You are the editor of Daily Bunch writing this week's digest. Your job is to synthesize the signal into a coherent narrative—not just list links, but tell readers what's happening in the cultural conversation.

${VOICE_GUIDE}

PERIOD: Week of ${periodLabel}

TOP STORIES BY VELOCITY:
${topLinksFormatted}

RISING FAST (accelerating in last 24h):
${risingFormatted}

ENTITY TRENDS:
${entityTrendsFormatted}

Write a digest that:

1. Opens with the single most important insight or pattern (not just "here's what happened")

2. Groups related stories into 2-3 thematic sections. For each:
   - Section title (descriptive, not generic like "Tech News")
   - 100-150 words explaining the theme and key links
   - WHY these things are connected

3. "Rising Fast" callout: 2-3 sentences on what's accelerating

4. Closes with a forward-looking observation: what to watch next week

FORMATTING:
- Length: 500-700 words total
- Links inline using markdown: [Title](url)
- No bullet points or numbered lists—use prose
- Section headers in bold, not markdown headers

Respond with ONLY the digest content, no meta-commentary.
`.trim();
}

/**
 * Schema for digest response
 */
export interface DigestResult {
  content: string;
  sections: Array<{
    title: string;
    content: string;
    linkUrls: string[];
  }>;
  risingCallout: string;
  forwardLook: string;
}
