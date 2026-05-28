# Security Baseline

## Required
- .env files ignored by git.
- Secret pattern scan in CI.
- Dependency updates enabled via Dependabot.
- CodeQL enabled.

## Recommended
- Rotate credentials every 90 days.
- Use branch protection on `main`.
- Require PR review for high-risk changes.
