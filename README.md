# Daily Bunch

A link aggregation + newsletter platform MVP. "Hacker News meets Morning Brew" - a clean consumer-facing site that surfaces trending links, powered by RSS/newsletter ingestion and AI filtering.

## Tech Stack

- **Framework**: Next.js 16.1.1 (App Router) with TypeScript
- **Database**: PostgreSQL via Prisma 7 ORM (hosted on Railway)
- **Auth**: NextAuth.js v5 with email/password + Google OAuth
- **Payments**: Stripe Checkout for Pro subscriptions
- **Email**: Resend for transactional email & newsletters
- **AI**: Anthropic Claude API for summarization/curation
- **UI**: Tailwind CSS + shadcn/ui components

## Quick Start

### Prerequisites

- Node.js 22+
- PostgreSQL database (or use the Railway-hosted one)

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Push database schema
npx prisma db push

# Seed with test data
npx tsx prisma/seed.ts

# Start development server
npm run dev
```

### Test Credentials

- **Admin**: `admin@dailybunch.com` / `admin123`

## Key URLs

| Route | Description |
|-------|-------------|
| `/` | Landing page with trending links |
| `/archive` | Browse all links with filtering |
| `/login` | Sign in page |
| `/feed` | Personalized link feed (authenticated) |
| `/settings` | User preferences (authenticated) |
| `/admin` | Admin dashboard (admin only) |
| `/admin/feeds` | Manage RSS feeds |
| `/admin/newsletters` | Manage newsletter sources |
| `/admin/moderation` | Content moderation |

## Environment Variables

```env
# Database (Railway PostgreSQL)
DATABASE_URL="postgresql://..."

# Auth
NEXTAUTH_SECRET="your-secret"
NEXTAUTH_URL="http://localhost:3000"

# Optional: Google OAuth
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

# Optional: Email (Resend)
RESEND_API_KEY=""
EMAIL_FROM="Daily Bunch <hello@dailybunch.com>"

# Optional: AI (Anthropic)
ANTHROPIC_API_KEY=""

# Optional: Payments (Stripe)
STRIPE_SECRET_KEY=""
STRIPE_PUBLISHABLE_KEY=""
STRIPE_WEBHOOK_SECRET=""
STRIPE_PRO_PRICE_ID=""

# Cron Security
CRON_SECRET="your-cron-secret"

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_APP_NAME="Daily Bunch"

# Mock Mode (uses mock implementations when APIs unavailable)
MOCK_SERVICES="true"
```

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Auth pages (login, signup)
│   ├── (dashboard)/       # Authenticated pages (feed, settings, admin)
│   ├── (marketing)/       # Public pages (landing, archive)
│   └── api/               # API routes
├── components/            # React components
│   ├── layout/           # Header, Footer, etc.
│   ├── providers/        # Context providers
│   └── ui/               # shadcn/ui components
├── features/             # Feature modules
│   ├── ai/               # AI enrichment services
│   ├── billing/          # Stripe integration
│   ├── links/            # Link management
│   ├── newsletter/       # Newsletter sending
│   └── sources/          # RSS/email ingestion
├── lib/                  # Shared utilities
│   ├── auth.ts          # NextAuth configuration
│   ├── prisma.ts        # Prisma client
│   ├── stripe.ts        # Stripe client
│   └── utils.ts         # Helper functions
└── types/               # TypeScript definitions
```

## Features

### Implemented

- [x] User authentication (email/password, Google OAuth)
- [x] Link aggregation with scoring algorithm
- [x] RSS feed management and ingestion
- [x] Newsletter inbound email parsing
- [x] AI-powered link summarization (mock)
- [x] Admin dashboard with moderation tools
- [x] User personalized feed
- [x] Email newsletter composition
- [x] Stripe Pro subscription flow (mock)
- [x] Dark mode support
- [x] Mobile responsive design

### Mock Services

When `MOCK_SERVICES=true` or API keys are missing:

- **AI**: Returns placeholder summaries
- **Stripe**: Simulates checkout flow
- **Resend**: Logs emails to console

## API Endpoints

### Public

- `GET /api/links/trending` - Get trending links
- `GET /api/links/search` - Search links
- `GET /api/links/top-domains` - Get top domains

### Protected

- `POST /api/links/vote` - Vote on a link
- `POST /api/subscribe` - Subscribe to newsletter
- `POST /api/billing/checkout` - Create Stripe checkout

### Admin

- `GET /api/admin/stats` - Dashboard statistics
- `POST /api/cron/fetch-rss` - Trigger RSS fetch
- `POST /api/cron/enrich-links` - Trigger AI enrichment

## Database Schema

Key models:

- **User** - Auth, subscription status, preferences
- **Link** - URL, title, AI summary, score, status
- **Mention** - Links to source (RSS/newsletter)
- **RssFeed** - RSS source configuration
- **Newsletter** - Newsletter source with ingest email
- **Tag** - Link categorization
- **Vote** - User votes on links
- **Comment** - User comments on links

## Deployment

### Railway

The app is configured for Railway deployment:

```bash
# Link to Railway project
railway link

# Deploy
railway up
```

The `railway.toml` configures:
- Prisma migrations on deploy
- Cron jobs for RSS fetching and AI enrichment

### Current Railway Project

- **Project**: daily-bunch
- **Database**: PostgreSQL at `crossover.proxy.rlwy.net:48562`
- **Dashboard**: https://railway.com/project/54ffe891-16f9-487f-87d3-78eed5d6e180

## Development Notes

### Prisma 7 Driver Adapter

This project uses Prisma 7 which requires a driver adapter for the "client" engine type:

```typescript
// src/lib/prisma.ts
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
```

### Known Issues

1. **Middleware removed**: The Next.js 16 edge runtime doesn't support the `crypto` module used by NextAuth. Route protection is handled at the page level instead.

2. **Stripe API version**: Using `2025-12-15.clover` for compatibility.

## Scripts

```bash
npm run dev       # Start development server
npm run build     # Build for production
npm run start     # Start production server
npm run lint      # Run ESLint
npx prisma studio # Open Prisma Studio
```

## License

Private - All rights reserved
