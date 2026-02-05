/**
 * Weekly Review Generator - Test Script
 *
 * Tests the Harper's-style Weekly Review prompt with real data from the DB.
 *
 * Run with: npx tsx scripts/test-weekly-review.ts
 *
 * Options:
 *   --days=N       Number of days to look back (default: 7)
 *   --min-velocity=N  Minimum velocity threshold (default: 2)
 *   --max-links=N  Maximum links to include (default: 15)
 *   --dry-run      Show links that would be used without calling Claude
 */

import { PrismaClient } from "@prisma/client";
import Anthropic from "@anthropic-ai/sdk";
import dotenv from "dotenv";
import {
  WEEKLY_REVIEW_SYSTEM_PROMPT,
  buildUserPrompt,
  parseWeeklyReviewResponse,
  type LinkForReview,
} from "../src/lib/prompts/weekly-review";

dotenv.config({ path: ".env.local" });

const prisma = new PrismaClient();

// Parse CLI arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    days: 7,
    minVelocity: 2,
    maxLinks: 15,
    dryRun: false,
  };

  for (const arg of args) {
    if (arg.startsWith("--days=")) {
      options.days = parseInt(arg.split("=")[1]) || 7;
    } else if (arg.startsWith("--min-velocity=")) {
      options.minVelocity = parseInt(arg.split("=")[1]) || 2;
    } else if (arg.startsWith("--max-links=")) {
      options.maxLinks = parseInt(arg.split("=")[1]) || 15;
    } else if (arg === "--dry-run") {
      options.dryRun = true;
    }
  }

  return options;
}

async function getHighVelocityLinks(
  days: number,
  minVelocity: number,
  maxLinks: number
): Promise<LinkForReview[]> {
  const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  // Get links with velocity (count of mentions) in the time period
  const links = await prisma.link.findMany({
    where: {
      firstSeenAt: { gte: cutoffDate },
    },
    include: {
      mentions: {
        include: {
          source: true,
        },
      },
      category: true,
    },
    orderBy: {
      firstSeenAt: "desc",
    },
  });

  // Calculate velocity and filter
  const linksWithVelocity = links
    .map((link) => ({
      ...link,
      velocity: link.mentions.length,
    }))
    .filter((link) => link.velocity >= minVelocity)
    .sort((a, b) => b.velocity - a.velocity)
    .slice(0, maxLinks);

  // Format for the prompt
  return linksWithVelocity.map((link) => ({
    id: link.id,
    url: link.canonicalUrl,
    title: link.title || "Untitled",
    summary: link.aiSummary || link.description || link.title || "No summary available",
    sourceName: link.mentions[0]?.source?.name || "Unknown Source",
    velocity: link.velocity,
    category: link.category?.name,
  }));
}

function formatWeekOf(days: number): string {
  const endDate = new Date();
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const options: Intl.DateTimeFormatOptions = {
    month: "long",
    day: "numeric",
    year: "numeric",
  };

  return `${startDate.toLocaleDateString("en-US", options)} - ${endDate.toLocaleDateString("en-US", options)}`;
}

async function testWeeklyReview() {
  const options = parseArgs();

  console.log("=".repeat(60));
  console.log("Weekly Review Generator - Test Script");
  console.log("=".repeat(60));
  console.log(`\nOptions:`);
  console.log(`  Days: ${options.days}`);
  console.log(`  Min velocity: ${options.minVelocity}`);
  console.log(`  Max links: ${options.maxLinks}`);
  console.log(`  Dry run: ${options.dryRun}`);
  console.log("");

  // Fetch high-velocity links
  console.log("Fetching high-velocity links from database...\n");
  const links = await getHighVelocityLinks(
    options.days,
    options.minVelocity,
    options.maxLinks
  );

  if (links.length === 0) {
    console.log("No links found matching criteria. Try:");
    console.log("  - Increasing --days");
    console.log("  - Decreasing --min-velocity");
    await prisma.$disconnect();
    return;
  }

  console.log(`Found ${links.length} links:\n`);
  links.forEach((link, i) => {
    console.log(`${i + 1}. [v${link.velocity}] ${link.title}`);
    console.log(`   ${link.sourceName} | ${link.category || "Uncategorized"}`);
    console.log(`   ${link.url.substring(0, 80)}...`);
    console.log("");
  });

  if (options.dryRun) {
    console.log("Dry run - skipping Claude API call.");
    await prisma.$disconnect();
    return;
  }

  // Check for API key
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("ANTHROPIC_API_KEY not found in environment");
    console.error("Add it to .env.local: ANTHROPIC_API_KEY=sk-ant-...");
    await prisma.$disconnect();
    process.exit(1);
  }

  // Generate the review
  console.log("=".repeat(60));
  console.log("Generating Weekly Review...");
  console.log("=".repeat(60));
  console.log("");

  const anthropic = new Anthropic({ apiKey });
  const weekOf = formatWeekOf(options.days);

  const startTime = Date.now();

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2500,
      system: WEEKLY_REVIEW_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: buildUserPrompt(links, weekOf),
        },
      ],
    });

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const rawText =
      response.content[0].type === "text" ? response.content[0].text : "";

    console.log(`Generated in ${elapsed}s\n`);
    console.log("=".repeat(60));
    console.log("RAW OUTPUT:");
    console.log("=".repeat(60));
    console.log(rawText);
    console.log("");

    // Parse the response
    const parsed = parseWeeklyReviewResponse(rawText, links);

    console.log("=".repeat(60));
    console.log("PARSED OUTPUT:");
    console.log("=".repeat(60));
    console.log("\nContent (with HTML superscripts):");
    console.log(parsed.content);
    console.log("\nFootnotes:");
    parsed.footnotes.forEach((fn) => {
      const link = links.find((l) => l.id === fn.linkId);
      console.log(`  [${fn.number}] → ${link?.title || "Unknown"}`);
    });

    // Quality metrics
    console.log("\n" + "=".repeat(60));
    console.log("QUALITY METRICS:");
    console.log("=".repeat(60));

    const wordCount = parsed.content.split(/\s+/).length;
    const semicolonCount = (parsed.content.match(/;/g) || []).length;
    const periodCount = (parsed.content.match(/\./g) || []).length;
    const paragraphCount = parsed.content.split(/\n\n+/).length;
    const hasEditorialWords = /shocking|disturbing|unbelievable|ironic|surprisingly/i.test(
      parsed.content
    );
    const hasTransitionWords = /meanwhile|in other news|on a lighter note/i.test(
      parsed.content
    );
    const endsWithByline = /—Weekly Review\s*$/.test(parsed.content);

    console.log(`  Word count: ${wordCount} (target: 400-700)`);
    console.log(`  Semicolons: ${semicolonCount}`);
    console.log(`  Periods: ${periodCount}`);
    console.log(`  Paragraphs: ${paragraphCount} (should be 1)`);
    console.log(`  Footnotes: ${parsed.footnotes.length}`);
    console.log(`  Editorial words: ${hasEditorialWords ? "YES (bad)" : "No (good)"}`);
    console.log(`  Transition words: ${hasTransitionWords ? "YES (bad)" : "No (good)"}`);
    console.log(`  Ends with byline: ${endsWithByline ? "Yes (good)" : "NO (bad)"}`);

    // Token usage
    console.log("\n" + "=".repeat(60));
    console.log("TOKEN USAGE:");
    console.log("=".repeat(60));
    console.log(`  Input tokens: ${response.usage.input_tokens}`);
    console.log(`  Output tokens: ${response.usage.output_tokens}`);
  } catch (error) {
    console.error("Error calling Claude API:", error);
  }

  await prisma.$disconnect();
}

testWeeklyReview();
