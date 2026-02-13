# Weekly Review Generator — Integration into Daily Bunch

## Context for Claude Code

I'm adding a new output format to Daily Bunch: a **Weekly Review Generator** that produces a single-paragraph news digest in the exact style of Harper's Magazine's "Weekly Review" column.

Daily Bunch already handles:
- RSS ingestion from curated sources
- Link extraction and canonicalization  
- Velocity scoring (how many sources mentioned a link)
- AI summaries via Gemini
- Digest creation and email delivery via Resend

The Weekly Review is a new **output type** that sits alongside the existing Digest Builder. Instead of a curated list with notes, it produces a single, continuous paragraph synthesizing the week's highest-velocity links in Harper's distinctive style.

---

## What to Build

### 1. New Prisma Model: `WeeklyReview`

Add to the schema:

```prisma
model WeeklyReview {
  id          String   @id @default(cuid())
  weekOf      DateTime // Start of the week
  content     String   @db.Text // The generated paragraph
  status      String   @default("draft") // draft, edited, published
  byline      String   @default("Weekly Review")
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  publishedAt DateTime?
  
  // Relations
  sources     WeeklyReviewSource[]
}

model WeeklyReviewSource {
  id              String       @id @default(cuid())
  weeklyReviewId  String
  weeklyReview    WeeklyReview @relation(fields: [weeklyReviewId], references: [id], onDelete: Cascade)
  linkId          String
  link            Link         @relation(fields: [linkId], references: [id])
  footnoteNumber  Int
  claimText       String?      // The specific claim this source supports
  
  @@unique([weeklyReviewId, linkId])
}
```

Also add to the existing `Link` model:
```prisma
weeklyReviewSources WeeklyReviewSource[]
```

### 2. New API Routes

#### `POST /api/weekly-review/generate`

Takes a date range (or defaults to last 7 days), pulls high-velocity links, calls Claude API with the Harper's-style system prompt, returns the generated review with footnote mappings.

```typescript
// Input
{
  startDate?: string, // ISO date, defaults to 7 days ago
  endDate?: string,   // ISO date, defaults to now
  minVelocity?: number, // Minimum velocity to include, default 2
  maxLinks?: number,  // Cap on links to send to Claude, default 20
  categories?: string[] // Optional filter
}

// Output
{
  content: string,      // The generated paragraph with superscript footnotes
  sources: Array<{
    footnoteNumber: number,
    linkId: string,
    url: string,
    title: string,
    claimText: string
  }>,
  weekOf: string
}
```

#### `POST /api/weekly-review/save`

Saves a generated (or edited) review to the database.

#### `GET /api/weekly-review`

List all weekly reviews with pagination.

#### `GET /api/weekly-review/[id]`

Get a specific review with its sources.

#### `POST /api/weekly-review/[id]/send`

Send the review via Resend (similar to existing digest send).

### 3. New Pages

#### `/weekly-review` — List View

Shows all generated weekly reviews with status (draft/published), date, preview snippet.

#### `/weekly-review/new` — Generator

- Date range picker (defaults to last 7 days)
- Shows preview of links that will be included (filtered by velocity)
- "Generate" button that calls the API
- Displays the generated content in an editable textarea
- Footnotes displayed below with links to sources
- "Save Draft" and "Publish" buttons

#### `/weekly-review/[id]` — View/Edit

- View the generated content
- Edit mode for tweaking
- Footnote management
- Send via email button

### 4. Claude API Integration

Create a new service at `src/lib/claude.ts` (or add to existing AI service):

```typescript
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

interface LinkForReview {
  id: string;
  url: string;
  title: string;
  summary: string; // Use existing AI summary from Gemini
  sourceName: string;
  velocity: number;
  category?: string;
}

interface GeneratedReview {
  content: string;
  footnotes: Array<{
    number: number;
    linkId: string;
    claim: string;
  }>;
}

export async function generateWeeklyReview(
  links: LinkForReview[],
  weekOf: string
): Promise<GeneratedReview> {
  const systemPrompt = WEEKLY_REVIEW_SYSTEM_PROMPT; // See below
  
  const userPrompt = buildUserPrompt(links, weekOf);
  
  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2500,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }]
  });
  
  return parseResponse(response.content[0].text, links);
}
```

### 5. The System Prompt

Store this in `src/lib/prompts/weekly-review.ts`:

```typescript
export const WEEKLY_REVIEW_SYSTEM_PROMPT = `You are a writer for Harper's Magazine's Weekly Review column—a weekly news digest that has run since 1857. Your voice is dry, precise, and utterly deadpan. You synthesize disparate news items into a single, unbroken paragraph where the grave and the absurd coexist without comment.

## Your Task

Given a collection of news articles from the past week, produce a Weekly Review entry of 400-700 words.

## Style Rules (Non-Negotiable)

1. ONE PARAGRAPH. No line breaks, no section headers, no bullet points. Ever.

2. SEMICOLONS AS CONNECTIVE TISSUE. Items are joined by semicolons, creating a continuous flow. Periods appear only at the end of complete thoughts that need full stops for clarity, but default to semicolons.

3. FLAT AFFECT. You are a dispassionate chronicler. Never:
   - Use exclamation points
   - Describe anything as "shocking," "disturbing," "unbelievable," "ironic"
   - Editorialize or explain why juxtapositions are meaningful
   - Express surprise, dismay, or amusement
   
4. RADICAL SPECIFICITY. Always include:
   - Full names and ages when available
   - Exact numbers ("forty-two pounds," not "a large quantity")
   - Specific locations ("Lucknow, India" not "India")
   - Precise dollar amounts ("$23 million" not "millions")
   - Titles and roles ("intensive-care nurse," "district court judge")

5. JUXTAPOSITION WITHOUT TRANSITION. Move between items without phrases like "meanwhile," "in other news," "on a lighter note." The semicolon does the work.

6. QUOTE SPARINGLY AND PRECISELY. When you quote, use the exact words and attribute clearly. Quotes should be short and revealing of character or absurdity.

7. STRUCTURE (flexible but typical):
   - Open with a significant political or social event
   - Layer in related developments, official responses, consequences
   - Pivot to international news or unrelated domestic stories
   - Include at least one crime/corruption item with specific figures
   - Build toward increasingly absurd items
   - End with an animal story or peak human folly
   - Close with an em dash and byline: —Weekly Review

8. FOOTNOTES. After each distinct claim or fact, place a superscript number in brackets like [1], [2], etc. These will be converted to actual superscripts. Number sequentially based on the order sources appear in your text. A single sentence may have multiple footnotes if it contains multiple distinct facts from different sources.

## What Makes It Work

The power of the Weekly Review comes from *accumulation* and *proximity*. A detention center death sits next to a penguin meme. A general's treason abuts a cow scratching itself with a tool. You never acknowledge the absurdity—you simply place things next to each other and trust the reader.

The tone is that of a particularly well-read coroner: just the facts, all the facts, no matter how strange.

## Output Format

Return ONLY:
1. The Weekly Review paragraph with [n] footnote markers
2. A line break
3. A FOOTNOTES section listing each number and which source it references (use the source number from my input, e.g., "1: Source 3" means footnote 1 cites Source 3)

Do not include any other commentary, titles, or meta-text.`;

export function buildUserPrompt(links: LinkForReview[], weekOf: string): string {
  let prompt = \`Here are the news items from the week of \${weekOf}. Synthesize them into a Weekly Review.

For each item, I've provided the source, a summary, and key details. Use your judgment about which items to include and how to order them for maximum effect. Not every item needs to appear—curate for impact and flow.

---

\`;

  links.forEach((link, i) => {
    prompt += \`## Source \${i + 1}: \${link.sourceName}
URL: \${link.url}
Title: \${link.title}
Velocity: \${link.velocity} sources mentioned this
Summary: \${link.summary}

---

\`;
  });

  prompt += \`
Remember: one paragraph, semicolons, flat affect, specific details, no commentary. End with —Weekly Review.

After the paragraph, list which source number each footnote references.\`;

  return prompt;
}
```

### 6. Response Parser

The Claude output will look something like:

```
In Minneapolis, Immigration and Customs Enforcement agents shot and killed Alex Pretti[1][2], a thirty-seven-year-old intensive-care nurse...

FOOTNOTES:
1: Source 1
2: Source 1
3: Source 2
...
```

Parse this to:
1. Convert `[n]` to actual superscript HTML: `<sup>n</sup>`
2. Map footnote numbers to actual link IDs from the input array
3. Return structured data for storage

```typescript
function parseResponse(text: string, links: LinkForReview[]): GeneratedReview {
  const [content, footnotesSection] = text.split('FOOTNOTES:');
  
  // Parse footnote mappings
  const footnoteLines = footnotesSection.trim().split('\n');
  const footnotes = footnoteLines.map(line => {
    const match = line.match(/(\d+):\s*Source\s*(\d+)/i);
    if (match) {
      const footnoteNum = parseInt(match[1]);
      const sourceNum = parseInt(match[2]) - 1; // 0-indexed
      return {
        number: footnoteNum,
        linkId: links[sourceNum]?.id,
        claim: '' // Could extract from content if needed
      };
    }
    return null;
  }).filter(Boolean);
  
  // Convert [n] to superscripts
  const formattedContent = content
    .trim()
    .replace(/\[(\d+)\]/g, '<sup>$1</sup>');
  
  return { content: formattedContent, footnotes };
}
```

---

## UI Components Needed

### `WeeklyReviewGenerator.tsx`

- Date range inputs
- Velocity threshold slider
- Category filter (multi-select)
- Preview of links to be included
- Generate button with loading state
- Output display (rendered HTML)
- Edit mode toggle
- Save/Publish buttons

### `WeeklyReviewCard.tsx`

For the list view—shows preview, status badge, date, actions.

### `FootnoteList.tsx`

Displays footnotes with links to original sources. Click to open source.

---

## Environment Variable

Add to `.env`:

```
ANTHROPIC_API_KEY=sk-ant-...
```

Add to Railway environment.

---

## Package to Install

```bash
npm install @anthropic-ai/sdk
```

---

## Migration Steps

1. Add Prisma schema changes
2. Run `npx prisma migrate dev --name add-weekly-review`
3. Create the Claude service
4. Create API routes
5. Create UI pages
6. Test with real data
7. Deploy

---

## Testing the Prompt

Before building all the infrastructure, test the prompt in isolation:

1. Create a test script at `scripts/test-weekly-review.ts`
2. Manually grab 10-15 high-velocity links from the DB
3. Call Claude API directly
4. Evaluate output against real Harper's Weekly Reviews
5. Iterate on system prompt until quality is consistent

```typescript
// scripts/test-weekly-review.ts
import { PrismaClient } from '@prisma/client';
import Anthropic from '@anthropic-ai/sdk';
import { WEEKLY_REVIEW_SYSTEM_PROMPT, buildUserPrompt } from '../src/lib/prompts/weekly-review';

const prisma = new PrismaClient();
const anthropic = new Anthropic();

async function test() {
  // Get high-velocity links from last 7 days
  const links = await prisma.link.findMany({
    where: {
      createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    },
    orderBy: { velocity: 'desc' },
    take: 15,
    include: { mentions: { include: { source: true } } }
  });
  
  const formatted = links.map(l => ({
    id: l.id,
    url: l.url,
    title: l.title,
    summary: l.summary || l.title,
    sourceName: l.mentions[0]?.source?.name || 'Unknown',
    velocity: l.velocity
  }));
  
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2500,
    system: WEEKLY_REVIEW_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: buildUserPrompt(formatted, 'January 27, 2025') }]
  });
  
  console.log(response.content[0].text);
}

test();
```

Run with: `npx ts-node scripts/test-weekly-review.ts`

---

## Reference: What Good Output Looks Like

See the attached `weekly-review-prompts.md` for a full example from Harper's and detailed iteration guidance.

The key markers of success:
- Single unbroken paragraph
- Semicolon-connected items
- Flat, clinical tone
- Radical specificity (names, numbers, places)
- No editorializing
- Ends with absurdity or animal story
- Footnotes map correctly to sources
