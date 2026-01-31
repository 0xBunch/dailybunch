/**
 * Polymarket API Client
 *
 * Fetches top prediction markets by volume from Polymarket's Gamma API.
 * Public read-only access, no authentication required.
 */

export interface PolymarketMarket {
  id: string;
  question: string;
  slug: string;
  outcomePrices: string; // JSON string of prices
  volume: number;
  liquidity: number;
  endDate: string;
  active: boolean;
}

export interface FormattedMarket {
  id: string;
  question: string;
  slug: string;
  yesPrice: number; // 0-100 percentage
  volume: number;
  volumeFormatted: string;
  endDate: Date;
}

const GAMMA_API_BASE = "https://gamma-api.polymarket.com";

/**
 * Format volume as human-readable string (e.g., "$2.4M", "$150K")
 */
function formatVolume(volume: number): string {
  if (volume >= 1_000_000) {
    return `$${(volume / 1_000_000).toFixed(1)}M`;
  }
  if (volume >= 1_000) {
    return `$${(volume / 1_000).toFixed(0)}K`;
  }
  return `$${volume.toFixed(0)}`;
}

/**
 * Parse outcome prices from JSON string
 */
function parseOutcomePrices(pricesJson: string): { yes: number; no: number } {
  try {
    const prices = JSON.parse(pricesJson);
    // Prices are typically [yesPrice, noPrice] as decimals
    if (Array.isArray(prices) && prices.length >= 2) {
      return {
        yes: Math.round(parseFloat(prices[0]) * 100),
        no: Math.round(parseFloat(prices[1]) * 100),
      };
    }
  } catch {
    // Fall back to 50/50
  }
  return { yes: 50, no: 50 };
}

/**
 * Get top markets by volume
 */
export async function getTopMarkets(limit = 5): Promise<FormattedMarket[]> {
  try {
    // Fetch active markets, sorted by volume
    const url = new URL(`${GAMMA_API_BASE}/markets`);
    url.searchParams.set("active", "true");
    url.searchParams.set("closed", "false");
    url.searchParams.set("limit", String(limit * 2)); // Fetch extra in case some are filtered
    url.searchParams.set("order", "volume");
    url.searchParams.set("ascending", "false");

    const res = await fetch(url.toString(), {
      next: { revalidate: 300 }, // Cache for 5 minutes
    });

    if (!res.ok) {
      console.error(`[Polymarket] API error: ${res.status}`);
      return [];
    }

    const markets: PolymarketMarket[] = await res.json();

    // Format and filter to top N by volume
    return markets
      .filter((m) => m.active && m.volume > 0)
      .slice(0, limit)
      .map((m) => {
        const prices = parseOutcomePrices(m.outcomePrices);
        return {
          id: m.id,
          question: m.question,
          slug: m.slug,
          yesPrice: prices.yes,
          volume: m.volume,
          volumeFormatted: formatVolume(m.volume),
          endDate: new Date(m.endDate),
        };
      });
  } catch (error) {
    console.error("[Polymarket] Failed to fetch markets:", error);
    return [];
  }
}
