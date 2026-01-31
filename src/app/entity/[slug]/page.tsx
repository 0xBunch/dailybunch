/**
 * Entity Detail Page
 *
 * Shows all links mentioning an entity, with velocity trends.
 */

import prisma from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { LinkCard } from "@/components/LinkCard";

export const dynamic = "force-dynamic";

interface EntityPageProps {
  params: Promise<{ slug: string }>;
}

export default async function EntityPage({ params }: EntityPageProps) {
  const { slug } = await params;

  // Find entity by slug or name
  const entity = await prisma.entity.findFirst({
    where: {
      OR: [
        { slug },
        { name: { equals: slug.replace(/-/g, " "), mode: "insensitive" } },
      ],
    },
    include: {
      links: {
        include: {
          link: {
            include: {
              category: true,
              mentions: {
                include: { source: true },
              },
            },
          },
        },
        orderBy: {
          link: { firstSeenAt: "desc" },
        },
        take: 100,
      },
    },
  });

  if (!entity) {
    notFound();
  }

  // Format links
  const links = entity.links
    .filter((le) => !le.link.isBlocked)
    .filter((le) => le.link.title || le.link.fallbackTitle)
    .map((le) => ({
      id: le.link.id,
      title: le.link.title,
      fallbackTitle: le.link.fallbackTitle,
      canonicalUrl: le.link.canonicalUrl,
      domain: le.link.domain,
      aiSummary: le.link.aiSummary,
      firstSeenAt: le.link.firstSeenAt,
      categoryName: le.link.category?.name ?? null,
      velocity: le.link.mentions.length,
      sourceNames: le.link.mentions.map((m) => m.source.name),
    }));

  // Get type prefix
  const typePrefix =
    entity.type === "person"
      ? "@"
      : entity.type === "organization"
        ? "+"
        : entity.type === "product"
          ? "#"
          : "";

  // Trend indicator
  const trendColor =
    entity.velocityTrend === "rising"
      ? "var(--status-success)"
      : entity.velocityTrend === "falling"
        ? "var(--status-error)"
        : "var(--text-muted)";

  const trendArrow =
    entity.velocityTrend === "rising"
      ? "↑"
      : entity.velocityTrend === "falling"
        ? "↓"
        : "●";

  return (
    <div className="min-h-dvh" style={{ background: "var(--background)" }}>
      {/* Header */}
      <header
        className="border-b px-4 py-4 md:px-6"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="mx-auto max-w-4xl">
          <nav className="mb-4">
            <Link
              href="/dashboard"
              className="text-sm hover:opacity-70 transition-opacity"
              style={{ color: "var(--text-muted)", textDecoration: "none" }}
            >
              ← Back to Dashboard
            </Link>
          </nav>

          <div className="flex items-start justify-between">
            <div>
              <div
                className="mb-1 text-xs uppercase tracking-wider"
                style={{ color: "var(--text-faint)", fontFamily: "var(--font-mono)" }}
              >
                {entity.type}
              </div>
              <h1
                className="text-2xl md:text-3xl"
                style={{ fontFamily: "var(--font-headline)" }}
              >
                {typePrefix}
                {entity.name}
              </h1>
            </div>

            {/* Velocity stats */}
            <div className="text-right">
              <div className="flex items-center justify-end gap-2">
                <span style={{ color: trendColor }}>{trendArrow}</span>
                <span
                  className="text-2xl tabular-nums"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  {entity.velocityWeek}
                </span>
              </div>
              <div
                className="text-xs"
                style={{ color: "var(--text-faint)", fontFamily: "var(--font-mono)" }}
              >
                mentions this week
              </div>
              <div
                className="mt-1 text-xs tabular-nums"
                style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}
              >
                {entity.velocityMonth} this month
              </div>
            </div>
          </div>

          {/* Aliases */}
          {entity.aliases.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {entity.aliases.map((alias) => (
                <span
                  key={alias}
                  className="px-2 py-0.5 text-xs"
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    color: "var(--text-muted)",
                  }}
                >
                  {alias}
                </span>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-4xl px-4 py-8 md:px-6">
        <div
          className="mb-6 flex items-center gap-3 border-b pb-3"
          style={{ borderColor: "var(--border)" }}
        >
          <h2
            className="text-xs uppercase tracking-wider"
            style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}
          >
            Related Links
          </h2>
          <span
            className="tabular-nums text-xs"
            style={{ color: "var(--text-faint)", fontFamily: "var(--font-mono)" }}
          >
            {links.length}
          </span>
        </div>

        {links.length === 0 ? (
          <div className="py-16 text-center">
            <p style={{ color: "var(--text-muted)" }}>No links found.</p>
          </div>
        ) : (
          <div
            className="divide-y"
            style={{ borderColor: "var(--border-subtle)" }}
          >
            {links.map((link) => (
              <LinkCard
                key={link.id}
                id={link.id}
                title={link.title}
                fallbackTitle={link.fallbackTitle}
                canonicalUrl={link.canonicalUrl}
                domain={link.domain}
                summary={link.aiSummary}
                category={link.categoryName ? { name: link.categoryName } : null}
                entities={[]}
                velocity={link.velocity}
                sources={link.sourceNames}
                firstSeenAt={link.firstSeenAt}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
