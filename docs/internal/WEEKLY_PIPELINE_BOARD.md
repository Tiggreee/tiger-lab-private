# Weekly Pipeline Board

## Goal
Track commercial execution with measurable weekly targets and enforce focus on deal closure.

## Data Source
- Main board data: ops/pipeline/weekly-pipeline.json
- Auto summary: scripts/pipeline-weekly-summary.mjs

## Update Cadence
- Monday morning: reset weekly targets and deal statuses.
- Daily (end of day): update stage, probability, next action, due date.
- Friday: review weighted pipeline and closure gap.

## Stage Definition
- lead: identified prospect, no call booked.
- discovery: call scheduled or completed.
- proposal: priced proposal sent.
- negotiation: objections, legal, or terms discussion.
- closed: signed and paid.
- lost: not moving forward.

## Non-Negotiable Rules
- Every deal must have nextAction and dueDate.
- No dueDate older than today without explicit reason.
- At least one P0 follow-up every business day.
- Human-owned tasks must be executed before new technical work.

## Weekly Review Checklist
1. Are leads enough to support next month target?
2. Is weighted pipeline at least 3x of weekly closure target?
3. Do we have at least one near-close deal in negotiation?
4. Are urgent human actions blocked by missing follow-up?

## Commands
- pipeline summary: npm run pipeline:summary
- pipeline summary markdown: npm run pipeline:summary:md
