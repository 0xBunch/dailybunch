/**
 * Resend Email Service
 *
 * Handles outbound email delivery for digests.
 */

import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

interface DigestItem {
  title: string;
  url: string;
  domain: string;
  summary?: string | null;
  category?: string | null;
  velocity: number;
}

interface DigestEmailData {
  to: string[];
  subject: string;
  items: DigestItem[];
  previewText?: string;
}

/**
 * Generate HTML email template for a digest
 */
function generateDigestHtml(items: DigestItem[], previewText?: string): string {
  const itemsHtml = items
    .map(
      (item, index) => `
      <tr>
        <td style="padding: 16px 0; border-bottom: 1px solid #e5e5e5;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="font-family: Georgia, serif; font-size: 10px; color: #999; padding-bottom: 4px;">
                ${index + 1}. ${item.domain}${item.category ? ` / ${item.category}` : ""}${item.velocity > 1 ? ` · ${item.velocity} sources` : ""}
              </td>
            </tr>
            <tr>
              <td style="font-family: Georgia, serif; font-size: 18px; line-height: 1.3;">
                <a href="${item.url}" style="color: #000; text-decoration: none;">${item.title}</a>
              </td>
            </tr>
            ${
              item.summary
                ? `<tr>
              <td style="font-family: Georgia, serif; font-size: 14px; color: #666; line-height: 1.5; padding-top: 8px;">
                ${item.summary}
              </td>
            </tr>`
                : ""
            }
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
  <meta name="viewport" content="width=device-width, initial-scale=1">
  ${previewText ? `<meta name="x-apple-disable-message-reformatting"><!--[if mso]><style>table { border-collapse: collapse; }</style><![endif]--><span style="display:none;font-size:0;line-height:0;max-height:0;max-width:0;opacity:0;overflow:hidden;">${previewText}</span>` : ""}
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: Georgia, serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff;">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 24px; border-bottom: 2px solid #000;">
              <h1 style="margin: 0; font-family: Georgia, serif; font-size: 28px; font-weight: 700;">
                Daily Bunch
              </h1>
              <p style="margin: 8px 0 0; font-family: Georgia, serif; font-size: 14px; color: #666;">
                ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 0 32px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                ${itemsHtml}
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 32px; border-top: 1px solid #e5e5e5;">
              <p style="margin: 0; font-family: Georgia, serif; font-size: 12px; color: #999; text-align: center;">
                Curated by Daily Bunch · <a href="https://dailybunch.com" style="color: #999;">dailybunch.com</a>
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

/**
 * Generate plain text version of digest
 */
function generateDigestText(items: DigestItem[]): string {
  const date = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const itemsText = items
    .map(
      (item, index) =>
        `${index + 1}. ${item.title}\n   ${item.url}\n   ${item.domain}${item.category ? ` / ${item.category}` : ""}${item.velocity > 1 ? ` · ${item.velocity} sources` : ""}\n${item.summary ? `   ${item.summary}\n` : ""}`
    )
    .join("\n");

  return `DAILY BUNCH
${date}

${itemsText}
---
Curated by Daily Bunch
https://dailybunch.com
`;
}

/**
 * Send a digest email
 */
export async function sendDigestEmail(
  data: DigestEmailData
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const fromEmail = process.env.RESEND_FROM_EMAIL || "now@dailybunch.com";

    const result = await resend.emails.send({
      from: `Daily Bunch <${fromEmail}>`,
      to: data.to,
      subject: data.subject,
      html: generateDigestHtml(data.items, data.previewText),
      text: generateDigestText(data.items),
    });

    if (result.error) {
      return { success: false, error: result.error.message };
    }

    return { success: true, id: result.data?.id };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Send a test email
 */
export async function sendTestEmail(
  to: string
): Promise<{ success: boolean; id?: string; error?: string }> {
  return sendDigestEmail({
    to: [to],
    subject: "Test Email from Daily Bunch",
    previewText: "This is a test email to verify your setup.",
    items: [
      {
        title: "Test Link: Daily Bunch is Working",
        url: "https://dailybunch.com",
        domain: "dailybunch.com",
        summary: "If you received this email, your Resend configuration is working correctly.",
        category: "BUSINESS",
        velocity: 3,
      },
    ],
  });
}
