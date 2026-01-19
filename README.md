# Daily Bunch

A cultural signal intelligence platform that surfaces what's traveling across the curated web. It answers the question: *"What are tastemakers collectively pointing at right now?"*

**Live at:** [dailybunch.com](https://dailybunch.com)

## How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│                         DAILY BUNCH                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   1. INGEST                                                      │
│   ─────────                                                      │
│   RSS feeds from newsletters, blogs, and publications            │
│   are polled on a schedule. Links are extracted from content.    │
│                                                                  │
│   2. CANONICALIZE                                                │
│   ───────────────                                                │
│   Tracking wrappers (Mailchimp, Substack, bit.ly) are unwrapped. │
│   URLs are normalized (strip UTM params, trailing slashes).      │
│                                                                  │
│   3. SCORE                                                       │
│   ────────                                                       │
│   "Velocity" = how many sources linked to the same article.      │
│   Higher velocity = more tastemakers are pointing at it.         │
│                                                                  │
│   4. CURATE                                                      │
│   ─────────                                                      │
│   Dashboard shows velocity-ranked links with filters.            │
│   Select links, add notes, write a headline.                     │
│                                                                  │
│   5. PUBLISH                                                     │
│   ─────────                                                      │
│   One click sends a formatted digest via email.                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Features

### Home (`/links`)
- Browse all ingested links with search
- Filter by category, source, sort by newest/oldest/velocity
- Pagination for large datasets
- Clean, editorial presentation

### Feed (`/dashboard`)
- Links ranked by velocity (number of sources that mentioned them)
- Filter by category, entity, and time range (24h, 48h, 7d)
- AI-generated summaries for each link
- Quick add to digest workflow

### Sources Management (`/admin/sources`)
- Configure RSS feeds and newsletter sources
- Toggle "Include Own Links" per source:
  - **OFF** (default): Only scrape external links the source mentions
  - **ON**: Include the source's own articles on the scoreboard
- Toggle "Show on Dashboard" to include/exclude sources from Feed view
- Track fetch errors and consecutive failures

### Digest Builder (`/digests`)
- Create curated digests from selected links
- Add editorial notes per link
- Send via Resend email API

### Admin Panel (`/admin`)
- Sources, Entities, Blacklist management
- Trigger manual RSS polls and AI analysis
- View pending entity suggestions

## Tech Stack

| Component | Technology |
|-----------|------------|
| Framework | Next.js 16 (App Router, Server Components) |
| Database | PostgreSQL via Prisma |
| Hosting | Railway |
| Email Delivery | Resend |
| AI Analysis | Google Gemini Flash |
| Link Unwrapping | Firecrawl |
| Styling | Tailwind CSS v4 |

## Data Model

```
Source (RSS feed / newsletter)
  └── SourceItem (individual posts from the source)
        └── extracts → Link (external articles mentioned)
                         └── Mention (tracks which source, when)
                         └── Entity (people, orgs, products tagged)
```

## Environment Variables

```bash
# Database
DATABASE_URL=postgresql://...

# AI
ANTHROPIC_API_KEY=...

# Link scraping
FIRECRAWL_API_KEY=...

# Email
RESEND_API_KEY=...
RESEND_FROM_EMAIL=digest@dailybunch.com
RESEND_AUDIENCE_ID=...

# Cron protection
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

Open [http://localhost:3000](http://localhost:3000) to see the dashboard.

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `POST /api/ingest/poll` | Trigger RSS polling (cron) |
| `POST /api/cron/analyze` | Run AI analysis on pending links |
| `GET /api/links` | List links with velocity |
| `POST /api/digests` | Create new digest |
| `POST /api/digests/[id]/send` | Send digest via email |
| `GET /api/health` | Health check (Railway) |

## Deployment

Deployed on Railway with:
- PostgreSQL database
- Nixpacks builder (Node.js 20+)
- Health checks at `/api/health`

```bash
# Build
npm run build

# Start
npm run start
```

## License

Private project by [Edge City Expedition Company](https://edgecity.co)
