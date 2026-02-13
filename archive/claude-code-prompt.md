Add a Weekly Review Generator to Daily Bunch. This is a new output format that produces a single-paragraph news digest in the exact style of Harper's Magazine's "Weekly Review" column.

Read the attached `weekly-review-for-dailybunch.md` for the full integration spec—it covers:
- Prisma schema additions (WeeklyReview, WeeklyReviewSource models)
- API routes for generate/save/send
- Claude API integration with the Harper's-style system prompt
- New pages at `/weekly-review`, `/weekly-review/new`, `/weekly-review/[id]`
- Response parsing for footnote mapping

Also read `weekly-review-prompts.md` for the detailed style guide, iteration framework, and example output.

Start with Phase 1: Create a test script at `scripts/test-weekly-review.ts` that pulls high-velocity links from the DB and tests the Claude prompt. I want to iterate on prompt quality before building the full UI.

Install `@anthropic-ai/sdk` and add `ANTHROPIC_API_KEY` to the environment.
