# CLAUDE.md - Daily Bunch

## Project Overview

Daily Bunch is a cultural signal intelligence platform that surfaces what's traveling across the curated web. It answers: *"What are tastemakers collectively pointing at right now?"*

**Live at:** [dailybunch.com](https://dailybunch.com)

## Tech Stack

- **Framework**: Next.js 16 (App Router, Server Components)
- **Database**: PostgreSQL via Prisma
- **Hosting**: Railway
- **Email**: Resend
- **AI (Analysis)**: Google Gemini Flash (categorization, entity extraction, summaries)
- **AI (Cultural/Narratives)**: Anthropic Claude Sonnet (cultural analysis, story narratives)
- **AI (Embeddings)**: Gemini text-embedding-004
- **Enrichment**: Mercury, Jina Reader, Firecrawl (multi-tier pipeline)
- **Styling**: Tailwind CSS v4

## Commands

```bash
npm run dev          # Development server
npm run build        # Build for production
npm run db:push      # Push schema to database
npm run db:seed      # Seed database
npm run db:studio    # Open Prisma Studio
```

## Key Directories

```
src/app/           # Next.js App Router pages
src/app/api/       # API routes
src/components/    # React components
src/lib/           # Utilities (db, rss, canonicalize, etc.)
prisma/            # Database schema and migrations
spec/              # Allium behavioral specification (v2.0 source of truth)
archive/           # Superseded docs (original PRD, session notes, build checklists)
```

## Key Documents

- `V1_SNAPSHOT.md` — what's currently built and live
- `V2_ROADMAP.md` — where v2.0 goes, phased implementation plan
- `spec/daily-bunch.allium` — authoritative behavioral spec (2,488 lines)
- `CHANGELOG.md` — release history

## Behavioral Spec

`spec/daily-bunch.allium` is the single source of truth for what the platform should do. Read it before implementing new features or making architectural decisions. It defines entities, rules, surfaces (UI contracts), and deferred specs for areas not yet fully specified.

## Frontend Aesthetics

<frontend_aesthetics>
You tend to converge toward generic, "on distribution" outputs. In frontend design, this creates what users call the "AI slop" aesthetic. Avoid this: make creative, distinctive frontends that surprise and delight. Focus on:

Typography: Choose fonts that are beautiful, unique, and interesting. Avoid generic fonts like Arial and Inter; opt instead for distinctive choices that elevate the frontend's aesthetics.

Color & Theme: Commit to a cohesive aesthetic. Use CSS variables for consistency. Dominant colors with sharp accents outperform timid, evenly-distributed palettes. Draw from IDE themes and cultural aesthetics for inspiration.

Motion: Use animations for effects and micro-interactions. Prioritize CSS-only solutions for HTML. Use Motion library for React when available. Focus on high-impact moments: one well-orchestrated page load with staggered reveals (animation-delay) creates more delight than scattered micro-interactions.

Backgrounds: Create atmosphere and depth rather than defaulting to solid colors. Layer CSS gradients, use geometric patterns, or add contextual effects that match the overall aesthetic.

Avoid generic AI-generated aesthetics:
- Overused font families (Inter, Roboto, Arial, system fonts)
- Clichéd color schemes (particularly purple gradients on white backgrounds)
- Predictable layouts and component patterns
- Cookie-cutter design that lacks context-specific character

Interpret creatively and make unexpected choices that feel genuinely designed for the context. Vary between light and dark themes, different fonts, different aesthetics. You still tend to converge on common choices (Space Grotesk, for example) across generations. Avoid this: it is critical that you think outside the box!
</frontend_aesthetics>

## Deployment Rules

**CRITICAL: Always push to production after completing work.**

1. After finishing any feature/fix, run `npm run build` to verify
2. Commit with descriptive message and push to `main`
3. Railway auto-deploys from main - no manual deploy needed
4. Don't accumulate multiple features without pushing
5. Never commit credentials or secrets (they're in `.gitignore`)

```bash
# Standard deploy flow
npm run build && git add -A && git commit -m "feat: description" && git push origin main
```

## Data Flow

1. **Ingest**: RSS feeds polled on schedule, links extracted
2. **Canonicalize**: Tracking wrappers unwrapped, URLs normalized
3. **Enrich**: Multi-tier title extraction (Mercury → Jina → Firecrawl → AI → URL path)
4. **Analyze**: Gemini categorizes, extracts entities, generates summaries
5. **Embed & Cluster**: Gemini embeddings → cosine similarity → story groups
6. **Score**: Velocity = distinct sources linking to same article, weighted by recency
7. **Cultural**: Claude Sonnet deep-analyzes high-velocity links (v >= 3)
8. **Surface**: Dashboard shows velocity-ranked stories and links with filters
