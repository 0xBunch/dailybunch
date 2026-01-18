/**
 * Mailgun Inbound Parse Webhook
 *
 * Receives forwarded emails, extracts links, canonicalizes them,
 * and stores them in the database with mentions.
 *
 * Error Handling:
 * - Verifies Mailgun HMAC signature
 * - Graceful degradation on canonicalization failure
 * - Never breaks batch on individual link failure
 * - Structured logging for all operations
 */

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import prisma from "@/lib/db";
import { canonicalizeUrl } from "@/lib/canonicalize";
import { log } from "@/lib/logger";

// Verify Mailgun webhook signature
function verifySignature(
  timestamp: string,
  token: string,
  signature: string
): boolean {
  const signingKey = process.env.MAILGUN_WEBHOOK_SIGNING_KEY;
  if (!signingKey) {
    log.warn("MAILGUN_WEBHOOK_SIGNING_KEY not configured", {
      service: "mailgun",
      operation: "verifySignature",
    });
    return false;
  }

  const encodedToken = crypto
    .createHmac("sha256", signingKey)
    .update(timestamp + token)
    .digest("hex");

  return encodedToken === signature;
}

// Extract all href links from HTML
function extractLinksFromHtml(html: string): string[] {
  const linkRegex = /href=["']([^"']+)["']/gi;
  const links: string[] = [];
  let match;

  while ((match = linkRegex.exec(html)) !== null) {
    const href = match[1];
    // Filter out mailto:, javascript:, and anchor links
    if (
      href &&
      !href.startsWith("mailto:") &&
      !href.startsWith("javascript:") &&
      !href.startsWith("#") &&
      (href.startsWith("http://") || href.startsWith("https://"))
    ) {
      links.push(href);
    }
  }

  return [...new Set(links)]; // Dedupe
}

// Match sender email to a source
async function matchSource(senderEmail: string): Promise<string | null> {
  // Extract domain from email
  const emailDomain = senderEmail.split("@")[1]?.toLowerCase();
  if (!emailDomain) return null;

  // Find source by email trigger (domain match)
  const source = await prisma.source.findFirst({
    where: {
      type: "newsletter",
      active: true,
      emailTrigger: {
        contains: emailDomain,
        mode: "insensitive",
      },
    },
  });

  return source?.id || null;
}

// Check if URL matches blacklist
async function isBlacklisted(url: string): Promise<boolean> {
  try {
    const parsed = new URL(url);
    const domain = parsed.hostname.replace(/^www\./, "");

    const blacklistEntry = await prisma.blacklist.findFirst({
      where: {
        OR: [
          { type: "domain", pattern: domain },
          { type: "domain", pattern: `www.${domain}` },
          { type: "url", pattern: url },
        ],
      },
    });

    return !!blacklistEntry;
  } catch {
    return true; // Invalid URLs are blacklisted
  }
}

// Process a single link (never throws)
async function processLink(
  url: string,
  sourceId: string
): Promise<{
  success: boolean;
  linkId?: string;
  error?: string;
  status?: string;
}> {
  try {
    // Check blacklist first
    if (await isBlacklisted(url)) {
      return { success: false, error: "Blacklisted" };
    }

    // Canonicalize the URL
    const result = await canonicalizeUrl(url);

    if (result.error) {
      log.warn("Canonicalization warning", {
        service: "mailgun",
        operation: "processLink",
        url: url.slice(0, 100),
        error: result.error,
      });
    }

    // Check if canonical URL is blacklisted
    if (await isBlacklisted(result.canonicalUrl)) {
      return { success: false, error: "Canonical URL blacklisted" };
    }

    // Upsert the link with status tracking
    const link = await prisma.link.upsert({
      where: { canonicalUrl: result.canonicalUrl },
      update: {
        lastSeenAt: new Date(),
      },
      create: {
        canonicalUrl: result.canonicalUrl,
        originalUrl: url,
        domain: result.domain,
        // Track canonicalization status
        canonicalStatus: result.status,
        canonicalError: result.error || null,
        needsManualReview: result.status === "failed",
      },
    });

    // Create mention (link seen in this source)
    await prisma.mention.create({
      data: {
        linkId: link.id,
        sourceId: sourceId,
        seenAt: new Date(),
      },
    });

    return {
      success: true,
      linkId: link.id,
      status: result.status,
    };
  } catch (error) {
    // Handle unique constraint violation (duplicate mention)
    if (
      error instanceof Error &&
      error.message.includes("Unique constraint")
    ) {
      return { success: true, error: "Duplicate mention" };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function POST(request: NextRequest) {
  const op = log.operationStart("api", "ingest/mailgun", {});

  try {
    // Parse multipart form data
    const formData = await request.formData();

    // Extract Mailgun signature fields
    const timestamp = formData.get("timestamp") as string;
    const token = formData.get("token") as string;
    const signature = formData.get("signature") as string;

    // Verify signature (skip in development if not configured)
    if (
      process.env.NODE_ENV === "production" ||
      process.env.MAILGUN_WEBHOOK_SIGNING_KEY
    ) {
      if (!verifySignature(timestamp, token, signature)) {
        log.warn("Invalid Mailgun signature", {
          service: "mailgun",
          operation: "verifySignature",
          timestamp,
        });
        op.end({ status: "failed", reason: "invalid_signature" });
        return NextResponse.json(
          { error: "Invalid signature" },
          { status: 401 }
        );
      }
    }

    // Extract email data
    const sender = formData.get("sender") as string;
    const from = formData.get("from") as string;
    const subject = formData.get("subject") as string;
    const bodyHtml = formData.get("body-html") as string;

    const senderEmail = sender || from || "";

    log.info("Received email", {
      service: "mailgun",
      operation: "receiveEmail",
      sender: senderEmail,
      subject: subject?.slice(0, 100),
    });

    // Match sender to a source
    const sourceId = await matchSource(senderEmail);
    if (!sourceId) {
      log.warn("No matching source for sender", {
        service: "mailgun",
        operation: "matchSource",
        sender: senderEmail,
      });
      op.end({ status: "ignored", reason: "unknown_sender" });
      // Still return 200 to acknowledge receipt
      return NextResponse.json({
        status: "ignored",
        reason: "Unknown sender",
      });
    }

    // Extract links from HTML (preferred) or plain text
    const htmlContent = bodyHtml || "";
    const links = extractLinksFromHtml(htmlContent);

    log.info("Extracted links from email", {
      service: "mailgun",
      operation: "extractLinks",
      linkCount: links.length,
      sourceId,
    });

    // Process each link
    const results = await Promise.all(
      links.map((link) => processLink(link, sourceId))
    );

    const processed = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;
    const needsReview = results.filter(
      (r) => r.success && r.status === "failed"
    ).length;

    log.batchSummary(
      "mailgun",
      "processLinks",
      {
        total: links.length,
        succeeded: processed,
        failed,
      },
      { needsReview }
    );

    op.end({
      status: "success",
      linksFound: links.length,
      linksProcessed: processed,
      linksFailed: failed,
    });

    return NextResponse.json({
      status: "ok",
      linksFound: links.length,
      linksProcessed: processed,
      linksFailed: failed,
      needsManualReview: needsReview,
    });
  } catch (error) {
    log.error("Mailgun webhook error", {
      service: "mailgun",
      operation: "handleWebhook",
      error: error instanceof Error ? error.message : String(error),
    });

    op.end({ status: "failed", error: "internal_error" });

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Health check for GET requests
export async function GET() {
  return NextResponse.json({
    status: "ok",
    endpoint: "Mailgun inbound webhook",
    timestamp: new Date().toISOString(),
  });
}
