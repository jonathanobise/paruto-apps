# Paruto coupons: design

Status: built in [`jonathanobise/paruto-coupons`](https://github.com/jonathanobise/paruto-coupons) (not yet deployed). Its README is the up-to-date reference; this page is the original design.

One coupon system for every Paruto app, so a promo is defined once instead of being built into each app.

## Shape

- **Where it lives:** a Cloudflare Worker, `paruto-coupons`, at `coupons.paruto.com`, backed by a D1 database. It's the same pattern as the Anansi leaderboard Worker, and every app is already on a `*.paruto.com` subdomain on Cloudflare.
- **The split:** the coupon service answers *"is this code valid here, for this person, and what do they get?"*. It never touches money. Each app's own checkout (Paystack, Stripe, …) charges the discounted amount. That way a promo is defined once and every app can honour it, whatever its payment setup.

## A coupon

```jsonc
{
  "code": "LAUNCH25",              // case-insensitive, unique
  "note": "Q4 launch push",        // internal only
  "campaign": "q4-2026",           // groups codes for reporting
  "benefit": { "type": "percent_off", "value": 25 },
  //   or { "type": "amount_off", "value": 50000, "currency": "NGN" }  (minor units: kobo)
  //   or { "type": "free_period", "days": 30 }
  //   or { "type": "grant", "key": "early-access" }  // the app decides what it unlocks (e.g. an Ivra invite)
  "apps": ["*"],                   // or ["ivra", "repwise"], ids from apps.json
  "overrides": { "repwise": { "type": "free_period", "days": 14 } },  // optional per-app benefit
  "starts_at": "2026-11-01", "ends_at": "2026-11-30",
  "max_redemptions": 500, "max_per_user": 1,
  "first_purchase_only": false,
  "public": false,                 // true = may be shown on apps.paruto.com
  "status": "active"               // active | paused
}
```

**Redemptions** table: coupon, app, user (the app's user id, hashed), order ref, amount before/after, currency, state (`reserved` → `confirmed` | `released`), timestamps.

## API

Called only by app servers, never by the browser directly. Each app has its own secret key, and the key identifies the app, so one app can't redeem codes on behalf of another.

| Endpoint | When | Effect |
| --- | --- | --- |
| `POST /validate` | user types a code | shows the benefit; no side effects |
| `POST /reserve` | checkout starts | holds one use for ~30 min; `order_ref` is the idempotency key |
| `POST /confirm` | payment webhook succeeds | the redemption counts |
| `POST /release` | payment fails or is abandoned | frees the hold (expired holds release themselves) |

Usage limits are enforced centrally, so "1 per person, 500 total" holds across every app.

## Admin

A small page at `coupons.paruto.com/admin`, behind Cloudflare Access so only you get in. It creates, pauses and expires codes, and shows redemptions per app and per campaign.

## Extras so apps do less work

- A shared drop-in coupon field (one script, styled per app).
- Links like `https://repwise.paruto.com/?coupon=LAUNCH25` that pre-fill the field.
- Later: a `public` coupon shows as an offer chip on that app's card and sheet on apps.paruto.com. That's the only part that touches this repo.

## Limits

- **App Store and Play purchases can't use this.** Apple and Google require their own offer codes. Not an issue today, since the apps are web or installable apps.
- **Apps with no server can't apply discounts securely** (for example the static Anansi games), because the code could be faked in the browser. They can use `grant` coupons for perks, or the Worker can create a discounted payment link.

## Open questions

1. Which apps charge money today, and through which provider? If they all use one (Paystack?), the Worker could create the discounted checkout itself, so each app only needs a few lines.
2. Which promos will actually run first: discounts, free trials, invites or perks? Version one can start with just those.
3. Code location: a new repo, `paruto-coupons`, is the suggestion.

## Build order

1. Worker + D1 schema + the four endpoints.
2. Admin page behind Cloudflare Access.
3. Wire up one app as the template; then the shared coupon field.
4. Optional: public offers on apps.paruto.com.
