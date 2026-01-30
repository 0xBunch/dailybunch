import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { Resend } from "resend";

/**
 * Send Weekly Review API
 *
 * POST - Send a weekly review via email
 */

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
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

    // Get review with sources
    const review = await prisma.weeklyReview.findUnique({
      where: { id },
      include: {
        sources: {
          include: {
            link: true,
          },
          orderBy: { footnoteNumber: "asc" },
        },
      },
    });

    if (!review) {
      return NextResponse.json(
        { error: "Weekly review not found" },
        { status: 404 }
      );
    }

    // Format date for subject
    const weekOfDate = new Date(review.weekOf);
    const emailSubject =
      subject ||
      `Weekly Review - ${weekOfDate.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })}`;

    // Build footnotes HTML
    const footnotesHtml = review.sources
      .map(
        (s) =>
          `<p style="margin: 4px 0; font-size: 12px; color: #666;">
            <sup>${s.footnoteNumber}</sup>
            <a href="${s.link.canonicalUrl}" style="color: #666;">${s.link.title || s.link.domain}</a>
          </p>`
      )
      .join("");

    // Build email HTML
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 20px; line-height: 1.7; color: #1a1a1a;">
  <header style="text-align: center; margin-bottom: 32px; border-bottom: 1px solid #ddd; padding-bottom: 16px;">
    <h1 style="font-size: 14px; letter-spacing: 2px; text-transform: uppercase; margin: 0; font-weight: normal;">Weekly Review</h1>
  </header>

  <article style="font-size: 16px; text-align: justify;">
    ${review.content}
  </article>

  <footer style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd;">
    <h2 style="font-size: 12px; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 12px; font-weight: normal;">Sources</h2>
    ${footnotesHtml}
  </footer>

  <div style="margin-top: 40px; text-align: center; font-size: 12px; color: #999;">
    <a href="https://dailybunch.com" style="color: #999;">Daily Bunch</a>
  </div>
</body>
</html>`;

    // Send email
    const result = await resend.emails.send({
      from: "Daily Bunch <weekly@dailybunch.com>",
      to,
      subject: emailSubject,
      html,
    });

    if (result.error) {
      return NextResponse.json(
        { error: result.error.message },
        { status: 500 }
      );
    }

    // Update review status
    await prisma.weeklyReview.update({
      where: { id },
      data: {
        status: "published",
        publishedAt: new Date(),
      },
    });

    return NextResponse.json({
      status: "sent",
      emailId: result.data?.id,
      recipients: to,
    });
  } catch (error) {
    console.error("Error sending weekly review:", error);
    return NextResponse.json(
      { error: "Failed to send weekly review" },
      { status: 500 }
    );
  }
}
