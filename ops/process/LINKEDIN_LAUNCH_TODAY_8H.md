# LinkedIn Launch Today (8 Hours)

Objective: generate qualified conversations and first paid opportunities today with a single offer and single channel.

## Scope lock (must stay fixed today)

- Offer: one only.
- Channel: LinkedIn only.
- CTA: one only.
- Landing: one real URL only.

## Hour-by-hour execution

1. Hour 1
- Define offer in one sentence.
- Define ICP in one sentence.
- Define CTA in one sentence.

2. Hour 2
- Prepare campaign pack.
- Verify all links are real and not placeholders.

3. Hour 3
- Configure LinkedIn secrets in `production-social` environment.
- Run readiness check.

4. Hour 4
- Run go-live check for `linkedin` only.
- Run dry publish.

5. Hour 5
- Publish live campaign.
- Validate publication and links.

6. Hour 6
- Send first wave outbound manually (minimum 10 targets).
- Log responses to pipeline and command center.

7. Hour 7
- Run daily dashboard and SLA checks.
- Adjust message angle based on response quality.

8. Hour 8
- Record outcomes.
- Schedule next 24h follow-up actions.

## Operational commands

```bash
npm run traffic:pack -- --topic "Sistema autonomo para capturar leads" --audience "founders SMB" --offer "diagnostico de 15 min" --campaign "linkedin-today" --baseLink "https://tu-landing-real.com" --closeChannel "calendar" --closeDestination "https://cal.com/tu-enlace"
npm run traffic:go-live -- --campaign "linkedin-today" --channels "linkedin"
npm run traffic:publish:dry -- --campaign "linkedin-today" --channels "linkedin"
npm run traffic:publish -- --campaign "linkedin-today" --channels "linkedin"
npm run revenue:daily
npm run traffic:sla
```

## Exit criteria for today

- One campaign published in LinkedIn.
- One clean dashboard report generated.
- SLA tracked with lead response data.
- Next-day follow-up list prepared.
