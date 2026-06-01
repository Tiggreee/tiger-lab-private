# Payment Stack Decision (MX/LATAM)

Objective: maximize conversion speed and collection reliability with minimal operational friction.

## Final stack (recommended)
- Primary processor: Stripe
- Local fallback (MX): OpenPay or Conekta
- Optional alt-pay for audience fit: Mercado Pago / PayPal

## Product focus policy (current)
- Active commercial focus: FacturAutentica only.
- Payment rail decisions must optimize first for FacturAutentica conversion and provisioning reliability.
- Other products remain expansion tracks until Phase 1 KPIs are stable.

## Settlement destination (active)
- Bank: Klar
- Account number: 661610004954169657
- Account holder: Victor Manuel Salgado Luna
- Currency: MXN (Peso Mexicano)
- Enabled uses: inbound collections and fallback operational transfers.

## Commercial collection channels (active)
- PayPal: tiggreee@vmdev.lat (business exclusive)
- Card: enabled through primary processor checkout.
- Transfer: enabled to Klar account for B2B/invoice-oriented buyers.

## Why this stack
1. Stripe gives fastest implementation for checkout, subscriptions, and webhook lifecycle.
2. OpenPay/Conekta provide local fallback where card acceptance or local rails require regional optimization.
3. Mercado Pago/PayPal increase acceptance for users already holding wallet balances.

## Payment methods by segment
### Segment A: non-IT / creator / solo operators
- Card
- Wallet
- Cash-reference voucher

### Segment B: SMB ops / B2B
- Card
- Bank transfer (SPEI/CLABE)
- Wallet optional

### Segment C: enterprise-like
- Card for pilot speed
- Transfer + invoice path for recurring billing

## Selection policy
1. Offer PayPal + Card as top rails on first screen (reduce decision friction).
2. If first rail fails, auto-suggest Card, then Transfer as one-click fallback.
3. Keep cash-reference visible only where card usage is low.

## Revenue defense policy
- No activation without succeeded payment event.
- Discounts only within approved policy bands.
- Manual-cash above threshold requires second approval.

## SLA targets
- Lead qualified to checkout link: <= 60s.
- Payment succeeded to provisioning: <= 60s.
- Failed payment fallback suggestion: <= 15s.

## Rollout order
1. Stripe live + webhook verification for FacturAutentica.
2. Transfer rail + reconciliation job for FacturAutentica.
3. PayPal enablement as trust/fallback rail.
4. Cash-reference (if segment demands and controls are proven).
5. Expansion rails for other products only after Phase 1 success.

## Go-live decision gate
Go only when:
- Signature verification PASS
- Idempotency PASS
- Payment->provisioning E2E PASS
- Reconciliation PASS
