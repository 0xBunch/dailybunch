# Daily Bunch

A cultural signal intelligence platform that surfaces what's traveling across the curated web. It answers the question: *"What are tastemakers collectively pointing at right now?"*

**Live at:** [dailybunch.com](https://dailybunch.com)

## Overview

Daily Bunch monitors RSS feeds from newsletters, blogs, and publications to identify links that multiple sources are mentioning. When several tastemakers point at the same article, that's a signal worth paying attention to.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              DAILY BUNCH                                      │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌─────────────┐  ┌──────────────────────────────┐  ┌────────────────────┐  │
│   │  FILTERS    │  │     MISSION CONTROL          │  │   RIGHT RAIL       │  │
│   │             │  │                              │  │                    │  │
│   │ Views       │  │  🔴 Breaking Now             │  │  ▶ TOP VIDEO       │  │
│   │ Time        │  │  📈 Trending Grid            │  │  [thumbnail]       │  │
│   │ Categories  │  │  ↑ Rising Entities           │  │                    │  │
│   │ Entities    │  │  💎 Hidden Gems              │  │  📊 POLYMARKET     │  │
│   │             │  │  ── All Signal Feed ──       │  │  [predictions]     │  │
│   └─────────────┘  └──────────────────────────────┘  └────────────────────┘  │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Mission Control 3.0

The homepage is a full-screen **Mission Control** dashboard with three columns:

### Left: Filter Sidebar
- **Views**: Trending, Hidden Gems, Videos, Podcasts
- **Time filters**: 6h, 24h, 7d, 30d
- **Categories**: AI, Culture, Sports, Business, etc.
- **Rising Entities**: People, orgs, and products trending now

### Center: Main Feed
- **Breaking Now**: High-velocity links (v5+) from the last 6 hours
- **Trending Grid**: Multi-source links with velocity badges
- **Rising Entities**: Clickable chips to filter by entity
- **Hidden Gems**: Single-source finds from trusted Tier 1 sources
- **All Signal**: Full velocity-ranked feed with view mode toggle

### Right: Contextual Modules
- **Top Video**: Highest-velocity YouTube/video content
- **Polymarket**: Top prediction markets by trading volume

## Two Main Views

### Trending (`/` and `/dashboard`)
The default homepage. Velocity-ranked view with Breaking, Trending, Hidden Gems sections. Full Mission Control experience.

### Latest (`/links`)
Chronological view of all ingested links, newest first. Simple, clean, no filters—just the stream of what's coming in.

## Features

### Intelligent Link Processing
- **URL Canonicalization**: Unwraps tracking redirects (Mailchimp, Substack, bit.ly, etc.)
- **Smart Deduplication**: Same article from different wrapped URLs gets unified
- **Title Cleaning**: Strips publication suffixes (`| NYTimes`), decodes HTML entities
- **Blocked Content Detection**: Auto-detects and hides robot pages, paywalls, 404s

### Content-Aware Display
- **Media Type Detection**: Automatically detects videos, podcasts, newsletters, threads
- **Video Cards**: Thumbnail-forward display for YouTube/Vimeo content
- **Podcast Cards**: Duration and waveform visualization
- **Story Clustering**: Groups related links into narrative stories via embedding similarity

### Keyboard Navigation
- `j/k` - Navigate up/down through links
- `Enter` - Open selected link in new tab
- `Cmd+K` - Command palette for quick actions
- `1/2/3` - Switch view modes (Feed/Compact/Grid)
- `?` - Show keyboard shortcuts help

### Source Management (`/admin/sources`)
- Add RSS feeds with one click
- **Fetch Now**: Manually trigger a fetch for any individual source
- **Include Own Links**: Toggle whether to include the source's own articles
- **Show on Dashboard**: Control which sources contribute to trending calculations
- **Internal Domains**: Configure additional domains to treat as self-referential
- **Source Tiers**: TIER_1 through TIER_4 for trust weighting
- Track fetch errors with consecutive failure counts

### Entity Tracking
- **Named Entity Recognition**: Extracts people, organizations, products from content
- **Velocity Trends**: Rising, stable, or falling indicators per entity
- **Entity Pages**: `/entity/[slug]` shows all links mentioning an entity

### Mobile-Responsive Design
- Right rail hidden on mobile
- Collapsible sidebar becomes bottom sheet
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
| Framework | Next.js 16 (App Router, Server Components) |
| Database | PostgreSQL via Prisma |
| Hosting | Railway (with cron jobs) |
| Email | Resend |
| AI | Anthropic Claude (summaries, categorization, embeddings) |
| Link Unwrapping | Firecrawl |
| Styling | Tailwind CSS v4 |
| External APIs | Polymarket Gamma API (prediction markets) |

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
| Endpoint | Schedule | Description |
|----------|----------|-------------|
| `/api/ingest/poll` | Every 15 min | Poll all RSS sources |
| `/api/cron/enrich` | Every 5 min | Enrich pending links (titles, metadata) |
| `/api/cron/analyze` | Every 10 min | AI analysis (summaries, categories) |
| `/api/cron/cultural-analysis` | Every 2 hours | Cultural significance scoring |
| `/api/cron/commentary` | Every 2 hours | AI commentary generation |
| `/api/cron/trends` | Every 6 hours | Entity velocity calculation |
| `/api/cron/clustering` | Every 6 hours | Story grouping via embeddings |

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
│   ├── dashboard/          # Mission Control (homepage)
│   ├── links/              # Latest chronological view
│   ├── entity/[slug]/      # Entity detail pages
│   ├── admin/              # Admin pages
│   └── api/
│       ├── cron/           # Scheduled jobs
│       │   ├── enrich/     # Link enrichment
│       │   ├── analyze/    # AI analysis
│       │   ├── clustering/ # Story grouping
│       │   └── trends/     # Entity velocity
│       └── ingest/         # RSS polling
├── components/
│   ├── MissionControlClient.tsx  # Main dashboard layout
│   ├── FilterSidebar.tsx         # Left sidebar with filters
│   ├── RightRail.tsx             # Right rail container
│   ├── TopVideoModule.tsx        # Featured video widget
│   ├── PolymarketModule.tsx      # Prediction markets widget
│   ├── LinkCard.tsx              # Link display (feed/compact/grid)
│   ├── VideoCard.tsx             # Video-specific card
│   ├── PodcastCard.tsx           # Podcast-specific card
│   ├── StoryCard.tsx             # Clustered story display
│   ├── CommandPalette.tsx        # Cmd+K interface
│   └── TrendingSection.tsx       # Trending grid
├── hooks/
│   └── useKeyboardNavigation.tsx # j/k navigation
├── lib/
│   ├── db.ts               # Prisma client
│   ├── queries.ts          # Optimized SQL queries
│   ├── polymarket.ts       # Polymarket API client
│   ├── clustering.ts       # Story clustering logic
│   ├── media-type.ts       # Content type detection
│   ├── trends.ts           # Entity velocity tracking
│   ├── rss.ts              # RSS parsing
│   ├── canonicalize.ts     # URL normalization
│   └── enrich.ts           # Link enrichment
└── prisma/
    └── schema.prisma       # Database schema
```

## License

Private project by [Edge City Expedition Company](https://edgecity.co)

---

**Version 3.0.0** — Mission Control — January 2026
