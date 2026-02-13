# Daily Bunch v1.0 — Snapshot

> Cultural signal intelligence platform. Surfaces what tastemakers are collectively pointing at across the curated web.

**Live:** [dailybunch.com](https://dailybunch.com)
**Tagged:** v1.0.0 (February 2026)

---

## What's Built

### Core Platform
- **RSS ingestion** — polls 40+ feeds on schedule, extracts external links, tracks source items
- **URL canonicalization** — unwraps Mailchimp/Substack/bit.ly tracking, normalizes URLs, caches redirects
- **Multi-tier enrichment** — Mercury → Jina → Firecrawl → AI title → URL path fallback
- **Blacklist** — domain and URL pattern blocking
- **Source management** — trust tiers (1-4), error tracking, auto-deactivation, manual fetch, poll frequency control

### AI Pipeline
- **Analysis** (Gemini Flash) — categorization, entity extraction, summarization in Daily Bunch voice
- **Cultural analysis** (Claude Sonnet) — triggered for links with velocity >= 3; surfaces why-now, tensions, predictions
- **Embeddings** (Gemini text-embedding-004) — vector representations for clustering
- **Story clustering** — cosine similarity grouping with narrative generation (Claude)
- **Weekly review** — Harper's Magazine-style prose digest generation

### Entity System
- Named entities: people, organizations, products
- AI-powered extraction with suggestion queue
- Admin approval/rejection workflow with bulk actions
- Entity blocklist for noise suppression
- Batch import from CSV/JSON
- Velocity tracking: weekly, monthly, trend direction (rising/stable/falling)
- Server-side pagination and search

### Scoring
- **Raw velocity** — count of distinct sources linking to same URL
- **Weighted velocity** — trust * tier weight * time decay (24h=1.0, 48h=0.7, 72h=0.4, older=0.2)
- **Ranking** — HN-style: `(velocity * weighted) / (hours + 2)^1.8`
- **Trending threshold** — velocity >= 2 AND weighted >= 1.5

### Frontend
- **Dashboard** (`/dashboard`) — stories + ungrouped links, trending entities sidebar, category filters
- **Latest** (`/links`) — chronological feed, all links
- **Entity pages** (`/entity/[slug]`) — all links mentioning an entity with velocity trend
- **Admin** — sources, entities, blacklist management with bulk operations
- **Design system** — Satoshi (headlines), Source Serif 4 (body), JetBrains Mono (mono), warm accent `#c45d2c`, lo-fi editorial aesthetic, no rounded corners
- **Keyboard nav** — j/k movement, Enter to open, Cmd+K command palette
- **Mobile responsive** — collapsible sidebar, responsive typography

### Content Types
- Story cards (clustered links with AI narrative)
- Video cards (YouTube thumbnails)
- Podcast cards (duration display)
- Standard link cards (feed/compact/grid modes)

### Digests & Reviews
- Manual digest curation (drag/drop ordering, admin notes)
- Weekly review generation (Harper's-style prose, footnoted sources)
- Email delivery via Resend

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, Server Components) |
| Database | PostgreSQL via Prisma |
| Hosting | Railway (cron scheduling) |
| AI — Analysis | Google Gemini Flash |
| AI — Cultural/Narratives | Anthropic Claude Sonnet |
| AI — Embeddings | Gemini text-embedding-004 |
| Enrichment | Mercury, Jina Reader, Firecrawl |
| Email | Resend |
| Styling | Tailwind CSS v4 |

---

## Cron Schedule

| Job | Frequency | What It Does |
|-----|-----------|-------------|
| RSS polling | 15 min | Fetch feeds, extract links |
| Enrichment | 5 min | Multi-tier title extraction |
| AI analysis | 15 min | Categorize, extract entities, summarize |
| Embeddings | 30 min | Generate vectors for clustering |
| Clustering | 6 hours | Group related links into stories |
| Trends | 6 hours | Update entity velocity metrics |
| Narratives | 6 hours | Generate story narratives |

---

## Data Flow

```
RSS Feed → Parse → Extract Links → Canonicalize URL → Check Blacklist
  ↓
Link (pending) → Enrich (Mercury → Jina → Firecrawl → AI → URL path)
  ↓
Link (enriched) → AI Analysis (Gemini: category + entities + summary)
  ↓
Link (analyzed) → Embeddings → Clustering → Stories → Narratives
  ↓
High-velocity links → Cultural Analysis (Claude Sonnet)
```

---

## Database Tables

| Table | Purpose |
|-------|---------|
| Category / Subcategory | Taxonomy (SPORTS, CULTURE, BUSINESS, AI) |
| Source / SourceItem | RSS feeds and their posts |
| Link | Canonical URLs with enrichment + AI state |
| Mention | Link-source join (drives velocity) |
| Entity / LinkEntity | Named entities and associations |
| EntitySuggestion / EntityBlocklist | Entity approval pipeline |
| Story / StoryLink | Clustered link groups |
| Digest / DigestItem | Manual curation |
| WeeklyReview / WeeklyReviewSource | Prose digests |
| Blacklist | Domain/URL blocking |
| UrlCache | Canonicalization cache |

---

## Known Limitations

- **No authentication** — admin pages are open (no auth middleware)
- **No tests** — only canonicalization has unit tests; rest untested
- **No monitoring** — console-based logging, no Sentry/DataDog
- **No CI/CD** — Railway auto-deploys from main, but no test gates
- **No full-text search** — entity/link search is basic
- **Schema management** — using `db push` instead of migrations
- **Claude rate limits** — cultural analysis bottlenecked at ~60 RPM

---

## File Structure

```
src/
├── app/
│   ├── dashboard/          # Main view (stories + links)
│   ├── links/              # Chronological feed
│   ├── entity/[slug]/      # Entity detail pages
│   ├── admin/              # Sources, entities, blacklist
│   ├── digests/            # Digest curation
│   ├── weekly-review/      # Harper's-style reviews
│   └── api/
│       ├── cron/           # Scheduled jobs (enrich, analyze, cluster, trends)
│       ├── ingest/         # RSS polling, Mailgun webhooks
│       ├── admin/          # Admin CRUD endpoints
│       └── ...             # Links, digests, health, etc.
├── components/             # React components (LinkCard, StoryCard, etc.)
├── hooks/                  # useKeyboardNavigation
└── lib/                    # Core logic (rss, canonicalize, enrich, analyze, clustering, scoring, trends)

prisma/schema.prisma        # Database schema
spec/daily-bunch.allium     # v2.0 behavioral spec
```
