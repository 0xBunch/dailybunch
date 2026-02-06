/**
 * Re-enrich links with garbage titles
 *
 * Instead of blocking links with titles like "Please update your browser",
 * this resets them to pending enrichment so the pipeline can try to
 * recover real titles (e.g. via oEmbed for YouTube).
 *
 * Run with: npx tsx scripts/re-enrich-garbage-titles.ts
 */

import { PrismaClient } from "@prisma/client";
import { isBlockedTitle } from "../src/lib/title-utils";

const prisma = new PrismaClient();

async function main() {
  console.log("Finding links with garbage titles to re-enrich...\n");

  const links = await prisma.link.findMany({
    where: {
      isBlocked: false,
      title: { not: null },
    },
    select: {
      id: true,
      title: true,
      domain: true,
      canonicalUrl: true,
    },
  });

  console.log(`Checking ${links.length} links...\n`);

  let reset = 0;

  for (const link of links) {
    if (!link.title) continue;

    const reason = isBlockedTitle(link.title);
    if (reason) {
      await prisma.link.update({
        where: { id: link.id },
        data: {
          title: null,
          enrichmentStatus: "pending",
          enrichmentRetryCount: 0,
        },
      });
      reset++;
      console.log(`Reset: "${link.title}" → pending (${link.domain}) ${link.canonicalUrl}`);
    }
  }

  console.log(`\nReset ${reset} links for re-enrichment.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
