# Changelog

All notable changes to Daily Bunch are documented in this file.

## [1.0.0] - 2026-01-30

### Overview
First major release of Daily Bunch, a cultural signal intelligence platform that surfaces what tastemakers are collectively pointing at across the curated web.

### Added

#### Two-View Architecture
- **Latest** (`/links`) - Chronological view of all links, newest first
- **Trending** (`/dashboard`) - Velocity-ranked view showing what multiple sources are linking to

#### Intelligent Link Processing
- URL canonicalization (unwraps Mailchimp, Substack, bit.ly tracking URLs)
- Smart deduplication across different wrapped URLs
- Title cleaning (strips publication suffixes like `| NYTimes`)
- HTML entity decoding (`&raquo;`, `&laquo;`, etc.)
- Blocked content detection (auto-hides robot pages, paywalls, 404s)

#### Source Management
- RSS feed configuration with one-click add
- **Fetch Now** button for manual single-source fetching
- **Include Own Links** toggle per source
- **Show on Dashboard** toggle for trending calculations
- **Internal Domains** configuration for self-referential link filtering
- Error tracking with consecutive failure counts

#### Velocity Scoring
- Count distinct sources (not mentions) for accurate velocity
- Weighted velocity: recent mentions weighted higher
  - 24h = 1.0 weight
  - 48h = 0.7 weight
  - 72h = 0.4 weight
  - Older = 0.2 weight
- Trending threshold: velocity ≥ 2 AND weighted velocity ≥ 1.5

#### Mobile-Responsive Design
- Collapsible filter sidebar with slide-over drawer on mobile
- Responsive typography (smaller on mobile)
- Responsive spacing and padding
- Touch-friendly controls

#### Admin Tools
- Sources management with bulk operations
- Entities management with suggestion review
- Blacklist management for domains and URLs
- Manual triggers for RSS polling, enrichment, and AI analysis

#### AI Integration
- Anthropic Claude for summaries and categorization
- Automatic entity extraction (people, organizations, products)
- Category and subcategory assignment

### Technical

#### Database Schema
- Link model with blocked content tracking (`isBlocked`, `blockedReason`)
- Source model with internal domains (`internalDomains` array)
- Optimized velocity queries using raw SQL
- Proper indexing for performance

#### API Endpoints
- `POST /api/admin/sources/[id]/fetch` - Single source fetch
- `POST /api/admin/blacklist` - Add to blacklist
- `DELETE /api/admin/blacklist/[id]` - Remove from blacklist
- All existing cron endpoints for polling, enrichment, and analysis

#### Performance
- Raw SQL queries for velocity calculations (~10ms at DB level)
- Parallel data fetching with Promise.all
- Batch entity lookups to reduce N+1 queries

### Changed
- Simplified navigation: Latest | Trending | Admin
- Removed sidebar filters from main views for cleaner layout
- Velocity now counts distinct sources, not total mentions

### Fixed
- Publication suffixes now properly stripped from titles
- HTML entities (`&raquo;`, `&laquo;`) decoded correctly
- Internal domain filtering works with source's `baseDomain` and `internalDomains`
- Mobile layout no longer causes horizontal overflow

---

## [0.x.x] - Pre-release Development

Initial development phase including:
- Core RSS ingestion pipeline
- Basic link management
- Digest creation workflow
- Initial admin interface
