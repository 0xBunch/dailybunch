# AI_INTELLIGENCE.md - Claude-Powered Analysis & Commentary

## Overview

The AI layer transforms Daily Bunch from an aggregator into an **intelligence platform**. We use Claude (Anthropic) as the primary AI for analysis, commentary, and content generation.

---

## Three Layers of AI Intelligence

### Layer 1: Factual Extraction (Basic)
**Purpose:** Extract structured data from links
**When:** Immediately after link creation
**Cost:** Low (can use Gemini Flash or Claude Haiku)

```typescript
interface LinkEnrichment {
  title: string;              // Clean, readable title
  summary: string;            // 1-2 sentence summary
  categories: string[];       // ["tech", "ai", "startups"]
  entities: {
    people: string[];         // Named individuals
    organizations: string[];  // Companies, institutions
    products: string[];       // Products, services
  };
  contentType: 'news' | 'opinion' | 'analysis' | 'announcement' | 'guide';
  estimatedReadTime: number;  // minutes
}
```

**Prompt Template:**
```
Analyze this article and extract structured information.

URL: {url}
Content: {scraped_content}

Provide a JSON response with:
- title: A clean, readable title (max 100 chars)
- summary: 1-2 sentences capturing the key point
- categories: Array of 1-3 relevant categories from: tech, ai, culture, media, business, politics, science, health, sports, entertainment, other
- entities.people: Array of named individuals mentioned
- entities.organizations: Array of companies/institutions mentioned  
- entities.products: Array of products/services mentioned
- contentType: One of: news, opinion, analysis, announcement, guide
- estimatedReadTime: Estimated minutes to read (integer)

Respond ONLY with valid JSON, no other text.
```

### Layer 2: Cultural Positioning (Smart)
**Purpose:** Understand WHY something is trending
**When:** After link reaches velocity >= 3
**Cost:** Medium (use Claude Sonnet)

```typescript
interface CulturalAnalysis {
  whyNow: string;           // Why this resonates at this moment
  tension: string;          // The underlying debate or stakes
  thread: string;           // Connection to other trends
  prediction: 'growing' | 'peaking' | 'fading';
  contrarian: string;       // The angle nobody is discussing
}
```

**Prompt Template:**
```
You are the editor of Daily Bunch, a cultural intelligence publication that surfaces what tastemakers are collectively pointing at. You've been tracking this space for years and have sharp instincts.

Here's a link that's getting attention:
- Title: {title}
- URL: {url}  
- Summary: {summary}
- Sources linking to it (velocity {velocity}): {source_names}
- First seen: {first_seen}
- Categories: {categories}
- Key entities: {entities}

Here's what else is trending this week (top 10 by velocity):
{other_trending_links_formatted}

Analyze this link and provide:

1. WHY NOW (2-3 sentences): What cultural moment or conversation does this fit into? Why is this resonating right now specifically? Don't just describe what the article says—explain the context that makes it timely.

2. THE TENSION (1-2 sentences): Every interesting story has a tension at its core. What's the underlying debate, contradiction, or stakes here?

3. THE THREAD (2-3 sentences): What other stories or trends does this connect to? Look at the other trending links—are there patterns? How does this fit into a larger narrative?

4. THE PREDICTION (one word + 1 sentence explanation): Is this story "growing" (more sources will pick it up), "peaking" (highest attention now), or "fading" (already past peak)? Why?

5. THE CONTRARIAN VIEW (1-2 sentences): What's the angle that isn't being discussed? What would a sophisticated reader push back with?

Be specific. Be opinionated. Avoid hedging language like "it's interesting" or "it remains to be seen." Write like someone who has seen thousands of stories come and go.

Respond in JSON format:
{
  "whyNow": "...",
  "tension": "...",
  "thread": "...",
  "prediction": "growing|peaking|fading",
  "predictionReason": "...",
  "contrarian": "..."
}
```

### Layer 3: Cross-Link Intelligence (Advanced)
**Purpose:** Find connections across the entire corpus
**When:** Daily batch analysis
**Cost:** Higher (use Claude Sonnet, batch processing)

```typescript
interface CrossLinkAnalysis {
  storyGroups: {
    title: string;
    links: string[];        // Link IDs
    narrative: string;      // What ties them together
  }[];
  emergingThemes: {
    theme: string;
    evidence: string[];     // Supporting observations
    strength: 'weak' | 'moderate' | 'strong';
  }[];
  entityTrends: {
    entity: string;
    direction: 'rising' | 'stable' | 'falling';
    context: string;
  }[];
}
```

**Prompt Template:**
```
You are analyzing the Daily Bunch corpus for patterns and connections.

Here are all links from the past 7 days with velocity >= 2:
{links_formatted}

Analyze this corpus and identify:

1. STORY GROUPS: Cluster links that are about the same underlying story or event. For each group:
   - Give it a descriptive title
   - List the link IDs that belong together
   - Write 1-2 sentences explaining what ties them together

2. EMERGING THEMES: What broader themes or patterns do you see across multiple stories? For each theme:
   - Name the theme
   - List 2-3 specific observations that support it
   - Rate strength as weak/moderate/strong

3. ENTITY TRENDS: Which people, companies, or products are getting notably more or less attention? For each:
   - Name the entity
   - Direction: rising, stable, or falling
   - Brief context on why

Focus on non-obvious connections. The obvious stuff is already visible in the data.

Respond in JSON format matching the schema above.
```

---

## The Digest Writer Agent

For generating weekly digests, use a multi-step process:

### Step 1: Gather Context
```typescript
async function gatherDigestContext(period: { start: Date; end: Date }) {
  const [topLinks, risingLinks, stories, entityTrends] = await Promise.all([
    getTopLinksByScore(period, 15),
    getRisingLinks(period, 5),
    getActiveStories(period),
    getEntityVelocityChanges(period)
  ]);
  
  return { topLinks, risingLinks, stories, entityTrends };
}
```

### Step 2: Generate Draft
```
You are the editor of Daily Bunch writing this week's digest. Your job is to synthesize the signal into a coherent narrative—not just list links, but tell readers what's happening in the cultural conversation.

VOICE GUIDELINES (follow these exactly):
- Confident, not arrogant: Share with conviction
- Economical: Every word earns its place
- Connective: Draw lines between things
- Time-aware: Situate in context

TOP STORIES BY VELOCITY:
{top_links_formatted}

RISING FAST (accelerating in last 24h):
{rising_links_formatted}

STORY CLUSTERS:
{stories_formatted}

ENTITY TRENDS:
{entity_trends_formatted}

Write a digest that:

1. Opens with the single most important insight or pattern (not just "here's what happened")

2. Groups related stories into 2-3 thematic sections. For each:
   - Section title (not generic like "Tech News")
   - 100-150 words explaining the theme and key links
   - WHY these things are connected

3. "Rising Fast" callout: 2-3 sentences on what's accelerating

4. Closes with a forward-looking observation: what to watch next week

FORMATTING:
- Length: 500-700 words total
- Links inline using markdown: [Title](url)
- No bullet points or numbered lists—use prose
- Section headers in bold, not markdown headers

BEGIN:
```

### Step 3: Human Review
The generated draft is presented to the editor for:
- Accuracy check
- Voice adjustment
- Adding personal observations
- Final polish

---

## The Commentary Engine

For individual link commentary (displayed on link pages):

### Context Gathering
```typescript
async function getCommentaryContext(link: Link): Promise<CommentaryContext> {
  const [
    relatedByEmbedding,    // Semantically similar links
    sameEntityLinks,       // Other links about same entities
    sourceProfile,         // What this source typically links to
    topicVelocity,         // Is this topic rising or falling
    contraryTakes          // Opposing perspectives
  ] = await Promise.all([
    findSimilarLinks(link, 5),
    getLinksByEntities(link.entities, 10),
    getSourceProfile(link.mentions[0].sourceId),
    getTopicVelocity(link.categories),
    findContraryLinks(link)
  ]);
  
  return {
    relatedByEmbedding,
    sameEntityLinks,
    sourceProfile,
    topicVelocity,
    contraryTakes
  };
}
```

### Commentary Prompt
```
You're writing a brief commentary for Daily Bunch readers. This appears on the link's detail page.

THE LINK:
Title: {title}
URL: {url}
Summary: {summary}
Velocity: {velocity} sources
First seen: {first_seen}
Categories: {categories}
Entities: {entities}

CONTEXT:
Related links this week: {related_formatted}
This source ({source_name}) typically covers: {source_profile}
Topic trend: {topic_name} is {rising/stable/falling} ({percent_change}% week-over-week)

Write 2-3 sentences that:
1. Add context a casual reader wouldn't have (not just summarize)
2. Connect to broader trends or other stories
3. Optionally make a prediction or note a contrarian angle

Use Daily Bunch voice: confident, economical, connective. No hedging.

Do NOT start with "This article..." or "This piece..." - jump straight to the insight.
```

---

## Analyst Personas

For variety, rotate between commentary styles:

### The Connector
```
Write as "The Connector" - your specialty is drawing lines between seemingly unrelated things. Find unexpected connections.
```

### The Historian  
```
Write as "The Historian" - your specialty is situating things in longer arcs. What does history tell us about moments like this?
```

### The Skeptic
```
Write as "The Skeptic" - your specialty is pushing back on consensus. What is everyone missing or overstating?
```

### The Scout
```
Write as "The Scout" - your specialty is spotting what's coming. What does this suggest about what happens next?
```

---

## Batch Processing

To minimize API costs, batch AI calls:

```typescript
// Instead of one call per link...
for (const link of pendingLinks) {
  await enrichLink(link); // ❌ Expensive
}

// Batch 10-20 links per call
const batches = chunk(pendingLinks, 15);
for (const batch of batches) {
  await enrichLinkBatch(batch); // ✅ Efficient
}

// Batch prompt structure
const batchPrompt = `
Analyze each of these ${batch.length} articles and provide structured data.

ARTICLES:
${batch.map((link, i) => `
[${i + 1}]
URL: ${link.url}
Content: ${link.scrapedContent?.substring(0, 2000)}
`).join('\n---\n')}

Respond with a JSON array of ${batch.length} objects, one per article, in the same order.
Each object should have: title, summary, categories, entities, contentType, estimatedReadTime
`;
```

---

## Error Handling

```typescript
interface AICallResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  retryable: boolean;
}

async function callClaudeWithRetry<T>(
  prompt: string,
  schema: z.ZodSchema<T>,
  maxRetries: number = 3
): Promise<AICallResult<T>> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }]
      });
      
      const text = response.content[0].type === 'text' 
        ? response.content[0].text 
        : '';
      
      // Parse JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('No JSON in response');
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      const validated = schema.parse(parsed);
      
      return { success: true, data: validated, retryable: false };
      
    } catch (error) {
      if (attempt === maxRetries - 1) {
        return {
          success: false,
          error: error.message,
          retryable: error.status === 429 || error.status >= 500
        };
      }
      // Exponential backoff
      await sleep(Math.pow(2, attempt) * 1000);
    }
  }
}
```

---

## Model Selection

| Task | Model | Why |
|------|-------|-----|
| Basic enrichment | Claude Haiku or Gemini Flash | Fast, cheap, structured output |
| Cultural analysis | Claude Sonnet | Nuanced understanding required |
| Digest generation | Claude Sonnet | Voice consistency matters |
| Cross-link analysis | Claude Sonnet | Complex reasoning |
| Embedding generation | all-MiniLM-L6-v2 | Fast, local, good quality |

---

## Cost Management

### Estimated Usage (at scale)
- 500 links/week needing enrichment
- ~50 links/week needing cultural analysis
- 1 digest/week
- 1 cross-link analysis/day

### Token Estimates
- Basic enrichment: ~500 input + 200 output per link
- Cultural analysis: ~2000 input + 500 output per link
- Digest: ~5000 input + 1000 output
- Cross-link: ~10000 input + 2000 output

### Monthly Estimate (Claude Sonnet pricing)
- ~$50-100/month at current scale
- Scale with caching, batching, model selection

---

## Caching AI Results

```typescript
// Cache enrichment results
const ENRICHMENT_CACHE_TTL = 60 * 60 * 24 * 7; // 1 week

async function getOrEnrich(link: Link): Promise<LinkEnrichment> {
  const cacheKey = `enrichment:${link.id}`;
  const cached = await redis.get(cacheKey);
  
  if (cached) {
    return JSON.parse(cached);
  }
  
  const enrichment = await enrichLink(link);
  await redis.setex(cacheKey, ENRICHMENT_CACHE_TTL, JSON.stringify(enrichment));
  
  return enrichment;
}

// Cultural analysis only for high-velocity links (no need to cache low-velocity)
// Commentary regenerated on demand (context changes)
```
