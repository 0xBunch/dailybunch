/**
 * Cleanup script to mark garbage titles as blocked
 * Run with: npx tsx scripts/cleanup-garbage-titles.ts
 */

import { PrismaClient } from "@prisma/client";
import { isBlockedTitle } from "../src/lib/title-utils";

const prisma = new PrismaClient();

async function main() {
  console.log("Finding links with garbage titles...\n");

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

  console.log(`Checking ${links.length} links...\n`);

  let blocked = 0;
  const blockedLinks: Array<{ title: string; reason: string; domain: string }> = [];

  for (const link of links) {
    const title = link.title || link.fallbackTitle;
    if (!title) continue;

    const reason = isBlockedTitle(title);
    if (reason) {
      await prisma.link.update({
        where: { id: link.id },
        data: {
          isBlocked: true,
          blockedReason: reason,
        },
      });
      blocked++;
      blockedLinks.push({ title, reason, domain: link.domain });
    }
  }

  console.log(`\nBlocked ${blocked} links:\n`);

  // Group by reason
  const byReason = blockedLinks.reduce((acc, link) => {
    acc[link.reason] = acc[link.reason] || [];
    acc[link.reason].push(link);
    return acc;
  }, {} as Record<string, typeof blockedLinks>);

  for (const [reason, items] of Object.entries(byReason)) {
    console.log(`\n${reason.toUpperCase()} (${items.length}):`);
    items.slice(0, 10).forEach((item) => {
      console.log(`  - "${item.title}" (${item.domain})`);
    });
    if (items.length > 10) {
      console.log(`  ... and ${items.length - 10} more`);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
