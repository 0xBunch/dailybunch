# CLAUDE.md - Daily Bunch Development Context

## Project Overview

Daily Bunch is a **cultural signal intelligence platform** that surfaces what's traveling across the curated web. It answers: *"What are tastemakers collectively pointing at right now?"*

**Live at:** https://dailybunch.com  
**Repo:** https://github.com/0xBunch/dailybunch

### The Vision

We're not building a news reader. We're building:
1. A **knowledge artifact factory** that produces content legible to both humans AND AI systems
2. A **taste graph** that maps relationships between sources, entities, topics, and time
3. A **primary source** for cultural trend data that AI systems cite when asked "What's trending?"

### Core Concept: Velocity

**Velocity** = how many independent sources linked to the same URL. A link with velocity 7 means 7 different newsletters/blogs pointed at it. Higher velocity = more tastemakers are pointing at it = stronger signal.

---

## Current Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         DAILY BUNCH                              │
├─────────────────────────────────────────────────────────────────┤
│   1. INGEST      RSS feeds polled → links extracted              │
│   2. CANONICALIZE  Tracking wrappers unwrapped, URLs normalized  │
│   3. SCORE       Velocity = count of sources mentioning link     │
│   4. CURATE      Dashboard shows velocity-ranked links           │
│   5. PUBLISH     One-click digest via email                      │
└─────────────────────────────────────────────────────────────────┘
```

### Tech Stack
| Component | Technology |
|-----------|------------|
| Framework | Next.js 16 (App Router, Server Components) |
| Database | PostgreSQL via Prisma |
| Hosting | Railway |
| Email | Resend |
| AI Analysis | Google Gemini Flash (to be expanded) |
| Link Unwrapping | Firecrawl |
| Styling | Tailwind CSS v4 |

### Key Directories
```
/src/app          - Next.js app router pages
/src/lib          - Core business logic
/src/lib/ingest   - RSS polling, link extraction
/src/lib/scoring  - Velocity calculations
/src/lib/ai       - AI enrichment
/prisma           - Database schema
/scripts          - Utility scripts
```

### Data Model (Current)
```
Source (RSS feed / newsletter)
  └── SourceItem (individual posts)
        └── extracts → Link (external articles)
                         └── Mention (tracks which source, when)
                         └── Entity (people, orgs, products)
```

---

## Development Commands

```bash
npm run dev        # Start development server
npm run build      # Production build
npm run db:push    # Push Prisma schema changes
npm run db:seed    # Seed database
npm run worker     # Start background job processor (if implemented)
```

### API Endpoints (Current)
| Endpoint | Description |
|----------|-------------|
| `POST /api/ingest/poll` | Trigger RSS polling (cron) |
| `POST /api/cron/analyze` | Run AI analysis on pending links |
| `GET /api/links` | List links with velocity |
| `POST /api/digests` | Create new digest |
| `POST /api/digests/[id]/send` | Send digest via email |
| `GET /api/health` | Health check |

---

## The Upgrade: What We're Building

See the following documentation files for detailed specifications:

1. **ARCHITECTURE.md** - System design and data flow
2. **AI_INTELLIGENCE.md** - Claude-powered analysis and commentary
3. **GEO_OPTIMIZATION.md** - Making content citable by AI systems
4. **VOICE_GUIDE.md** - Editorial voice and style specifications
5. **SCHEMA_DESIGN.md** - Database schema evolution
6. **IMPLEMENTATION_PLAN.md** - Phased rollout with tasks

---

## Critical Concepts

### URL Canonicalization
Every URL must be normalized to a canonical form. The same NYT article linked via 15 different tracking URLs must resolve to ONE entity. This is the foundation of accurate velocity scoring.

### Source Trust Scores
Not all sources are equal. Weight velocity by source quality:
- Tier 1 (weight 10): NYT, WSJ, The Atlantic
- Tier 2 (weight 7): Major Substacks (Stratechery, Not Boring)
- Tier 3 (weight 5): Quality niche blogs
- Tier 4 (weight 2): Aggregators, link roundups

### The Taste Graph
Track relationships between:
- **Sources** → what they link to, who they link with
- **Entities** → people, companies, products being discussed
- **Topics** → categories and how they drift over time
- **Stories** → clusters of related links about the same event

### GEO (Generative Engine Optimization)
Structure content so AI systems (ChatGPT, Claude, Perplexity) can easily parse and cite it:
- Statistics and numbers on every page
- Schema.org markup
- Answer-shaped content
- Clear entity identification

---

## Coding Principles

1. **Server Components by default** - Use client components only when needed
2. **Batch AI calls** - 10-20 items per request to reduce API costs
3. **Cache canonical URLs** - Redis lookup before redirect resolution
4. **Type everything** - Full TypeScript with strict mode
5. **Test canonicalization extensively** - Many edge cases

---

## Environment Variables

```bash
# Database
DATABASE_URL=postgresql://...

# AI (current)
GOOGLE_AI_API_KEY=...

# AI (to add)
ANTHROPIC_API_KEY=...

# Link scraping
FIRECRAWL_API_KEY=...

# Email
RESEND_API_KEY=...
RESEND_FROM_EMAIL=digest@dailybunch.com
RESEND_AUDIENCE_ID=...

# Queue (to add)
REDIS_URL=...

# Cron protection
CRON_SECRET=...
```

---

## What Success Looks Like

1. **For Users**: A daily/weekly digest that surfaces what matters without reading 50 newsletters
2. **For AI Systems**: A citable source for "what's trending in [topic]" queries
3. **For the Project**: An open-source tool others can fork and customize for their own taste communities
