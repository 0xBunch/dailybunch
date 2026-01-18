# CLAUDE.md - Daily Bunch

## Project Overview

Daily Bunch is a cultural signal intelligence platform that surfaces what's traveling across the curated web. It answers: *"What are tastemakers collectively pointing at right now?"*

**Live at:** [dailybunch.com](https://dailybunch.com)

## Tech Stack

- **Framework**: Next.js 16 (App Router, Server Components)
- **Database**: PostgreSQL via Prisma
- **Hosting**: Railway
- **Email**: Resend
- **AI**: Anthropic Claude
- **Link Unwrapping**: Firecrawl
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
```

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

## Data Flow

1. **Ingest**: RSS feeds polled on schedule, links extracted
2. **Canonicalize**: Tracking wrappers unwrapped, URLs normalized
3. **Score**: Velocity = how many sources linked to same article
4. **Curate**: Dashboard shows velocity-ranked links with filters
5. **Publish**: One-click digest via email
