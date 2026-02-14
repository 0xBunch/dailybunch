# Daily Bunch V2: Project Brief
**Date:** February 13, 2026
**Status:** Planning → Build

---

## The Concept

Daily Bunch is a **personal culture engine** built on two products powered by one system:

**The Newsroom** (`dailybunch.com/newsroom`, password-protected) — Your Bloomberg Terminal for culture. A dense, desktop-first dashboard where every signal from every source is visible, filterable, and actionable. This is where you see the raw firehose, manage sources, spot trends, and operate as editor-in-chief.

**Daily Bunch** (`dailybunch.com`, public) — The published newspaper. A mostly-automated, mobile-friendly digest of the best content from the Newsroom. Smart scoring and AI curation do the heavy lifting; you occasionally step in to boost, demote, or annotate. This is the page you send friends to.

**The workflow:** Content flows into the engine → appears in the Newsroom → the best stuff automatically graduates to the public Daily Bunch page based on velocity, source trust, and section rules → you occasionally intervene from the Newsroom to promote, demote, or annotate.

---

## The Problem

You have 50–100+ high-signal sources across RSS feeds, Substack/Beehive newsletters, Apple News, Twitter, Instagram, LinkedIn, YouTube, and podcasts. These sources collectively contain everything you need to know about culture, technology, media, sports, and the topics you care about. But there's no single place to ingest, organize, score, and surface what matters. The best stuff slips through the cracks.

---

## What Exists Today (V1)

- **Live at** dailybunch.com
- **Stack:** Next.js + Prisma + PostgreSQL + Railway
- **Working features:** RSS polling, link extraction, velocity scoring (count of unique sources linking to same URL), digest builder
- **Email ingest:** `ingest@in.dailybunch.com` configured via Mailgun (ready for newsletter ingestion)
- **Spec docs in repo** (~100KB across 9 files): Architecture, AI Intelligence, Voice Guide, Schema Design, GEO Optimization, Implementation Plan, Quick Reference
- **Not yet built:** URL canonicalization, Claude AI integration, entity system, story clustering, trend detection, email parsing, Weekly Review generator

---

## Product 1: The Newsroom

`dailybunch.com/newsroom` — Password-protected. Desktop-only. Your private command center.

### What You See

**The Feed Wall**
All ingested content in a dense, scannable format. Every link the system has captured, organized by section, sortable by velocity, recency, source, or content type. Think of it as the wire service ticker — everything is here, unfiltered.

- Each item shows: title, source, velocity score, section, entities detected, timestamp, content type (article, video, podcast, tweet, etc.)
- Filter by: section, source, content type, date range, velocity threshold, entity/person
- Bulk actions: promote to public site, kill, tag, annotate

**Trending Entities**
A sidebar or top bar showing people, companies, and topics that are spiking across your sources. When 5+ independent sources mention Sabrina Carpenter in a 48-hour window, she surfaces here — even if the sources are linking to different articles about her. This is entity-level velocity, not just URL-level.

**Section Views**
Each section (Tech & AI, Culture & Entertainment, Sports, etc.) has its own filtered view showing the top stories, trending entities within that section, and source health (are all feeds in this section polling correctly?).

**Source Management**
Add, remove, configure, and monitor all sources:
- RSS feeds (URL, poll frequency, trust weight, section mapping)
- Email newsletters (which sender addresses map to which sections, parsing rules)
- Manual submissions
- Source health dashboard (last poll time, error rate, link yield)

**Content Detail View**
Click into any item to see:
- Full extracted metadata and AI enrichment (summary, tags, entities, cultural analysis)
- Which sources surfaced this link and when (provenance chain)
- Related/clustered stories
- Your annotations and ratings
- One-click actions: promote to public site, share, annotate, rate

**Output Controls**
Generate and manage outputs from the Newsroom:
- Daily rundown (auto-generated from top velocity items)
- Weekly review (Harper's-style synthesis)
- Custom exports and summaries
- Email delivery management

### What You Do Here

Your morning routine: Open the Newsroom, scan the Feed Wall and Trending sidebar, check each section, star/rate the things you've read or want to read, optionally promote or annotate items for the public site. Maybe 10-15 minutes. The rest of the day, the engine runs on its own.

---

## Product 2: Daily Bunch (Public)

`dailybunch.com` — Public. Mobile-friendly. The published product.

### What Visitors See

A clean, opinionated daily digest organized by sections. The editorial output of the Newsroom engine. It should feel like reading a sharp culture newsletter, not staring at an RSS reader.

**Daily Page**
- Organized by sections (your newspaper model)
- Top stories per section, ranked by velocity and AI curation score
- Trending people/entities callouts ("Everyone's talking about...")
- Embedded content where appropriate: X/Twitter posts, TikTok embeds, Instagram posts, YouTube videos
- Podcast highlights and popular episodes
- Source attribution on every item
- Light editorial voice (Daily Bunch tone: confident, economical, connective)

**Content Types Displayed:**
- Articles and news stories (linked, summarized)
- Embedded tweets/X posts
- Embedded TikToks and Instagram posts
- YouTube video embeds
- Podcast episode highlights
- Streaming/entertainment trending (Netflix, etc.)

**Automated Curation Logic:**
Most content graduates from Newsroom to public site automatically based on:
- Velocity threshold (minimum number of source mentions)
- Source trust weighting
- Section quotas (top N per section per day)
- Content type diversity (don't let one section be all articles — mix in video, social, etc.)

**Human Curation Layer:**
From the Newsroom, you can:
- Force-promote something that the algorithm wouldn't have surfaced
- Kill something that scored high but doesn't belong
- Add a one-line annotation or editorial note
- Pin a story to the top of a section

**Additional Outputs:**
- Weekly review email (subscribers)
- RSS feed of the public digest
- Shareable individual story/section links
- GEO-optimized pages (Schema.org markup for AI citability)

---

## The Engine: Core Systems

Both products are powered by the same back-end engine. Here's what it does:

### 1. Ingest Pipeline

Pulls content from multiple source types into one unified pipeline.

**Source Types:**

| Type | Method | Status |
|------|--------|--------|
| RSS/Atom feeds | HTTP polling on cron (every 15-30 min) | Working in V1, needs expansion |
| Email newsletters | Mailgun inbound at `ingest@in.dailybunch.com` → parse → extract | Infrastructure ready, parsing not built |
| Manual URL submission | API endpoint + Newsroom UI (paste a link) | Not built |
| Social embeds (X, TikTok, IG) | Embed display + metadata extraction | Not built (V2 goal for display) |

**Ingest Processing (every item, regardless of source):**
1. Receive raw content (RSS entry, email body, pasted URL)
2. Extract all URLs from content
3. Canonicalize each URL (strip tracking params, resolve redirects, deduplicate against existing records)
4. Fetch metadata for new URLs (title, author, publication, date, images, description, content type)
5. Classify content type (article, video, podcast, social post, streaming content)
6. Assign to section(s) based on source mapping and content rules
7. Calculate velocity score (how many independent sources linked to this URL)
8. Store with full provenance (which source, when, original context)
9. Queue for AI enrichment

### 2. Intelligence Layer (Claude API)

AI processing runs in tiers to manage cost:

**Layer 1 — Basic Enrichment (every item, use Haiku for cost efficiency):**
- Category/section confirmation
- Entity extraction (people, companies, topics)
- One-line summary
- Content type classification
- Sentiment/tone

**Layer 2 — Cultural Analysis (high-velocity items only, use Sonnet):**
- Why this matters / cultural significance
- Connection to broader trends
- Editorial commentary draft in Daily Bunch voice
- Suggested section placement and prominence

**Layer 3 — Synthesis (scheduled, batch processing):**
- Daily trend summary across all sections
- Weekly narrative synthesis (feeds the Harper's-style Weekly Review)
- Entity trend reports (who/what is rising or fading over time)
- Retrospective pattern detection (monthly/quarterly)

### 3. Scoring & Curation Engine

**Velocity Score:**
```
url_velocity = count of unique sources linking to canonical URL
entity_velocity = count of unique sources mentioning entity in time window
weighted_score = sum of (source_trust_weight) for each mention
```

**Auto-Curation Score (determines what graduates to public site):**
```
curation_score = (weighted_velocity × recency_decay) + section_relevance + content_type_bonus + manual_boost
```

Items above a configurable threshold per section automatically appear on the public Daily Bunch page.

### 4. Entity System

Entities are people, companies, topics, shows, albums — anything that appears across multiple stories.

- Extracted by Claude during Layer 1 enrichment
- Deduplicated and linked to a canonical entity record
- Tracked over time: entity_velocity = how many mentions in rolling 24h/48h/7d windows
- Powers the "Trending" callouts on both Newsroom and public site
- Example: "Sabrina Carpenter" appears in 8 sources across 3 sections in 48 hours → trending entity

### 5. Section System

Sections are configurable content buckets — the newspaper model.

**Section definition:**
- Name and slug
- Description
- Mapped source IDs (which feeds/newsletters contribute to this section)
- Keyword rules (include/exclude terms)
- Entity rules (always include stories mentioning certain entities)
- Display order and quota (max items per day on public site)
- Content type preferences (prioritize video in entertainment, articles in tech, etc.)

**Adding a new section** = filling out a form in the Newsroom: name it, pick sources, set keywords, done. It immediately backfills with matching content already in the system.

---

## Technical Decisions

| Decision | Choice | Notes |
|----------|--------|-------|
| Stack | Next.js + Prisma + PostgreSQL + Railway | No changes from V1 |
| AI | Anthropic Claude API (Haiku for L1, Sonnet for L2/L3) | No OpenAI |
| Email ingest | Mailgun inbound routing | Already configured |
| Auth | Simple password protection on /newsroom | Just you, no multi-user |
| Storage | Append-only — nothing gets deleted | Full historical record |
| Mobile | Public site only; Newsroom is desktop-only | Reduces front-end complexity |
| Social embeds | oEmbed API for X, TikTok, Instagram, YouTube | Display embedded content on public site |
| No-code tools | None | Everything custom-built |
| Standalone | No integration with Based/OS or Notion | Fully independent system |

---

## Build Phases

### Phase 1: Ingest Foundation
*The single most important phase. Everything else depends on this.*

- [ ] URL canonicalization engine (strip UTM/tracking params, resolve redirects, deduplicate)
- [ ] Email newsletter parsing pipeline (Mailgun webhook → extract links, text, metadata → strip tracking → store)
- [ ] Manual URL submission endpoint + basic Newsroom UI for pasting links
- [ ] Expanded RSS source management (add/remove/test from Newsroom, trust weights)
- [ ] Unified content storage (all source types normalize to one schema)
- [ ] Source health monitoring (last poll, error rate, link yield per source)
- [ ] Content type detection (article vs. video vs. podcast vs. social vs. streaming)

### Phase 2: Intelligence & Scoring
- [ ] Claude API integration — Layer 1 batch enrichment (Haiku)
- [ ] Entity extraction and deduplication system
- [ ] Velocity scoring v2 (entity-level, not just URL-level)
- [ ] Story clustering (group related articles into one story thread)
- [ ] Trend detection (entity velocity spikes over rolling windows)
- [ ] Auto-curation scoring (determines what graduates to public site)
- [ ] Claude Layer 2 enrichment for high-velocity items (Sonnet)

### Phase 3: The Newsroom
- [ ] Newsroom layout: Feed Wall, Trending sidebar, Section views
- [ ] Source management interface (full CRUD for feeds, email sources, trust weights)
- [ ] Section management (create/edit sections, map sources, set rules)
- [ ] Content detail view (metadata, provenance, related stories, annotations)
- [ ] Editor actions: promote, kill, annotate, rate, pin
- [ ] Filtering and sorting (by section, source, velocity, date, content type, entity)
- [ ] Password protection

### Phase 4: The Public Site
- [ ] Redesigned dailybunch.com organized by sections
- [ ] Auto-populated from curation engine with manual override capability
- [ ] Embedded social content (X posts, TikTok, Instagram, YouTube)
- [ ] Trending entities/people callouts
- [ ] Velocity indicators and source attribution
- [ ] Mobile-responsive design
- [ ] Daily Bunch editorial voice in AI-generated summaries
- [ ] GEO optimization (Schema.org, answer-shaped content)
- [ ] RSS feed output
- [ ] Weekly Review email generation and delivery (Harper's style)

---

## Cost Projection (Year 1 Steady State)

| Line Item | Monthly Cost |
|-----------|-------------|
| Railway compute (app + workers) | $10–20 |
| Railway PostgreSQL (growing to ~5-10GB) | $5–10 |
| Mailgun (inbound email, low volume) | $0–15 |
| Claude API (Haiku L1 + Sonnet L2/L3, 200-500 items/day) | $30–80 |
| Domain/misc | ~$1 |
| **Total** | **$50–120/month** |

Scales comfortably to 200-500 RSS feeds + 50 email newsletters at this budget. Claude API is the main variable — controlled by being selective about which items get Layer 2/3 treatment.

---

## The Daily Routine

1. **Morning (10-15 min):** Open the Newsroom. Scan the Feed Wall. Check Trending sidebar. Browse each section. Star things you've read. Promote anything the algorithm missed. Kill anything that doesn't belong. Add a quick note to anything worth annotating.

2. **The engine does the rest:** Auto-curates the public Daily Bunch page throughout the day. High-velocity items surface automatically. Your manual interventions from the morning are reflected.

3. **Weekly:** Review the auto-generated Weekly Review draft. Light edits. Send to your subscriber list.

4. **Ongoing:** Add new sources as you discover them. Tweak section rules as your interests evolve. The system gets better as more data flows through it.
