# QUICK_REFERENCE.md - Patterns & Snippets

## Common Patterns

### Canonicalization

```typescript
import { canonicalize } from '@/lib/canonicalization';

const canonical = await canonicalize(rawUrl);
// Returns: normalized URL with redirects resolved, tracking params stripped
```

### Scoring

```typescript
import { calculateWeightedScore } from '@/lib/scoring';

const score = calculateWeightedScore({
  mentionCount: 7,
  sourceTrustSum: 45,  // Sum of trust scores from all mentioning sources
  ageHours: 24
});
```

### Claude API Call

```typescript
import { claude } from '@/lib/ai/claude';

const response = await claude.messages.create({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 4096,
  messages: [{ role: 'user', content: prompt }]
});

const text = response.content[0].type === 'text' 
  ? response.content[0].text 
  : '';
```

### Batch AI Processing

```typescript
// ✅ Good: Batch items
const batch = links.slice(0, 15);
const prompt = buildBatchPrompt(batch);
const results = await callClaude(prompt);

// ❌ Bad: Individual calls
for (const link of links) {
  await callClaude(buildPrompt(link)); // Don't do this!
}
```

### Schema.org Component

```tsx
export function LinkSchema({ link }: { link: Link }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebPage",
          "name": link.title,
          "url": `https://dailybunch.com/links/${link.id}`,
          "description": link.summary,
          "datePublished": link.firstSeenAt.toISOString(),
          "interactionStatistic": {
            "@type": "InteractionCounter",
            "interactionType": "https://schema.org/ShareAction",
            "userInteractionCount": link.velocity
          }
        })
      }}
    />
  );
}
```

---

## Prompt Templates

### Voice Context (include in all content prompts)

```
VOICE GUIDELINES:
1. CONFIDENT: Write with conviction. No hedging.
2. ECONOMICAL: Every word earns its place.
3. CONNECTIVE: Draw lines between things.
4. SPECIFIC: Use numbers. "7 sources in 48 hours" not "a lot of attention."

AVOID: "It's interesting...", "It's worth noting...", questions as headlines.
```

### Enrichment (Layer 1)

```
Analyze this article and extract structured information.

URL: {url}
Content: {content}

Respond with JSON:
{
  "title": "Clean title (max 100 chars)",
  "summary": "1-2 sentences",
  "categories": ["tech", "ai"],
  "entities": {
    "people": ["Name"],
    "organizations": ["Company"],
    "products": ["Product"]
  },
  "contentType": "news|opinion|analysis|announcement|guide",
  "estimatedReadTime": 5
}
```

### Cultural Analysis (Layer 2)

```
You are the editor of Daily Bunch. Analyze this trending link:

Title: {title}
URL: {url}
Velocity: {velocity} sources
First seen: {first_seen}

Other trending this week:
{other_links}

Provide JSON:
{
  "whyNow": "Why this resonates now (2-3 sentences)",
  "tension": "The underlying debate/stakes (1-2 sentences)",
  "thread": "Connection to other trends (2-3 sentences)",
  "prediction": "growing|peaking|fading",
  "contrarian": "The angle being missed (1-2 sentences)"
}
```

---

## Database Queries

### Get Links with Velocity

```typescript
const links = await prisma.link.findMany({
  where: {
    firstSeenAt: { gte: startDate },
    velocity: { gte: 3 }
  },
  include: {
    mentions: {
      include: { source: true }
    }
  },
  orderBy: { velocity: 'desc' },
  take: 20
});
```

### Calculate Velocity (raw SQL for speed)

```sql
SELECT 
  l.id,
  l.title,
  COUNT(m.id) as velocity,
  SUM(s.trust_score) as trust_sum
FROM links l
JOIN mentions m ON l.id = m.link_id
JOIN sources s ON m.source_id = s.id
WHERE l.first_seen_at > NOW() - INTERVAL '7 days'
GROUP BY l.id
ORDER BY velocity DESC
LIMIT 20;
```

### Rising Links (acceleration)

```sql
WITH recent AS (
  SELECT link_id, COUNT(*) as cnt
  FROM mentions
  WHERE mentioned_at > NOW() - INTERVAL '6 hours'
  GROUP BY link_id
),
previous AS (
  SELECT link_id, COUNT(*) as cnt
  FROM mentions
  WHERE mentioned_at BETWEEN NOW() - INTERVAL '12 hours' 
    AND NOW() - INTERVAL '6 hours'
  GROUP BY link_id
)
SELECT 
  l.*,
  COALESCE(r.cnt, 0) as recent_mentions,
  COALESCE(p.cnt, 0) as previous_mentions,
  COALESCE(r.cnt, 0) - COALESCE(p.cnt, 0) as acceleration
FROM links l
LEFT JOIN recent r ON l.id = r.link_id
LEFT JOIN previous p ON l.id = p.link_id
WHERE COALESCE(r.cnt, 0) > COALESCE(p.cnt, 0)
ORDER BY acceleration DESC;
```

---

## URL Patterns to Handle

### Known Redirects (resolve these)

```typescript
const REDIRECT_PATTERNS = [
  /^https:\/\/link\.mail\.beehiiv\.com\//,
  /^https:\/\/substack\.com\/redirect\//,
  /^https:\/\/email\.mg\d?\.substack\.com\//,
  /^https:\/\/click\.convertkit-mail\.com\//,
  /^https:\/\/t\.co\//,
  /^https:\/\/bit\.ly\//,
  /^https:\/\/tinyurl\.com\//,
  /^https:\/\/ow\.ly\//,
];
```

### Tracking Params to Strip

```typescript
const TRACKING_PARAMS = [
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term',
  'fbclid', 'gclid', 'msclkid', 'twclid',
  'mc_cid', 'mc_eid', 'ck_subscriber_id',
  '_ga', '_gl', 'ref', 'source', 'trk', 'srid',
  'mkt_tok', 'ncid', 'sr_share'
];
```

---

## Trust Score Weights

```typescript
const TIER_WEIGHTS = {
  TIER_1: 10,  // NYT, WSJ, Atlantic
  TIER_2: 7,   // Stratechery, Not Boring
  TIER_3: 5,   // Quality blogs
  TIER_4: 2,   // Aggregators
};
```

---

## Testing Commands

```bash
# Run all tests
npm test

# Run specific test file
npm test -- canonicalization

# Type check
npm run typecheck

# Lint
npm run lint
```

---

## Deployment Checklist

- [ ] Environment variables set (DATABASE_URL, ANTHROPIC_API_KEY, REDIS_URL)
- [ ] Database migrations run
- [ ] Redis accessible
- [ ] Cron jobs configured (polling, analysis)
- [ ] Schema markup validates (Google Rich Results Test)
- [ ] RSS feed valid (W3C Feed Validator)
