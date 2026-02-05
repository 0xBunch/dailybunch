# ARCHITECTURE.md - System Design & Data Flow

## Overview

Daily Bunch evolves from a simple RSS aggregator to a **cultural signal intelligence platform** with three core innovations:

1. **Multi-source ingestion** - RSS, email newsletters, YouTube
2. **AI-native analysis** - Claude-powered commentary and insights
3. **Knowledge graph** - Relationships between sources, entities, topics

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           INGESTION LAYER                                    │
├─────────────────┬──────────────────┬──────────────────┬─────────────────────┤
│   RSS Poller    │  Email Parser    │  YouTube API     │  (Future: Social)   │
│   (feedparser)  │  (IMAP/forward)  │  (trending)      │                     │
└────────┬────────┴────────┬─────────┴────────┬─────────┴─────────────────────┘
         │                 │                  │
         └─────────────────┼──────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        PROCESSING PIPELINE                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│  1. Link Extraction    - Parse HTML, extract all <a> tags                   │
│  2. Canonicalization   - Resolve redirects, strip tracking params           │
│  3. Deduplication      - Match to existing canonical URL or create new      │
│  4. Mention Recording  - Link source + link + timestamp                     │
└────────────────────────────────────────────┬────────────────────────────────┘
                                             │
                                             ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        INTELLIGENCE LAYER                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│  1. AI Enrichment      - Title, summary, categories, entities               │
│  2. Embedding          - Vector representation for similarity               │
│  3. Story Clustering   - Group related links into Stories                   │
│  4. Commentary Gen     - "Why it matters" analysis                          │
│  5. Trend Detection    - Rising/falling velocity calculations               │
└────────────────────────────────────────────┬────────────────────────────────┘
                                             │
                                             ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          DATA LAYER                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│  PostgreSQL (Prisma)   │  Redis (Cache + Queue)  │  FAISS (Embeddings)      │
│  - Sources, Links      │  - URL cache            │  - Similarity search     │
│  - Mentions, Entities  │  - Job queue            │  - Deduplication         │
│  - Stories, Digests    │  - Rate limiting        │  - Clustering            │
└─────────────────────────────────────────────────────────────────────────────┘
                                             │
                                             ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          OUTPUT LAYER                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│  Web Dashboard   │  Email Digests   │  RSS Feed   │  API   │  (Future: Bot) │
│  - /links        │  - Resend        │  - /feed    │  - /api│                │
│  - /dashboard    │  - Weekly        │             │        │                │
│  - /admin        │                  │             │        │                │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Component Details

### 1. Ingestion Layer

#### RSS Poller (Current - Enhance)
```typescript
// Current: Synchronous polling in cron job
// Target: Async queue with parallel workers

interface PollConfig {
  sourceId: string;
  frequency: number;        // minutes between polls
  priority: 'high' | 'normal' | 'low';
  retryOnFail: number;      // max consecutive failures before disable
}

// Queue jobs by priority
// High-trust sources (Stratechery, etc.) = high priority, frequent polling
// Weekly roundups = low priority, daily polling
```

#### Email Parser (New)
```typescript
// Option A: Dedicated inbox (ingest@dailybunch.com)
// Option B: IMAP connection to existing inbox
// Option C: Forward-based (users forward newsletters)

interface EmailSource {
  type: 'imap' | 'forward';
  address?: string;         // for IMAP
  expectedFrom?: string[];  // filter by sender
  parseMode: 'html' | 'text';
}

// Workflow:
// 1. Connect to inbox / receive forwarded email
// 2. Parse HTML body
// 3. Extract all links
// 4. Run through same canonicalization pipeline as RSS
```

#### YouTube API (New)
```typescript
// Track popular videos that are getting linked
interface YouTubeConfig {
  categories: string[];     // Tech, Education, etc.
  minViews: number;         // Threshold for consideration
  trackLinkedOnly: boolean; // Only track if other sources link to it
}

// When a YouTube URL appears in multiple newsletters,
// it's a signal worth surfacing
```

### 2. Canonicalization Service

**This is the most critical component.** Accuracy here determines velocity accuracy.

```typescript
// /src/lib/canonicalization/index.ts

export class URLCanonicalizer {
  private redirectCache: RedisCache;
  private knownPatterns: PatternMatcher;
  
  async canonicalize(rawUrl: string): Promise<CanonicalResult> {
    // 1. Check cache first
    const cached = await this.redirectCache.get(rawUrl);
    if (cached) return cached;
    
    // 2. Apply known patterns (no HTTP needed)
    const patternResult = this.knownPatterns.match(rawUrl);
    if (patternResult.confident) {
      return this.cacheAndReturn(rawUrl, patternResult.canonical);
    }
    
    // 3. Resolve redirects (up to 5 hops)
    const resolved = await this.resolveRedirects(rawUrl, 5);
    
    // 4. Strip tracking parameters
    const stripped = this.stripTrackingParams(resolved);
    
    // 5. Normalize (protocol, www, trailing slash)
    const normalized = this.normalize(stripped);
    
    return this.cacheAndReturn(rawUrl, normalized);
  }
  
  private stripTrackingParams(url: string): string {
    const paramsToStrip = [
      // UTM
      'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term',
      // Social
      'fbclid', 'gclid', 'msclkid', 'twclid',
      // Email
      'mc_cid', 'mc_eid', 'ck_subscriber_id',
      // Analytics
      '_ga', '_gl', 'ref', 'source', 'trk', 'srid',
      // Misc
      'mkt_tok', 'ncid', 'sr_share'
    ];
    // Implementation...
  }
}

// Known redirect patterns (no HTTP resolution needed)
const REDIRECT_PATTERNS = [
  { pattern: /^https:\/\/link\.mail\.beehiiv\.com\//, type: 'redirect' },
  { pattern: /^https:\/\/substack\.com\/redirect\//, type: 'redirect' },
  { pattern: /^https:\/\/click\.convertkit-mail\.com\//, type: 'redirect' },
  { pattern: /^https:\/\/email\.mg\d?\.substack\.com\//, type: 'redirect' },
  { pattern: /^https:\/\/t\.co\//, type: 'redirect' },
  { pattern: /^https:\/\/bit\.ly\//, type: 'redirect' },
  { pattern: /^https:\/\/tinyurl\.com\//, type: 'redirect' },
];
```

### 3. Queue System (Redis + BullMQ)

```typescript
// /src/lib/queue/index.ts

import { Queue, Worker } from 'bullmq';

// Define queues
export const pollQueue = new Queue('poll', { connection: redis });
export const processQueue = new Queue('process', { connection: redis });
export const aiQueue = new Queue('ai', { connection: redis });

// Poll queue: RSS/email fetching
// Jobs: { sourceId, type: 'rss' | 'email' }

// Process queue: Link processing
// Jobs: { rawUrl, sourceId, sourceItemId }

// AI queue: Enrichment
// Jobs: { linkIds: string[] }  // Batch of 10-20

// Workers
new Worker('poll', async (job) => {
  const { sourceId, type } = job.data;
  // Fetch source, extract links, queue to process
}, { connection: redis, concurrency: 5 });

new Worker('process', async (job) => {
  const { rawUrl, sourceId, sourceItemId } = job.data;
  // Canonicalize, dedupe, record mention
}, { connection: redis, concurrency: 10 });

new Worker('ai', async (job) => {
  const { linkIds } = job.data;
  // Batch AI enrichment
}, { connection: redis, concurrency: 2 });
```

### 4. Scoring System

```typescript
// /src/lib/scoring/index.ts

interface ScoringConfig {
  gravity: number;           // Time decay factor (default: 1.8)
  trustWeights: Record<number, number>;  // trust_score -> weight
  windowHours: number;       // Scoring window (default: 168 = 7 days)
}

export function calculateScore(
  mentionCount: number,
  sourceTrustSum: number,
  ageHours: number,
  config: ScoringConfig = DEFAULT_CONFIG
): number {
  // Base score: mentions weighted by source quality
  const avgTrust = sourceTrustSum / mentionCount;
  const baseScore = mentionCount * avgTrust;
  
  // Time decay (Hacker News style)
  const timeDecay = Math.pow(ageHours + 2, config.gravity);
  
  return baseScore / timeDecay;
}

// Trend detection: acceleration
export async function detectRising(windowHours: number = 6): Promise<Link[]> {
  // Compare mentions in last N hours vs previous N hours
  // Return links where recent > previous
}

// Contrarian signal: high-trust source, low velocity
export async function findHiddenGems(): Promise<Link[]> {
  // Links with velocity <= 2 but max source trust >= 8
}
```

### 5. Story Clustering

```typescript
// /src/lib/clustering/index.ts

import { HuggingFaceTransformer } from '@xenova/transformers';
import * as faiss from 'faiss-node';

export class StoryClustering {
  private embedder: HuggingFaceTransformer;
  private index: faiss.IndexFlatL2;
  
  async clusterLink(link: Link): Promise<string | null> {
    // 1. Generate embedding for link
    const embedding = await this.embedder.encode(
      `${link.title} ${link.summary}`
    );
    
    // 2. Find similar links
    const { indices, distances } = this.index.search(embedding, 5);
    
    // 3. Check if any are similar enough (threshold: 0.85)
    const similarLinks = indices
      .map((idx, i) => ({ link: this.getLinkByIndex(idx), distance: distances[i] }))
      .filter(({ distance }) => distance < 0.15); // L2 distance
    
    // 4. If similar links exist and share entities, same story
    for (const { link: similar } of similarLinks) {
      if (this.sharesEntities(link, similar)) {
        return similar.storyId;
      }
    }
    
    // 5. Otherwise, create new story or return null
    return null;
  }
  
  private sharesEntities(a: Link, b: Link): boolean {
    const aEntities = new Set([...a.entities.people, ...a.entities.orgs]);
    const bEntities = new Set([...b.entities.people, ...b.entities.orgs]);
    const intersection = [...aEntities].filter(e => bEntities.has(e));
    return intersection.length > 0;
  }
}
```

---

## Data Flow Examples

### New RSS Item Flow
```
1. Scheduler triggers poll job for Source A
2. Worker fetches RSS feed, finds new item
3. For each link in item:
   a. Queue process job
   b. Worker canonicalizes URL
   c. Check if Link exists with canonical URL
   d. If exists: create Mention linking Source A to Link
   e. If new: create Link, create Mention, queue AI enrichment
4. AI worker batches pending links, enriches with Claude
5. Embedder generates vector, attempts story clustering
6. Dashboard reflects updated velocity scores
```

### Email Newsletter Flow
```
1. Email arrives at ingest@dailybunch.com
2. Email parser extracts HTML body
3. Link extractor finds all <a> tags
4. For each link: same flow as RSS
5. Source = newsletter sender (matched by From address)
```

### Digest Generation Flow
```
1. User clicks "Generate Digest" for time period
2. System fetches top links by score for period
3. Clusters links into 2-3 thematic groups
4. Claude generates narrative connecting clusters
5. User reviews, edits, adds personal notes
6. Click send → Resend API delivers to subscribers
```

---

## Caching Strategy

```typescript
// Redis key patterns

// Canonical URL cache (1 week TTL)
`canonical:${md5(rawUrl)}` → canonicalUrl

// Link metadata cache (1 hour TTL)
`link:${linkId}:meta` → { title, summary, score }

// Velocity cache (5 min TTL)
`velocity:${linkId}` → number

// Source profile cache (1 day TTL)
`source:${sourceId}:profile` → { avgTopics, linkedWith }

// Rate limiting
`ratelimit:${ip}:${endpoint}` → count
```

---

## Scaling Considerations

### Current Scale (MVP)
- ~50 sources
- ~1000 links/week
- Single server sufficient

### Target Scale (Phase 1)
- ~200 sources
- ~5000 links/week
- Queue workers can run on same server

### Future Scale (Phase 2+)
- ~1000 sources
- ~50000 links/week
- Separate worker instances
- FAISS index in dedicated process
- Consider managed Postgres (Supabase/Neon)

---

## Error Handling

```typescript
// Source health tracking
interface SourceHealth {
  lastSuccessAt: Date;
  consecutiveFailures: number;
  lastError: string;
  status: 'active' | 'degraded' | 'disabled';
}

// Auto-disable after 5 consecutive failures
// Alert admin for manual review
// Exponential backoff on retry
```

---

## Monitoring Points

1. **Ingestion Health**
   - Sources polled successfully vs failed
   - Links extracted per source
   - Queue depth and processing time

2. **Data Quality**
   - Duplicate detection rate
   - Canonicalization cache hit rate
   - Story clustering accuracy (manual review)

3. **AI Performance**
   - Enrichment queue backlog
   - API costs per day
   - Error rate on AI calls

4. **User Engagement**
   - Dashboard page views
   - Digest open rates
   - Link click-through
