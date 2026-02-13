# Daily Bunch v2.0 — Roadmap

> From link velocity tracker to cultural signal intelligence platform.

**Full spec:** `spec/daily-bunch.allium` (2,488 lines, no open questions)

---

## The Vision

v1.0 answers: *"What are tastemakers linking to?"*
v2.0 answers: *"What are tastemakers collectively signaling about — across platforms, over time, and why does it matter?"*

Three big moves:
1. **Broaden inputs** — RSS + social + podcasts, unified under one signal model
2. **Deepen intelligence** — entity graphs, narrative arcs, cross-signal convergence
3. **Sharpen delivery** — watchlists, alerts, configurable briefings

---

## Key Decisions Already Made

These are locked in the spec. No need to re-debate:

- **Market signals: removed** — not in scope
- **Podcast signals: titles/descriptions only** — no audio transcription
- **Social accounts: manual discovery** — no auto-follow
- **Entity relationships: human-approved** — AI suggests, admin confirms
- **Alerts: diminishing priority** — repeated patterns decay (floor 0.2)
- **Briefings: admin-configured** — no per-user personalization
- **Digest sending: removed** — curation only
- **Arc beat types: fixed enum** — emergence, escalation, pivot, resolution, resurgence

---

## Implementation Phases

### Phase 1: Signal Unification
**What:** Unified `Signal` entity wrapping links, social posts, podcast episodes
**Why:** Everything downstream (entities, stories, arcs, alerts) needs a common signal layer
**Scope:**
- New schema: Signal, LinkSignal, SocialSignal, PodcastSignal, SignalEntity
- TrackedSocialAccount, TrackedPodcastFeed tables
- Social polling (X, Bluesky, Threads, Mastodon) with engagement threshold
- Podcast feed polling (titles/descriptions only)
- Signal analysis pipeline (entity extraction across types)

**Depends on:** Nothing — can start immediately
**Risk:** API access for social platforms varies; start with what's accessible

### Phase 2: Entity Graph
**What:** Relationships between entities (works_at, founded, competes_with, etc.)
**Why:** Makes entity intelligence meaningful — "Who is connected to what?"
**Scope:**
- EntityRelationship, EntityRelationshipSuggestion tables
- EntityProfile with cross-signal velocity
- AI inference of relationships from co-occurrence (confidence >= 0.8)
- Admin approval UI
- Entity graph visualization

**Depends on:** Phase 1 (cross-signal velocity needs unified signals)

### Phase 3: Narrative Arcs
**What:** Track how stories evolve over time with classified beats
**Why:** Transforms clustering from static snapshots to living narratives
**Scope:**
- NarrativeArc, ArcBeat tables
- Beat classification (emergence → escalation → pivot → resolution → resurgence)
- Arc status lifecycle (developing → climax → resolving → dormant)
- 72-hour dormancy detection
- Arc visualization UI

**Depends on:** Existing story clustering (already built)

### Phase 4: Alerts & Watchlists
**What:** Watch entities/categories/domains, get alerted on velocity spikes or convergence
**Why:** Moves platform from "check the dashboard" to "we'll tell you"
**Scope:**
- Channel (Slack, email, webhook), Watchlist, WatchlistItem tables
- AlertRule, Alert, AlertPatternHistory tables
- Diminishing priority decay (0.8^occurrence, floor 0.2)
- Cooldown + daily limits
- Multi-channel delivery

**Depends on:** Phase 1 (convergence triggers need unified signals)

### Phase 5: Briefings
**What:** Admin-configurable daily intelligence briefings
**Why:** Structured output that replaces manual curation
**Scope:**
- BriefingConfig, Briefing tables
- Template sections: top_signals, rising_entities, convergences, arc_updates, contrarian_take
- Voice prompt + prose length (short/medium/long)
- Scheduled generation with timezone support
- Multi-channel delivery

**Depends on:** Phases 1-4 (needs all signal types + convergence + arcs for full briefings)

### Phase 6: Cross-Signal Convergence
**What:** Detect when same entity appears across 2+ signal types within 48 hours
**Why:** Cross-platform signals are the highest-confidence indicator
**Scope:**
- SignalConvergence table
- Significance scoring (high/medium/low)
- Synthesis explanations
- Convergence view UI

**Depends on:** Phase 1 (needs multiple signal types)

---

## Build-on-Top vs. Fresh Start

### Arguments for Building On
- v1.0 core is solid: ingestion, enrichment, analysis, scoring, clustering all work
- Prisma schema is extensible — add tables without breaking existing ones
- ~40 RSS sources already configured with trust/tier data
- Entity corpus already exists with velocity history
- Design system is established and distinctive

### Arguments for Fresh Start
- Next.js 16 App Router patterns may have evolved
- Could adopt stricter patterns from day one (migrations, auth, monitoring)
- Signal unification is a fundamental architectural shift
- Opportunity to shed technical debt (backwards compat wrappers, mixed AI providers)

### Recommendation
**Build on top for data layer. Consider fresh start for UI layer.**

The database, ingestion pipeline, and AI services are production-proven. The schema additions for v2.0 (signals, arcs, alerts) are additive — they don't break existing tables. Starting fresh would mean re-building working infrastructure.

The frontend, however, could benefit from a clean pass: server components patterns, proper auth from the start, component library discipline.

---

## What's NOT in v2.0

Per spec decisions:
- No market signals (stocks, crypto)
- No audio transcription
- No social auto-discovery
- No per-user personalization
- No digest email sending
- No open registration (admin-only)

---

## 44 Deferred Specs

The spec marks 44 implementation details as deferred — these are the "how" behind the "what." Key ones to resolve early:

| Area | Deferred Specs | Notes |
|------|---------------|-------|
| Canonicalization | URL resolution, caching | Already built in v1 — just formalize |
| Enrichment | Pipeline orchestration, blocked title detection | Already built in v1 |
| Scoring | Weighted velocity, ranking algorithm | Already built in v1 |
| Embeddings | Vector generation, clustering algorithm | Already built in v1 |
| Entity extraction | From signals (not just links) | Extend existing Gemini pipeline |
| Relationship inference | Type + confidence + reasoning | New Claude call |
| Arc analysis | Beat classification, prediction | New Claude call |
| Convergence | Synthesis, significance | New Claude call |
| Briefing writing | Prose generation, formatting | New Claude call |

Many deferred specs map to things already built in v1. The spec was written to describe the full system — including parts that are already working.

---

## Next Session Checklist

When you pick this back up:
1. Read `spec/daily-bunch.allium` for authoritative behavior
2. Read `V1_SNAPSHOT.md` for what's currently built
3. Decide: build on top or fresh start (recommendation: hybrid)
4. If building on top: start with Phase 1 (Signal Unification) or Phase 3 (Narrative Arcs — no new deps)
5. If starting fresh: scaffold new project, migrate Prisma schema, port lib/ utilities
