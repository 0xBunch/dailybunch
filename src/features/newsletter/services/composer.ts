import { prisma } from "@/lib/prisma";
import { render } from "@react-email/render";
import { DailyDigestEmail } from "../templates/daily-digest";
import { sendEmail } from "@/lib/resend";
import { format } from "date-fns";
import type { LinkStatus } from "@prisma/client";

interface EditionLink {
  id: string;
  title: string;
  url: string;
  domain: string;
  aiSummary: string | null;
  score: number;
}

interface ComposeOptions {
  title?: string;
  linkIds?: string[];
  autoSelect?: boolean;
  limit?: number;
}

// Get links for a newsletter edition
export async function getLinksForEdition(options: ComposeOptions = {}): Promise<EditionLink[]> {
  const { linkIds, autoSelect = true, limit = 10 } = options;
  const approvedStatuses: LinkStatus[] = ["APPROVED", "FEATURED"];

  if (linkIds && linkIds.length > 0) {
    // Get specific links
    const links = await prisma.link.findMany({
      where: {
        id: { in: linkIds },
        status: { in: approvedStatuses },
      },
      select: {
        id: true,
        title: true,
        url: true,
        domain: true,
        aiSummary: true,
        score: true,
      },
      orderBy: { score: "desc" },
    });

    return links;
  }

  if (autoSelect) {
    // Auto-select top links from last 24 hours
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const links = await prisma.link.findMany({
      where: {
        status: { in: approvedStatuses },
        createdAt: { gte: since },
      },
      select: {
        id: true,
        title: true,
        url: true,
        domain: true,
        aiSummary: true,
        score: true,
      },
      orderBy: { score: "desc" },
      take: limit,
    });

    return links;
  }

  return [];
}

// Compose newsletter HTML
export async function composeNewsletter(links: EditionLink[]): Promise<string> {
  const date = format(new Date(), "MMMM d, yyyy");
  const unsubscribeUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/unsubscribe`;

  const html = await render(
    DailyDigestEmail({
      links,
      date,
      unsubscribeUrl,
    })
  );

  return html;
}

// Send newsletter to all active subscribers
export async function sendNewsletter(
  links: EditionLink[],
  options: { testEmail?: string; dryRun?: boolean } = {}
): Promise<{
  success: boolean;
  sent: number;
  failed: number;
  editionId?: string;
}> {
  const { testEmail, dryRun = false } = options;

  const html = await composeNewsletter(links);
  const date = format(new Date(), "MMMM d, yyyy");
  const subject = `Daily Bunch - ${date}`;

  // If test email, just send to that address
  if (testEmail) {
    const result = await sendEmail({
      to: testEmail,
      subject: `[TEST] ${subject}`,
      html,
    });

    return {
      success: result.success,
      sent: result.success ? 1 : 0,
      failed: result.success ? 0 : 1,
    };
  }

  // Get active subscribers
  const subscribers = await prisma.subscriber.findMany({
    where: { isActive: true },
    select: { email: true, id: true },
  });

  if (dryRun) {
    console.log(`Dry run: Would send to ${subscribers.length} subscribers`);
    return {
      success: true,
      sent: 0,
      failed: 0,
    };
  }

  // Create edition record
  const edition = await prisma.publishedEdition.create({
    data: {
      title: subject,
      headline: `Top ${links.length} links for ${date}`,
      status: "SENDING",
    },
  });

  // Link the links to the edition
  for (let i = 0; i < links.length; i++) {
    await prisma.linksOnEditions.create({
      data: {
        editionId: edition.id,
        linkId: links[i].id,
        position: i,
      },
    });
  }

  let sent = 0;
  let failed = 0;

  // Send to each subscriber
  for (const subscriber of subscribers) {
    try {
      const result = await sendEmail({
        to: subscriber.email,
        subject,
        html,
      });

      if (result.success) {
        sent++;
      } else {
        failed++;
      }

      // Rate limit: 1 email per 100ms
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`Failed to send to ${subscriber.email}:`, error);
      failed++;
    }
  }

  // Update edition with stats
  await prisma.publishedEdition.update({
    where: { id: edition.id },
    data: {
      status: failed === 0 ? "SENT" : "FAILED",
      publishedAt: new Date(),
      emailSentAt: new Date(),
      sentCount: sent,
    },
  });

  return {
    success: failed === 0,
    sent,
    failed,
    editionId: edition.id,
  };
}

// Get recent editions
export async function getRecentEditions(limit = 10) {
  const editions = await prisma.publishedEdition.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      title: true,
      emailSentAt: true,
      sentCount: true,
      createdAt: true,
      status: true,
    },
  });

  return editions;
}

// Get edition by ID
export async function getEdition(id: string) {
  const edition = await prisma.publishedEdition.findUnique({
    where: { id },
    include: {
      links: {
        include: {
          link: true,
        },
        orderBy: { position: "asc" },
      },
    },
  });

  return edition;
}
