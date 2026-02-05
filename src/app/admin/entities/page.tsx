/**
 * Entities Admin Page
 *
 * Full entity management with search, filter, sort, and bulk operations.
 */

import prisma from "@/lib/db";
import { EntitiesClient } from "./EntitiesClient";

export const dynamic = "force-dynamic";

export default async function EntitiesAdminPage() {
  // Get all entities with link counts and velocity
  const entities = await prisma.entity.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { links: true } },
    },
  });

  // Group pending suggestions by name+type
  const groupedSuggestions = await prisma.entitySuggestion.groupBy({
    by: ["name", "type"],
    where: { status: "pending" },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: 30,
  });

  // Get blocklist
  const blocklist = await prisma.entityBlocklist.findMany({
    orderBy: { name: "asc" },
  });

  // Transform for client component
  const entitiesData = entities.map((e) => ({
    id: e.id,
    name: e.name,
    type: e.type,
    aliases: e.aliases,
    active: e.active,
    showInTrending: e.showInTrending,
    linkCount: e._count.links,
    velocityWeek: e.velocityWeek,
    createdAt: e.createdAt.toISOString(),
  }));

  const suggestionsData = groupedSuggestions.map((s) => ({
    name: s.name,
    type: s.type,
    count: s._count.id,
  }));

  const blocklistData = blocklist.map((b) => ({
    id: b.id,
    name: b.name,
    reason: b.reason,
  }));

  return (
    <EntitiesClient
      entities={entitiesData}
      suggestions={suggestionsData}
      blocklist={blocklistData}
    />
  );
}
