# Daily Bunch: Product Requirements Document

## Vision

Daily Bunch is a **modular signal intelligence platform** that surfaces what's traveling across the curated web. It answers the question: "What are tastemakers collectively pointing at right now?"

The core insight: In an age of infinite content, curation is more valuable than creation. The people who read 50 newsletters don't have time to notice when 12 of them link to the same article. Daily Bunch does.

### Platform Architecture (Full Vision)

```
┌─────────────────────────────────────────────────────────────────┐
│                      DAILY BUNCH PLATFORM                        │
├─────────────────────────────────────────────────────────────────┤
│  V1: CULTURAL RADAR          │  V2+: ADDITIONAL RADARS          │
│  ─────────────────────────   │  ─────────────────────────────   │
│  • Newsletter link velocity  │  • Prediction Markets (Polymarket)│
│  • RSS feed aggregation      │  • Search Trends (Google, Wiki)   │
│  • Tastemaker signal         │  • Social Velocity (Bluesky, HN)  │
│                              │  • Market Signals (options flow)  │
├─────────────────────────────────────────────────────────────────┤
│                    UNIFIED SIGNAL DASHBOARD                      │
│         Filter by category, entity, time, signal type            │
├─────────────────────────────────────────────────────────────────┤
│                      DAILY DIGEST OUTPUT                         │
│              Curated → Formatted → Delivered                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## V1 Scope: The Cultural Radar

### What We're Building

A system that:
1. **Ingests** 20-30 newsletters and RSS feeds
2. **Extracts** all links, unwrapping tracking redirects to canonical URLs
3. **Counts** how many sources link to each URL (velocity)
4. **Categorizes** links by topic and tags entities
5. **Displays** a dashboard ranked by velocity with filtering
6. **Enables** 10-minute daily curation workflow
7. **Publishes** a digest via Resend

### The Hard Problem We're Solving

Every newsletter platform wraps links in tracking redirects:
- Mailchimp: `click.mailchimp.com/...`
- Substack: `substack.com/redirect/...`
- Beehiiv: `link.beehiiv.com/...`
- ConvertKit: `click.convertkit.com/...`
- bit.ly, t.co, and dozens of shorteners

We must follow these redirects to the canonical destination, normalize the URL (strip UTM params), then count. This is the core technical challenge and the source of the product's value.

---

## User Stories

### Daily Workflow (10 minutes)

1. **Open dashboard** at 8am
2. **See ranked list** of links by velocity (how many sources linked them)
3. **Filter by category** (Sports, Culture, Business, AI) via sidebar
4. **Select 5-7 links** (10-15 on Fridays) with checkboxes
5. **Add optional one-liner** to any link
6. **Write clever headline**
7. **Hit publish** → Resend delivers to subscriber list

### Admin Workflows

- Add/remove ingestion sources
- Create/edit categories and subcategories
- Manage entity tag list (people, companies, etc.)
- Adjust source weights
- Blacklist domains or specific URLs
- Review suggested new entities (approval queue)

---

## Taxonomy Structure

### Primary Categories (assigned per source, inherited by links with AI adjustment)

| Category | Description |
|----------|-------------|
| SPORTS | Athletics, leagues, players, sports business |
| CULTURE | Music, film, fashion, food, lifestyle |
| BUSINESS | Media, tech, finance, startups |
| AI | Tools, research, industry news |

### Subcategories (nested under primary)

**SPORTS**
- Football
- Baseball
- Basketball
- Soccer
- Business of Sports
- Olympics
- Combat Sports

**CULTURE**
- Music
- Film/TV
- Fashion
- Food
- Books
- Art

**BUSINESS**
- Media
- Tech
- Finance
- Startups
- Retail

**AI**
- Tools/Products
- Research
- Industry
- Policy

### Entity Tags (cross-cutting)

- **People:** Sabrina Carpenter, Shohei Ohtani, Sam Altman
- **Organizations:** Los Angeles Dodgers, Nike, OpenAI, Netflix
- **Products/Properties:** Thursday Night Football, ChatGPT, Severance

Entities are:
- Seeded with an initial manual list
- Expanded via AI suggestions that go into an approval queue
- Never auto-added without human approval

---

## Technical Architecture

### Stack

| Component | Technology |
|-----------|------------|
| Backend | Node.js (TypeScript) |
| Database | PostgreSQL (Railway) |
| Hosting | Railway |
| Email Ingestion | Mailgun Inbound Parse |
| RSS Parsing | rss-parser library |
| Link Unwrapping | Custom + got/axios with redirect following |
| AI Processing | Anthropic Claude API |
| Email Delivery | Resend |
| Frontend | Next.js (React) |

### System Flow

```
┌──────────────────┐     ┌──────────────────┐
│   MAILGUN        │     │   RSS POLLER     │
│   (newsletters)  │     │   (feeds)        │
└────────┬─────────┘     └────────┬─────────┘
         │                        │
         ▼                        ▼
┌─────────────────────────────────────────────┐
│            INGESTION SERVICE                 │
│  • Parse HTML/feed content                   │
│  • Extract all links                         │
│  • Unwrap tracking redirects                 │
│  • Canonicalize URLs (strip UTM, etc.)       │
└────────────────────┬────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────┐
│            PROCESSING SERVICE                │
│  • Check if URL already exists               │
│  • If new: analyze with AI for category/tags │
│  • If existing: increment velocity only      │
│  • Queue new entity suggestions              │
└────────────────────┬────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────┐
│              POSTGRESQL                      │
│  • links, sources, mentions, categories      │
│  • entities, entity_suggestions              │
│  • digests, digest_items                     │
└────────────────────┬────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────┐
│            DASHBOARD (Next.js)               │
│  • Ranked link list with velocity scores     │
│  • Sidebar filters (category, subcategory)   │
│  • Entity tag filtering                      │
│  • Selection checkboxes                      │
│  • Headline input                            │
│  • Publish button                            │
└────────────────────┬────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────┐
│              RESEND API                      │
│  • Format digest email                       │
│  • Deliver to subscriber list                │
└─────────────────────────────────────────────┘
```

---

## Data Models

### sources
```sql
CREATE TABLE sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'newsletter' | 'rss'
  url VARCHAR(2048), -- RSS feed URL (null for newsletters)
  email_address VARCHAR(255), -- inbound email trigger (for newsletters)
  category_id UUID REFERENCES categories(id),
  weight DECIMAL(3,2) DEFAULT 1.00, -- for future weighted scoring
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### categories
```sql
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL, -- 'SPORTS', 'CULTURE', etc.
  parent_id UUID REFERENCES categories(id), -- null for primary, set for subcategories
  created_at TIMESTAMP DEFAULT NOW()
);
```

### links
```sql
CREATE TABLE links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_url VARCHAR(2048) NOT NULL UNIQUE,
  original_urls TEXT[], -- array of pre-canonicalized URLs that resolved here
  title VARCHAR(500),
  description TEXT,
  domain VARCHAR(255),
  category_id UUID REFERENCES categories(id),
  subcategory_id UUID REFERENCES categories(id),
  ai_summary TEXT,
  first_seen_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_links_canonical_url ON links(canonical_url);
CREATE INDEX idx_links_domain ON links(domain);
CREATE INDEX idx_links_first_seen ON links(first_seen_at);
```

### mentions (junction: which source mentioned which link, when)
```sql
CREATE TABLE mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id UUID REFERENCES links(id) ON DELETE CASCADE,
  source_id UUID REFERENCES sources(id) ON DELETE CASCADE,
  seen_at TIMESTAMP DEFAULT NOW(),
  raw_url VARCHAR(2048), -- the original wrapped URL before canonicalization
  UNIQUE(link_id, source_id, DATE(seen_at)) -- one mention per source per day
);

CREATE INDEX idx_mentions_link_id ON mentions(link_id);
CREATE INDEX idx_mentions_seen_at ON mentions(seen_at);
```

### entities
```sql
CREATE TABLE entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'person' | 'organization' | 'product'
  aliases TEXT[], -- alternative names/spellings
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### link_entities (junction)
```sql
CREATE TABLE link_entities (
  link_id UUID REFERENCES links(id) ON DELETE CASCADE,
  entity_id UUID REFERENCES entities(id) ON DELETE CASCADE,
  confidence DECIMAL(3,2), -- AI confidence score
  PRIMARY KEY (link_id, entity_id)
);
```

### entity_suggestions (approval queue)
```sql
CREATE TABLE entity_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  mention_count INTEGER DEFAULT 1,
  sample_links UUID[], -- links where this entity was detected
  status VARCHAR(50) DEFAULT 'pending', -- 'pending' | 'approved' | 'rejected'
  created_at TIMESTAMP DEFAULT NOW()
);
```

### domain_blacklist
```sql
CREATE TABLE domain_blacklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain VARCHAR(255) NOT NULL UNIQUE,
  reason VARCHAR(500),
  created_at TIMESTAMP DEFAULT NOW()
);
```

### digests
```sql
CREATE TABLE digests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  headline VARCHAR(500) NOT NULL,
  sent_at TIMESTAMP,
  resend_id VARCHAR(255), -- Resend message ID
  status VARCHAR(50) DEFAULT 'draft', -- 'draft' | 'sent' | 'failed'
  created_at TIMESTAMP DEFAULT NOW()
);
```

### digest_items
```sql
CREATE TABLE digest_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  digest_id UUID REFERENCES digests(id) ON DELETE CASCADE,
  link_id UUID REFERENCES links(id),
  position INTEGER NOT NULL,
  custom_note TEXT, -- optional one-liner
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Velocity Calculation

### V1: Simple 24-Hour Count

```sql
-- Get velocity for all links in the last 24 hours
SELECT 
  l.id,
  l.canonical_url,
  l.title,
  l.domain,
  l.category_id,
  COUNT(DISTINCT m.source_id) as velocity,
  ARRAY_AGG(DISTINCT s.name) as source_names
FROM links l
JOIN mentions m ON l.id = m.link_id
JOIN sources s ON m.source_id = s.id
WHERE m.seen_at > NOW() - INTERVAL '24 hours'
GROUP BY l.id
ORDER BY velocity DESC, l.first_seen_at DESC
LIMIT 100;
```

### Future: Weighted + Decay

```sql
-- Weighted velocity with time decay (for V2)
SELECT 
  l.id,
  SUM(
    s.weight * 
    EXP(-0.1 * EXTRACT(EPOCH FROM (NOW() - m.seen_at)) / 3600)
  ) as weighted_velocity
FROM links l
JOIN mentions m ON l.id = m.link_id
JOIN sources s ON m.source_id = s.id
WHERE m.seen_at > NOW() - INTERVAL '48 hours'
GROUP BY l.id
ORDER BY weighted_velocity DESC;
```

---

## Link Unwrapping Logic

### Known Redirect Patterns

```typescript
const TRACKING_WRAPPERS = [
  // Newsletter platforms
  { pattern: /click\.mailchimp\.com/, extract: 'url' },
  { pattern: /substack\.com\/redirect/, extract: 'url' },
  { pattern: /link\.beehiiv\.com/, extract: null }, // follow redirect
  { pattern: /click\.convertkit\.com/, extract: null },
  { pattern: /email\.mg\d?\./, extract: null }, // Mailgun
  { pattern: /links\.iterable\.com/, extract: null },
  
  // Shorteners
  { pattern: /bit\.ly/, extract: null },
  { pattern: /t\.co/, extract: null },
  { pattern: /tinyurl\.com/, extract: null },
  { pattern: /ow\.ly/, extract: null },
  { pattern: /goo\.gl/, extract: null },
  
  // Social
  { pattern: /lnkd\.in/, extract: null }, // LinkedIn
  { pattern: /fb\.me/, extract: null }, // Facebook
];
```

### Canonicalization Steps

```typescript
async function canonicalizeUrl(rawUrl: string): Promise<string> {
  // 1. Follow redirects to final destination
  let finalUrl = await followRedirects(rawUrl);
  
  // 2. Parse URL
  const parsed = new URL(finalUrl);
  
  // 3. Remove tracking parameters
  const STRIP_PARAMS = [
    'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
    'ref', 'source', 'mc_cid', 'mc_eid', // Mailchimp
    'fbclid', 'gclid', 'msclkid', // Ad platforms
    'ck_subscriber_id', // ConvertKit
    '_hsenc', '_hsmi', // HubSpot
  ];
  
  STRIP_PARAMS.forEach(param => parsed.searchParams.delete(param));
  
  // 4. Normalize
  parsed.hash = ''; // Remove fragments
  const canonical = parsed.toString().replace(/\/$/, ''); // Remove trailing slash
  
  return canonical;
}
```

---

## AI Processing

### Link Analysis Prompt

```typescript
const LINK_ANALYSIS_PROMPT = `
Analyze this link and return JSON:

URL: {url}
Title: {title}
Description: {description}
Source Category: {source_category}
Source Subcategory: {source_subcategory}

Known entities to look for: {entity_list}

Return:
{
  "category": "SPORTS" | "CULTURE" | "BUSINESS" | "AI",
  "subcategory": "string matching defined subcategories",
  "matched_entities": ["entity names from the known list"],
  "suggested_entities": ["new entities not in the list, if highly prominent"],
  "summary": "One sentence summary, max 150 chars"
}

Rules:
- Use source category as a hint but override if content clearly fits elsewhere
- Only match entities from the known list with high confidence
- Only suggest new entities if they are clearly the main subject
- Keep summary punchy and informative
`;
```

### Entity Suggestion Parameters

New entities are suggested only if:
- They appear prominently in the content (title or first paragraph)
- They are proper nouns (people, companies, products)
- They don't fuzzy-match existing entities

Suggested entities go into the approval queue and are NOT automatically tagged until approved.

---

## Dashboard UI Specification

### Layout

```
┌────────────────────────────────────────────────────────────────────┐
│  DAILY BUNCH                                    [Admin] [Publish]  │
├──────────────┬─────────────────────────────────────────────────────┤
│              │                                                     │
│  FILTERS     │  HEADLINE: [                                    ]   │
│              │                                                     │
│  ☑ SPORTS    │  ┌─────────────────────────────────────────────────┐│
│    □ Football│  │ □ | 12 | nytimes.com | The Story Everyone...   ││
│    □ Baseball│  │   |    | SPORTS > Baseball | Shohei Ohtani     ││
│    ☑ Business│  │   |    | [Add note...]                         ││
│              │  ├─────────────────────────────────────────────────┤│
│  □ CULTURE   │  │ □ | 9  | theverge.com | OpenAI Announces...    ││
│  □ BUSINESS  │  │   |    | AI > Industry | OpenAI, Sam Altman    ││
│  □ AI        │  │   |    | [Add note...]                         ││
│              │  ├─────────────────────────────────────────────────┤│
│  ───────────│  │ □ | 7  | youtube.com | [VIDEO] The Interview   ││
│              │  │   |    | CULTURE > Music | Sabrina Carpenter   ││
│  ENTITIES    │  │   |    | [Add note...]                         ││
│  [Search...] │  ├─────────────────────────────────────────────────┤│
│              │  │ ...                                             ││
│  Sabrina C.  │  └─────────────────────────────────────────────────┘│
│  Nike        │                                                     │
│  Dodgers     │  Showing 47 links from last 24h | 5 selected       │
│              │                                                     │
└──────────────┴─────────────────────────────────────────────────────┘
```

### Interactions

- **Category filter:** Click to toggle, shows/hides subcategories when expanded
- **Velocity column:** Sortable (default: descending)
- **Checkbox:** Selects link for digest
- **Add note:** Inline text input, optional
- **Headline:** Required before publish
- **Publish button:** Validates selection, sends via Resend

### Admin Panel (separate route)

- **Sources:** List, add, edit, delete, toggle active
- **Categories:** Tree view, add subcategories
- **Entities:** List with search, add, edit aliases, delete
- **Entity Queue:** Pending suggestions with approve/reject
- **Blacklist:** Domain list with add/remove
- **Weights:** Slider per source (V2)

---

## Email Template (Resend)

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Georgia, serif; max-width: 600px; margin: 0 auto; }
    h1 { font-size: 24px; margin-bottom: 8px; }
    .date { color: #666; font-size: 14px; margin-bottom: 24px; }
    .item { margin-bottom: 20px; }
    .item a { color: #000; text-decoration: none; font-weight: bold; }
    .item a:hover { text-decoration: underline; }
    .item .source { color: #666; font-size: 13px; }
    .item .note { color: #333; font-size: 15px; margin-top: 4px; }
    .velocity { color: #999; font-size: 12px; }
  </style>
</head>
<body>
  <h1>{{headline}}</h1>
  <p class="date">{{date}}</p>
  
  {{#each items}}
  <div class="item">
    <a href="{{url}}">{{title}}</a>
    <div class="source">{{domain}} · <span class="velocity">{{velocity}} sources</span></div>
    {{#if note}}<p class="note">{{note}}</p>{{/if}}
  </div>
  {{/each}}
  
  <hr>
  <p style="font-size: 12px; color: #999;">
    You're receiving Daily Bunch because you subscribed. 
    <a href="{{unsubscribe_url}}">Unsubscribe</a>
  </p>
</body>
</html>
```

---

## API Endpoints

### Ingestion

```
POST /api/ingest/mailgun     # Mailgun webhook for newsletters
POST /api/ingest/poll        # Cron-triggered RSS polling
```

### Dashboard

```
GET  /api/links              # List links with velocity (filterable)
GET  /api/links/:id          # Single link detail
POST /api/digest             # Create new digest
PUT  /api/digest/:id         # Update digest (add/remove items, headline)
POST /api/digest/:id/publish # Send via Resend
```

### Admin

```
GET    /api/sources          # List sources
POST   /api/sources          # Add source
PUT    /api/sources/:id      # Update source
DELETE /api/sources/:id      # Remove source

GET    /api/categories       # List category tree
POST   /api/categories       # Add category/subcategory
PUT    /api/categories/:id   # Update category
DELETE /api/categories/:id   # Remove category

GET    /api/entities         # List entities
POST   /api/entities         # Add entity
PUT    /api/entities/:id     # Update entity (name, aliases)
DELETE /api/entities/:id     # Remove entity

GET    /api/entity-queue     # Pending suggestions
POST   /api/entity-queue/:id/approve
POST   /api/entity-queue/:id/reject

GET    /api/blacklist        # List blacklisted domains
POST   /api/blacklist        # Add domain
DELETE /api/blacklist/:id    # Remove domain
```

---

## Environment Variables

```
# Database
DATABASE_URL=postgresql://...

# Mailgun (inbound parsing)
MAILGUN_API_KEY=...
MAILGUN_WEBHOOK_SIGNING_KEY=...
MAILGUN_DOMAIN=...

# Resend (outbound email)
RESEND_API_KEY=...
RESEND_FROM_EMAIL=digest@dailybunch.com

# Anthropic (AI processing)
ANTHROPIC_API_KEY=...

# App
APP_URL=https://dailybunch.yoursite.com
CRON_SECRET=... # for RSS polling endpoint
```

---

## Success Criteria (14 Days)

### Working

- [ ] Newsletters successfully ingested via Mailgun
- [ ] Links unwrapped and canonicalized correctly
- [ ] Velocity scores feel intuitively right
- [ ] Dashboard loads in <2 seconds
- [ ] Can publish digest in <10 minutes
- [ ] Subscribers receive formatted email

### Failure Modes (Abandon If)

- Link unwrapping fails on >20% of newsletters
- Velocity is dominated by noise (tracking pixels, social buttons)
- Dashboard is too slow to be useful
- Category/entity tagging is wildly inaccurate
- Mailgun parsing breaks constantly

---

## Future Enhancements (V2+)

### Additional Radars

- **Prediction Markets:** Polymarket, Kalshi API integration
- **Search Trends:** Google Trends, Wikipedia pageviews
- **Social Velocity:** Bluesky firehose, Hacker News API, Reddit
- **Market Signals:** Unusual Whales, SEC EDGAR

### Platform Features

- Subscriber management (move to Beehiiv/Ghost)
- Paid subscription tier
- Web archive of past digests
- Mobile-responsive dashboard
- Multi-user support
- Weighted velocity scoring
- AI-generated headline suggestions
- Scheduled publishing

---

# Claude Code Master Prompt

Below is the prompt to paste into Claude Code to begin building Daily Bunch.

---

```
# DAILY BUNCH: Build Prompt

You are building Daily Bunch, a cultural signal intelligence platform that tracks link velocity across newsletters and RSS feeds. The goal is a system where a user can curate and publish a daily link digest in under 10 minutes.

## BEFORE YOU START

Ask me these questions and wait for answers:

1. "Do you have your Mailgun account set up? I need:
   - API Key
   - Webhook signing key  
   - Domain for receiving emails (e.g., ingest.dailybunch.com)"

2. "Do you have your Resend account set up? I need:
   - API Key
   - From email address you've verified"

3. "Do you have your Anthropic API key ready?"

4. "What's your Railway project name? (I'll set up Postgres there)"

5. "Give me your initial source list - at least 5-10 newsletters/RSS feeds to start with. Format:
   - Name | Type (newsletter/rss) | URL or email trigger | Category (SPORTS/CULTURE/BUSINESS/AI) | Subcategory"

6. "Give me your initial entity list - 10-20 people, companies, and products you want to track. Format:
   - Name | Type (person/organization/product) | Any aliases"

Once you answer these, I'll build the system in this order:

## BUILD ORDER

### Phase 1: Foundation (Do First, Don't Stop)
1. Initialize Next.js project with TypeScript
2. Set up Railway Postgres and create all tables from the schema
3. Create database connection and basic ORM setup
4. Seed categories and subcategories
5. Seed initial entities from your list
6. Seed initial sources from your list

### Phase 2: Ingestion Engine (The Hard Part)
7. Build link canonicalization service:
   - Redirect following (handles Mailchimp, Substack, Beehiiv wrappers)
   - URL normalization (strip UTM, fragments, trailing slashes)
   - Domain extraction
8. Build Mailgun webhook endpoint:
   - Verify webhook signature
   - Parse HTML email body
   - Extract all links
   - Process through canonicalizer
   - Store mentions
9. Build RSS polling service:
   - Fetch and parse feeds
   - Extract links from items
   - Process through canonicalizer
   - Store mentions
10. Create cron endpoint for RSS polling (protected by secret)

### Phase 3: AI Processing
11. Build link analysis service:
    - Call Claude API with link metadata
    - Categorize and tag entities
    - Generate summary
    - Handle new entity suggestions (queue, don't auto-add)
12. Integrate analysis into ingestion pipeline (only for new links)

### Phase 4: Dashboard
13. Build main dashboard page:
    - Fetch links with velocity scores (last 24h)
    - Display ranked list
    - Sidebar with category/entity filters
    - Checkbox selection
    - Headline input
    - Note input per item
14. Build admin pages:
    - Sources management (CRUD)
    - Entities management (CRUD + queue)
    - Categories management
    - Blacklist management

### Phase 5: Publishing
15. Build digest creation flow:
    - Save selected links + headline + notes
    - Generate email HTML from template
    - Send via Resend API
    - Store digest record

### Phase 6: Polish
16. Add loading states and error handling
17. Add toast notifications
18. Test with real newsletters
19. Deploy to Railway

## TECHNICAL REQUIREMENTS

- **Stack:** Next.js 14+ (App Router), TypeScript, PostgreSQL, Tailwind CSS
- **ORM:** Drizzle or Prisma (your choice, pick one and stick with it)
- **Hosting:** Railway (app + Postgres)
- **Email In:** Mailgun inbound parse
- **Email Out:** Resend
- **AI:** Anthropic Claude API (claude-sonnet-4-20250514)

## KEY FILES TO CREATE

```
/app
  /api
    /ingest
      /mailgun/route.ts    # Mailgun webhook
      /poll/route.ts       # RSS polling (cron)
    /links/route.ts        # List links with velocity
    /digest/route.ts       # Create/update digest
    /digest/[id]/publish/route.ts
    /admin
      /sources/route.ts
      /entities/route.ts
      /categories/route.ts
      /blacklist/route.ts
  /dashboard/page.tsx      # Main dashboard
  /admin
    /sources/page.tsx
    /entities/page.tsx
    /categories/page.tsx
/lib
  /db.ts                   # Database connection
  /schema.ts               # Drizzle/Prisma schema
  /canonicalize.ts         # URL canonicalization
  /unwrap.ts               # Redirect following
  /analyze.ts              # AI link analysis
  /resend.ts               # Email sending
/components
  /LinkList.tsx
  /FilterSidebar.tsx
  /DigestBuilder.tsx
```

## VELOCITY QUERY

The core query for the dashboard:

```sql
SELECT 
  l.id,
  l.canonical_url,
  l.title,
  l.domain,
  l.category_id,
  l.subcategory_id,
  l.ai_summary,
  COUNT(DISTINCT m.source_id) as velocity,
  ARRAY_AGG(DISTINCT s.name) as source_names
FROM links l
JOIN mentions m ON l.id = m.link_id
JOIN sources s ON m.source_id = s.id
WHERE m.seen_at > NOW() - INTERVAL '24 hours'
GROUP BY l.id
ORDER BY velocity DESC, l.first_seen_at DESC;
```

## IMPORTANT NOTES

1. **Don't stop between phases.** Build continuously. Only pause to ask clarifying questions if truly blocked.

2. **Test canonicalization thoroughly.** This is the hardest part. Test with:
   - Mailchimp wrapped links
   - Substack redirect links
   - bit.ly shortlinks
   - Links with UTM params

3. **Mailgun webhook verification is critical.** Don't skip signature verification.

4. **The dashboard should be fast.** Use proper indexes. The velocity query should run in <100ms.

5. **AI analysis is async.** Don't block ingestion waiting for Claude. Store the link, queue analysis.

6. **Entity suggestions go to a queue.** Never auto-add entities. Always require approval.

Now, ask me the setup questions and let's build this thing.
```

---

## End of Document

This PRD and Claude Code prompt should give you everything needed to build Daily Bunch V1. The prompt is designed to let Claude Code ask configuration questions upfront, then build continuously through all phases without stopping.

Good luck. Ship it. 🚀
