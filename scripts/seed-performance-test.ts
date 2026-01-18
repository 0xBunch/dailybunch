/**
 * Seed database with 1000 links and 5000 mentions for performance testing
 *
 * Run with: npx tsx scripts/seed-performance-test.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const domains = [
  "nytimes.com",
  "wsj.com",
  "bloomberg.com",
  "techcrunch.com",
  "theverge.com",
  "wired.com",
  "arstechnica.com",
  "reuters.com",
  "bbc.com",
  "theguardian.com",
  "washingtonpost.com",
  "forbes.com",
  "businessinsider.com",
  "cnbc.com",
  "axios.com",
  "politico.com",
  "theatlantic.com",
  "newyorker.com",
  "vanityfair.com",
  "rollingstone.com",
];

const titlePrefixes = [
  "Breaking:",
  "Exclusive:",
  "Analysis:",
  "Opinion:",
  "Report:",
  "How",
  "Why",
  "The",
  "Inside",
  "What",
];

const titleSubjects = [
  "Tech Giants",
  "AI Companies",
  "Startups",
  "Wall Street",
  "Silicon Valley",
  "Sports Industry",
  "Music Business",
  "Fashion Brands",
  "Streaming Wars",
  "Social Media",
];

const titleActions = [
  "Face New Challenges",
  "Report Record Growth",
  "Announce Major Changes",
  "Reshape the Industry",
  "Battle for Market Share",
  "Embrace AI Technology",
  "Cut Thousands of Jobs",
  "Expand Into New Markets",
  "Launch Surprising Products",
  "Navigate Uncertain Times",
];

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateTitle(): string {
  return `${randomElement(titlePrefixes)} ${randomElement(titleSubjects)} ${randomElement(titleActions)}`;
}

function generateUrl(domain: string, index: number): string {
  const slug = `article-${index}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return `https://${domain}/${slug}`;
}

async function seed() {
  console.log("Starting performance test seed...\n");

  // Get existing sources and categories
  const sources = await prisma.source.findMany({ where: { active: true } });
  const categories = await prisma.category.findMany({
    include: { subcategories: true },
  });

  if (sources.length === 0) {
    console.error("No sources found. Run prisma/seed.ts first.");
    process.exit(1);
  }

  console.log(`Found ${sources.length} sources and ${categories.length} categories`);

  // Check existing link count
  const existingLinks = await prisma.link.count();
  console.log(`Existing links: ${existingLinks}`);

  if (existingLinks >= 1000) {
    console.log("Already have 1000+ links. Skipping seed.");
    await prisma.$disconnect();
    return;
  }

  const linksToCreate = 1000 - existingLinks;
  console.log(`Creating ${linksToCreate} new links...`);

  // Create links in batches
  const batchSize = 100;
  const createdLinkIds: string[] = [];

  for (let batch = 0; batch < linksToCreate / batchSize; batch++) {
    const links = [];
    for (let i = 0; i < batchSize; i++) {
      const domain = randomElement(domains);
      const category = randomElement(categories);
      const subcategory = category.subcategories.length > 0
        ? randomElement(category.subcategories)
        : null;

      // Random date within last 7 days
      const daysAgo = Math.random() * 7;
      const firstSeenAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

      links.push({
        canonicalUrl: generateUrl(domain, batch * batchSize + i),
        originalUrl: generateUrl(domain, batch * batchSize + i),
        domain,
        title: generateTitle(),
        description: `This is a test article about ${randomElement(titleSubjects).toLowerCase()}.`,
        categoryId: category.id,
        subcategoryId: subcategory?.id || null,
        aiSummary: `AI-generated summary for test article ${batch * batchSize + i}.`,
        aiAnalyzedAt: new Date(),
        firstSeenAt,
        lastSeenAt: firstSeenAt,
      });
    }

    const result = await prisma.link.createMany({ data: links });
    console.log(`  Batch ${batch + 1}: Created ${result.count} links`);

    // Get IDs of created links for this batch
    const createdLinks = await prisma.link.findMany({
      where: {
        domain: { in: domains },
        createdAt: { gte: new Date(Date.now() - 60000) },
      },
      select: { id: true },
      orderBy: { createdAt: "desc" },
      take: batchSize,
    });
    createdLinkIds.push(...createdLinks.map((l) => l.id));
  }

  console.log(`\nCreated ${createdLinkIds.length} links total`);

  // Get all link IDs for mention creation
  const allLinks = await prisma.link.findMany({
    select: { id: true },
  });
  const allLinkIds = allLinks.map((l) => l.id);

  // Check existing mentions
  const existingMentions = await prisma.mention.count();
  console.log(`Existing mentions: ${existingMentions}`);

  const mentionsToCreate = Math.max(0, 5000 - existingMentions);
  console.log(`Creating ${mentionsToCreate} new mentions...`);

  // Create mentions - distribute across links with varying velocity
  const mentionBatchSize = 500;
  for (let batch = 0; batch < mentionsToCreate / mentionBatchSize; batch++) {
    const mentions = [];
    for (let i = 0; i < mentionBatchSize; i++) {
      const linkId = randomElement(allLinkIds);
      const source = randomElement(sources);
      const daysAgo = Math.random() * 7;
      const seenAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

      mentions.push({
        linkId,
        sourceId: source.id,
        seenAt,
        context: `Found in ${source.name} feed`,
      });
    }

    // Use createMany with skipDuplicates to handle unique constraint
    const result = await prisma.mention.createMany({
      data: mentions,
      skipDuplicates: true,
    });
    console.log(`  Batch ${batch + 1}: Created ${result.count} mentions`);
  }

  // Final counts
  const finalLinkCount = await prisma.link.count();
  const finalMentionCount = await prisma.mention.count();

  console.log(`\n✅ Seed complete!`);
  console.log(`   Links: ${finalLinkCount}`);
  console.log(`   Mentions: ${finalMentionCount}`);

  await prisma.$disconnect();
}

seed().catch(console.error);
