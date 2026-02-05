# SCHEMA_DESIGN.md - Database Schema Evolution

## Overview

This document describes the target database schema for Daily Bunch 2.0. It evolves the current schema to support:
- Source trust scores and taste clustering
- Story grouping and cross-link intelligence
- Entity tracking and velocity
- GEO-optimized content storage

---

## Current Schema (Simplified)

```prisma
model Source {
  id              String       @id @default(cuid())
  name            String
  url             String
  includeOwnLinks Boolean      @default(false)
  showOnDashboard Boolean      @default(true)
  lastPollAt      DateTime?
  consecutiveFails Int         @default(0)
  items           SourceItem[]
}

model SourceItem {
  id        String   @id @default(cuid())
  sourceId  String
  source    Source   @relation(fields: [sourceId], references: [id])
  url       String
  title     String?
  content   String?
  publishedAt DateTime?
  createdAt DateTime @default(now())
}

model Link {
  id           String    @id @default(cuid())
  url          String    @unique
  title        String?
  summary      String?
  categories   String[]
  createdAt    DateTime  @default(now())
  mentions     Mention[]
}

model Mention {
  id           String   @id @default(cuid())
  linkId       String
  link         Link     @relation(fields: [linkId], references: [id])
  sourceId     String
  createdAt    DateTime @default(now())
}
```

---

## Target Schema

### Sources & Trust

```prisma
model Source {
  id               String       @id @default(cuid())
  name             String
  url              String       @unique
  type             SourceType   @default(RSS)
  
  // Trust & Quality
  trustScore       Int          @default(5)  // 1-10 scale
  tier             SourceTier   @default(TIER_3)
  
  // Configuration
  includeOwnLinks  Boolean      @default(false)
  showOnDashboard  Boolean      @default(true)
  pollFrequency    Int          @default(60)  // minutes
  
  // Health tracking
  lastPollAt       DateTime?
  lastSuccessAt    DateTime?
  consecutiveFails Int          @default(0)
  lastError        String?
  status           SourceStatus @default(ACTIVE)
  
  // Metadata
  description      String?
  website          String?
  
  createdAt        DateTime     @default(now())
  updatedAt        DateTime     @updatedAt
  
  items            SourceItem[]
  mentions         Mention[]
  
  // Taste clustering (computed)
  clusterId        String?
  cluster          SourceCluster? @relation(fields: [clusterId], references: [id])
}

enum SourceType {
  RSS
  EMAIL
  YOUTUBE
  MANUAL
}

enum SourceTier {
  TIER_1  // weight 10: Major publications
  TIER_2  // weight 7: Top newsletters
  TIER_3  // weight 5: Quality blogs
  TIER_4  // weight 2: Aggregators
}

enum SourceStatus {
  ACTIVE
  DEGRADED
  DISABLED
  PAUSED
}

// Taste clustering - sources that link to similar content
model SourceCluster {
  id          String   @id @default(cuid())
  name        String?  // Auto-generated or manual
  sources     Source[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

### Links & Canonicalization

```prisma
model Link {
  id             String    @id @default(cuid())
  
  // URLs
  canonicalUrl   String    @unique  // Normalized, deduplicated
  originalUrls   String[]  // All original URLs that resolved to this
  
  // Basic metadata
  title          String?
  summary        String?
  imageUrl       String?
  domain         String?   // Extracted from canonical URL
  
  // AI enrichment (Layer 1)
  categories     String[]
  contentType    ContentType?
  readTimeMinutes Int?
  
  // AI analysis (Layer 2) - nullable, populated for high-velocity links
  whyNow         String?
  tension        String?
  thread         String?
  prediction     Prediction?
  contrarian     String?
  
  // Embeddings (for similarity/clustering)
  embedding      Float[]?  // 384-dim vector
  
  // Scoring
  velocity       Int       @default(0)  // Cached count of mentions
  weightedScore  Float     @default(0)  // Trust-weighted score
  peakVelocity   Int       @default(0)
  
  // Timestamps
  firstSeenAt    DateTime  @default(now())
  lastMentionAt  DateTime?
  peakAt         DateTime?
  
  // Relations
  mentions       Mention[]
  entities       LinkEntity[]
  
  // Story clustering
  storyId        String?
  story          Story?    @relation(fields: [storyId], references: [id])
  
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
  
  // GEO: Flag for pages that should be indexed
  isPublished    Boolean   @default(true)
  
  @@index([velocity])
  @@index([firstSeenAt])
  @@index([storyId])
}

enum ContentType {
  NEWS
  OPINION
  ANALYSIS
  ANNOUNCEMENT
  GUIDE
  INTERVIEW
  REVIEW
  OTHER
}

enum Prediction {
  GROWING
  PEAKING
  FADING
}
```

### Mentions

```prisma
model Mention {
  id           String    @id @default(cuid())
  
  linkId       String
  link         Link      @relation(fields: [linkId], references: [id], onDelete: Cascade)
  
  sourceId     String
  source       Source    @relation(fields: [sourceId], references: [id])
  
  sourceItemId String?   // Which specific item contained this link
  sourceItem   SourceItem? @relation(fields: [sourceItemId], references: [id])
  
  // Context
  originalUrl  String    // URL as it appeared (before canonicalization)
  context      String?   // Surrounding text snippet
  position     Int?      // Position in source item (for ordering)
  
  mentionedAt  DateTime  @default(now())
  
  // Prevent duplicate mentions
  @@unique([linkId, sourceId, sourceItemId])
  @@index([linkId])
  @@index([sourceId])
  @@index([mentionedAt])
}
```

### Entities

```prisma
model Entity {
  id           String      @id @default(cuid())
  
  // Identity
  name         String      // Canonical name
  type         EntityType
  aliases      String[]    // Alternative names that resolve to this
  
  // Metadata
  description  String?
  imageUrl     String?
  wikipediaUrl String?
  websiteUrl   String?
  
  // Velocity tracking
  weeklyMentions Int       @default(0)
  monthlyMentions Int      @default(0)
  
  // Relations
  links        LinkEntity[]
  
  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt
  
  @@unique([name, type])
  @@index([type])
}

enum EntityType {
  PERSON
  ORGANIZATION
  PRODUCT
  TOPIC
  PLACE
  EVENT
}

// Junction table for Link <-> Entity
model LinkEntity {
  id        String   @id @default(cuid())
  
  linkId    String
  link      Link     @relation(fields: [linkId], references: [id], onDelete: Cascade)
  
  entityId  String
  entity    Entity   @relation(fields: [entityId], references: [id])
  
  // How prominently is this entity mentioned?
  prominence Prominence @default(MENTIONED)
  
  @@unique([linkId, entityId])
  @@index([entityId])
}

enum Prominence {
  PRIMARY    // Main subject of the link
  SECONDARY  // Significantly discussed
  MENTIONED  // Just mentioned
}
```

### Stories (Clustered Links)

```prisma
model Story {
  id          String   @id @default(cuid())
  
  // Auto-generated or edited
  title       String
  summary     String?
  
  // Aggregated from links
  velocity    Int      @default(0)  // Sum of link velocities
  
  // Relations
  links       Link[]
  
  // Timestamps
  startedAt   DateTime  // First link's firstSeenAt
  lastUpdated DateTime  // Most recent link addition
  
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  
  @@index([velocity])
  @@index([startedAt])
}
```

### Digests

```prisma
model Digest {
  id          String       @id @default(cuid())
  
  // Content
  title       String
  headline    String?      // Opening insight
  body        String?      // Full generated content
  
  // Period covered
  periodStart DateTime
  periodEnd   DateTime
  
  // Status
  status      DigestStatus @default(DRAFT)
  sentAt      DateTime?
  
  // Metrics
  recipientCount Int?
  openRate       Float?
  clickRate      Float?
  
  // Relations
  items       DigestItem[]
  
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
}

enum DigestStatus {
  DRAFT
  SCHEDULED
  SENT
  FAILED
}

model DigestItem {
  id        String  @id @default(cuid())
  
  digestId  String
  digest    Digest  @relation(fields: [digestId], references: [id], onDelete: Cascade)
  
  linkId    String
  
  // Editorial additions
  note      String?   // Editor's commentary
  section   String?   // Which section of digest
  position  Int       // Order within digest
  
  @@unique([digestId, linkId])
}
```

### URL Cache (for canonicalization)

```prisma
model UrlCache {
  id           String   @id @default(cuid())
  
  originalUrl  String   @unique
  canonicalUrl String
  
  // Resolution metadata
  redirectChain String[]  // Intermediate URLs
  resolvedAt   DateTime
  
  // TTL management
  expiresAt    DateTime
  
  @@index([canonicalUrl])
  @@index([expiresAt])
}
```

### AI Analysis Queue

```prisma
model AnalysisJob {
  id        String        @id @default(cuid())
  
  linkId    String
  type      AnalysisType
  
  status    JobStatus     @default(PENDING)
  attempts  Int           @default(0)
  lastError String?
  
  createdAt DateTime      @default(now())
  startedAt DateTime?
  completedAt DateTime?
  
  @@index([status, createdAt])
}

enum AnalysisType {
  ENRICHMENT     // Layer 1: basic metadata
  CULTURAL       // Layer 2: why now, tension, etc.
  EMBEDDING      // Vector generation
  CLUSTERING     // Story assignment
}

enum JobStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
  CANCELLED
}
```

---

## Migration Strategy

### Phase 1: Add New Fields (Non-Breaking)

```sql
-- Add trust/tier to sources
ALTER TABLE "Source" ADD COLUMN "trustScore" INTEGER DEFAULT 5;
ALTER TABLE "Source" ADD COLUMN "tier" TEXT DEFAULT 'TIER_3';
ALTER TABLE "Source" ADD COLUMN "status" TEXT DEFAULT 'ACTIVE';

-- Add scoring fields to links
ALTER TABLE "Link" ADD COLUMN "weightedScore" FLOAT DEFAULT 0;
ALTER TABLE "Link" ADD COLUMN "peakVelocity" INTEGER DEFAULT 0;
ALTER TABLE "Link" ADD COLUMN "embedding" FLOAT[];

-- Add context to mentions
ALTER TABLE "Mention" ADD COLUMN "originalUrl" TEXT;
ALTER TABLE "Mention" ADD COLUMN "context" TEXT;
```

### Phase 2: Create New Tables

```sql
-- Create Entity table
CREATE TABLE "Entity" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "aliases" TEXT[],
  ...
);

-- Create Story table
CREATE TABLE "Story" (
  "id" TEXT PRIMARY KEY,
  "title" TEXT NOT NULL,
  ...
);

-- Create junction tables
CREATE TABLE "LinkEntity" (...);
```

### Phase 3: Backfill Data

```typescript
// Backfill entities from existing link data
async function backfillEntities() {
  const links = await prisma.link.findMany({
    where: { categories: { isEmpty: false } }
  });
  
  for (const link of links) {
    // Extract entities from existing AI analysis
    // Create Entity records
    // Create LinkEntity relations
  }
}

// Compute initial weighted scores
async function computeWeightedScores() {
  const links = await prisma.link.findMany({
    include: { mentions: { include: { source: true } } }
  });
  
  for (const link of links) {
    const weightedScore = link.mentions.reduce((sum, m) => {
      return sum + getTierWeight(m.source.tier);
    }, 0);
    
    await prisma.link.update({
      where: { id: link.id },
      data: { weightedScore }
    });
  }
}
```

### Phase 4: Update Application Code

- Update queries to use new fields
- Add trust score to source forms
- Display weighted scores on dashboard
- Implement entity pages

---

## Indexes for Performance

```prisma
// On Link
@@index([velocity])           // For sorting by velocity
@@index([firstSeenAt])        // For time-based queries
@@index([storyId])            // For story clustering
@@index([domain])             // For domain-based filtering

// On Mention
@@index([linkId])             // For velocity calculation
@@index([sourceId])           // For source analysis
@@index([mentionedAt])        // For time-based queries

// On Entity
@@index([type])               // For entity type filtering
@@index([weeklyMentions])     // For trending entities

// On AnalysisJob
@@index([status, createdAt])  // For queue processing
```

---

## Computed Views (for dashboards)

```sql
-- Velocity over time (for sparklines)
CREATE VIEW link_velocity_history AS
SELECT 
  link_id,
  DATE_TRUNC('day', mentioned_at) as day,
  COUNT(*) as daily_mentions
FROM mentions
WHERE mentioned_at > NOW() - INTERVAL '30 days'
GROUP BY link_id, DATE_TRUNC('day', mentioned_at);

-- Source taste similarity
CREATE VIEW source_overlap AS
SELECT 
  m1.source_id AS source_a,
  m2.source_id AS source_b,
  COUNT(DISTINCT m1.link_id) AS shared_links
FROM mentions m1
JOIN mentions m2 ON m1.link_id = m2.link_id AND m1.source_id < m2.source_id
WHERE m1.mentioned_at > NOW() - INTERVAL '30 days'
GROUP BY m1.source_id, m2.source_id;

-- Entity velocity
CREATE VIEW entity_velocity AS
SELECT 
  e.id,
  e.name,
  e.type,
  COUNT(DISTINCT le.link_id) FILTER (WHERE l.first_seen_at > NOW() - INTERVAL '7 days') as week_count,
  COUNT(DISTINCT le.link_id) FILTER (WHERE l.first_seen_at > NOW() - INTERVAL '30 days') as month_count
FROM entities e
JOIN link_entities le ON e.id = le.entity_id
JOIN links l ON le.link_id = l.id
GROUP BY e.id;
```
