/**
 * FUTURA - The Synthesis Feed
 *
 * Not a list of links. A briefing from the future.
 * FUTURA is an opinionated AI entity that synthesizes the cultural signal
 * into crystallized insights, predictions, and tensions.
 */

import { getTrendingLinks } from "@/lib/queries";
import { getRisingLinks, getHiddenGems, getTopEntities } from "@/lib/trends";
import prisma from "@/lib/db";
import { FuturaInterface } from "./FuturaInterface";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "FUTURA | Daily Bunch",
  description: "The synthesis feed. Not what happened. What it means.",
};

async function gatherSignal() {
  const [trending, rising, gems, entities, recentCount] = await Promise.all([
    getTrendingLinks({ limit: 15, minVelocity: 2 }),
    getRisingLinks(5),
    getHiddenGems(5),
    getTopEntities("week", 10),
    prisma.link.count({
      where: { firstSeenAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
    }),
  ]);

  // Get cultural analysis for top links
  const topIds = trending.slice(0, 10).map((l) => l.id);
  const withCultural = await prisma.link.findMany({
    where: { id: { in: topIds } },
    select: {
      id: true,
      culturalWhyNow: true,
      culturalTension: true,
      culturalThread: true,
      culturalPrediction: true,
      culturalContrarian: true,
      commentary: true,
    },
  });
  const culturalMap = new Map(withCultural.map((l) => [l.id, l]));

  const enrichedTrending = trending.map((link) => ({
    ...link,
    cultural: culturalMap.get(link.id) || null,
  }));

  return {
    trending: enrichedTrending,
    rising,
    gems,
    entities,
    stats: {
      linksToday: recentCount,
      totalTrending: trending.length,
      topVelocity: trending[0]?.velocity || 0,
    },
  };
}

export default async function FuturaPage() {
  const signal = await gatherSignal();

  // Synthesize into structured briefing sections
  const sections = synthesizeSections(signal);

  return <FuturaInterface sections={sections} signal={signal} />;
}

interface Section {
  id: string;
  title: string;
  glyph: string;
  entries: Array<{
    insight: string;
    confidence: "high" | "medium" | "low";
    evidence: string[];
    prediction?: string;
    contrarian?: string;
    links: Array<{ title: string; url: string; velocity: number }>;
  }>;
}

function synthesizeSections(signal: Awaited<ReturnType<typeof gatherSignal>>): Section[] {
  const sections: Section[] = [];

  // SIGNAL: What's happening now
  const signalEntries = signal.trending.slice(0, 5).map((link) => {
    const cultural = link.cultural;
    return {
      insight: cultural?.commentary || cultural?.culturalWhyNow || link.aiSummary || link.title || link.fallbackTitle || "Untitled",
      confidence: (link.velocity >= 5 ? "high" : link.velocity >= 3 ? "medium" : "low") as "high" | "medium" | "low",
      evidence: link.sourceNames.slice(0, 3),
      prediction: cultural?.culturalPrediction || undefined,
      contrarian: cultural?.culturalContrarian || undefined,
      links: [{
        title: link.title || link.fallbackTitle || "Untitled",
        url: link.canonicalUrl,
        velocity: link.velocity,
      }],
    };
  });

  sections.push({
    id: "signal",
    title: "SIGNAL",
    glyph: "◉",
    entries: signalEntries,
  });

  // TRAJECTORY: What's accelerating
  if (signal.rising.length > 0) {
    const trajectoryEntries = signal.rising.slice(0, 3).map((link) => ({
      insight: `${link.title || link.fallbackTitle} is accelerating (${link.recentVelocity} sources in 24h)`,
      confidence: "medium" as const,
      evidence: link.sourceNames.slice(0, 3),
      prediction: "growing",
      links: [{
        title: link.title || link.fallbackTitle || "Untitled",
        url: link.canonicalUrl,
        velocity: link.velocity,
      }],
    }));

    sections.push({
      id: "trajectory",
      title: "TRAJECTORY",
      glyph: "↗",
      entries: trajectoryEntries,
    });
  }

  // HIDDEN: What high-trust sources noticed that others missed
  if (signal.gems.length > 0) {
    const hiddenEntries = signal.gems.slice(0, 3).map((link) => ({
      insight: `${link.title || link.fallbackTitle} — noticed by elite sources but not yet viral`,
      confidence: "medium" as const,
      evidence: link.sourceNames,
      links: [{
        title: link.title || link.fallbackTitle || "Untitled",
        url: link.canonicalUrl,
        velocity: link.velocity,
      }],
    }));

    sections.push({
      id: "hidden",
      title: "HIDDEN",
      glyph: "◇",
      entries: hiddenEntries,
    });
  }

  // ENTITIES: Who's generating signal
  if (signal.entities.length > 0) {
    const risingEntities = signal.entities.filter((e) => e.trend === "rising");
    if (risingEntities.length > 0) {
      sections.push({
        id: "entities",
        title: "RISING ENTITIES",
        glyph: "△",
        entries: [{
          insight: risingEntities.map((e) => `${e.name} (${e.velocity} mentions)`).join(" · "),
          confidence: "high" as const,
          evidence: [],
          links: [],
        }],
      });
    }
  }

  return sections;
}
