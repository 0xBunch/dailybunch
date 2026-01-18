import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { processLinksFromSource } from "@/services/links";
import { extractLinksFromHtml } from "@/services/canonicalize";

const SIGNING_KEY = process.env.MAILGUN_WEBHOOK_SIGNING_KEY || "";

/**
 * Verify Mailgun webhook signature
 */
function verifyWebhook(
  timestamp: string,
  token: string,
  signature: string
): boolean {
  const encodedToken = crypto
    .createHmac("sha256", SIGNING_KEY)
    .update(timestamp + token)
    .digest("hex");

  return encodedToken === signature;
}

/**
 * Find source by email sender domain
 */
async function findSourceByEmail(from: string): Promise<string | null> {
  // Extract domain from email
  const match = from.match(/@([^\s>]+)/);
  if (!match) return null;

  const domain = match[1].toLowerCase();

  // Find source with matching email trigger
  const source = await prisma.source.findFirst({
    where: {
      type: "NEWSLETTER",
      isActive: true,
      emailTrigger: {
        contains: domain,
        mode: "insensitive",
      },
    },
  });

  return source?.id || null;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    // Get signature fields
    const timestamp = formData.get("timestamp") as string;
    const token = formData.get("token") as string;
    const signature = formData.get("signature") as string;

    // Verify webhook signature
    if (!verifyWebhook(timestamp, token, signature)) {
      console.error("Invalid Mailgun webhook signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // Get email data
    const from = formData.get("from") as string;
    const subject = formData.get("subject") as string;
    const bodyHtml = formData.get("body-html") as string;
    const bodyPlain = formData.get("body-plain") as string;

    console.log(`Received email from: ${from}, subject: ${subject}`);

    // Find matching source
    const sourceId = await findSourceByEmail(from);

    if (!sourceId) {
      console.log(`No matching source for email from: ${from}`);
      return NextResponse.json({
        message: "No matching source found",
        from,
      });
    }

    // Extract links from HTML body (preferred) or plain text
    const content = bodyHtml || bodyPlain || "";
    const links = extractLinksFromHtml(content);

    if (links.length === 0) {
      return NextResponse.json({
        message: "No links found in email",
        sourceId,
      });
    }

    // Process links
    const linksWithContext = links.map((url) => ({
      url,
      context: subject || undefined,
    }));

    const result = await processLinksFromSource(linksWithContext, sourceId);

    // Update source last fetched time
    await prisma.source.update({
      where: { id: sourceId },
      data: { lastFetchedAt: new Date() },
    });

    console.log(
      `Processed email: ${result.total} links, ${result.new} new, ${result.blacklisted} blacklisted`
    );

    return NextResponse.json({
      message: "Email processed successfully",
      sourceId,
      linksProcessed: result.total,
      newLinks: result.new,
      blacklisted: result.blacklisted,
    });
  } catch (error) {
    console.error("Error processing Mailgun webhook:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
