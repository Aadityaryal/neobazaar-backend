# Rollback Notes — Phase A Foundation Migration

Date: 2026-02-26
Migration: `2026-02-26-phase-a-foundation.ts`

## Collections created
- `orders`
- `offers`
- `disputes`
- `reviews`
- `notifications`
- `referrals`
- `campaigns`
- `idempotencykeys`

## Safe rollback strategy
1. Ensure no production traffic writes to these collections.
2. Export backup snapshots if any data exists:
   - `mongoexport --collection=<name> ...`
3. Drop collections in reverse dependency order:
   - `idempotencykeys`, `notifications`, `reviews`, `disputes`, `offers`, `orders`, `campaigns`, `referrals`
4. Re-run baseline API smoke tests.

## Rollback command examples
- `db.idempotencykeys.drop()`
- `db.notifications.drop()`
- `db.reviews.drop()`
- `db.disputes.drop()`
- `db.offers.drop()`
- `db.orders.drop()`
- `db.campaigns.drop()`
- `db.referrals.drop()`
