/**
 * Send Digest API
 *
 * POST - Send a digest via email
 *
 * Error Handling:
 * - Validates recipient emails before sending
 * - Returns error codes for debugging
 * - Keeps digest as draft on failure (sentAt = null)
 * - Structured logging for all operations
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { sendDigestEmail } from "@/lib/resend";
import { log } from "@/lib/logger";
import { wrapError } from "@/lib/errors";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const op = log.operationStart("api", "digests/send", { digestId: id });

  try {
    const body = await request.json();
    const { to, subject } = body as {
      to: string[];
      subject?: string;
    };

    if (!to || !Array.isArray(to) || to.length === 0) {
      op.end({ status: "failed", reason: "missing_recipients" });
      return NextResponse.json(
        { error: "At least one recipient email is required" },
        { status: 400 }
      );
    }

    // Validate emails
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = to.filter((email) => !emailRegex.test(email));
    if (invalidEmails.length > 0) {
      op.end({ status: "failed", reason: "invalid_emails" });
      return NextResponse.json(
        { error: `Invalid email addresses: ${invalidEmails.join(", ")}` },
        { status: 400 }
      );
    }

    // Get digest with items
    const digest = await prisma.digest.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            link: {
              include: {
                category: true,
                mentions: true,
              },
            },
          },
          orderBy: { position: "asc" },
        },
      },
    });

    if (!digest) {
      op.end({ status: "failed", reason: "not_found" });
      return NextResponse.json({ error: "Digest not found" }, { status: 404 });
    }

    if (digest.items.length === 0) {
      op.end({ status: "failed", reason: "no_items" });
      return NextResponse.json(
        { error: "Digest has no items" },
        { status: 400 }
      );
    }

    log.info("Preparing digest for sending", {
      service: "api",
      operation: "digests/send",
      digestId: id,
      itemCount: digest.items.length,
      recipientCount: to.length,
    });

    // Prepare items for email
    const emailItems = digest.items.map((item) => ({
      title: item.note || item.link.title || "Untitled",
      url: item.link.canonicalUrl,
      domain: item.link.domain,
      summary: item.link.aiSummary,
      category: item.link.category?.name,
      velocity: item.link.mentions.length,
    }));

    // Generate subject
    const emailSubject =
      subject ||
      `Daily Bunch - ${new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })}`;

    // Send email
    const result = await sendDigestEmail({
      to,
      subject: emailSubject,
      items: emailItems,
      previewText: `${emailItems.length} links for you today`,
      digestId: id,
    });

    if (!result.success) {
      // Log the failure but keep digest as draft
      log.warn("Digest email send failed", {
        service: "api",
        operation: "digests/send",
        digestId: id,
        error: result.error,
        errorCode: result.errorCode,
      });

      op.end({
        status: "failed",
        reason: "send_failed",
        errorCode: result.errorCode,
      });

      return NextResponse.json(
        {
          error: result.error || "Failed to send email",
          errorCode: result.errorCode,
          message: "Digest saved as draft. You can retry sending later.",
        },
        { status: 500 }
      );
    }

    // Update digest with sent timestamp
    await prisma.digest.update({
      where: { id },
      data: { sentAt: new Date() },
    });

    log.info("Digest sent successfully", {
      service: "api",
      operation: "digests/send",
      digestId: id,
      emailId: result.id,
      recipientCount: to.length,
      itemCount: emailItems.length,
    });

    op.end({
      status: "success",
      emailId: result.id,
      recipientCount: to.length,
    });

    return NextResponse.json({
      status: "sent",
      emailId: result.id,
      recipients: to,
      itemCount: emailItems.length,
    });
  } catch (error) {
    const serviceError = wrapError(error, {
      service: "api",
      operation: "digests/send",
      digestId: id,
    });

    log.error(serviceError);
    op.end({ status: "failed", errorCode: serviceError.code });

    return NextResponse.json(
      {
        error: "Failed to send digest",
        errorCode: serviceError.code,
        message: "Digest saved as draft. You can retry sending later.",
      },
      { status: 500 }
    );
  }
}
