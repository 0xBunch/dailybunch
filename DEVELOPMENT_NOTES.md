# Development Notes - Daily Bunch

Last updated: January 14, 2026

## Current Status

**All 10 phases complete.** The MVP is functional and running locally with a Railway-hosted PostgreSQL database.

### What's Working

- Homepage loads with 3 sample links from the database
- Login/authentication with email/password
- Admin dashboard accessible after login
- Feed page with trending links
- All API endpoints functional
- Database seeded with test data

### Test the App

```bash
# Start dev server (already connected to Railway DB)
npm run dev

# Open http://localhost:3000
# Login: admin@dailybunch.com / admin123
```

## Technical Decisions & Gotchas

### 1. Prisma 7 Driver Adapter (CRITICAL)

Prisma 7 with `engineType = "client"` requires a driver adapter. This affects ALL Prisma instantiation:

```typescript
// CORRECT - src/lib/prisma.ts
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
```

The seed script also needs this pattern (see `prisma/seed.ts`).

### 2. Middleware Removed

Next.js 16's edge runtime doesn't support Node.js `crypto` module. The NextAuth `auth()` wrapper and `getToken()` both use crypto internally.

**Solution**: Removed `src/middleware.ts`. Route protection is handled at the page level by checking `auth()` in server components.

**Future fix**: Use Next.js 16's new "proxy" convention or wait for NextAuth edge-compatible release.

### 3. Zod Error Handling

Zod v3 uses `.issues` not `.errors`:

```typescript
// WRONG
parsed.error.errors[0].message

// CORRECT
parsed.error.issues[0].message
```

Files affected: Multiple API routes in `src/app/api/`

### 4. Stripe API Version

Must use exact version string:

```typescript
const stripe = new Stripe(key, {
  apiVersion: "2025-12-15.clover",  // Not "2024-xx-xx"
});
```

### 5. NextAuth Adapter Types

PrismaAdapter needs type assertion:

```typescript
import type { Adapter } from "next-auth/adapters";
adapter: PrismaAdapter(prisma) as Adapter,
```

### 6. Database Model Names

- Comments use `user` relation, not `author`
- No `subscription` model - use `Subscriber` for newsletter subs
- No `subscriptionStatus` field - use `isPro: boolean` on User

### 7. LinkStatus Enum

When filtering by enum, create mutable arrays:

```typescript
// WRONG - readonly tuple
const statuses = ["APPROVED", "FEATURED"] as const;

// CORRECT - mutable array
const statuses: LinkStatus[] = ["APPROVED", "FEATURED"];
```

## File Structure Overview

```
src/
├── app/
│   ├── (auth)/login/          # Login page
│   ├── (dashboard)/
│   │   ├── admin/             # Admin pages (feeds, newsletters, moderation)
│   │   ├── feed/              # User feed
│   │   ├── settings/          # User settings + billing
│   │   └── link/[id]/         # Link detail page
│   ├── (marketing)/
│   │   ├── page.tsx           # Landing page
│   │   └── archive/           # Archive browser
│   └── api/
│       ├── auth/[...nextauth]/ # NextAuth handlers
│       ├── admin/              # Admin API routes
│       ├── billing/            # Stripe checkout/webhooks
│       ├── cron/               # Scheduled job endpoints
│       ├── links/              # Link CRUD + trending
│       ├── newsletter/         # Newsletter send
│       ├── subscribe/          # Newsletter subscription
│       └── webhooks/           # Stripe + inbound email
├── components/
│   ├── layout/                # Header, Footer
│   ├── providers/             # SessionProvider, ThemeProvider
│   └── ui/                    # shadcn components
├── features/
│   ├── ai/                    # AI enrichment (mock)
│   ├── billing/               # Stripe components
│   ├── links/                 # Link components + services
│   ├── newsletter/            # Email templates + composer
│   └── sources/               # RSS fetcher, email parser
├── lib/
│   ├── auth.ts               # NextAuth config
│   ├── prisma.ts             # Prisma client with adapter
│   ├── stripe.ts             # Stripe client
│   ├── resend.ts             # Resend client (mock)
│   ├── anthropic.ts          # Claude client (mock)
│   └── utils.ts              # Helpers (cn, isMockMode, etc.)
└── types/
    └── next-auth.d.ts        # Session type extensions
```

## Database

### Connection

Currently using Railway PostgreSQL:
- Host: `crossover.proxy.rlwy.net`
- Port: `48562`
- Database: `railway`
- User: `postgres`

### Useful Commands

```bash
# Push schema changes
npx prisma db push

# Open Prisma Studio
npx prisma studio

# Re-seed database
npx tsx prisma/seed.ts

# Generate client after schema changes
npx prisma generate
```

### Seeded Data

- 1 admin user: `admin@dailybunch.com`
- 5 RSS feeds (HN, TechCrunch, Ars Technica, The Verge, Wired)
- 10 tags (Technology, AI, Business, etc.)
- 3 sample links

## Railway Deployment

### Current Project

- **ID**: `54ffe891-16f9-487f-87d3-78eed5d6e180`
- **URL**: https://railway.com/project/54ffe891-16f9-487f-87d3-78eed5d6e180
- **Services**: Postgres

### Deploy Commands

```bash
# Already linked to project
railway up

# Or build and deploy
npm run build && railway up
```

### Environment Variables Needed

Set these in Railway dashboard for production:
- `DATABASE_URL` (auto-set by Railway Postgres)
- `NEXTAUTH_SECRET` (generate new one)
- `NEXTAUTH_URL` (your Railway app URL)
- `CRON_SECRET`
- Optional: `ANTHROPIC_API_KEY`, `STRIPE_*`, `RESEND_API_KEY`

## Next Steps / TODO

### High Priority

1. **Re-add middleware** using Next.js 16 proxy pattern or edge-compatible auth
2. **Deploy to Railway** - add app service, configure env vars
3. **Add real API keys** - Anthropic, Stripe, Resend

### Medium Priority

4. **RSS fetching** - Test with real feeds, add error handling
5. **AI enrichment** - Connect real Anthropic API
6. **Email sending** - Configure Resend, test newsletter flow

### Nice to Have

7. **Rate limiting** on public APIs
8. **Error boundaries** and loading states polish
9. **SEO** - sitemap, OpenGraph images
10. **Analytics** - basic usage tracking

## Troubleshooting

### "PrismaClient needs to be constructed with valid options"

The Prisma client isn't using the driver adapter. Check `src/lib/prisma.ts` and ensure any script loading Prisma uses the same pattern.

### "ECONNREFUSED" on database

1. Check `.env` has correct `DATABASE_URL`
2. Ensure `dotenv/config` is imported at top of scripts
3. Verify Railway Postgres is running

### "crypto module not supported"

Something is using NextAuth's `auth()` or `getToken()` in edge runtime context. Move that code to a server component or API route.

### Build errors with Stripe

Ensure using `apiVersion: "2025-12-15.clover"` exactly.

## Contact

Project created January 2026.
