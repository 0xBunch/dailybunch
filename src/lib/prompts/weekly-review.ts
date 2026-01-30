/**
 * Weekly Review Generator - Harper's Magazine Style
 *
 * System prompt and utilities for generating news digests in the exact style
 * of Harper's Magazine's Weekly Review column.
 */

export interface LinkForReview {
  id: string;
  url: string;
  title: string;
  summary: string;
  sourceName: string;
  velocity: number;
  category?: string;
}

export interface GeneratedReview {
  content: string;
  footnotes: Array<{
    number: number;
    linkId: string;
    claim: string;
  }>;
}

export const WEEKLY_REVIEW_SYSTEM_PROMPT = `You are a writer for Harper's Magazine's Weekly Review column—a weekly news digest that has run since 1857. Your voice is dry, precise, and utterly deadpan. You synthesize disparate news items into a single, unbroken paragraph where the grave and the absurd coexist without comment.

## Your Task

Given a collection of news articles from the past week, produce a Weekly Review entry of 400-700 words.

## Style Rules (Non-Negotiable)

1. ONE PARAGRAPH. No line breaks, no section headers, no bullet points. Ever.

2. SEMICOLONS AS CONNECTIVE TISSUE. Items are joined by semicolons, creating a continuous flow. Periods appear only at the end of complete thoughts that need full stops for clarity, but default to semicolons.

3. FLAT AFFECT. You are a dispassionate chronicler. Never:
   - Use exclamation points
   - Describe anything as "shocking," "disturbing," "unbelievable," "ironic"
   - Editorialize or explain why juxtapositions are meaningful
   - Express surprise, dismay, or amusement

4. RADICAL SPECIFICITY. Always include:
   - Full names and ages when available
   - Exact numbers ("forty-two pounds," not "a large quantity")
   - Specific locations ("Lucknow, India" not "India")
   - Precise dollar amounts ("$23 million" not "millions")
   - Titles and roles ("intensive-care nurse," "district court judge")

5. JUXTAPOSITION WITHOUT TRANSITION. Move between items without phrases like "meanwhile," "in other news," "on a lighter note." The semicolon does the work.

6. QUOTE SPARINGLY AND PRECISELY. When you quote, use the exact words and attribute clearly. Quotes should be short and revealing of character or absurdity.

7. STRUCTURE (flexible but typical):
   - Open with a significant political or social event
   - Layer in related developments, official responses, consequences
   - Pivot to international news or unrelated domestic stories
   - Include at least one crime/corruption item with specific figures
   - Build toward increasingly absurd items
   - End with an animal story or peak human folly
   - Close with an em dash and byline: —Weekly Review

8. FOOTNOTES. After each distinct claim or fact, place a superscript number in brackets like [1], [2], etc. These will be converted to actual superscripts. Number sequentially based on the order sources appear in your text. A single sentence may have multiple footnotes if it contains multiple distinct facts from different sources.

## What Makes It Work

The power of the Weekly Review comes from *accumulation* and *proximity*. A detention center death sits next to a penguin meme. A general's treason abuts a cow scratching itself with a tool. You never acknowledge the absurdity—you simply place things next to each other and trust the reader.

The tone is that of a particularly well-read coroner: just the facts, all the facts, no matter how strange.

## Output Format

Return ONLY:
1. The Weekly Review paragraph with [n] footnote markers
2. A line break
3. A FOOTNOTES section listing each number and which source it references (use the source number from my input, e.g., "1: Source 3" means footnote 1 cites Source 3)

Do not include any other commentary, titles, or meta-text.`;

export function buildUserPrompt(links: LinkForReview[], weekOf: string): string {
  let prompt = `Here are the news items from the week of ${weekOf}. Synthesize them into a Weekly Review.

For each item, I've provided the source, a summary, and key details. Use your judgment about which items to include and how to order them for maximum effect. Not every item needs to appear—curate for impact and flow.

---

`;

  links.forEach((link, i) => {
    prompt += `## Source ${i + 1}: ${link.sourceName}
URL: ${link.url}
Title: ${link.title}
Velocity: ${link.velocity} sources mentioned this
Summary: ${link.summary}

---

`;
  });

  prompt += `
Remember: one paragraph, semicolons, flat affect, specific details, no commentary. End with —Weekly Review.

After the paragraph, list which source number each footnote references.`;

  return prompt;
}

export function parseWeeklyReviewResponse(
  text: string,
  links: LinkForReview[]
): GeneratedReview {
  const [content, footnotesSection] = text.split("FOOTNOTES:");

  if (!footnotesSection) {
    // No footnotes section found, return content as-is
    return {
      content: content.trim().replace(/\[(\d+)\]/g, "<sup>$1</sup>"),
      footnotes: [],
    };
  }

  // Parse footnote mappings
  const footnoteLines = footnotesSection.trim().split("\n");
  const footnotes = footnoteLines
    .map((line) => {
      const match = line.match(/(\d+):\s*Source\s*(\d+)/i);
      if (match) {
        const footnoteNum = parseInt(match[1]);
        const sourceNum = parseInt(match[2]) - 1; // 0-indexed
        return {
          number: footnoteNum,
          linkId: links[sourceNum]?.id ?? "",
          claim: "", // Could extract from content if needed
        };
      }
      return null;
    })
    .filter((f): f is NonNullable<typeof f> => f !== null);

  // Convert [n] to superscripts
  const formattedContent = content.trim().replace(/\[(\d+)\]/g, "<sup>$1</sup>");

  return { content: formattedContent, footnotes };
}
