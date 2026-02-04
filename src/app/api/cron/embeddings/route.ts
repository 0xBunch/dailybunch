/**
 * Embedding Generation Cron
 *
 * Generates embeddings for links that don't have them.
 * Embeddings enable story clustering.
 *
 * Schedule: Every 30 minutes
 * GET /api/cron/embeddings
 */

import { NextResponse } from "next/server";
import { generateMissingEmbeddings } from "@/lib/embeddings";

export async function GET() {
  try {
    const startTime = Date.now();
    const result = await generateMissingEmbeddings(50);
    const duration = Date.now() - startTime;

    return NextResponse.json({
      status: "ok",
      ...result,
      durationMs: duration,
    });
  } catch (error) {
    console.error("[Embeddings Cron] Error:", error);
    return NextResponse.json(
      { error: "Embedding generation failed", message: String(error) },
      { status: 500 }
    );
  }
}

export async function POST() {
  return GET();
}
