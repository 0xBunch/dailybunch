/**
 * AI Prompts Index
 *
 * Central export for all AI prompt templates and voice guidelines.
 */

// Voice and style
export { VOICE_GUIDE, PERSONAS, getPersonaInstruction } from "./voice-guide";

// Layer 1: Enrichment (categorization, entities, summaries)
export {
  getEnrichmentPrompt,
  getBatchEnrichmentPrompt,
  type EnrichmentContext,
  type EnrichmentResult,
} from "./enrichment";

// Layer 2: Cultural analysis
export {
  getCulturalAnalysisPrompt,
  getCommentaryPrompt,
  type CulturalAnalysisResult,
} from "./analysis";

// Digest generation
export {
  getDigestPrompt,
  type DigestContext,
  type DigestResult,
} from "./digest";
