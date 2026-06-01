# Agent Closer Silent Policy

Objective: maximize close rate with minimal human interruption while keeping controls safe.

## Operating doctrine
- Fastest valid payment rail wins.
- No delay for routine approvals.
- Human participates only in strategic and risk gates.

## Automated closer behavior
1. Qualify lead intent and urgency.
2. Select plan by policy.
3. Handle objections with product-proof responses.
4. Offer discount only inside approved discount bands.
5. Dispatch checkout immediately through best payment rail.
6. Retry and follow-up automatically until paid or disqualified.

## Payment rail selection logic
- Default sequence: PayPal -> Card -> Transfer.
- Segment non-IT: PayPal + card first; cash-reference only when needed.
- Segment B2B ops: card + transfer first, with PayPal available as trust fallback.
- If PayPal fails: fallback to card.
- If card fails: fallback to transfer.
- If transfer unavailable: fallback to cash-reference.

## Human gates only
1. Publication/go-live approval.
2. Exception discounts outside policy.
3. Security/fraud/compliance incidents.
4. Large manual-cash exceptions.

## SLA targets for closer
- Lead first response: under 2 minutes.
- Checkout dispatch after qualification: under 60 seconds.
- Objection response latency: under 3 minutes.
- Paid confirmation to provisioning: under 60 seconds.

## KPIs
- Lead to checkout conversion.
- Checkout to paid conversion.
- Payment rail success rate by segment.
- Discount usage rate and margin impact.
- Manual intervention rate.

## Weekly tuning loop
1. Review top objections and win/loss causes.
2. Adjust discount bands by segment.
3. Adjust payment rail order by success rate.
4. Re-train objection templates with fresh market evidence.
