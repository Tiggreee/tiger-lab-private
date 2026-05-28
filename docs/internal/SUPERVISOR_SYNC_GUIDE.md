# Supervisor Sync Guide

## Objective
Convert supervisor unified report actions into live command center tasks automatically.

## Input Format
Use JSON appendix from:
- copilottools/agents/supervisor-report-template.md

Required per action:
- id (S-*)
- task
- owner (human or ai)
- dueWindow (today, 48h, this week)
- status (todo, in-progress, done)
- priority (P0..P3)
- area
- nextAction

## Command
- Example input file:
  - npm run supervisor:sync:example
- Custom report path:
  - node scripts/supervisor-sync-command-center.mjs <path-to-report.json>

## Result
Updates `ops/command-center/tasks.json` using upsert by action id.
- Existing S-* tasks are updated.
- New S-* tasks are created.
- Metadata records last sync timestamp and report source.

## Operating Rule
Run supervisor sync after every multi-agent review cycle.
