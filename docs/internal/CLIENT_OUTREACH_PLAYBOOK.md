# Inbound Automation Playbook (Replaces Outreach)

## Status
This file replaces the previous outreach-first approach.
The active model is product-led, inbound, and automated.

## ICP Signals (Captured Automatically)
- Team uses repetitive workflows that can be automated.
- Team explores API docs, pricing, and integration pages.
- Team starts trial or uses playground endpoints.

## Acquisition Channels (Automation)
- Technical docs and release notes with SEO structure.
- Playground demos and API quickstart snippets.
- Automated social distribution from release artifacts.

## Conversion Structure
1. Trigger event:
   - docs_view, pricing_view, playground_use, trial_started
2. Lead scoring:
   - score by intent, product fit, and usage depth
3. Bot response:
   - recommends plan and setup path
4. Checkout:
   - self-serve payment and automatic provisioning

## Bot Conversation Rules
- Answer pricing, setup, limits, and migration questions.
- Offer product-specific next step (trial, API key, starter template).
- Escalate only on security or enterprise exceptions.

## Content Loop
- Generate one technical artifact per release.
- Repurpose artifact into docs, short post, and changelog highlight.
- Publish via scheduler and track CTR, trial starts, and paid activations.
