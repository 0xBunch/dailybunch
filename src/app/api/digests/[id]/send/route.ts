import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.EMAIL_FROM || "Daily Bunch <now@dailybunch.com>";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get digest with items
    const digest = await prisma.digest.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            link: true,
          },
          orderBy: {
            position: "asc",
          },
        },
      },
    });

    if (!digest) {
      return NextResponse.json({ error: "Digest not found" }, { status: 404 });
    }

    if (digest.status === "SENT") {
      return NextResponse.json(
        { error: "Digest already sent" },
        { status: 400 }
      );
    }

    // Get all active subscribers
    const subscribers = await prisma.subscriber.findMany({
      where: { isActive: true },
    });

    if (subscribers.length === 0) {
      return NextResponse.json(
        { error: "No active subscribers" },
        { status: 400 }
      );
    }

    // Build email HTML
    const html = buildEmailHtml(digest);

    // Send to all subscribers
    const emails = subscribers.map((s) => s.email);

    try {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: emails,
        subject: `Daily Bunch: ${digest.headline}`,
        html,
      });
    } catch (emailError) {
      console.error("Error sending email:", emailError);
      return NextResponse.json(
        { error: "Failed to send email" },
        { status: 500 }
      );
    }

    // Update digest status
    await prisma.digest.update({
      where: { id },
      data: {
        status: "SENT",
        sentAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      recipientCount: subscribers.length,
    });
  } catch (error) {
    console.error("Error sending digest:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

function buildEmailHtml(digest: {
  headline: string;
  items: Array<{
    note: string | null;
    link: {
      title: string | null;
      domain: string;
      url: string;
      aiSummary: string | null;
    };
  }>;
}): string {
  const itemsHtml = digest.items
    .map(
      (item, index) => `
      <tr>
        <td style="padding: 20px 0; border-bottom: 1px solid #e5e7eb;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td width="30" style="vertical-align: top; color: #9ca3af; font-size: 18px; font-weight: bold;">
                ${index + 1}.
              </td>
              <td style="vertical-align: top;">
                <a href="${item.link.url}" style="color: #111827; font-size: 18px; font-weight: 600; text-decoration: none;">
                  ${item.link.title || item.link.domain}
                </a>
                <div style="color: #6b7280; font-size: 14px; margin-top: 4px;">
                  ${item.link.domain}
                </div>
                ${item.link.aiSummary ? `<p style="color: #4b5563; margin-top: 8px; margin-bottom: 0;">${item.link.aiSummary}</p>` : ""}
                ${item.note ? `<p style="color: #6b7280; font-style: italic; margin-top: 8px; margin-bottom: 0; padding-left: 12px; border-left: 2px solid #e5e7eb;">${item.note}</p>` : ""}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    `
    )
    .join("");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f9fafb;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="padding: 32px; background-color: #111827;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: bold;">
                Daily Bunch
              </h1>
            </td>
          </tr>

          <!-- Headline -->
          <tr>
            <td style="padding: 32px 32px 24px;">
              <h2 style="margin: 0; color: #111827; font-size: 28px; font-weight: bold;">
                ${digest.headline}
              </h2>
            </td>
          </tr>

          <!-- Items -->
          <tr>
            <td style="padding: 0 32px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                ${itemsHtml}
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 32px; text-align: center; color: #6b7280; font-size: 14px;">
              <p style="margin: 0 0 8px;">
                You received this because you subscribed to Daily Bunch.
              </p>
              <p style="margin: 0;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/unsubscribe" style="color: #6b7280;">Unsubscribe</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}
