/**
 * Polymarket Module
 *
 * Displays top prediction markets by volume in the right rail.
 */

interface PolymarketModuleProps {
  markets: Array<{
    id: string;
    question: string;
    slug: string;
    yesPrice: number;
    volumeFormatted: string;
  }>;
}

export function PolymarketModule({ markets }: PolymarketModuleProps) {
  if (markets.length === 0) {
    return (
      <section>
        <div
          className="mb-3 flex items-center gap-2 text-xs uppercase tracking-wider"
          style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}
        >
          <span>📊</span>
          <span>Polymarket</span>
        </div>
        <div
          className="py-8 text-center text-sm"
          style={{ color: "var(--text-faint)" }}
        >
          No markets available
        </div>
      </section>
    );
  }

  return (
    <section>
      <div
        className="mb-3 flex items-center gap-2 text-xs uppercase tracking-wider"
        style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}
      >
        <span>📊</span>
        <span>Polymarket</span>
      </div>

      <div className="space-y-3">
        {markets.map((market) => (
          <a
            key={market.id}
            href={`https://polymarket.com/event/${market.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="group block"
            style={{
              textDecoration: "none",
              padding: "0.75rem",
              background: "var(--surface)",
              border: "1px solid var(--border)",
            }}
          >
            {/* Question */}
            <p
              className="mb-2 line-clamp-2 text-sm leading-snug transition-opacity group-hover:opacity-70"
              style={{ color: "var(--text-primary)" }}
            >
              {market.question}
            </p>

            {/* Probability bar */}
            <div className="mb-2">
              <div
                className="h-2 overflow-hidden"
                style={{ background: "var(--border)" }}
              >
                <div
                  className="h-full transition-all"
                  style={{
                    width: `${market.yesPrice}%`,
                    background:
                      market.yesPrice >= 50
                        ? "var(--status-success)"
                        : "var(--status-error)",
                  }}
                />
              </div>
            </div>

            {/* Stats */}
            <div
              className="flex items-center justify-between text-xs"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              <span
                style={{
                  color:
                    market.yesPrice >= 50
                      ? "var(--status-success)"
                      : "var(--status-error)",
                }}
              >
                {market.yesPrice}% Yes
              </span>
              <span style={{ color: "var(--text-faint)" }}>
                {market.volumeFormatted} volume
              </span>
            </div>
          </a>
        ))}
      </div>

      <a
        href="https://polymarket.com"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 block text-center text-xs hover:opacity-70"
        style={{ color: "var(--text-muted)", textDecoration: "none" }}
      >
        View all on Polymarket →
      </a>
    </section>
  );
}
