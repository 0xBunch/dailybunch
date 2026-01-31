/**
 * Scoring & Velocity Calculations
 *
 * Calculates weighted velocity scores based on source trust tiers.
 */

/**
 * Source tier weights for scoring
 * TIER_1: Major publications (NYT, WSJ, The Atlantic, etc.)
 * TIER_2: Top newsletters (Stratechery, Not Boring, etc.)
 * TIER_3: Quality blogs and Substacks
 * TIER_4: Aggregators, link roundups
 */
export const TIER_WEIGHTS: Record<string, number> = {
  TIER_1: 10,
  TIER_2: 7,
  TIER_3: 5,
  TIER_4: 2,
};

/**
 * Get the weight for a source tier
 */
export function getTierWeight(tier: string): number {
  return TIER_WEIGHTS[tier] ?? 5; // Default to TIER_3 weight
}

/**
 * Time decay weights for recency
 * Recent mentions count more than older ones
 */
export const TIME_WEIGHTS = {
  LAST_24H: 1.0,
  LAST_48H: 0.7,
  LAST_72H: 0.4,
  OLDER: 0.2,
};

/**
 * Get time weight based on how old a mention is
 */
export function getTimeWeight(mentionDate: Date): number {
  const now = Date.now();
  const mentionTime = mentionDate.getTime();
  const hoursAgo = (now - mentionTime) / (1000 * 60 * 60);

  if (hoursAgo <= 24) return TIME_WEIGHTS.LAST_24H;
  if (hoursAgo <= 48) return TIME_WEIGHTS.LAST_48H;
  if (hoursAgo <= 72) return TIME_WEIGHTS.LAST_72H;
  return TIME_WEIGHTS.OLDER;
}

/**
 * Mention with source info for scoring
 */
interface MentionForScoring {
  seenAt: Date;
  source: {
    trustScore: number;
    tier: string;
  };
}

/**
 * Calculate weighted velocity for a link
 *
 * Combines:
 * - Source trust score (1-10)
 * - Source tier weight (2-10)
 * - Time decay (older mentions count less)
 *
 * @param mentions - Array of mentions with source info
 * @returns Weighted velocity score
 */
export function calculateWeightedVelocity(
  mentions: MentionForScoring[]
): number {
  if (mentions.length === 0) return 0;

  let totalScore = 0;

  for (const mention of mentions) {
    const trustWeight = mention.source.trustScore / 10; // Normalize to 0-1
    const tierWeight = getTierWeight(mention.source.tier) / 10; // Normalize to 0-1
    const timeWeight = getTimeWeight(mention.seenAt);

    // Combine weights: trust * tier * time
    // This gives higher scores to recent mentions from high-trust, high-tier sources
    const mentionScore = trustWeight * tierWeight * timeWeight;
    totalScore += mentionScore;
  }

  // Scale to a reasonable range (multiply by 10 for readability)
  return Math.round(totalScore * 100) / 10;
}

/**
 * Calculate simple velocity (distinct source count)
 */
export function calculateVelocity(
  mentions: { sourceId: string }[]
): number {
  const uniqueSources = new Set(mentions.map((m) => m.sourceId));
  return uniqueSources.size;
}

/**
 * Get velocity with time-based weighting
 * Uses the time weights to decay older mentions
 */
export function calculateTimeWeightedVelocity(
  mentions: { seenAt: Date; sourceId: string }[]
): number {
  if (mentions.length === 0) return 0;

  // Group by source to count unique sources
  const sourceScores = new Map<string, number>();

  for (const mention of mentions) {
    const timeWeight = getTimeWeight(mention.seenAt);
    const currentScore = sourceScores.get(mention.sourceId) ?? 0;
    // Take max score per source (most recent mention)
    sourceScores.set(mention.sourceId, Math.max(currentScore, timeWeight));
  }

  // Sum all source scores
  let total = 0;
  for (const score of sourceScores.values()) {
    total += score;
  }

  return Math.round(total * 10) / 10;
}

/**
 * Determine if a link is "trending"
 * Trending = velocity >= 2 AND weighted velocity >= 1.5
 */
export function isTrending(
  velocity: number,
  weightedVelocity: number
): boolean {
  return velocity >= 2 && weightedVelocity >= 1.5;
}

/**
 * Calculate score for ranking (combines multiple factors)
 * Uses Hacker News-style time decay
 */
export function calculateRankingScore(
  velocity: number,
  weightedVelocity: number,
  hoursOld: number,
  gravity: number = 1.8
): number {
  const baseScore = velocity * weightedVelocity;
  const timeDecay = Math.pow(hoursOld + 2, gravity);
  return baseScore / timeDecay;
}

/**
 * Get tier label for display
 */
export function getTierLabel(tier: string): string {
  switch (tier) {
    case "TIER_1":
      return "Tier 1 (Major Publication)";
    case "TIER_2":
      return "Tier 2 (Top Newsletter)";
    case "TIER_3":
      return "Tier 3 (Quality Blog)";
    case "TIER_4":
      return "Tier 4 (Aggregator)";
    default:
      return tier;
  }
}

/**
 * Available tiers for selection
 */
export const TIERS = [
  { value: "TIER_1", label: "Tier 1 - Major Publications", weight: 10 },
  { value: "TIER_2", label: "Tier 2 - Top Newsletters", weight: 7 },
  { value: "TIER_3", label: "Tier 3 - Quality Blogs", weight: 5 },
  { value: "TIER_4", label: "Tier 4 - Aggregators", weight: 2 },
];
