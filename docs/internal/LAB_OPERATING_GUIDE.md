# Internal Operating Guide

## How to Use This Lab
1. Capture idea and constraints in `docs/internal/ROADMAP.md`.
2. Write one ADR for key architecture decisions.
3. Scaffold with template scripts.
4. Implement in small vertical slices.
5. Keep tests and security checks green before publishing.

## Mandatory Gates Before Public Release
- Smoke tests passing.
- Secret scan passing.
- README with architecture + runbook.
- Deployment rollback plan documented.

## Common Mistakes to Avoid
- Building without a defined scope.
- Hardcoding secrets.
- Publishing without observability and rollback notes.
