/**
 * Entities Admin Page
 *
 * Server-side pagination, search, filter, and sort.
 */

import prisma from "@/lib/db";
import { Prisma } from "@prisma/client";
import { EntitiesClient } from "./EntitiesClient";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

type SortField = "name" | "type" | "linkCount" | "velocityWeek" | "createdAt";
type SortDir = "asc" | "desc";

const VALID_SORTS: SortField[] = ["name", "type", "linkCount", "velocityWeek", "createdAt"];

interface SearchParams {
  page?: string;
  search?: string;
  type?: string;
  status?: string;
  sort?: string;
  dir?: string;
}

export default async function EntitiesAdminPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  const currentPage = Math.max(1, parseInt(params.page || "1", 10));
  const search = params.search || "";
  const typeFilter = params.type || "all";
  const statusFilter = params.status || "all";
  const sortField: SortField = VALID_SORTS.includes(params.sort as SortField)
    ? (params.sort as SortField)
    : "name";
  const sortDir: SortDir = params.dir === "desc" ? "desc" : "asc";

  // Build where clause
  const where: Prisma.EntityWhereInput = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { aliases: { has: search } },
    ];
  }

  if (typeFilter !== "all") {
    where.type = typeFilter;
  }

  if (statusFilter === "active") {
    where.active = true;
  } else if (statusFilter === "inactive") {
    where.active = false;
  } else if (statusFilter === "hidden") {
    where.showInTrending = false;
  }

  // Build orderBy
  let orderBy: Prisma.EntityOrderByWithRelationInput;
  if (sortField === "linkCount") {
    orderBy = { links: { _count: sortDir } };
  } else {
    orderBy = { [sortField]: sortDir };
  }

  // Parallel queries: paginated entities + count + stats + suggestions + blocklist
  const [entities, totalCount, stats, suggestionCountsByType, groupedSuggestions, blocklist] =
    await Promise.all([
      prisma.entity.findMany({
        where,
        orderBy,
        skip: (currentPage - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        include: { _count: { select: { links: true } } },
      }),
      prisma.entity.count({ where }),
      Promise.all([
        prisma.entity.count(),
        prisma.entity.count({ where: { active: true } }),
        prisma.entity.count({ where: { showInTrending: false } }),
        prisma.entitySuggestion.count({ where: { status: "pending" } }),
      ]),
      prisma.entitySuggestion.groupBy({
        by: ["type"],
        where: { status: "pending" },
        _count: { id: true },
      }),
      prisma.entitySuggestion.groupBy({
        by: ["name", "type"],
        where: { status: "pending" },
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: 50,
      }),
      prisma.entityBlocklist.findMany({
        orderBy: { name: "asc" },
      }),
    ]);

  const [totalEntities, activeCount, hiddenCount, pendingCount] = stats;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

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

  const suggestionTypeCounts = Object.fromEntries(
    suggestionCountsByType.map((s) => [s.type, s._count.id])
  );

  const blocklistData = blocklist.map((b) => ({
    id: b.id,
    name: b.name,
    reason: b.reason,
  }));

  return (
    <EntitiesClient
      entities={entitiesData}
      suggestions={suggestionsData}
      suggestionTypeCounts={suggestionTypeCounts}
      blocklist={blocklistData}
      pagination={{
        currentPage,
        totalPages,
        totalCount,
      }}
      filters={{
        search,
        type: typeFilter,
        status: statusFilter,
        sort: sortField,
        dir: sortDir,
      }}
      stats={{
        total: totalEntities,
        active: activeCount,
        hidden: hiddenCount,
        pending: pendingCount,
      }}
    />
  );
}
