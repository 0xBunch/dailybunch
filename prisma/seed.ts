import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // ============================================
  // CATEGORIES & SUBCATEGORIES
  // ============================================
  console.log("Creating categories...");

  const sports = await prisma.category.upsert({
    where: { slug: "sports" },
    update: {},
    create: { name: "SPORTS", slug: "sports" },
  });

  const culture = await prisma.category.upsert({
    where: { slug: "culture" },
    update: {},
    create: { name: "CULTURE", slug: "culture" },
  });

  const business = await prisma.category.upsert({
    where: { slug: "business" },
    update: {},
    create: { name: "BUSINESS", slug: "business" },
  });

  const ai = await prisma.category.upsert({
    where: { slug: "ai" },
    update: {},
    create: { name: "AI", slug: "ai" },
  });

  console.log("Creating subcategories...");

  // SPORTS subcategories
  const sportsSubcategories = [
    { name: "Business", slug: "business" },
    { name: "Lifestyle", slug: "lifestyle" },
    { name: "NIL", slug: "nil" },
    { name: "Media", slug: "media" },
    { name: "Fashion", slug: "fashion" },
  ];

  for (const sub of sportsSubcategories) {
    await prisma.subcategory.upsert({
      where: { categoryId_slug: { categoryId: sports.id, slug: sub.slug } },
      update: {},
      create: { name: sub.name, slug: sub.slug, categoryId: sports.id },
    });
  }

  // CULTURE subcategories
  const cultureSubcategories = [
    { name: "Music", slug: "music" },
    { name: "Film", slug: "film" },
    { name: "Fashion", slug: "fashion" },
    { name: "Social Media", slug: "social-media" },
    { name: "Food", slug: "food" },
    { name: "Travel", slug: "travel" },
  ];

  for (const sub of cultureSubcategories) {
    await prisma.subcategory.upsert({
      where: { categoryId_slug: { categoryId: culture.id, slug: sub.slug } },
      update: {},
      create: { name: sub.name, slug: sub.slug, categoryId: culture.id },
    });
  }

  // BUSINESS subcategories
  const businessSubcategories = [
    { name: "Tech", slug: "tech" },
    { name: "Advertising", slug: "advertising" },
    { name: "General", slug: "general" },
  ];

  for (const sub of businessSubcategories) {
    await prisma.subcategory.upsert({
      where: { categoryId_slug: { categoryId: business.id, slug: sub.slug } },
      update: {},
      create: { name: sub.name, slug: sub.slug, categoryId: business.id },
    });
  }

  // AI subcategories
  const aiSubcategories = [
    { name: "Tools", slug: "tools" },
    { name: "Research", slug: "research" },
    { name: "Policy", slug: "policy" },
  ];

  for (const sub of aiSubcategories) {
    await prisma.subcategory.upsert({
      where: { categoryId_slug: { categoryId: ai.id, slug: sub.slug } },
      update: {},
      create: { name: sub.name, slug: sub.slug, categoryId: ai.id },
    });
  }

  // ============================================
  // SOURCES
  // ============================================
  console.log("Creating sources...");

  const sources = [
    // ============================================
    // EXISTING SOURCES
    // ============================================
    {
      name: "Morning Brew",
      type: "newsletter",
      emailTrigger: "morningbrew.com",
      categoryId: business.id,
    },
    {
      name: "Stratechery",
      type: "rss",
      url: "https://stratechery.com/feed/",
      categoryId: business.id,
    },
    {
      name: "SIC Weekly",
      type: "rss",
      url: "https://sic.substack.com/feed",
      categoryId: culture.id,
    },
    {
      name: "Intelligencer",
      type: "rss",
      url: "https://feeds.feedburner.com/nymag/intelligencer",
      categoryId: culture.id,
    },
    {
      name: "Front Office Sports",
      type: "rss",
      url: "https://frontofficesports.com/feed/",
      categoryId: sports.id,
    },
    {
      name: "Boardroom",
      type: "rss",
      url: "https://boardroom.tv/feed/",
      categoryId: sports.id,
    },
    {
      name: "GOOD THINKING",
      type: "rss",
      url: "https://ingoodco.substack.com/feed",
      categoryId: business.id,
    },
    {
      name: "Why is this interesting?",
      type: "newsletter",
      emailTrigger: "whyistheinteresting.substack.com",
      categoryId: culture.id,
    },

    // ============================================
    // NEW SOURCES - AI / TECH
    // ============================================
    {
      name: "Ben's Bites",
      type: "rss",
      url: "https://bensbites.beehiiv.com/feed",
      categoryId: ai.id,
    },
    {
      name: "The Rundown AI",
      type: "rss",
      url: "https://www.therundown.ai/feed",
      categoryId: ai.id,
    },
    {
      name: "Import AI",
      type: "rss",
      url: "https://importai.substack.com/feed",
      categoryId: ai.id,
    },
    {
      name: "Platformer",
      type: "rss",
      url: "https://www.platformer.news/feed",
      categoryId: ai.id,
    },

    // ============================================
    // NEW SOURCES - TECH / BUSINESS
    // ============================================
    {
      name: "Daring Fireball",
      type: "rss",
      url: "https://daringfireball.net/feeds/main",
      categoryId: business.id,
    },
    {
      name: "Techmeme",
      type: "rss",
      url: "https://www.techmeme.com/feed.xml",
      categoryId: business.id,
    },
    {
      name: "Hacker News",
      type: "rss",
      url: "https://hnrss.org/frontpage",
      categoryId: business.id,
    },
    {
      name: "Big Technology",
      type: "rss",
      url: "https://www.bigtechnology.com/feed",
      categoryId: business.id,
    },

    // ============================================
    // NEW SOURCES - CULTURE
    // ============================================
    {
      name: "Garbage Day",
      type: "rss",
      url: "https://www.garbageday.email/feed",
      categoryId: culture.id,
    },
    {
      name: "Kottke.org",
      type: "rss",
      url: "https://feeds.kottke.org/main",
      categoryId: culture.id,
    },
    {
      name: "Dirt",
      type: "rss",
      url: "https://dirt.substack.com/feed",
      categoryId: culture.id,
    },
    {
      name: "Normcore Tech",
      type: "rss",
      url: "https://normcore.substack.com/feed",
      categoryId: culture.id,
    },

    // ============================================
    // NEW SOURCES - SPORTS
    // ============================================
    {
      name: "Sportico",
      type: "rss",
      url: "https://www.sportico.com/feed/",
      categoryId: sports.id,
    },
    {
      name: "Defector",
      type: "rss",
      url: "https://defector.com/feed",
      categoryId: sports.id,
    },

    // ============================================
    // NEW SOURCES - LINK AGGREGATORS
    // ============================================
    {
      name: "Waxy Links",
      type: "rss",
      url: "https://waxy.org/feed/",
      categoryId: culture.id,
    },
    {
      name: "The Browser",
      type: "rss",
      url: "https://thebrowser.com/feed/",
      categoryId: culture.id,
    },
  ];

  for (const source of sources) {
    await prisma.source.upsert({
      where: { id: source.name.toLowerCase().replace(/[^a-z0-9]/g, "-") },
      update: source,
      create: {
        id: source.name.toLowerCase().replace(/[^a-z0-9]/g, "-"),
        ...source,
      },
    });
  }

  // ============================================
  // ENTITIES
  // ============================================
  console.log("Creating entities...");

  const entities = [
    { name: "Elon Musk", type: "person", aliases: ["@elonmusk"] },
    { name: "OpenAI", type: "organization", aliases: ["Open AI"] },
    { name: "Anthropic", type: "organization", aliases: ["Claude"] },
    { name: "Shohei Ohtani", type: "person", aliases: ["Shohei"] },
    { name: "Sabrina Carpenter", type: "person", aliases: ["Sabrina"] },
    { name: "Chris Black", type: "person", aliases: ["@donetodeath"] },
    { name: "Jason Stewart", type: "person", aliases: ["@themjeans"] },
    { name: "New Balance", type: "organization", aliases: ["newbalance"] },
    { name: "iPhone", type: "product", aliases: ["iphone"] },
    { name: "Claude Code", type: "product", aliases: ["claudecode"] },
    { name: "Los Angeles Dodgers", type: "organization", aliases: ["dodgers"] },
  ];

  for (const entity of entities) {
    await prisma.entity.upsert({
      where: { name: entity.name },
      update: { aliases: entity.aliases, type: entity.type },
      create: entity,
    });
  }

  // ============================================
  // COMMON BLACKLIST DOMAINS
  // ============================================
  console.log("Creating blacklist entries...");

  const blacklistDomains = [
    { pattern: "twitter.com", type: "domain", reason: "Social media - too noisy" },
    { pattern: "x.com", type: "domain", reason: "Social media - too noisy" },
    { pattern: "facebook.com", type: "domain", reason: "Social media - too noisy" },
    { pattern: "instagram.com", type: "domain", reason: "Social media - too noisy" },
    { pattern: "linkedin.com", type: "domain", reason: "Social media - too noisy" },
    { pattern: "mailto:", type: "url", reason: "Email links" },
    { pattern: "javascript:", type: "url", reason: "Script links" },
  ];

  for (const entry of blacklistDomains) {
    await prisma.blacklist.upsert({
      where: { pattern: entry.pattern },
      update: {},
      create: entry,
    });
  }

  console.log("✅ Seed complete!");
  console.log(`   - ${4} categories`);
  console.log(`   - ${sportsSubcategories.length + cultureSubcategories.length + businessSubcategories.length + aiSubcategories.length} subcategories`);
  console.log(`   - ${sources.length} sources`);
  console.log(`   - ${entities.length} entities`);
  console.log(`   - ${blacklistDomains.length} blacklist entries`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
