import Anthropic from "@anthropic-ai/sdk";
import { isMockMode } from "@/lib/utils";

// Real Anthropic client (only created if API key exists)
const getClient = () => {
  if (!process.env.ANTHROPIC_API_KEY) {
    return null;
  }
  return new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });
};

export interface EnrichmentResult {
  summary: string;
  category: string;
  tags: string[];
  readingTime: string;
}

export interface SummaryResult {
  summary: string;
}

// Mock responses for development
const mockEnrichment = (title: string, description?: string): EnrichmentResult => {
  const categories = ["Technology", "Business", "Science", "Culture", "Design", "Politics"];
  const tagOptions = ["ai", "startup", "programming", "web", "mobile", "data", "security", "cloud"];

  return {
    summary: `${title}. ${description?.slice(0, 100) || "This article explores important topics in the tech industry."}`,
    category: categories[Math.floor(Math.random() * categories.length)],
    tags: tagOptions.slice(0, Math.floor(Math.random() * 3) + 1),
    readingTime: `${Math.floor(Math.random() * 10) + 2} min read`,
  };
};

const mockSummary = (title: string): SummaryResult => {
  return {
    summary: `A concise summary of "${title}". This piece provides insights into current trends and developments.`,
  };
};

export async function enrichLink(
  url: string,
  title: string,
  description?: string,
  content?: string
): Promise<EnrichmentResult> {
  // Use mock in development or if no API key
  if (isMockMode() || !process.env.ANTHROPIC_API_KEY) {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 500));
    return mockEnrichment(title, description);
  }

  const client = getClient();
  if (!client) {
    return mockEnrichment(title, description);
  }

  try {
    const prompt = `Analyze this article and provide:
1. A 2-sentence summary (concise, informative)
2. A single category (Technology, Business, Science, Culture, Design, or Politics)
3. 1-3 relevant tags (lowercase, single words)
4. Estimated reading time

URL: ${url}
Title: ${title}
Description: ${description || "N/A"}
Content excerpt: ${content?.slice(0, 2000) || "N/A"}

Respond in JSON format:
{
  "summary": "...",
  "category": "...",
  "tags": ["...", "..."],
  "readingTime": "X min read"
}`;

    const message = await client.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 500,
      messages: [{ role: "user", content: prompt }],
    });

    const responseText = message.content[0].type === "text" ? message.content[0].text : "";
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as EnrichmentResult;
    }

    return mockEnrichment(title, description);
  } catch (error) {
    console.error("AI enrichment error:", error);
    return mockEnrichment(title, description);
  }
}

export async function summarizeLink(
  title: string,
  description?: string
): Promise<SummaryResult> {
  if (isMockMode() || !process.env.ANTHROPIC_API_KEY) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return mockSummary(title);
  }

  const client = getClient();
  if (!client) {
    return mockSummary(title);
  }

  try {
    const message = await client.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 200,
      messages: [
        {
          role: "user",
          content: `Write a 1-2 sentence summary for this article:
Title: ${title}
Description: ${description || "N/A"}

Be concise and informative. Just return the summary text, no formatting.`,
        },
      ],
    });

    const summary = message.content[0].type === "text" ? message.content[0].text : "";
    return { summary: summary.trim() };
  } catch (error) {
    console.error("AI summary error:", error);
    return mockSummary(title);
  }
}

export async function categorizeLink(
  title: string,
  description?: string
): Promise<{ category: string; tags: string[] }> {
  const enrichment = await enrichLink("", title, description);
  return {
    category: enrichment.category,
    tags: enrichment.tags,
  };
}
