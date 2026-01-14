import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { processNewsletterEmail } from "@/features/sources/services/newsletter-parser";

// Resend inbound email webhook format
interface ResendInboundEmail {
  type: "email.received";
  data: {
    from: string;
    to: string;
    subject?: string;
    html?: string;
    text?: string;
    headers: Record<string, string>;
  };
}

// POST /api/webhooks/inbound-email - Handle inbound emails from Resend
export async function POST(req: NextRequest) {
  try {
    // Verify webhook signature (in production)
    const svixId = req.headers.get("svix-id");
    const svixTimestamp = req.headers.get("svix-timestamp");
    const svixSignature = req.headers.get("svix-signature");

    // In development/mock mode, we don't strictly verify
    if (process.env.NODE_ENV === "production" && !svixSignature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 401 });
    }

    const body = await req.json();

    // Handle Resend format
    if (body.type === "email.received") {
      const email = body as ResendInboundEmail;
      return handleResendEmail(email.data);
    }

    // Handle direct/test format
    if (body.to && body.html) {
      return handleResendEmail(body);
    }

    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  } catch (error) {
    console.error("Inbound email error:", error);
    return NextResponse.json(
      { error: "Failed to process email" },
      { status: 500 }
    );
  }
}

async function handleResendEmail(data: {
  from: string;
  to: string;
  subject?: string;
  html?: string;
  text?: string;
}) {
  const { from, to, subject, html, text } = data;

  // Find newsletter by inbox email
  const newsletter = await prisma.newsletter.findFirst({
    where: {
      inboxEmail: to,
      isActive: true,
    },
  });

  if (!newsletter) {
    console.log(`No newsletter found for inbox: ${to}`);
    return NextResponse.json(
      { error: "Unknown recipient", to },
      { status: 404 }
    );
  }

  // Optionally verify sender
  if (newsletter.fromEmail && !from.includes(newsletter.fromEmail)) {
    console.log(`Sender mismatch: expected ${newsletter.fromEmail}, got ${from}`);
    // Don't reject, but log for debugging
  }

  // Process the email content
  const content = html || text || "";
  if (!content) {
    return NextResponse.json(
      { error: "No content to process" },
      { status: 400 }
    );
  }

  const result = await processNewsletterEmail(newsletter.id, subject, content);

  return NextResponse.json({
    success: result.success,
    newsletter: newsletter.name,
    subject,
    linksFound: result.linksFound,
    linksAdded: result.linksAdded,
    error: result.error,
  });
}

// GET endpoint for testing
export async function GET(req: NextRequest) {
  const testEmail = req.nextUrl.searchParams.get("test");

  if (testEmail === "true") {
    // Return sample payload format for testing
    return NextResponse.json({
      info: "Send a POST request with the following format to process inbound emails",
      samplePayload: {
        type: "email.received",
        data: {
          from: "newsletter@example.com",
          to: "your-inbox@ingest.dailybunch.com",
          subject: "Weekly Newsletter",
          html: "<p>Check out <a href='https://example.com/article'>this article</a></p>",
        },
      },
    });
  }

  return NextResponse.json({
    status: "Inbound email webhook active",
    endpoint: "/api/webhooks/inbound-email",
  });
}
