# Daily Bunch 2.0 - Development Documentation

## Quick Start

Copy this entire folder into your Daily Bunch project root (alongside `src/`, `prisma/`, etc.).

Then tell Claude Code:

```
Read all the .md files in the dailybunch-docs folder, starting with CLAUDE.md. 
This is the specification for upgrading Daily Bunch. 
Let's start with Phase 1.1: URL Canonicalization.
```

## Documentation Files

| File | Purpose | Read When |
|------|---------|-----------|
| **CLAUDE.md** | Project overview, current state, quick reference | First - always |
| **ARCHITECTURE.md** | System design, data flow, component details | Planning infrastructure |
| **AI_INTELLIGENCE.md** | Claude prompts, analysis layers, batch processing | Implementing AI features |
| **VOICE_GUIDE.md** | Editorial voice, style rules, examples | Writing any user-facing text |
| **SCHEMA_DESIGN.md** | Database schema, migrations, indexes | Changing data model |
| **GEO_OPTIMIZATION.md** | Schema.org, answer-shaped content, AI citability | Building public pages |
| **IMPLEMENTATION_PLAN.md** | Phased tasks, testing, success metrics | Planning work |

## The Big Picture

**What we're building:** A cultural signal intelligence platform that surfaces what tastemakers are collectively pointing at.

**Why it's different:** 
1. We don't just aggregate—we analyze (Claude-powered commentary)
2. We structure for AI citation (GEO optimization)
3. We build a taste graph (entities, stories, source relationships)

**The metric that matters:** Velocity = how many independent sources linked to the same URL.

## Implementation Order

```
Phase 1 (Week 1): Foundation
├── URL Canonicalization [CRITICAL]
├── Source Trust Scores
├── Schema.org Markup
└── Voice Guide Integration

Phase 2 (Week 2): Intelligence
├── Claude Integration
├── Layer 1: Basic Enrichment
├── Layer 2: Cultural Analysis
├── Commentary Engine
└── Embedding Generation

Phase 3 (Week 3): Taste Graph
├── Entity System
├── Story Clustering
├── Trend Detection
└── Source Taste Clustering

Phase 4 (Week 4): GEO & Polish
├── Weekly Summary Pages
├── Link Page Optimization
├── RSS Enhancement
├── Digest Generation
└── (Optional) Public API
```

## Critical Concepts

### Canonicalization
The same NYT article might be linked via 15 different tracking URLs. They must all resolve to ONE canonical URL for accurate velocity counting.

### Velocity Scoring
```
velocity = count of unique sources linking to canonical URL
weighted_score = sum of (source_trust_weight) for each mention
```

### The Voice
Daily Bunch has a distinctive voice: confident, economical, connective, time-aware. See VOICE_GUIDE.md for details and examples.

### GEO (Generative Engine Optimization)
Structure content so AI systems (ChatGPT, Claude, Perplexity) can parse and cite it. Include statistics, use Schema.org, create answer-shaped content.

## Files to Create in the Codebase

```
/src/lib/canonicalization/    # URL processing
/src/lib/ai/claude.ts         # Claude client
/src/lib/ai/prompts/          # Prompt templates
/src/lib/scoring/             # Velocity calculations
/src/lib/clustering/          # Story grouping
/src/components/schema/       # Schema.org components
```

## Questions?

If anything is unclear:
1. Re-read the relevant documentation file
2. Check the examples in each file
3. Ask for clarification before implementing

Better to clarify than to build the wrong thing.
