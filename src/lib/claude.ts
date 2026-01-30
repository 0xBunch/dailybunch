/**
 * Claude API Service
 *
 * Handles interactions with Anthropic's Claude API for content generation.
 */

import Anthropic from "@anthropic-ai/sdk";
import {
  WEEKLY_REVIEW_SYSTEM_PROMPT,
  buildUserPrompt,
  parseWeeklyReviewResponse,
  type LinkForReview,
  type GeneratedReview,
} from "./prompts/weekly-review";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface WeeklyReviewGenerationResult {
  success: true;
  content: string;
  footnotes: GeneratedReview["footnotes"];
  inputTokens: number;
  outputTokens: number;
}

export interface WeeklyReviewGenerationError {
  success: false;
  error: string;
}

export type WeeklyReviewResult =
  | WeeklyReviewGenerationResult
  | WeeklyReviewGenerationError;

export async function generateWeeklyReview(
  links: LinkForReview[],
  weekOf: string
): Promise<WeeklyReviewResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return {
      success: false,
      error: "ANTHROPIC_API_KEY not configured",
    };
  }

  if (links.length === 0) {
    return {
      success: false,
      error: "No links provided for review generation",
    };
  }

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2500,
      system: WEEKLY_REVIEW_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: buildUserPrompt(links, weekOf),
        },
      ],
    });

    const rawText =
      response.content[0].type === "text" ? response.content[0].text : "";

    const parsed = parseWeeklyReviewResponse(rawText, links);

    return {
      success: true,
      content: parsed.content,
      footnotes: parsed.footnotes,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    return {
      success: false,
      error: `Claude API error: ${message}`,
    };
  }
}

export { type LinkForReview, type GeneratedReview };
