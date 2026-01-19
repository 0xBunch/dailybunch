/**
 * Analyze All Links API
 *
 * Triggers analysis of ALL pending links using Gemini Flash.
 * With Gemini's high rate limits and parallel processing,
 * can process hundreds of links in minutes.
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { analyzeUnanalyzedLinks } from "@/lib/analyze";
import { log } from "@/lib/logger";
import { redirectTo } from "@/lib/redirect";

// Process up to 1000 links per request
const MAX_LINKS = 1000;

export async function POST(request: NextRequest) {
  const op = log.operationStart("api", "admin/analyze-all", {});

  try {
    // Get count of pending links
    const pendingCount = await prisma.link.count({
      where: {
        aiStatus: "pending",
        aiRetryCount: { lt: 3 },
        title: { not: null },
      },
    });

    if (pendingCount === 0) {
      op.end({ status: "no_work" });
      return redirectTo(request, "/admin?message=no-pending-links");
    }

    log.info("Starting bulk AI analysis", {
      service: "api",
      operation: "analyze-all",
      pendingCount,
      limit: Math.min(pendingCount, MAX_LINKS),
    });

    // Process all pending links (up to MAX_LINKS)
    const result = await analyzeUnanalyzedLinks(Math.min(pendingCount, MAX_LINKS));

    log.info("Bulk AI analysis complete", {
      service: "api",
      operation: "analyze-all",
      ...result,
    });

    op.end({ status: "success", ...result });

    return redirectTo(
      request,
      `/admin?message=analyzed-${result.analyzed}-failed-${result.failed}`
    );
  } catch (error) {
    log.error("Bulk analysis failed", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    op.end({ status: "failed" });
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
