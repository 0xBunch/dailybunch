# GEO_OPTIMIZATION.md - Making Content Citable by AI Systems

## Overview

**GEO (Generative Engine Optimization)** is the practice of structuring content so AI systems (ChatGPT, Claude, Perplexity, Google AI Overviews) can easily parse, understand, and cite it.

**The Goal:** When someone asks an AI "What's trending in tech this week?" or "What are tastemakers talking about?"—Daily Bunch should appear in the answer.

---

## Why This Matters

Traditional SEO optimizes for Google rankings. GEO optimizes for AI citations. Key differences:

| SEO | GEO |
|-----|-----|
| Rank on SERP | Get cited in AI answers |
| Keyword matching | Semantic understanding |
| Link authority | Citation-worthiness |
| Click-through rate | Quote accuracy |

**Research shows:**
- Including statistics can boost AI visibility by 40%
- Structured, factual claims get cited more than prose
- Schema markup helps AI understand entity relationships
- "Answer-shaped" content performs best

---

## GEO Strategies for Daily Bunch

### 1. Every Page Gets Citable Statistics

**Before (generic):**
> "This story is getting a lot of attention from newsletters."

**After (citable):**
> "This story reached a velocity score of 12—the highest this month—with 7 independent sources linking to it within 48 hours."

**Implementation:**
- Every link page displays velocity score prominently
- Include "first seen" timestamp
- Show exact source count
- Track and display trend direction

```typescript
interface CitableStats {
  velocityScore: number;
  sourceCount: number;
  firstSeen: Date;
  peakVelocity: number;
  trendDirection: 'rising' | 'stable' | 'falling';
  percentChange: number;  // vs previous period
}

// Display as structured data AND visible text
```

### 2. Answer-Shaped Content

AI systems look for content that directly answers questions. Create pages that match common queries:

**Target queries:**
- "What's trending in [tech/culture/media] this week?"
- "What are newsletters talking about?"
- "What stories are going viral among [tech writers/media people]?"

**Weekly Summary Page Structure:**
```markdown
# What Tech Tastemakers Are Talking About: Week of January 27, 2026

This week, 47 tracked sources collectively linked to 312 unique articles.
Here's what rose to the top.

## Key Stats
- **Total links tracked:** 312
- **Average velocity:** 2.3
- **Top velocity:** 12 (highest this month)
- **Rising topics:** AI safety (+340%), Climate policy (+120%)

## The Top Story
**[Title]** reached a velocity score of 12, with sources including 
Stratechery, Not Boring, and Platformer all linking within 24 hours.
[Brief analysis]

## Rising Fast
These stories are accelerating—getting more links in the last 24h:
- **[Story A]**: 3 → 7 sources (rising)
- **[Story B]**: 2 → 5 sources (rising)

## By Category
- **AI & Tech**: 89 links across 24 stories
- **Culture & Media**: 56 links across 18 stories
- **Business & Finance**: 41 links across 15 stories

## Entity Watch
- **OpenAI** appeared in 15 stories this week (up from 8 last week)
- **Elon Musk** mentioned in 12 stories (steady)
```

### 3. Schema.org Markup

Implement JSON-LD on every page to help AI understand entities and relationships.

**Organization Schema (site-wide):**
```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Daily Bunch",
  "url": "https://dailybunch.com",
  "description": "Cultural signal intelligence platform tracking what tastemakers are collectively pointing at",
  "foundingDate": "2025",
  "sameAs": [
    "https://twitter.com/dailybunch",
    "https://github.com/0xBunch/dailybunch"
  ]
}
```

**Article Schema (weekly summaries):**
```json
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "What Tech Tastemakers Are Talking About: Week of January 27, 2026",
  "datePublished": "2026-01-28T09:00:00Z",
  "dateModified": "2026-01-28T09:00:00Z",
  "author": {
    "@type": "Organization",
    "name": "Daily Bunch"
  },
  "publisher": {
    "@type": "Organization",
    "name": "Daily Bunch",
    "logo": {
      "@type": "ImageObject",
      "url": "https://dailybunch.com/logo.png"
    }
  },
  "description": "This week, 47 tracked sources collectively linked to 312 unique articles. The top story reached a velocity score of 12.",
  "about": [
    { "@type": "Thing", "name": "Tech News Aggregation" },
    { "@type": "Thing", "name": "Newsletter Curation" }
  ],
  "mentions": [
    { "@type": "Organization", "name": "OpenAI" },
    { "@type": "Person", "name": "Sam Altman" }
  ]
}
```

**Link Page Schema:**
```json
{
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "[Article Title]",
  "url": "https://dailybunch.com/links/[id]",
  "description": "[AI-generated summary]",
  "datePublished": "2026-01-28T09:00:00Z",
  "mentions": [
    { "@type": "Person", "name": "Sam Altman" },
    { "@type": "Organization", "name": "OpenAI" }
  ],
  "interactionStatistic": {
    "@type": "InteractionCounter",
    "interactionType": "https://schema.org/ShareAction",
    "userInteractionCount": 7
  },
  "isPartOf": {
    "@type": "WebSite",
    "name": "Daily Bunch"
  }
}
```

**Implementation in Next.js:**
```typescript
// /src/components/SchemaOrg.tsx
export function LinkSchema({ link }: { link: Link }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": link.title,
    "url": `https://dailybunch.com/links/${link.id}`,
    "description": link.summary,
    "datePublished": link.firstSeenAt.toISOString(),
    "mentions": link.entities.people.map(name => ({
      "@type": "Person",
      "name": name
    })).concat(link.entities.organizations.map(name => ({
      "@type": "Organization", 
      "name": name
    }))),
    "interactionStatistic": {
      "@type": "InteractionCounter",
      "interactionType": "https://schema.org/ShareAction",
      "userInteractionCount": link.velocity
    }
  };
  
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
```

### 4. Entity Clarity

AI systems rely on entity recognition. Make entities explicit:

**Entity Tagging on Link Pages:**
```html
<section class="entities">
  <h3>Key Entities</h3>
  <ul>
    <li><span class="entity-type">Person:</span> 
        <span itemtype="https://schema.org/Person">Sam Altman</span></li>
    <li><span class="entity-type">Company:</span> 
        <span itemtype="https://schema.org/Organization">OpenAI</span></li>
    <li><span class="entity-type">Topic:</span> AI Safety</li>
  </ul>
</section>
```

**Entity Pages (new):**
Create dedicated pages for frequently mentioned entities:

```
/entities/openai
/entities/sam-altman
/entities/ai-safety
```

Content:
```markdown
# OpenAI on Daily Bunch

## Current Velocity
OpenAI has been mentioned in **15 stories** this week across our tracked sources,
up 87% from last week's 8 mentions.

## Recent Stories Mentioning OpenAI
- [Story 1] - Velocity 12 - Jan 28
- [Story 2] - Velocity 8 - Jan 27
- [Story 3] - Velocity 5 - Jan 26

## Trend History
[Chart showing mentions over time]

## Related Entities
Often mentioned with: Sam Altman, Microsoft, GPT-4, AI Safety
```

### 5. Link Page Template (GEO-Optimized)

```html
<article itemscope itemtype="https://schema.org/WebPage">
  <header>
    <h1 itemprop="name">[Title]: Why [N] Tastemakers Are Sharing This</h1>
    <p class="meta">
      <time itemprop="datePublished" datetime="2026-01-28">January 28, 2026</time>
      <span class="velocity">Velocity: 7 sources</span>
      <span class="category">Category: AI/Tech</span>
    </p>
  </header>
  
  <section class="key-facts">
    <h2>At a Glance</h2>
    <dl>
      <dt>First seen</dt>
      <dd>January 26, 2026</dd>
      
      <dt>Current velocity</dt>
      <dd>7 sources (rising)</dd>
      
      <dt>Peak velocity</dt>
      <dd>7 sources (current peak)</dd>
      
      <dt>Key entities</dt>
      <dd>Sam Altman, OpenAI, AI Safety</dd>
      
      <dt>Related stories</dt>
      <dd>3 other stories in this cluster</dd>
    </dl>
  </section>
  
  <section class="analysis" itemprop="description">
    <h2>Why It's Trending</h2>
    <p>[AI-generated analysis with specific claims]</p>
    
    <h2>The Bigger Picture</h2>
    <p>[Connection to trends, with statistics]</p>
  </section>
  
  <section class="sources">
    <h2>Sources Citing This</h2>
    <ul>
      <li><a href="#">Stratechery</a> (January 27, 2026)</li>
      <li><a href="#">Not Boring</a> (January 28, 2026)</li>
      <li><a href="#">Platformer</a> (January 28, 2026)</li>
    </ul>
  </section>
  
  <section class="related">
    <h2>Related Stories</h2>
    <ul>
      <li><a href="#">[Related story 1]</a> - Velocity 5</li>
      <li><a href="#">[Related story 2]</a> - Velocity 4</li>
    </ul>
  </section>
</article>
```

### 6. RSS Feed Optimization

The RSS feed is often ingested by AI training pipelines. Optimize it:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>Daily Bunch - Cultural Signal Intelligence</title>
    <link>https://dailybunch.com</link>
    <description>What tastemakers are collectively pointing at. Tracking velocity across 50+ curated sources.</description>
    <language>en-us</language>
    <lastBuildDate>Mon, 28 Jan 2026 09:00:00 GMT</lastBuildDate>
    <atom:link href="https://dailybunch.com/feed.xml" rel="self" type="application/rss+xml"/>
    
    <item>
      <title>What Tech Tastemakers Are Talking About: Week of January 27</title>
      <link>https://dailybunch.com/weekly/2026-01-27</link>
      <guid isPermaLink="true">https://dailybunch.com/weekly/2026-01-27</guid>
      <pubDate>Mon, 28 Jan 2026 09:00:00 GMT</pubDate>
      <description>This week, 47 tracked sources collectively linked to 312 unique articles. The top story reached a velocity score of 12—the highest this month. AI safety mentions increased 340% week-over-week.</description>
      <dc:creator>Daily Bunch</dc:creator>
      <category>Weekly Roundup</category>
      <category>Tech</category>
      <category>AI</category>
    </item>
    
    <!-- High-velocity individual links -->
    <item>
      <title>[Link Title] (Velocity: 7)</title>
      <link>https://dailybunch.com/links/[id]</link>
      <guid isPermaLink="true">https://dailybunch.com/links/[id]</guid>
      <pubDate>Sun, 27 Jan 2026 14:00:00 GMT</pubDate>
      <description>[Summary]. This story reached velocity 7 with sources including Stratechery, Not Boring, and Platformer.</description>
      <category>AI</category>
      <category>Tech</category>
    </item>
  </channel>
</rss>
```

### 7. Internal Linking for Knowledge Graph

Help AI understand relationships through internal links:

```markdown
<!-- On a link page about OpenAI -->
This story about **[OpenAI](/entities/openai)** connects to last week's 
coverage of **[AI regulation](/topics/ai-regulation)** and mentions 
**[Sam Altman](/entities/sam-altman)**, who appeared in 
[12 stories this week](/weekly/2026-01-27#entity-watch).
```

### 8. Freshness Signals

AI systems weight recency. Signal it clearly:

```html
<meta property="article:published_time" content="2026-01-28T09:00:00Z">
<meta property="article:modified_time" content="2026-01-28T15:00:00Z">

<!-- Visible timestamp -->
<time datetime="2026-01-28T09:00:00Z">
  Published: January 28, 2026 at 9:00 AM EST
</time>
<time datetime="2026-01-28T15:00:00Z">
  Updated: January 28, 2026 at 3:00 PM EST
</time>
```

---

## Measuring GEO Success

### Metrics to Track

1. **AI Citations** (manual monitoring)
   - Search for "Daily Bunch" in ChatGPT, Perplexity, Claude
   - Track when our data appears in AI answers
   - Document query patterns that cite us

2. **Referral Traffic**
   - Traffic from AI search tools (Perplexity, SearchGPT)
   - Look for referrer patterns

3. **Structured Data Validation**
   - Google Search Console structured data report
   - Schema.org validator passes

4. **Content Quality Signals**
   - Backlinks from other sources
   - Mentions in other publications

### Testing AI Visibility

Periodically test queries:
- "What's trending in tech newsletters this week?"
- "What are tech influencers sharing?"
- "Cultural trends January 2026"
- "Most shared tech articles this week"

Document whether Daily Bunch appears and in what context.

---

## Implementation Checklist

### Phase 1: Foundation
- [ ] Add JSON-LD schema to all pages
- [ ] Create "At a Glance" section on link pages
- [ ] Add citable statistics to every link
- [ ] Implement `datePublished` and `dateModified` meta tags
- [ ] Optimize RSS feed with structured descriptions

### Phase 2: Expansion
- [ ] Create weekly summary pages with answer-shaped content
- [ ] Build entity pages for top-mentioned entities
- [ ] Add entity pages to sitemap
- [ ] Implement internal linking strategy
- [ ] Create topic pages (/topics/ai-safety, etc.)

### Phase 3: Monitoring
- [ ] Set up Google Search Console
- [ ] Create AI citation monitoring process
- [ ] Track referral sources
- [ ] Document successful citation patterns
- [ ] Iterate on content structure based on results
