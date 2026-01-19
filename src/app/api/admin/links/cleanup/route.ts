/**
 * Link Cleanup API
 *
 * Deletes links that belong to source domains (shouldn't have been ingested).
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { log } from "@/lib/logger";
import { redirectTo } from "@/lib/redirect";

// Extract base domain from URL
function getBaseDomain(url: string): string | null {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();
    const parts = hostname.split(".");
    if (parts.length <= 2) {
      return hostname.replace(/^www\./, "");
    }
    const twoPartTlds = ["co.uk", "com.au", "co.nz", "com.br", "co.jp"];
    const lastTwo = parts.slice(-2).join(".");
    if (twoPartTlds.includes(lastTwo)) {
      return parts.slice(-3).join(".");
    }
    return parts.slice(-2).join(".");
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const op = log.operationStart("api", "admin/links/cleanup", {});

  try {
    // Get all source base domains where includeOwnLinks is false
    const sources = await prisma.source.findMany({
      where: { includeOwnLinks: false },
      select: { url: true },
    });

    const sourceDomains = sources
      .map((s) => s.url && getBaseDomain(s.url))
      .filter(Boolean) as string[];

    if (sourceDomains.length === 0) {
      op.end({ status: "no_sources" });
      return redirectTo(request, "/admin?message=no-sources-to-clean");
    }

    // Find links whose base domain matches a source domain
    const allLinks = await prisma.link.findMany({
      select: { id: true, domain: true, canonicalUrl: true },
    });

    const linksToDelete = allLinks.filter((link) => {
      const linkBaseDomain = getBaseDomain(link.canonicalUrl);
      return linkBaseDomain && sourceDomains.includes(linkBaseDomain);
    });

    if (linksToDelete.length === 0) {
      op.end({ status: "nothing_to_delete" });
      return redirectTo(request, "/admin?message=no-source-links-found");
    }

    const linkIds = linksToDelete.map((l) => l.id);

    // Delete mentions first (foreign key)
    const deletedMentions = await prisma.mention.deleteMany({
      where: { linkId: { in: linkIds } },
    });

    // Delete link entities
    const deletedLinkEntities = await prisma.linkEntity.deleteMany({
      where: { linkId: { in: linkIds } },
    });

    // Delete the links
    const deletedLinks = await prisma.link.deleteMany({
      where: { id: { in: linkIds } },
    });

    log.info("Cleaned up source-domain links", {
      service: "api",
      operation: "cleanup",
      deletedLinks: deletedLinks.count,
      deletedMentions: deletedMentions.count,
      deletedLinkEntities: deletedLinkEntities.count,
      sourceDomains,
    });

    op.end({ status: "success", deleted: deletedLinks.count });

    return redirectTo(request, `/admin?message=deleted-${deletedLinks.count}-source-links`);
  } catch (error) {
    log.error("Link cleanup failed", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    op.end({ status: "failed" });
    return NextResponse.json({ error: "Cleanup failed" }, { status: 500 });
  }
}
