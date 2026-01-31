# Daily Bunch

A cultural signal intelligence platform that surfaces what's traveling across the curated web. It answers the question: *"What are tastemakers collectively pointing at right now?"*

**Live at:** [dailybunch.com](https://dailybunch.com)

## Overview

Daily Bunch monitors RSS feeds from newsletters, blogs, and publications to identify links that multiple sources are mentioning. When several tastemakers point at the same article, that's a signal worth paying attention to.

```
┌─────────────────────────────────────────────────────────────────┐
│                         DAILY BUNCH                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   RSS Feeds ──► Ingest ──► Canonicalize ──► Score ──► Display   │
│                                                                 │
│   • Poll 20+ curated sources                                    │
│   • Unwrap tracking URLs (Mailchimp, Substack, bit.ly)          │
│   • Normalize URLs (strip UTM, trailing slashes)                │
│   • Calculate velocity (# of sources mentioning same link)      │
│   • Rank by what's traveling across the web                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Two Main Views

### Latest (`/links`)
Chronological view of all ingested links, newest first. Simple, clean, no filters—just the stream of what's coming in.

### Trending (`/dashboard`)
Velocity-ranked view showing what multiple sources are linking to. Links with higher velocity (more sources mentioning them) rise to the top. This is where you find the signals.

## Features

### Intelligent Link Processing
- **URL Canonicalization**: Unwraps tracking redirects (Mailchimp, Substack, bit.ly, etc.)
- **Smart Deduplication**: Same article from different wrapped URLs gets unified
- **Title Cleaning**: Strips publication suffixes (`| NYTimes`), decodes HTML entities
- **Blocked Content Detection**: Auto-detects and hides robot pages, paywalls, 404s

### Source Management (`/admin/sources`)
- Add RSS feeds with one click
- **Fetch Now**: Manually trigger a fetch for any individual source
- **Include Own Links**: Toggle whether to include the source's own articles
- **Show on Dashboard**: Control which sources contribute to trending calculations
- **Internal Domains**: Configure additional domains to treat as self-referential
- Track fetch errors with consecutive failure counts

### Mobile-Responsive Design
- Collapsible sidebar for filters (on pages that have them)
- Responsive typography and spacing
- Touch-friendly controls

### Admin Tools (`/admin`)
- Sources, Entities, Blacklist management
- Manual RSS poll trigger
- AI analysis queue management
- Entity suggestion review

## Tech Stack

| Component | Technology |
|-----------|------------|
| Framework | Next.js 15 (App Router, Server Components) |
| Database | PostgreSQL via Prisma |
| Hosting | Railway |
| Email | Resend |
| AI | Anthropic Claude (summaries, categorization) |
| Link Unwrapping | Firecrawl |
| Styling | Tailwind CSS v4 |

## Data Model

```
Source (RSS feed)
  └── SourceItem (individual posts from the feed)
        └── extracts → Link (external articles mentioned)
                         ├── Mention (tracks which source, when)
                         ├── Entity (people, orgs, products)
                         └── Category / Subcategory
```

### Key Concepts

- **Velocity**: Number of distinct sources that linked to an article
- **Weighted Velocity**: Recent mentions weighted higher (24h = 1.0, 48h = 0.7, 72h = 0.4)
- **Trending**: Links with velocity ≥ 2 AND weighted velocity ≥ 1.5

## Environment Variables

```bash
# Database
DATABASE_URL=postgresql://...

# AI (for summaries and categorization)
ANTHROPIC_API_KEY=...

# Link scraping
FIRECRAWL_API_KEY=...

# Email delivery
RESEND_API_KEY=...
RESEND_FROM_EMAIL=digest@dailybunch.com

# Cron job authentication
CRON_SECRET=...
```

## Getting Started

```bash
# Install dependencies
npm install

# Set up database
npm run db:push
npm run db:seed

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## API Endpoints

### Public
| Endpoint | Description |
|----------|-------------|
| `GET /links` | Latest view (chronological) |
| `GET /dashboard` | Trending view (velocity-ranked) |

### Admin
| Endpoint | Description |
|----------|-------------|
| `POST /api/admin/sources` | Add new RSS source |
| `POST /api/admin/sources/[id]` | Update source settings |
| `POST /api/admin/sources/[id]/fetch` | Fetch single source manually |
| `POST /api/admin/blacklist` | Add to blacklist |

### Cron (Protected)
| Endpoint | Description |
|----------|-------------|
| `POST /api/ingest/poll` | Poll all RSS sources |
| `POST /api/cron/enrich` | Enrich pending links (titles, metadata) |
| `POST /api/cron/analyze` | AI analysis (summaries, categories) |

## Commands

```bash
npm run dev          # Development server
npm run build        # Production build
npm run start        # Start production server
npm run db:push      # Push schema to database
npm run db:seed      # Seed initial data
npm run db:studio    # Open Prisma Studio
```

## Deployment

Deployed on Railway with:
- PostgreSQL database
- Cron jobs for RSS polling (every 15 min) and enrichment (every 5 min)
- Health checks at `/api/health`

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── links/              # Latest view
│   ├── dashboard/          # Trending view
│   ├── admin/              # Admin pages
│   └── api/                # API routes
├── components/             # React components
│   ├── LinkCard.tsx        # Link display card
│   ├── TrendingSection.tsx # Featured trending links
│   ├── StatsTicker.tsx     # Stats bar
│   └── FilterSidebar.tsx   # Collapsible filter sidebar
├── lib/                    # Utilities
│   ├── db.ts               # Prisma client
│   ├── queries.ts          # Optimized SQL queries
│   ├── rss.ts              # RSS parsing
│   ├── canonicalize.ts     # URL normalization
│   ├── enrich.ts           # Link enrichment
│   └── title-utils.ts      # Title processing
└── prisma/
    └── schema.prisma       # Database schema
```

## License

Private project by [Edge City Expedition Company](https://edgecity.co)

---

**Version 1.0.0** — January 2026
