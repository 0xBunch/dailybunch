/**
 * Cultural Analysis Prompts
 *
 * Templates for AI-powered cultural analysis (Layer 2: positioning and context)
 */

import { VOICE_GUIDE, getPersonaInstruction, PERSONAS } from "./voice-guide";

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
 * Cultural analysis prompt for high-velocity links
 */
export function getCulturalAnalysisPrompt(context: AnalysisContext): string {
  const entitiesFormatted = context.entities
    ? [
        ...(context.entities.people || []),
        ...(context.entities.organizations || []),
        ...(context.entities.products || []),
      ].join(", ")
    : "N/A";

  const otherTrending = context.otherTrendingLinks
    ? context.otherTrendingLinks
        .slice(0, 10)
        .map((l) => `- ${l.title} (velocity: ${l.velocity})`)
        .join("\n")
    : "N/A";

  return `
You are the editor of Daily Bunch, a cultural intelligence publication that surfaces what tastemakers are collectively pointing at. You've been tracking this space for years and have sharp instincts.

${VOICE_GUIDE}

Here's a link that's getting attention:
- Title: ${context.title}
- URL: ${context.url}
- Summary: ${context.summary || "N/A"}
- Velocity: ${context.velocity} sources (${context.sourceNames.slice(0, 5).join(", ")})
- First seen: ${context.firstSeenAt.toISOString()}
- Categories: ${context.categories?.join(", ") || "N/A"}
- Key entities: ${entitiesFormatted}

Other trending links this week:
${otherTrending}

Analyze this link and provide:

1. WHY NOW (2-3 sentences): What cultural moment or conversation does this fit into? Why is this resonating right now specifically? Don't just describe what the article says—explain the context that makes it timely.

2. THE TENSION (1-2 sentences): Every interesting story has a tension at its core. What's the underlying debate, contradiction, or stakes here?

3. THE THREAD (2-3 sentences): What other stories or trends does this connect to? Look at the other trending links—are there patterns? How does this fit into a larger narrative?

4. THE PREDICTION (one word + 1 sentence): Is this story "growing" (more sources will pick it up), "peaking" (highest attention now), or "fading" (already past peak)? Why?

5. THE CONTRARIAN VIEW (1-2 sentences): What's the angle that isn't being discussed? What would a sophisticated reader push back with?

Be specific. Be opinionated. Avoid hedging language.

Respond in JSON format:
{
  "whyNow": "...",
  "tension": "...",
  "thread": "...",
  "prediction": "growing" | "peaking" | "fading",
  "predictionReason": "...",
  "contrarian": "..."
}
`.trim();
}

/**
 * Commentary prompt for link detail pages
 */
export function getCommentaryPrompt(
  context: AnalysisContext,
  persona?: keyof typeof PERSONAS
): string {
  const personaInstruction = persona
    ? getPersonaInstruction(persona)
    : "";

  return `
You're writing a brief commentary for Daily Bunch readers. This appears on the link's detail page.

${VOICE_GUIDE}

${personaInstruction}

THE LINK:
Title: ${context.title}
URL: ${context.url}
Summary: ${context.summary || "N/A"}
Velocity: ${context.velocity} sources
First seen: ${context.firstSeenAt.toISOString()}
Categories: ${context.categories?.join(", ") || "N/A"}
Sources: ${context.sourceNames.slice(0, 5).join(", ")}

Write 2-3 sentences that:
1. Add context a casual reader wouldn't have (not just summarize)
2. Connect to broader trends or other stories
3. Optionally make a prediction or note a contrarian angle

Do NOT start with "This article..." or "This piece..." - jump straight to the insight.
Keep it under 75 words.
`.trim();
}

/**
 * Schema for cultural analysis response
 */
export interface CulturalAnalysisResult {
  whyNow: string;
  tension: string;
  thread: string;
  prediction: "growing" | "peaking" | "fading";
  predictionReason: string;
  contrarian: string;
}
