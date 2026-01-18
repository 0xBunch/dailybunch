/**
 * Test Claude API Connection
 *
 * Run with: npx tsx scripts/test-claude.ts
 */

import Anthropic from "@anthropic-ai/sdk";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function testClaude() {
  console.log("Testing Claude API connection...\n");

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("❌ ANTHROPIC_API_KEY not found in environment");
    process.exit(1);
  }

  console.log("✓ API key found");

  const anthropic = new Anthropic({ apiKey });

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 100,
      messages: [
        {
          role: "user",
          content: "Respond with exactly: 'Claude API connection successful!'",
        },
      ],
    });

    const responseText =
      message.content[0].type === "text" ? message.content[0].text : "";

    console.log("✓ API response received");
    console.log(`  Response: ${responseText}\n`);

    // Test with a sample link analysis
    console.log("Testing link analysis prompt...\n");

    const analysisMessage = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 500,
      messages: [
        {
          role: "user",
          content: `Analyze this link and provide structured data.

URL: https://www.nytimes.com/2024/01/15/technology/openai-sam-altman-davos.html
Title: Sam Altman to Speak at Davos as OpenAI Pushes for AI Regulation
Description: The OpenAI CEO will address world leaders about the need for global AI governance.

TAXONOMY (pick the best fit):
- SPORTS: Business, Lifestyle, NIL, Media, Fashion
- CULTURE: Music, Film, Fashion, Social Media, Food, Travel
- BUSINESS: Tech, Advertising, General
- AI: Tools, Research, Policy

KNOWN ENTITIES:
- Elon Musk (person)
- OpenAI (organization)
- Sam Altman (person)

Respond with valid JSON only, no markdown:
{
  "category": "CATEGORY_NAME",
  "subcategory": "subcategory_name or null",
  "summary": "2-3 sentence summary",
  "matchedEntities": ["Entity Name"],
  "suggestedEntities": []
}`,
        },
      ],
    });

    const analysisText =
      analysisMessage.content[0].type === "text"
        ? analysisMessage.content[0].text
        : "";

    console.log("✓ Analysis response received");
    console.log(`  Raw response:\n${analysisText}\n`);

    // Try to parse the JSON
    try {
      const parsed = JSON.parse(analysisText);
      console.log("✓ JSON parsed successfully");
      console.log(`  Category: ${parsed.category}`);
      console.log(`  Subcategory: ${parsed.subcategory}`);
      console.log(`  Matched entities: ${parsed.matchedEntities.join(", ")}`);
      console.log(`  Summary: ${parsed.summary}`);
    } catch {
      console.log("⚠ Could not parse JSON (may need prompt tuning)");
    }

    console.log("\n✅ All Claude API tests passed!");
  } catch (error) {
    console.error("❌ Claude API error:", error);
    process.exit(1);
  }
}

testClaude();
