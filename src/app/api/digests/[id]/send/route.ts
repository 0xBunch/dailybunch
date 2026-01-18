import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { sendDigestEmail } from "@/lib/resend";

/**
 * Send Digest API
 *
 * POST - Send a digest via email
 */

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { to, subject } = body as {
      to: string[];
      subject?: string;
    };

    if (!to || !Array.isArray(to) || to.length === 0) {
      return NextResponse.json(
        { error: "At least one recipient email is required" },
        { status: 400 }
      );
    }

    // Validate emails
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = to.filter((email) => !emailRegex.test(email));
    if (invalidEmails.length > 0) {
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
      return NextResponse.json({ error: "Digest not found" }, { status: 404 });
    }

    if (digest.items.length === 0) {
      return NextResponse.json(
        { error: "Digest has no items" },
        { status: 400 }
      );
    }

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
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to send email" },
        { status: 500 }
      );
    }

    // Update digest with sent timestamp
    await prisma.digest.update({
      where: { id },
      data: { sentAt: new Date() },
    });

    return NextResponse.json({
      status: "sent",
      emailId: result.id,
      recipients: to,
      itemCount: emailItems.length,
    });
  } catch (error) {
    console.error("Error sending digest:", error);
    return NextResponse.json(
      { error: "Failed to send digest" },
      { status: 500 }
    );
  }
}
