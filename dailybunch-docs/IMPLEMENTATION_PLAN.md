# IMPLEMENTATION_PLAN.md - Phased Rollout

## Overview

This document outlines the implementation plan for Daily Bunch 2.0. The work is organized into 4 phases over 4-6 weeks, with each phase building on the previous.

**Guiding Principles:**
1. Ship incrementally - each phase delivers working features
2. Don't break existing functionality
3. Migrate data carefully
4. Test canonicalization extensively (it's critical)

---

## Phase 1: Foundation (Week 1)

**Goal:** Establish core infrastructure for the upgrade

### 1.1 URL Canonicalization Service

**Priority: CRITICAL** - This is the foundation of accurate velocity scoring.

**Tasks:**
- [ ] Create `/src/lib/canonicalization/` module
- [ ] Implement redirect resolution (follow up to 5 hops)
- [ ] Build tracking parameter stripper (see list in ARCHITECTURE.md)
- [ ] Add known redirect pattern matcher (Substack, Beehiiv, bit.ly, etc.)
- [ ] Implement URL normalization (protocol, www, trailing slash)
- [ ] Add Redis caching layer for resolved URLs
- [ ] Write comprehensive test suite (50+ test cases minimum)
- [ ] Backfill: Re-canonicalize all existing links

**Test Cases to Include:**
```typescript
// Must handle all of these correctly
const testCases = [
  // Substack redirects
  'https://email.mg2.substack.com/c/xxx',
  'https://substack.com/redirect/xxx',
  
  // Beehiiv
  'https://link.mail.beehiiv.com/xxx',
  
  // ConvertKit
  'https://click.convertkit-mail.com/xxx',
  
  // URL shorteners
  'https://bit.ly/xxx',
  'https://t.co/xxx',
  
  // UTM parameters
  'https://example.com/article?utm_source=newsletter&utm_medium=email',
  
  // Trailing slashes
  'https://example.com/article/',
  'https://example.com/article',
  
  // Protocol variants
  'http://example.com/article',
  'https://example.com/article',
  
  // www variants
  'https://www.example.com/article',
  'https://example.com/article',
];
```

### 1.2 Source Trust Scores

**Tasks:**
- [ ] Add `trustScore` and `tier` fields to Source model
- [ ] Run migration
- [ ] Create admin UI for setting trust scores
- [ ] Assign initial scores to existing sources
- [ ] Update velocity calculation to weight by trust

**Initial Tier Assignments:**
```
TIER_1 (10): NYT, WSJ, The Atlantic, New Yorker
TIER_2 (7): Stratechery, Not Boring, Lenny's Newsletter, The Hustle
TIER_3 (5): Most quality Substacks and blogs
TIER_4 (2): Aggregators, link roundups, automated feeds
```

### 1.3 Schema.org Markup

**Tasks:**
- [ ] Create `SchemaOrg` component for link pages
- [ ] Add Organization schema to layout
- [ ] Add Article schema to weekly summary pages (when created)
- [ ] Validate with Google's Rich Results Test
- [ ] Add to existing link detail pages

### 1.4 Voice Guide Integration

**Tasks:**
- [ ] Create `/src/lib/ai/prompts/` directory
- [ ] Move all prompts to template files
- [ ] Include voice guide in all content-generation prompts
- [ ] Update existing AI analysis to use new prompts

**Deliverables:**
- Canonicalization working with test coverage
- Trust scores assignable in admin
- Schema markup on all link pages
- Prompts centralized and voice-guided

---

## Phase 2: Intelligence Layer (Week 2)

**Goal:** Add Claude-powered cultural analysis

### 2.1 Switch to Anthropic Claude

**Tasks:**
- [ ] Add `ANTHROPIC_API_KEY` to environment
- [ ] Create Claude client wrapper in `/src/lib/ai/claude.ts`
- [ ] Implement retry logic with exponential backoff
- [ ] Add rate limiting (respect API limits)
- [ ] Create batch processing utility

### 2.2 Layer 1: Basic Enrichment

**Tasks:**
- [ ] Update enrichment prompt (from AI_INTELLIGENCE.md)
- [ ] Implement batch processing (10-20 links per call)
- [ ] Store results in Link model
- [ ] Create queue for pending enrichment
- [ ] Add admin trigger for manual enrichment

### 2.3 Layer 2: Cultural Analysis

**Tasks:**
- [ ] Create cultural analysis prompt
- [ ] Implement trigger: run when velocity >= 3
- [ ] Add new fields to Link model (whyNow, tension, thread, etc.)
- [ ] Store analysis results
- [ ] Display on link detail page

### 2.4 Commentary Engine

**Tasks:**
- [ ] Implement context gathering function
- [ ] Create commentary prompt with personas
- [ ] Generate commentary for high-velocity links
- [ ] Add "Why It's Trending" section to link pages
- [ ] Cache commentary (regenerate if context changes significantly)

### 2.5 Embedding Generation

**Tasks:**
- [ ] Set up sentence-transformers (all-MiniLM-L6-v2)
- [ ] Create embedding pipeline
- [ ] Store embeddings in Link model (Float array)
- [ ] Backfill embeddings for existing links
- [ ] Create similarity search utility

**Deliverables:**
- Claude integration working
- All new links get enriched automatically
- High-velocity links get cultural analysis
- Link pages show "Why It's Trending"
- Embeddings stored for all links

---

## Phase 3: The Taste Graph (Week 3)

**Goal:** Build entity tracking and story clustering

### 3.1 Entity System

**Tasks:**
- [ ] Create Entity and LinkEntity models
- [ ] Run migration
- [ ] Extract entities from existing links (backfill)
- [ ] Create entity resolution logic (merge similar entities)
- [ ] Track entity velocity (weekly/monthly counts)
- [ ] Create entity detail pages (/entities/[slug])

### 3.2 Story Clustering

**Tasks:**
- [ ] Set up FAISS index for embeddings
- [ ] Implement clustering algorithm:
  - Find similar links by embedding
  - Check for shared entities
  - Assign to existing story or create new
- [ ] Create Story model
- [ ] Build story assignment pipeline
- [ ] Create story detail pages (/stories/[id])

### 3.3 Trend Detection

**Tasks:**
- [ ] Implement "Rising" detection (compare windows)
- [ ] Implement "Hidden Gems" detection (high trust, low velocity)
- [ ] Add trend indicators to dashboard
- [ ] Create "Rising" section on homepage
- [ ] Create "Hidden Gems" section

### 3.4 Source Taste Clustering

**Tasks:**
- [ ] Implement source overlap calculation
- [ ] Cluster sources by shared links
- [ ] Store cluster assignments
- [ ] Display on source admin page
- [ ] (Optional) "Sources like X" recommendations

**Deliverables:**
- Entity pages live
- Stories automatically clustered
- Rising/Hidden Gems visible
- Source taste clusters computed

---

## Phase 4: GEO & Polish (Week 4)

**Goal:** Optimize for AI citation and polish UX

### 4.1 Answer-Shaped Content

**Tasks:**
- [ ] Create weekly summary page template
- [ ] Implement auto-generation of weekly summaries
- [ ] Structure with citable statistics
- [ ] Add to sitemap
- [ ] Schedule generation (every Monday)

### 4.2 Link Page Optimization

**Tasks:**
- [ ] Redesign link detail page with "At a Glance"
- [ ] Add citable statistics section
- [ ] Add related stories section
- [ ] Add entity links
- [ ] Improve Schema markup

### 4.3 RSS Feed Enhancement

**Tasks:**
- [ ] Update RSS feed with structured descriptions
- [ ] Include velocity in item descriptions
- [ ] Add category tags
- [ ] Validate feed format

### 4.4 Digest Generation

**Tasks:**
- [ ] Implement digest context gathering
- [ ] Create digest generation prompt
- [ ] Build digest preview UI
- [ ] Add editorial editing interface
- [ ] Test email delivery

### 4.5 API Endpoints (Optional)

**Tasks:**
- [ ] Create public API routes
- [ ] `GET /api/trends` - trending links
- [ ] `GET /api/entities/[id]/velocity` - entity stats
- [ ] Rate limiting
- [ ] Documentation

**Deliverables:**
- Weekly summary pages auto-generated
- Link pages fully optimized
- RSS feed enhanced
- Digest generation working
- (Optional) Public API live

---

## Testing Checklist

### Unit Tests
- [ ] Canonicalization (extensive)
- [ ] Scoring calculation
- [ ] Trend detection
- [ ] Entity extraction

### Integration Tests
- [ ] RSS polling → link creation → mention recording
- [ ] AI enrichment pipeline
- [ ] Story clustering
- [ ] Digest generation

### Manual QA
- [ ] Test with 10 different newsletter redirect formats
- [ ] Verify velocity counts match manual count
- [ ] Check Schema markup with Google tool
- [ ] Test digest email rendering
- [ ] Review AI-generated commentary quality

---

## Rollback Plan

Each phase should be independently reversible:

**Phase 1 Rollback:**
- Canonicalization: Keep old URLs in `originalUrls` array
- Trust scores: Default to weight 5 for all sources

**Phase 2 Rollback:**
- Keep Gemini as fallback if Claude fails
- New fields are nullable, old code still works

**Phase 3 Rollback:**
- Entity/Story relations are additive
- Dashboard works without them

**Phase 4 Rollback:**
- New pages are additive
- Existing functionality unchanged

---

## Success Metrics

### Week 1
- Canonicalization test suite passing
- 0 duplicate links from redirect variations
- Schema markup valid on 100% of link pages

### Week 2
- AI enrichment completing in < 5 min for batch of 50
- Cultural analysis generating for all links with velocity >= 3
- Commentary quality reviewed and approved

### Week 3
- Entity pages for top 20 entities
- At least 10 stories auto-clustered
- Rising section showing relevant links

### Week 4
- First weekly summary published
- One digest sent successfully
- AI search test: Daily Bunch appears for relevant queries

---

## Resource Requirements

### APIs
- Anthropic Claude API (Sonnet tier)
- Existing: Firecrawl, Resend

### Infrastructure
- Redis (for queue + caching) - Add to Railway
- Consider: Separate worker process for queue

### Monitoring
- Set up error tracking (Sentry or similar)
- Add API usage tracking for cost monitoring

---

## Getting Started

1. **Review all documentation files** in order:
   - CLAUDE.md (overview)
   - ARCHITECTURE.md (system design)
   - AI_INTELLIGENCE.md (prompts and AI logic)
   - VOICE_GUIDE.md (editorial voice)
   - SCHEMA_DESIGN.md (database changes)
   - GEO_OPTIMIZATION.md (AI citability)

2. **Start with Phase 1.1**: URL Canonicalization
   - This is the critical foundation
   - Don't proceed until tests are passing

3. **Commit frequently** with descriptive messages
   - Each task should be its own commit
   - Makes rollback easier

4. **Ask questions** if anything is unclear
   - The documentation is comprehensive but not exhaustive
   - Better to clarify than assume

---

## Notes for Claude Code

When working on this project:

1. **Read the voice guide** before writing any user-facing text
2. **Test canonicalization extensively** - this is the most critical component
3. **Use TypeScript strictly** - no `any` types, full type coverage
4. **Batch AI calls** - never call Claude API in a loop for individual items
5. **Cache aggressively** - URL resolution, embeddings, computed scores
6. **Log everything** - especially during development, for debugging
7. **Keep the existing app working** - all changes should be additive until ready to switch

### Coding Style

```typescript
// Prefer explicit types
interface LinkWithMentions extends Link {
  mentions: (Mention & { source: Source })[];
}

// Use Zod for runtime validation of AI responses
const EnrichmentSchema = z.object({
  title: z.string(),
  summary: z.string(),
  categories: z.array(z.string()),
  // ...
});

// Prefer async/await over .then()
const result = await prisma.link.findMany({
  where: { velocity: { gte: 3 } },
  include: { mentions: { include: { source: true } } }
});

// Use early returns for clarity
if (!link.canonicalUrl) {
  return { error: 'Missing canonical URL' };
}
```

### File Organization

```
/src
  /app                    # Next.js app router
    /api                  # API routes
    /links/[id]           # Link detail pages
    /entities/[slug]      # Entity pages (new)
    /stories/[id]         # Story pages (new)
    /weekly/[date]        # Weekly summaries (new)
    
  /lib
    /ai                   # AI integration
      /claude.ts          # Claude client
      /prompts/           # Prompt templates
      /enrichment.ts      # Layer 1 enrichment
      /analysis.ts        # Layer 2 cultural analysis
      /commentary.ts      # Commentary generation
      /embeddings.ts      # Vector embeddings
      
    /canonicalization     # URL processing
      /index.ts           # Main canonicalizer
      /patterns.ts        # Known redirect patterns
      /params.ts          # Tracking params to strip
      /cache.ts           # Redis caching
      
    /scoring              # Velocity & scoring
      /velocity.ts        # Basic velocity calc
      /weighted.ts        # Trust-weighted scoring
      /trends.ts          # Rising/falling detection
      
    /clustering           # Story clustering
      /embeddings.ts      # FAISS integration
      /stories.ts         # Story assignment
      /entities.ts        # Entity extraction
      
    /queue                # Job processing
      /index.ts           # Queue setup
      /workers/           # Worker implementations
      
  /components
    /schema               # Schema.org components
    /links                # Link-related components
    /dashboard            # Dashboard components
```

### Environment Setup

Make sure these are configured before starting:

```bash
# Required
DATABASE_URL=postgresql://...
ANTHROPIC_API_KEY=sk-ant-...
FIRECRAWL_API_KEY=...
RESEND_API_KEY=...

# Add for Phase 1
REDIS_URL=redis://...

# Optional (for monitoring)
SENTRY_DSN=...
```

### Quick Wins

If you want early momentum, these can be done quickly:

1. **Add Schema.org markup** - Just a component, no backend changes
2. **Add trust scores to admin** - Simple form field addition
3. **Voice-ify existing prompts** - Update prompt text only
4. **Add "first seen" to link pages** - Already have the data

### Potential Blockers

Watch out for:

1. **Redirect loops** - Some URLs redirect in circles; implement max hop limit
2. **Rate limits** - Claude API has limits; implement backoff
3. **Large embeddings** - 384-dim floats per link; monitor DB size
4. **FAISS complexity** - May need to run in separate process at scale

---

## Appendix: Example Prompts

### Enrichment Prompt (Layer 1)
See AI_INTELLIGENCE.md section "Layer 1: Factual Extraction"

### Cultural Analysis Prompt (Layer 2)
See AI_INTELLIGENCE.md section "Layer 2: Cultural Positioning"

### Digest Generation Prompt
See AI_INTELLIGENCE.md section "The Digest Writer Agent"

### Commentary Prompt
See AI_INTELLIGENCE.md section "The Commentary Engine"

All prompts should include the voice guide excerpt from VOICE_GUIDE.md.
