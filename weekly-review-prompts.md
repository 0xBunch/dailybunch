# Weekly Review Generator — Prompt Engineering Document

## Project Overview

Build a self-hosted web application that ingests saved news links and generates a weekly news digest in the exact style of Harper's Magazine's "Weekly Review" column. The output should be indistinguishable from the real thing: a single, unbroken paragraph that juxtaposes political gravitas with human absurdity, connected by semicolons, delivered in a flat, clinical tone that lets irony emerge from proximity alone.

---

## Reference: The Harper's Weekly Review Style

### Defining Characteristics

1. **Single paragraph, no breaks** — Everything flows as one continuous thought
2. **Semicolon architecture** — Items connected by semicolons, not periods, creating rhythm
3. **Flat affect** — A cow mauling and a constitutional crisis described with identical detachment
4. **Specificity over abstraction** — Always names, numbers, dates, locations ("forty-two pounds of meth," "a five-year-old returning from preschool")
5. **Juxtaposition without commentary** — The absurd follows the tragic without transition or editorializing
6. **Footnoted claims** — Superscript numbers after factual claims, linking to sources
7. **The dismount** — Typically ends with an animal story or bizarre human behavior, then "—Byline"
8. **No emotional language** — Never "shocking," "horrifying," "unbelievable"—the facts speak

### Structural Pattern (typical)

```
[Major political/social event, stated flatly]¹ ² [Related development or official response]³ ⁴ ⁵
[Second major story, different topic]⁶ ⁷ [Escalation or consequence]⁸
[Pivot to something slightly absurd but still newsy]⁹ ¹⁰
[International item]¹¹ [Another international item]¹²
[Crime or corruption story with specific dollar amounts]¹³ ¹⁴
[Bizarre animal story or human folly]¹⁵ ¹⁶
[Final kicker—the most absurd item]¹⁷ —Byline
```

---

## System Prompt v1

```
You are a writer for Harper's Magazine's Weekly Review column—a weekly news digest that has run since 1857. Your voice is dry, precise, and utterly deadpan. You synthesize disparate news items into a single, unbroken paragraph where the grave and the absurd coexist without comment.

## Your Task

Given a collection of news articles from the past week, produce a Weekly Review entry of 400-700 words.

## Style Rules (Non-Negotiable)

1. ONE PARAGRAPH. No line breaks, no section headers, no bullet points. Ever.

2. SEMICOLONS AS CONNECTIVE TISSUE. Items are joined by semicolons, creating a continuous flow. Periods appear only at the end of complete thoughts that need full stops for clarity, but default to semicolons.

3. FLAT AFFECT. You are a dispassionate chronicler. Never:
   - Use exclamation points
   - Describe anything as "shocking," "disturbing," "unbelievable," "ironic"
   - Editorialize or explain why juxtapositions are meaningful
   - Express surprise, dismay, or amusement
   
4. RADICAL SPECIFICITY. Always include:
   - Full names and ages when available
   - Exact numbers ("forty-two pounds," not "a large quantity")
   - Specific locations ("Lucknow, India" not "India")
   - Precise dollar amounts ("$23 million" not "millions")
   - Titles and roles ("intensive-care nurse," "district court judge")

5. JUXTAPOSITION WITHOUT TRANSITION. Move between items without phrases like "meanwhile," "in other news," "on a lighter note." The semicolon does the work.

6. QUOTE SPARINGLY AND PRECISELY. When you quote, use the exact words and attribute clearly. Quotes should be short and revealing of character or absurdity.

7. STRUCTURE (flexible but typical):
   - Open with a significant political or social event
   - Layer in related developments, official responses, consequences
   - Pivot to international news or unrelated domestic stories
   - Include at least one crime/corruption item with specific figures
   - Build toward increasingly absurd items
   - End with an animal story or peak human folly
   - Close with an em dash and byline: —[Name]

8. FOOTNOTES. Place superscript numbers after claims that cite specific sources. Number sequentially. These will be linked to the source URLs.

## What Makes It Work

The power of the Weekly Review comes from *accumulation* and *proximity*. A detention center death sits next to a penguin meme. A general's treason abuts a cow scratching itself with a tool. You never acknowledge the absurdity—you simply place things next to each other and trust the reader.

The tone is that of a particularly well-read coroner: just the facts,528 all the facts, no matter how strange.

## Output Format

Return ONLY the Weekly Review paragraph followed by the byline. Do not include:
- Titles or headers
- Explanatory notes
- Lists of sources (those are handled separately)
- Any meta-commentary about the writing
```

---

## User Prompt Template

```
Here are the news items from the week of {week_date}. Synthesize them into a Weekly Review.

For each item, I've provided the source, a summary, and key details. Use your judgment about which items to include and how to order them for maximum effect. Not every item needs to appear—curate for impact and flow.

---

{for each link in links}
## Source {n}: {source_name}
URL: {url}
Title: {title}
Key Details:
{extracted_text_or_summary}

---
{end for}

Remember: one paragraph, semicolons, flat affect, specific details, no commentary. End with —Weekly Review or —[Generated Byline].
```

---

## Prompt Refinement Strategy

### Testing Approach

1. **Baseline test**: Feed 10-15 real news items, compare output to actual Harper's Weekly Reviews
2. **Edge cases**: 
   - All serious news (can it still find the rhythm?)
   - All absurd news (does it maintain gravitas?)
   - Only 3-4 items (can it still produce something substantial?)
   - 25+ items (does it curate effectively?)

### Likely Failure Modes & Fixes

| Problem | Symptom | Fix |
|---------|---------|-----|
| Too editorial | "In a troubling development..." | Add to system prompt: "Never use evaluative adjectives. Never signal that something is significant—its inclusion signals significance." |
| Choppy transitions | Items feel disconnected | Add examples of good semicolon transitions from real Reviews |
| Over-quoting | Too many direct quotes | "Use no more than 3-4 direct quotes. Prefer paraphrase with attribution." |
| Wrong ending | Ends on serious note | "The final item must be either: an animal story, a bizarre crime, or peak human absurdity." |
| Too short | Under 400 words | "Ensure at least 8-10 distinct news items are synthesized." |
| Breaks format | Uses line breaks or bullets | Emphasize more strongly; consider post-processing check |

### Iteration Log Template

```markdown
## Iteration {n} — {date}

**Change made**: 
[What you modified in the prompt]

**Test input**: 
[Brief description of test articles]

**Output quality**:
- Tone: [1-5]
- Structure: [1-5]  
- Specificity: [1-5]
- Ending: [1-5]

**Issues observed**:
[What went wrong]

**Next iteration**:
[What to try next]
```

---

## Few-Shot Examples

If the model struggles, add 2-3 real Weekly Review excerpts as examples. Here's how to format:

```
## Examples of Excellent Weekly Reviews

### Example 1 (Winter 2025)

In Minneapolis, Immigration and Customs Enforcement agents shot and killed Alex Pretti, a thirty-seven-year-old intensive-care nurse, one day after thousands joined a general strike protesting the agency's operations in the city, which resulted in the fatal shooting of the poet Renée Good three weeks earlier.¹ ² Federal officials claimed Pretti had approached them with a handgun, a narrative contradicted by multiple eyewitnesses as well as by footage of the encounter showing the man approaching federal agents with only a phone drawn.³ ⁴ [... continue with full example ...]

### Example 2 (Fall 2024)

[Another full example]

---

Now, using these as your stylistic guide, synthesize the following news items:
```

---

## Content Extraction Guidance

When building the link-saving pipeline, extract and store:

1. **Title** — Exact headline
2. **Source name** — Publication (NYT, Reuters, local news, etc.)
3. **Date published** — For chronological ordering
4. **Key facts** — Names, numbers, locations, quotes
5. **Category tag** (optional but useful):
   - `politics-domestic`
   - `politics-international`
   - `crime-corruption`
   - `corporate`
   - `absurd-human`
   - `animal`
   - `weather-disaster`
   - `science-tech`

The category tags help with:
- Ensuring variety in the generated review
- Guaranteeing an animal/absurd story for the ending
- Balancing serious and light content

---

## API Call Structure

```python
import anthropic

client = anthropic.Anthropic()

def generate_weekly_review(links: list[dict], week_of: str) -> str:
    """
    links: list of dicts with keys: url, title, source_name, extracted_text, category
    week_of: string like "January 27, 2025"
    """
    
    system_prompt = """[Full system prompt from above]"""
    
    user_content = f"Here are the news items from the week of {week_of}. Synthesize them into a Weekly Review.\n\n"
    
    for i, link in enumerate(links, 1):
        user_content += f"""## Source {i}: {link['source_name']}
URL: {link['url']}
Title: {link['title']}
Key Details:
{link['extracted_text']}

---

"""
    
    user_content += "Remember: one paragraph, semicolons, flat affect, specific details, no commentary. End with —Weekly Review."
    
    response = client.messages.create(
        model="claude-sonnet-4-20250514",  # or opus for higher quality
        max_tokens=2000,
        system=system_prompt,
        messages=[
            {"role": "user", "content": user_content}
        ]
    )
    
    return response.content[0].text
```

---

## Architecture Notes for Claude Code

When you take this into Claude Code, here's the build order I'd suggest:

### Phase 1: Core Prompt Iteration
- Set up a simple test harness
- Manually paste in 10-15 news summaries
- Run against Claude API
- Compare to real Harper's output
- Iterate on system prompt until quality is consistent

### Phase 2: Database + Link Ingestion
- Railway Postgres setup
- Schema creation (links, drafts, sources tables)
- FastAPI endpoints for saving links
- Content extraction with `trafilatura`

### Phase 3: Generation Pipeline
- Endpoint that pulls week's links from DB
- Calls Claude API with constructed prompt
- Stores draft with footnote mapping
- Returns draft for display

### Phase 4: Frontend
- Simple UI for pasting/saving links
- Week view of saved links
- Generate button
- Draft display with editing
- Export (markdown, HTML with footnotes)

### Phase 5: Polish
- Auto-extraction improvements
- Category auto-tagging (could use Claude for this too)
- Scheduled generation option
- Email delivery of weekly draft

---

## Open Questions to Resolve in Claude Code

1. **Footnote handling**: Should Claude output footnotes inline (¹ ² ³) and we map them to URLs post-hoc? Or should it output something parseable like `[^1]` that we convert?

2. **Curation logic**: If you save 30 links but only 15 should appear, should Claude curate? Or do you want a pre-selection step?

3. **Byline**: Generated name? Your name? Rotating fake names? "—Weekly Review"?

4. **Editing workflow**: Do you want to edit the raw text, or have a structured editor that lets you reorder/add/remove items and regenerate?

5. **Versioning**: Keep old drafts? Track iterations?

---

## Success Criteria

A successful Weekly Review Generator produces output where:

- [ ] A reader familiar with Harper's couldn't distinguish it from the real thing
- [ ] Tone is consistent (flat, dry, precise)
- [ ] Structure flows naturally (serious → absurd)
- [ ] Specific details are preserved from source material
- [ ] Footnotes correctly map to sources
- [ ] No AI-isms ("I," "As an AI," "It's worth noting," "In conclusion")
- [ ] The ending lands (animal or absurdity, feels like a punchline without being one)
