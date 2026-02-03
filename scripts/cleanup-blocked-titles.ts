/**
 * Cleanup Blocked Titles
 *
 * Scans all links and marks those with garbage titles as blocked.
 * Uses the same patterns as the enrichment pipeline.
 *
 * Run with: npx tsx scripts/cleanup-blocked-titles.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Patterns that indicate a blocked/error page
const BLOCKED_TITLE_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  // Robot/captcha pages
  { pattern: /are you a robot/i, reason: "robot" },
  { pattern: /captcha/i, reason: "robot" },
  { pattern: /just a moment/i, reason: "robot" },
  { pattern: /checking your browser/i, reason: "robot" },
  { pattern: /verify you are human/i, reason: "robot" },
  { pattern: /cloudflare/i, reason: "robot" },
  { pattern: /ddos protection/i, reason: "robot" },
  // Access denied
  { pattern: /access denied/i, reason: "access_denied" },
  { pattern: /403 forbidden/i, reason: "access_denied" },
  { pattern: /age verification/i, reason: "access_denied" },
  { pattern: /restricted content/i, reason: "access_denied" },
  // 404/error pages
  { pattern: /page not found/i, reason: "404" },
  { pattern: /404 error/i, reason: "404" },
  { pattern: /link.*has expired/i, reason: "expired" },
  { pattern: /error \d{3}/i, reason: "error" },
  // Paywalls
  { pattern: /subscribe to continue/i, reason: "paywall" },
  { pattern: /subscribe to read/i, reason: "paywall" },
  { pattern: /subscription required/i, reason: "paywall" },
  { pattern: /please log in/i, reason: "paywall" },
  { pattern: /sign in to continue/i, reason: "paywall" },
  { pattern: /sign in to read/i, reason: "paywall" },
  { pattern: /create.*account to/i, reason: "paywall" },
  { pattern: /members only/i, reason: "paywall" },
  // Generic garbage
  { pattern: /^untitled$/i, reason: "garbage" },
  { pattern: /^home$/i, reason: "garbage" },
  { pattern: /^index$/i, reason: "garbage" },
  { pattern: /^loading/i, reason: "garbage" },
  { pattern: /^please wait/i, reason: "garbage" },
  { pattern: /^redirecting/i, reason: "garbage" },
];

function isBlockedTitle(title: string | null): string | null {
  if (!title) return null;
  for (const { pattern, reason } of BLOCKED_TITLE_PATTERNS) {
    if (pattern.test(title)) {
      return reason;
    }
  }
  return null;
}

async function cleanupBlockedTitles() {
  console.log("Scanning links for garbage titles...\n");

  // Get all non-blocked links with titles
  const links = await prisma.link.findMany({
    where: {
      isBlocked: false,
      OR: [
        { title: { not: null } },
        { fallbackTitle: { not: null } },
      ],
    },
    select: {
      id: true,
      title: true,
      fallbackTitle: true,
      domain: true,
    },
  });

  console.log(`Found ${links.length} links to check\n`);

  let blocked = 0;
  const blockedByReason: Record<string, number> = {};

  for (const link of links) {
    const title = link.title || link.fallbackTitle;
    const blockedReason = isBlockedTitle(title);

    if (blockedReason) {
      await prisma.link.update({
        where: { id: link.id },
        data: {
          isBlocked: true,
          blockedReason,
        },
      });

      blocked++;
      blockedByReason[blockedReason] = (blockedByReason[blockedReason] || 0) + 1;
      console.log(`Blocked: "${title?.slice(0, 50)}..." (${blockedReason}) - ${link.domain}`);
    }
  }

  console.log(`\n--- Summary ---`);
  console.log(`Total links checked: ${links.length}`);
  console.log(`Links blocked: ${blocked}`);
  console.log(`\nBlocked by reason:`);
  for (const [reason, count] of Object.entries(blockedByReason)) {
    console.log(`  ${reason}: ${count}`);
  }

  await prisma.$disconnect();
}

cleanupBlockedTitles().catch((error) => {
  console.error("Error:", error);
  prisma.$disconnect();
  process.exit(1);
});
