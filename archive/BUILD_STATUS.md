# Daily Bunch - Build Status

> Cultural signal intelligence platform tracking link velocity across newsletters and RSS feeds.

**Last Updated:** 2025-01-18

---

## Phase 1: Foundation ✅ COMPLETE

| Task | Status |
|------|--------|
| Next.js 14+ with TypeScript, Tailwind, App Router | ✅ |
| Railway Postgres provisioned | ✅ |
| Prisma schema with all tables + indexes | ✅ |
| Seed data (4 categories, 17 subcategories, 8 sources, 11 entities) | ✅ |
| Environment variables configured | ✅ |
| Lo-fi editorial aesthetic (serif fonts, no decoration) | ✅ |

**Database Tables:**
- `categories` / `subcategories` - Taxonomy
- `sources` - Newsletter and RSS feed configs
- `links` - Canonical URLs with metadata
- `mentions` - Link × source occurrences (for velocity)
- `entities` / `link_entities` - People, orgs, products
- `entity_suggestions` - AI-proposed entities awaiting approval
- `digests` / `digest_items` - Published collections
- `blacklist` - Domains/URLs to ignore

---

## Phase 2: Ingestion Engine ✅ COMPLETE

| Task | Status |
|------|--------|
| Link canonicalization service | ✅ |
| URL normalization (UTM stripping, HTTPS, etc.) | ✅ |
| Redirect following (up to 10 hops) | ✅ |
| Newsletter wrapper extraction (Mailchimp, Substack) | ✅ |
| Mailgun webhook endpoint | ✅ |
| RSS polling service | ✅ |
| Manual link entry endpoint | ✅ |

**RSS Polling Results:**
- Successfully polled 6 sources
- Fetched 145 feed items
- Processed 672 links total

**Canonicalization Tests Passed:**
- Mailchimp wrapper extraction ✅
- Substack redirect extraction ✅
- HTTP redirect following ✅
- UTM parameter stripping ✅
- Trailing slash removal ✅
- Fragment removal ✅
- HTTP to HTTPS upgrade ✅
- Multi-hop redirects ✅

---

## Phase 3: AI Processing ✅ COMPLETE

| Task | Status |
|------|--------|
| Claude API integration | ✅ |
| Link analysis (categorization, entity extraction) | ✅ |
| AI summary generation | ✅ |
| Entity suggestion queue (never auto-add) | ✅ |
| Cron endpoint for batch processing | ✅ |

**Test Results:**
- Claude API (claude-sonnet-4-20250514) connected and working
- Analyzed 3 test links successfully
- Proper category/subcategory assignment
- 5 entity suggestions queued for approval

---

## Phase 4: Dashboard ✅ COMPLETE

| Task | Status |
|------|--------|
| Scoreboard (`/dashboard`) - velocity-ranked links | ✅ |
| Link Browser (`/links`) - search/filter all links | ✅ |
| Manual Link Entry (`/links/new`) - add URLs for processing | ✅ |
| Admin landing page (`/admin`) | ✅ |
| Shared components (LinkCard, EntityChip, CategoryBadge, VelocityIndicator) | ✅ |

**Features:**
- Velocity-ranked scoreboard with time range filtering (24h/48h/7d)
- Full link browser with search, category/source filters, pagination
- Manual URL entry with real-time processing and redirect chain display
- Admin overview with link/source/entity counts
- Lo-fi editorial aesthetic (serif fonts, no decoration)

---

## Phase 5: Publishing ✅ COMPLETE

| Task | Status |
|------|--------|
| Resend email service | ✅ |
| Email template (clean, minimal) | ✅ |
| Digest API (create, list, get, delete, send) | ✅ |
| Digest list page (`/digests`) | ✅ |
| Digest builder (`/digests/new`) | ✅ |
| Digest detail + send page (`/digests/[id]`) | ✅ |

**Email Features:**
- Clean HTML template with lo-fi editorial style
- Plain text fallback
- Preview text for email clients
- Velocity and category display per link

---

## Phase 6: Polish & Deploy 🔄 IN PROGRESS

| Task | Status |
|------|--------|
| Build compiles successfully | ✅ |
| All routes functional | ✅ |
| Health check endpoint (`/api/health`) | ✅ |
| Railway configuration (`railway.toml`) | ✅ |
| Environment variables template | ✅ |
| Railway deployment | ⏳ Ready for deploy |
| Production verification | ⏳ |

---

## Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | Next.js 14+ (App Router) |
| Language | TypeScript |
| Database | PostgreSQL (Railway) |
| ORM | Prisma 5 |
| Styling | Tailwind CSS |
| Email In | Mailgun (inbound parse) |
| Email Out | Resend |
| AI | Anthropic Claude (claude-sonnet-4-20250514) |

---

## Key Files

```
/src
  /app
    /api
      /ingest/mailgun/route.ts   # Webhook for incoming emails
      /ingest/poll/route.ts      # RSS cron endpoint
      /links/route.ts            # Link list API
      /links/process/route.ts    # Manual link processing
    /dashboard/page.tsx          # Scoreboard
    /links/page.tsx              # Link Browser
    /links/new/page.tsx          # Manual Entry
  /lib
    /db.ts                       # Prisma client singleton
    /canonicalize.ts             # URL unwrapping + normalization ✅
    /analyze.ts                  # AI link analysis
    /resend.ts                   # Email sending
/prisma
  /schema.prisma                 # Database schema ✅
  /seed.ts                       # Seed data ✅
/scripts
  /test-canonicalize.ts          # Canonicalization test suite ✅
```

---

## Seed Data

**Categories:** SPORTS, CULTURE, BUSINESS, AI

**Sources (8):**
- Morning Brew (newsletter, BUSINESS)
- Stratechery (RSS, BUSINESS)
- SIC Weekly (RSS, CULTURE)
- Intelligencer (RSS, CULTURE)
- Front Office Sports (RSS, SPORTS)
- Boardroom (RSS, SPORTS)
- GOOD THINKING (RSS, BUSINESS)
- Why is this interesting? (newsletter, CULTURE)

**Entities (11):**
Elon Musk, OpenAI, Anthropic, Shohei Ohtani, Sabrina Carpenter, Chris Black, Jason Stewart, New Balance, iPhone, Claude Code, Los Angeles Dodgers
