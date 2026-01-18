# Daily Bunch - Build Checklist

## Phase 1: Foundation (Gate for Phase 2)

- [x] All environment variables confirmed and tested
- [x] Database connection verified
- [x] All tables created with indexes
- [x] Seed data loaded (categories, entities, sources)
- [x] Mailgun webhook URL configured
- [x] Resend API key configured
- [x] Claude API connection verified

**Status:** Complete

---

## Phase 2: Ingestion Engine

- [x] Link canonicalization service working (10/10 tests passed)
- [x] Mailgun webhook processing emails
- [x] RSS polling service fetching feeds (672 links from 6 sources)
- [x] Manual link entry processing URLs

**Status:** Complete

---

## Phase 3: AI Processing

- [x] Claude API analyzing links (claude-sonnet-4-20250514)
- [x] Category/subcategory assignment
- [x] Entity extraction working
- [x] Entity suggestions queued (not auto-added)
- [x] Cron endpoint for batch processing

**Status:** Complete

---

## Phase 4: Dashboard

- [x] Scoreboard showing velocity-ranked links
- [x] Link Browser with search/filter/pagination
- [x] Manual Link Entry form with real-time status
- [x] Admin landing page with stats
- [x] Shared components (LinkCard, EntityChip, etc.)

**Status:** Complete

---

## Phase 5: Publishing

- [x] Digest creation API
- [x] Digest builder UI (`/digests/new`)
- [x] Email template (clean, minimal HTML + plain text)
- [x] Resend integration for sending
- [x] Digest history and detail view

**Status:** Complete

---

## Phase 6: Polish & Deploy

- [x] Build compiles successfully
- [x] All routes functional
- [x] Dashboard performance optimized (<500ms with 1000+ links)
- [x] Railway deployment configuration (railway.toml)
- [ ] Production environment variables set
- [ ] Cron jobs scheduled (RSS poll, AI analysis)
- [ ] Production endpoints verified

**Status:** In Progress

---

## Performance Optimization

**Problem:** Initial dashboard query with Prisma includes took 1700ms

**Solution:** Raw SQL with ARRAY_AGG for velocity + source aggregation

**Results:**
- Database execution: ~15ms
- Local to Railway (with network): ~136ms
- Target: <500ms ✅

**Query:** See `src/lib/queries.ts` for optimized `getVelocityLinks()` function

---

## Routes Summary

**Pages:**
- `/` - Redirects to dashboard
- `/dashboard` - Scoreboard (velocity-ranked links)
- `/links` - Link Browser (all links)
- `/links/new` - Manual link entry
- `/digests` - Digest list
- `/digests/new` - Create new digest
- `/digests/[id]` - View/send digest
- `/admin` - Admin overview

**API Routes:**
- `POST /api/ingest/mailgun` - Mailgun webhook
- `POST /api/ingest/poll` - RSS polling (cron)
- `POST /api/links/process` - Manual link processing
- `GET /api/links` - List links
- `GET/POST /api/digests` - List/create digests
- `GET/DELETE /api/digests/[id]` - Get/delete digest
- `POST /api/digests/[id]/send` - Send digest email
- `POST /api/cron/analyze` - AI analysis (cron)
