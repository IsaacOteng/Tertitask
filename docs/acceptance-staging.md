# Staging Acceptance Matrix

Run this matrix against **staging** before flipping to live Paystack keys.
Then repeat on **production** with real money (section 26).

Staging URL: `https://tertitask-web.vercel.app`
API URL: `https://tertitask-api.onrender.com`

---

## Part A — Mandatory automated tests (section 20)

Run the full test suite against the local codebase:

```bash
source venv/Scripts/activate
python manage.py test --verbosity=2
```

All 89 tests must pass. Key assertions covered:

| # | Test | Class | Status |
|---|------|-------|--------|
| 1 | 401 on invalid Firebase token | `FirebaseAuthentication` | `PayoutCreateViewTest` indirectly |
| 2 | Email/phone never in public serializer | `GigSerializerPrivacyTest`, `PublicProfileSerializerTest` | automated |
| 3 | Non-owner 403 on gig edits | `GigOwnershipTest` | automated |
| 4 | Webhook wrong-signature → 401 | `PaystackWebhookTest.test_wrong_signature_returns_401` | automated |
| 5 | Webhook duplicate event → no-op (idempotency) | `PaystackWebhookTest.test_duplicate_charge_success_causes_exactly_one_state_change` | automated |
| 6 | No double delivery (409) | `DeliverViewTest.test_cannot_deliver_twice` | automated |
| 7 | No over-withdraw (400 + "Insufficient") | `PayoutCreateViewTest.test_cannot_withdraw_more_than_available` | automated |
| 8 | Reject writes zero ledger entries | `RejectViewTest.test_rejecting_writes_zero_ledger_entries` | automated |
| 9 | Full lifecycle SUM(ledger) = 0 | `FullLifecycleTest.test_full_lifecycle_ledger_sums_to_zero` | automated |
| 10 | `transfer.failed` fully restores balance | `TransferFailedWebhookTest.test_available_after_failed_equals_available_before_withdrawal` | automated |

---

## Part B — Four-path manual matrix

Requires two test accounts (sign-in with Firebase test emails) and a Paystack test card.

**Test card**: `4084 0840 8408 4081` · Expiry any future date · CVV `408` · PIN `0000`

### Path 1 — Happy path: funded → approved → released → withdrawn

| Step | Action | Expected result | Pass? |
|------|--------|-----------------|-------|
| 1 | Freelancer creates a gig (GHS 10) | Gig appears in /browse | ☐ |
| 2 | Client orders the gig | Redirected to Paystack checkout page | ☐ |
| 3 | Client pays with test card | Redirected to `/order/:id/return`, order shows **Funded** | ☐ |
| 4 | Freelancer delivers (message + optional link) | Order shows **Delivered**, client sees delivery | ☐ |
| 5 | Client clicks Approve | Order shows **Approved**, freelancer Earnings → Pending shows GHS 9.00 | ☐ |
| 6 | *(Wait 7 days or advance `clear_at` in DB)* | Run `python manage.py release_cleared_orders` | ☐ |
| 7 | Check Earnings | Pending → 0, Available → GHS 9.00, Lifetime → GHS 9.00 | ☐ |
| 8 | Freelancer adds bank account, withdraws GHS 9.00 | Payout row shows **Processing** in payout history | ☐ |
| 9 | Simulate `transfer.success` webhook | Payout row shows **Success**, Available stays 0 | ☐ |

### Path 2 — Reject flow: funded → rejected → refunded

| Step | Action | Expected result | Pass? |
|------|--------|-----------------|-------|
| 1 | Client orders and pays | Order **Funded** | ☐ |
| 2 | Freelancer delivers | Order **Delivered** | ☐ |
| 3 | Client clicks Reject and confirms | Order **Rejected**, Paystack issues refund | ☐ |
| 4 | Check ledger via Django shell | `LedgerEntry.objects.filter(user=freelancer)` → empty (zero entries) | ☐ |
| 5 | Client receives refund | Confirm in Paystack dashboard → Refunds | ☐ |

```python
# Django shell check
from orders.models import Order
from payouts.models import LedgerEntry
order = Order.objects.latest('created_at')
print(LedgerEntry.objects.filter(user=order.freelancer).count())  # must be 0
```

### Path 3 — Auto-approve: delivered → auto-approved after 3 days

| Step | Action | Expected result | Pass? |
|------|--------|-----------------|-------|
| 1 | Client orders, pays, freelancer delivers | Order **Delivered** | ☐ |
| 2 | Advance `auto_approve_at` in shell | `order.auto_approve_at = timezone.now() - timedelta(seconds=1); order.save()` | ☐ |
| 3 | Run cron | `python manage.py auto_approve_orders` | ☐ |
| 4 | Check order | Status → **Approved**, `clear_at` set to now+7 days | ☐ |
| 5 | Advance `clear_at`, run release cron | `python manage.py release_cleared_orders` → status **Released** | ☐ |
| 6 | Check Earnings | Available shows freelancer cut | ☐ |

```python
# Django shell — advance timestamps
from django.utils import timezone
from datetime import timedelta
from orders.models import Order
order = Order.objects.filter(status='delivered').latest('created_at')
order.auto_approve_at = timezone.now() - timedelta(seconds=1)
order.save(update_fields=['auto_approve_at'])
```

### Path 4 — transfer.failed: withdraw → webhook → balance restored

| Step | Action | Expected result | Pass? |
|------|--------|-----------------|-------|
| 1 | Freelancer has Available balance ≥ GHS 50 | Withdraw button enabled | ☐ |
| 2 | Freelancer withdraws | Payout row **Processing**, Available → 0 | ☐ |
| 3 | Send `transfer.failed` webhook manually (see below) | Payout row → **Failed**, Available restored to pre-withdrawal amount | ☐ |
| 4 | Verify ledger sum | `SUM(ledger entries for user)` unchanged from before withdrawal | ☐ |

```bash
# Simulate transfer.failed webhook against staging
TRANSFER_CODE="TRF_yourcode"  # from Payout object in DB
SECRET="your-webhook-secret"

BODY=$(python3 -c "import json; print(json.dumps({'event':'transfer.failed','data':{'id':99999,'transfer_code':'$TRANSFER_CODE','reason':'Insufficient funds','reference':'testref'}}))")
SIG=$(echo -n "$BODY" | openssl dgst -sha512 -hmac "$SECRET" | awk '{print $2}')

curl -X POST https://tertitask-api.onrender.com/api/webhooks/paystack/ \
  -H "Content-Type: application/json" \
  -H "x-paystack-signature: $SIG" \
  -d "$BODY"
# Expected: 200
```

---

## Part C — Production separation checklist

Before going live with real money:

- [ ] Create a **separate Firebase project** for production (don't reuse staging project)
- [ ] Complete Paystack **KYC/Business verification** to unlock live mode
- [ ] Create **separate R2 buckets** (`tertitask-public-prod`, `tertitask-deliveries-prod`)
- [ ] Generate a new `PAYSTACK_WEBHOOK_SECRET` for the production webhook endpoint
- [ ] Set all production env vars on Render (swap `sk_test_` for `sk_live_` etc.)
- [ ] Re-run the four-path matrix on production using your own money
- [ ] All four paths must be "boring" (no errors, correct state at each step)
- [ ] Add the production domain to Firebase authorized domains
- [ ] Update `robots.txt` and `sitemap.xml` with production domain

---

## Part D — Full production-launch checklist (Appendix B)

Copy this into your PR description for the production-launch commit.
Every box must be checked before sharing the URL with real users.

- [ ] All 10 mandatory tests from section 20 pass in CI (`python manage.py test`)
- [ ] Four-path manual matrix passes on **STAGING** with Paystack test keys
- [ ] Four-path manual matrix passes on **PRODUCTION** with real money
- [ ] `CORS_ALLOWED_ORIGINS` on Render lists the exact Vercel production URL — no wildcards
- [ ] Vercel `VITE_API_BASE_URL` points to the Render production URL over HTTPS
- [ ] Firebase **production** project has the Vercel domain in Authorized domains
- [ ] Paystack live webhook URL is `/api/webhooks/paystack/` on the Render production URL, secret set
- [ ] Two Render cron jobs (`auto_approve_orders`, `release_cleared_orders`) scheduled daily
- [ ] `SENTRY_DSN` set on both frontend and backend; a test error appears in Sentry dashboard
- [ ] `DEBUG=False` in production; HSTS, `SECURE_SSL_REDIRECT`, secure cookies all on
- [ ] `robots.txt` and `sitemap.xml` published; `/me/*` and `/orders/*` disallowed
- [ ] R2 buckets: bucket listing **DISABLED**; CORS restricted to frontend origin (`python scripts/r2_harden.py`)
- [ ] Password-manager entries for all production secrets — no plaintext copies anywhere
- [ ] Smoke test passes: `API_URL=<render-url> FRONTEND_URL=<vercel-url> bash scripts/smoke.sh`

Only after all boxes are checked: share the URL with real users.
