import { PrismaClient, SourceType, EntityType } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // ============ CATEGORIES ============
  console.log("Creating categories...");

  const sports = await prisma.category.create({
    data: { name: "Sports", slug: "sports" },
  });

  const culture = await prisma.category.create({
    data: { name: "Culture", slug: "culture" },
  });

  const business = await prisma.category.create({
    data: { name: "Business", slug: "business" },
  });

  const ai = await prisma.category.create({
    data: { name: "AI", slug: "ai" },
  });

  // ============ SUBCATEGORIES ============
  console.log("Creating subcategories...");

  const sportsBusiness = await prisma.subcategory.create({
    data: { name: "Business", slug: "business", categoryId: sports.id },
  });

  const businessTech = await prisma.subcategory.create({
    data: { name: "Tech", slug: "tech", categoryId: business.id },
  });

  const businessGeneral = await prisma.subcategory.create({
    data: { name: "General", slug: "general", categoryId: business.id },
  });

  const businessAdvertising = await prisma.subcategory.create({
    data: { name: "Advertising", slug: "advertising", categoryId: business.id },
  });

  // ============ ENTITIES ============
  console.log("Creating entities...");

  const entities = [
    { name: "Elon Musk", type: EntityType.PERSON, aliases: ["@elonmusk"] },
    { name: "OpenAI", type: EntityType.ORGANIZATION, aliases: ["Open AI"] },
    { name: "Anthropic", type: EntityType.ORGANIZATION, aliases: ["Claude"] },
    { name: "Shohei Ohtani", type: EntityType.PERSON, aliases: ["Shohei"] },
    { name: "Sabrina Carpenter", type: EntityType.PERSON, aliases: ["Sabrina"] },
    { name: "Chris Black", type: EntityType.PERSON, aliases: ["@donetodeath"] },
    { name: "Jason Stewart", type: EntityType.PERSON, aliases: ["@themjeans"] },
    { name: "New Balance", type: EntityType.ORGANIZATION, aliases: ["newbalance"] },
    { name: "iPhone", type: EntityType.PRODUCT, aliases: ["iphone"] },
    { name: "Claude Code", type: EntityType.PRODUCT, aliases: ["claudecode"] },
    { name: "Los Angeles Dodgers", type: EntityType.ORGANIZATION, aliases: ["dodgers"] },
  ];

  for (const entity of entities) {
    await prisma.entity.create({ data: entity });
  }

  // ============ SOURCES ============
  console.log("Creating sources...");

  const sources = [
    {
      name: "Morning Brew",
      type: SourceType.NEWSLETTER,
      emailTrigger: "morningbrew.com",
      categoryId: business.id,
      subcategoryId: businessGeneral.id,
    },
    {
      name: "Stratechery",
      type: SourceType.RSS,
      url: "https://stratechery.com/feed/",
      categoryId: business.id,
      subcategoryId: businessTech.id,
    },
    {
      name: "SIC Weekly",
      type: SourceType.RSS,
      url: "https://sic.substack.com/feed",
      categoryId: culture.id,
    },
    {
      name: "Intelligencer",
      type: SourceType.RSS,
      url: "https://feeds.feedburner.com/nymag/intelligencer",
      categoryId: culture.id,
    },
    {
      name: "Front Office Sports",
      type: SourceType.RSS,
      url: "https://frontofficesports.com/feed/",
      categoryId: sports.id,
      subcategoryId: sportsBusiness.id,
    },
    {
      name: "Boardroom",
      type: SourceType.RSS,
      url: "https://boardroom.tv/feed/",
      categoryId: sports.id,
    },
    {
      name: "GOOD THINKING",
      type: SourceType.RSS,
      url: "https://ingoodco.substack.com/feed",
      categoryId: business.id,
      subcategoryId: businessAdvertising.id,
    },
    {
      name: "Why is this interesting?",
      type: SourceType.NEWSLETTER,
      emailTrigger: "whyistheinteresting.substack.com",
      categoryId: culture.id,
    },
  ];

  for (const source of sources) {
    await prisma.source.create({ data: source });
  }

  // ============ BLACKLISTED DOMAINS ============
  console.log("Creating blacklisted domains...");

  const blacklistedDomains = [
    { domain: "twitter.com", reason: "Social media - too noisy" },
    { domain: "x.com", reason: "Social media - too noisy" },
    { domain: "facebook.com", reason: "Social media" },
    { domain: "instagram.com", reason: "Social media" },
    { domain: "linkedin.com", reason: "Social media" },
    { domain: "youtube.com", reason: "Video platform" },
    { domain: "mailchimp.com", reason: "Email service infrastructure" },
    { domain: "substack.com", reason: "Newsletter platform homepage" },
    { domain: "beehiiv.com", reason: "Newsletter platform" },
    { domain: "list-manage.com", reason: "Email tracking" },
    { domain: "mailchi.mp", reason: "Email tracking" },
  ];

  for (const domain of blacklistedDomains) {
    await prisma.blacklistedDomain.create({ data: domain });
  }

  console.log("Seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
