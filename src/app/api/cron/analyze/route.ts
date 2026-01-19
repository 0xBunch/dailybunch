/**
 * AI Analysis Cron Endpoint
 *
 * Processes unanalyzed links through Gemini Flash for:
 * - Category classification
 * - Entity extraction
 * - Summary generation
 *
 * Protected by CRON_SECRET header.
 * With Gemini's high rate limits, can process 100+ links per run.
 *
 * Error Handling:
 * - Uses retry logic for Gemini API calls
 * - Tracks aiStatus and aiRetryCount in database
 * - Structured logging for monitoring
 * - Also supports retrying failed analyses
 */

import { NextRequest, NextResponse } from "next/server";
import { analyzeUnanalyzedLinks, retryFailedAnalyses } from "@/lib/analyze";
import { log } from "@/lib/logger";
import { wrapError } from "@/lib/errors";

export async function POST(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    log.warn("Unauthorized cron access attempt", {
      service: "api",
      operation: "cron/analyze",
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const op = log.operationStart("api", "cron/analyze", {});

  try {
    // Get parameters from query string
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "100", 10);
    const mode = searchParams.get("mode") || "new"; // "new" or "retry"

    log.info("Starting AI analysis cron", {
      service: "api",
      operation: "cron/analyze",
      limit,
      mode,
    });

    let result: {
      analyzed?: number;
      failed?: number;
      skipped?: number;
      retried?: number;
      succeeded?: number;
    };

    if (mode === "retry") {
      // Retry previously failed analyses
      result = await retryFailedAnalyses(limit);

      log.info("Retry analysis complete", {
        service: "api",
        operation: "cron/analyze",
        ...result,
      });

      op.end({
        status: "success",
        mode: "retry",
        retried: result.retried,
        succeeded: result.succeeded,
        failed: result.failed,
      });

      return NextResponse.json({
        status: "ok",
        mode: "retry",
        ...result,
      });
    } else {
      // Analyze new unanalyzed links
      result = await analyzeUnanalyzedLinks(limit);

      log.info("AI analysis complete", {
        service: "api",
        operation: "cron/analyze",
        ...result,
      });

      op.end({
        status: "success",
        mode: "new",
        analyzed: result.analyzed,
        failed: result.failed,
        skipped: result.skipped,
      });

      return NextResponse.json({
        status: "ok",
        mode: "new",
        ...result,
      });
    }
  } catch (error) {
    const serviceError = wrapError(error, {
      service: "api",
      operation: "cron/analyze",
    });

    log.error(serviceError);
    op.end({ status: "failed", errorCode: serviceError.code });

    return NextResponse.json(
      {
        error: "Failed to analyze links",
        errorCode: serviceError.code,
        message: serviceError.message,
      },
      { status: 500 }
    );
  }
}

// Also support GET for easier testing
export async function GET(request: NextRequest) {
  return POST(request);
}
