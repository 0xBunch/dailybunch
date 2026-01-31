/**
 * AI Services Index
 *
 * Central export for all AI-powered services.
 */

// Prompts and templates
export {
  VOICE_GUIDE,
  PERSONAS,
  getPersonaInstruction,
  getEnrichmentPrompt,
  getBatchEnrichmentPrompt,
  getCulturalAnalysisPrompt,
  getCommentaryPrompt,
  type EnrichmentContext,
  type EnrichmentResult,
  type CulturalAnalysisResult,
} from "./prompts";

// Cultural analysis (Layer 2)
export {
  analyzeLinkCulturally,
  analyzeHighVelocityLinks,
} from "./cultural-analysis";

// Commentary engine
export {
  generateCommentary,
  generateMissingCommentary,
  regenerateCommentary,
} from "./commentary";

// Digest generation
export {
  gatherDigestContext,
  generateDigest,
  createDigest,
} from "./digest";
