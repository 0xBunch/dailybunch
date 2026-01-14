import { Resend } from "resend";
import { isMockMode } from "@/lib/utils";

// Real Resend client (only if API key exists)
export const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
}

export interface SendResult {
  success: boolean;
  id?: string;
  error?: string;
}

// Mock email log (for development)
const emailLog: Array<{
  id: string;
  to: string | string[];
  subject: string;
  sentAt: Date;
}> = [];

export async function sendEmail(options: EmailOptions): Promise<SendResult> {
  const from = options.from || process.env.EMAIL_FROM || "Daily Bunch <hello@dailybunch.com>";

  if (isMockMode() || !resend) {
    // Mock email - log to console
    const mockId = `mock_email_${Date.now()}`;
    console.log("\n📧 Mock Email Sent:");
    console.log(`   To: ${Array.isArray(options.to) ? options.to.join(", ") : options.to}`);
    console.log(`   From: ${from}`);
    console.log(`   Subject: ${options.subject}`);
    console.log(`   ID: ${mockId}\n`);

    emailLog.push({
      id: mockId,
      to: options.to,
      subject: options.subject,
      sentAt: new Date(),
    });

    return { success: true, id: mockId };
  }

  try {
    const result = await resend.emails.send({
      from,
      to: options.to,
      subject: options.subject,
      html: options.html,
      replyTo: options.replyTo,
    });

    if (result.error) {
      return { success: false, error: result.error.message };
    }

    return { success: true, id: result.data?.id };
  } catch (error) {
    console.error("Email send error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function sendBulkEmails(
  emails: EmailOptions[]
): Promise<SendResult[]> {
  // Send in batches of 10 to avoid rate limits
  const results: SendResult[] = [];
  const batchSize = 10;

  for (let i = 0; i < emails.length; i += batchSize) {
    const batch = emails.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(sendEmail));
    results.push(...batchResults);

    // Small delay between batches
    if (i + batchSize < emails.length) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  return results;
}

export function getEmailLog() {
  return emailLog;
}

export function clearEmailLog() {
  emailLog.length = 0;
}

// Newsletter-specific email template
export function createNewsletterHtml(options: {
  title: string;
  headline?: string;
  links: Array<{
    title: string;
    url: string;
    summary: string;
    domain: string;
  }>;
  unsubscribeUrl: string;
}): string {
  const linksHtml = options.links
    .map(
      (link) => `
    <div style="margin-bottom: 24px; padding-bottom: 24px; border-bottom: 1px solid #e5e7eb;">
      <h3 style="margin: 0 0 8px 0; font-size: 18px;">
        <a href="${link.url}" style="color: #1f2937; text-decoration: none;">
          ${link.title}
        </a>
      </h3>
      <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 14px;">
        ${link.summary}
      </p>
      <p style="margin: 0; color: #9ca3af; font-size: 12px;">
        ${link.domain}
      </p>
    </div>
  `
    )
    .join("");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${options.title}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px;">
  <header style="text-align: center; margin-bottom: 32px;">
    <h1 style="font-size: 24px; font-weight: bold; margin: 0;">Daily Bunch</h1>
    <p style="color: #6b7280; margin: 8px 0 0 0;">${options.title}</p>
  </header>

  ${options.headline ? `<p style="font-size: 16px; margin-bottom: 32px;">${options.headline}</p>` : ""}

  <main>
    ${linksHtml}
  </main>

  <footer style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb; text-align: center; color: #9ca3af; font-size: 12px;">
    <p>You're receiving this because you subscribed to Daily Bunch.</p>
    <p>
      <a href="${options.unsubscribeUrl}" style="color: #6b7280;">Unsubscribe</a>
    </p>
  </footer>
</body>
</html>
`;
}
