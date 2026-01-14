import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  // Create admin user
  const hashedPassword = await bcrypt.hash("admin123", 10);
  const admin = await prisma.user.upsert({
    where: { email: "admin@dailybunch.com" },
    update: {},
    create: {
      email: "admin@dailybunch.com",
      name: "Admin",
      password: hashedPassword,
      role: "ADMIN",
    },
  });
  console.log("Created admin user:", admin.email);

  // Create some RSS feeds
  const feeds = [
    {
      name: "Hacker News",
      url: "https://hnrss.org/frontpage",
      isActive: true,
    },
    {
      name: "TechCrunch",
      url: "https://techcrunch.com/feed/",
      isActive: true,
    },
    {
      name: "Ars Technica",
      url: "https://feeds.arstechnica.com/arstechnica/index",
      isActive: true,
    },
    {
      name: "The Verge",
      url: "https://www.theverge.com/rss/index.xml",
      isActive: true,
    },
    {
      name: "Wired",
      url: "https://www.wired.com/feed/rss",
      isActive: true,
    },
  ];

  for (const feed of feeds) {
    await prisma.rssFeed.upsert({
      where: { url: feed.url },
      update: {},
      create: feed,
    });
  }
  console.log("Created RSS feeds:", feeds.length);

  // Create some sample tags
  const tags = [
    "Technology",
    "AI & ML",
    "Programming",
    "Startups",
    "Design",
    "Business",
    "Science",
    "Security",
    "Mobile",
    "Web",
  ];

  for (const tagName of tags) {
    const slug = tagName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    await prisma.tag.upsert({
      where: { slug },
      update: {},
      create: {
        name: tagName,
        slug,
      },
    });
  }
  console.log("Created tags:", tags.length);

  // Create some sample links
  const sampleLinks = [
    {
      url: "https://example.com/article-1",
      title: "The Future of AI in Software Development",
      description:
        "An in-depth look at how artificial intelligence is reshaping the way we write and maintain code.",
      domain: "example.com",
      status: "APPROVED" as const,
      score: 42,
      aiSummary:
        "This article explores the transformative impact of AI on software development, from code generation to automated testing. It discusses current tools like GitHub Copilot and looks ahead to future possibilities.",
    },
    {
      url: "https://example.com/article-2",
      title: "Building Scalable Systems: Lessons from Big Tech",
      description:
        "Key architectural patterns and practices used by major technology companies to handle millions of users.",
      domain: "example.com",
      status: "FEATURED" as const,
      score: 87,
      aiSummary:
        "A comprehensive guide to system design principles used by companies like Google, Amazon, and Netflix. Covers topics including microservices, caching strategies, and database sharding.",
    },
    {
      url: "https://example.com/article-3",
      title: "The State of JavaScript in 2025",
      description:
        "A comprehensive overview of the JavaScript ecosystem and what's trending this year.",
      domain: "example.com",
      status: "APPROVED" as const,
      score: 35,
      aiSummary:
        "This annual survey results reveal interesting trends in the JavaScript community, including the rise of Bun, the continued dominance of TypeScript, and new frameworks gaining traction.",
    },
  ];

  for (const link of sampleLinks) {
    await prisma.link.upsert({
      where: { url: link.url },
      update: {},
      create: {
        ...link,
        firstSeenAt: new Date(),
      },
    });
  }
  console.log("Created sample links:", sampleLinks.length);

  console.log("Seeding completed!");
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
