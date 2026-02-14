/**
 * Newsroom - Editorial Command Center
 *
 * Dense, desktop-first dashboard for managing cultural signals.
 */

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import prisma from "@/lib/db";
import Link from "next/link";
import { NewsroomClient } from "./NewsroomClient";

export const dynamic = "force-dynamic";

export default async function NewsroomPage() {
  // Auth check
  const cookieStore = await cookies();
  const authCookie = cookieStore.get("newsroom_auth");

  if (authCookie?.value !== process.env.NEWSROOM_PASSWORD) {
    redirect("/newsroom/login");
  }

  // Fetch data
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [links, categories, sources, entities] = await Promise.all([
    // Links with all relationships
    prisma.link.findMany({
      where: {
        isBlocked: false,
        firstSeenAt: { gte: sevenDaysAgo },
      },
      include: {
        mentions: {
          include: { source: { select: { id: true, name: true, tier: true } } },
        },
        entities: {
          include: { entity: { select: { id: true, name: true, type: true } } },
        },
        category: true,
      },
      orderBy: { firstSeenAt: "desc" },
      take: 500,
    }),

    // Categories
    prisma.category.findMany({
      orderBy: { name: "asc" },
    }),

    // Sources for filter
    prisma.source.findMany({
      where: { active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),

    // Trending entities
    prisma.entity.findMany({
      where: { active: true, showInTrending: true, velocityWeek: { gt: 0 } },
      orderBy: { velocityWeek: "desc" },
      take: 30,
    }),
  ]);

  // Compute velocity for each link
  const linksWithVelocity = links.map((link) => ({
    ...link,
    velocity: new Set(link.mentions.map((m) => m.sourceId)).size,
    firstSeenAt: link.firstSeenAt.toISOString(),
    lastSeenAt: link.lastSeenAt.toISOString(),
    publishedAt: link.publishedAt?.toISOString() || null,
    createdAt: link.createdAt.toISOString(),
    updatedAt: link.updatedAt.toISOString(),
    aiAnalyzedAt: link.aiAnalyzedAt?.toISOString() || null,
    culturalAnalyzedAt: link.culturalAnalyzedAt?.toISOString() || null,
    commentaryGeneratedAt: link.commentaryGeneratedAt?.toISOString() || null,
    embeddingGeneratedAt: link.embeddingGeneratedAt?.toISOString() || null,
    enrichmentLastAttempt: link.enrichmentLastAttempt?.toISOString() || null,
    mentions: link.mentions.map((m) => ({
      ...m,
      seenAt: m.seenAt.toISOString(),
      createdAt: m.createdAt.toISOString(),
    })),
    entities: link.entities.map((e) => ({
      ...e,
      createdAt: e.createdAt.toISOString(),
    })),
  }));

  return (
    <>
      {/* Header */}
      <header
        className="border-b px-6 py-3 flex items-center justify-between"
        style={{ borderColor: "var(--border)", background: "var(--ink)" }}
      >
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="text-lg font-medium hover:opacity-70 transition-opacity"
            style={{ color: "#fff", textDecoration: "none" }}
          >
            Daily Bunch
          </Link>
          <span
            className="text-xs uppercase tracking-wide px-2 py-0.5"
            style={{
              color: "var(--accent-warm)",
              background: "rgba(196,93,44,0.2)",
              fontFamily: "var(--font-mono)",
            }}
          >
            Newsroom
          </span>
        </div>
        <nav className="flex items-center gap-4 text-sm">
          <Link
            href="/dashboard"
            className="hover:opacity-70 transition-opacity"
            style={{ color: "#888", textDecoration: "none" }}
          >
            Dashboard
          </Link>
          <Link
            href="/admin"
            className="hover:opacity-70 transition-opacity"
            style={{ color: "#888", textDecoration: "none" }}
          >
            Admin
          </Link>
          <form action="/api/newsroom/auth" method="DELETE">
            <button
              type="submit"
              className="hover:opacity-70 transition-opacity"
              style={{
                color: "#666",
                background: "none",
                border: "none",
                cursor: "pointer",
                fontFamily: "var(--font-mono)",
                fontSize: "12px",
              }}
            >
              Logout
            </button>
          </form>
        </nav>
      </header>

      <NewsroomClient
        links={linksWithVelocity}
        categories={categories}
        sources={sources}
        entities={entities}
      />
    </>
  );
}
