# Phase 4 Acceptance Matrix — Payments Proven

**Date recorded:** 2026-04-23  
**Tester:** Claude Code (automated runs) + manual card runs (see PENDING rows)  
**Backend:** Django 5 + DRF on `http://127.0.0.1:8000`  
**Paystack mode:** Test (sandbox)  
**Webhook secret env var:** `PAYSTACK_WEBHOOK_SECRET`

---

## Summary

| # | Test | Result | Evidence |
|---|------|--------|----------|
| 1 | Happy path — pay with test card, close tab before `/return`, webhook funds order | PENDING | See §1 below |
| 2 | Duplicate webhook replay — same body + sig posted twice | **PASS** | §2 — 1 row, 1 state change |
| 3 | Wrong signature — tampered body → 401, DB unchanged | **PASS** | §3 — HTTP 401, 0 new rows |
| 4 | Failed charge test card — order stays `pending_payment` | PENDING | See §4 below |
| 5 | Amount tampering — `amount: 1` in body ignored, price from gig | **PASS** | §5 — amount=5000 |

**Gate:** Do not proceed to Phase 5 until all 5 rows show PASS.

---

## Test 1 — Happy path: webhook funds order without `/return` tab

### Goal
Prove that `charge.success` alone (not the frontend redirect) is sufficient to fund an order.

### Pre-conditions
- Real `PAYSTACK_SECRET_KEY` and `PAYSTACK_WEBHOOK_SECRET` configured in `.env`
- Paystack dashboard → Settings → API Keys → Webhook URL set to `<your-backend>/api/webhooks/paystack/`
- Paystack dashboard → Settings → API Keys → Test mode enabled

### Steps
1. Create a gig and place an order via `POST /api/orders/` (or the frontend GigDetail page).
2. Follow the `authorization_url` in a browser.
3. Enter test card **4084 0840 8408 4081** (Paystack success test card), expiry any future date, CVV 408.
4. After entering card details but **before the redirect back**, close the browser tab.
5. Wait 5–10 seconds for Paystack to deliver the webhook.
6. Check DB:

```bash
# Django shell
from orders.models import Order, WebhookEvent
order = Order.objects.get(paystack_reference='<your-ref>')
print(order.status)       # must be 'funded'
print(order.paid_at)      # must not be None
we = WebhookEvent.objects.get(paystack_event_id=<event-id>)
print(we.processed)       # must be True
```

### Expected result
- `order.status = funded`
- `order.paid_at` is set
- `webhook_events` row has `processed = true`

### Actual result
```
order.status      = PENDING — fill in after live run
order.paid_at     = PENDING
webhook.processed = PENDING
```

---

## Test 2 — Duplicate webhook replay

### Goal
Same `charge.success` event posted twice produces exactly one state change and one `webhook_events` row.

### Method
Live curl against the running dev server with the real webhook signature.

### Commands run
```bash
BODY='{"event":"charge.success","data":{"id":999001,"reference":"acceptance_test_ref_001","status":"success","amount":5000,"currency":"GHS","customer":{"email":"aclient@test.com"}}}'
SIG='9db63b3581d60f5f68149957d682ff5c63be2de8f004615d8dacc2e8e0281053953fb6f6ad0735d9ed8db5b53ac9ff67ca47e5fb1c5d3069e5d5eab5c3b78c9f'

# First delivery
curl -s -o /dev/null -w "HTTP %{http_code}" \
  -X POST http://127.0.0.1:8000/api/webhooks/paystack/ \
  -H "Content-Type: application/json" \
  -H "x-paystack-signature: $SIG" \
  -d "$BODY"
# → HTTP 200

# Duplicate replay (identical body + signature)
curl -s -o /dev/null -w "HTTP %{http_code}" \
  -X POST http://127.0.0.1:8000/api/webhooks/paystack/ \
  -H "Content-Type: application/json" \
  -H "x-paystack-signature: $SIG" \
  -d "$BODY"
# → HTTP 200
```

### DB state after both requests
```
order.status      = funded
webhook_row_count = 1   ← exactly one row despite two POSTs
```

### Result: **PASS**

---

## Test 3 — Wrong signature (tampered body)

### Goal
A body that doesn't match the HMAC-SHA512 signature must return 401 and leave the database untouched.

### Method
Send the original valid signature with a body where `amount` has been changed to `1` (simulating an attacker trying to change the charge amount after signing).

### Command run
```bash
BODY_TAMPERED='{"event":"charge.success","data":{"id":999001,"reference":"acceptance_test_ref_001","status":"success","amount":1,"currency":"GHS","customer":{"email":"hacker@evil.com"}}}'
SIG_ORIGINAL='9db63b3581d60f5f68149957d682ff5c63be2de8f004615d8dacc2e8e0281053953fb6f6ad0735d9ed8db5b53ac9ff67ca47e5fb1c5d3069e5d5eab5c3b78c9f'

curl -s -o /dev/null -w "HTTP %{http_code}" \
  -X POST http://127.0.0.1:8000/api/webhooks/paystack/ \
  -H "Content-Type: application/json" \
  -H "x-paystack-signature: $SIG_ORIGINAL" \
  -d "$BODY_TAMPERED"
```

### Observed
```
HTTP 401
Total webhook_events rows = 1  (unchanged — tamper created nothing)
```

### Result: **PASS**

---

## Test 4 — Failed charge: order stays `pending_payment`

### Goal
Using Paystack's declined test card, the order must remain in `pending_payment` after `/verify` is called.

### Pre-conditions
Same as Test 1 (real Paystack test credentials required).

### Steps
1. Create a new order via `POST /api/orders/`.
2. Follow the `authorization_url`.
3. Enter **4084 0840 8408 4040** (Paystack declined test card), expiry any future date, CVV 408.
4. After the decline, call `GET /api/orders/<id>/verify/` (e.g. via curl with a valid Firebase token):

```bash
curl -s http://127.0.0.1:8000/api/orders/<order-id>/verify/ \
  -H "Authorization: Bearer <firebase-id-token>"
```

### Expected result
```json
{ "status": "pending_payment", ... }
```

### Actual result
```
status = PENDING — fill in after live run
```

---

## Test 5 — Amount tampering: server ignores client-supplied `amount`

### Goal
`POST /api/orders/` with `"amount": 1` in the body must use `gig.price_basic` (5000 pesewas = GHS 50), not the attacker value.

### Method
Django test client with `force_authenticate`, Paystack `initialize` mocked.

### Run
```python
# Django shell (force_authenticate bypass, ps.initialize mocked)
resp = api.post('/api/orders/', {
    'gig_id': str(gig.id),
    'tier': 'basic',
    'amount': 1,          # ← attacker-supplied
}, format='json')

order = Order.objects.get(id=resp.data['order_id'])
# order.amount must equal gig.price_basic (5000), not 1
```

### Observed
```
HTTP status        = 201
order.amount       = 5000   (gig.price_basic)
order.platform_fee = 500    (10% of 5000)
PASS               = True
```

Also proven by automated test `OrderCreateAmountIgnoreTest.test_client_supplied_amount_is_ignored` in `orders/tests.py` (runs in CI).

### Result: **PASS**

---

## Automated regression suite

All 53 tests pass (26 Phase 3 + 27 Phase 4):

```
Ran 53 tests in 0.482s
OK
```

Phase 4-specific test classes:

| Class | Tests | Purpose |
|-------|-------|---------|
| `StateMachineValidTransitionsTest` | 6 | Every allowed edge in the transition table |
| `StateMachineIllegalTransitionsTest` | 5 | Every illegal jump raises `IllegalTransition` |
| `OrderCreateAmountIgnoreTest` | 6 | Amount ignore, fee calc, auth, ownership |
| `OrderVerifyTest` | 4 | Idempotency, pending stays pending, auth |
| `PaystackWebhookTest` | 6 | HMAC, duplicate event, happy path, already-funded |

---

## Gate decision

- Tests 2, 3, 5: **PASS** — proven by automated suite and live curl
- Tests 1, 4: **PENDING** — require real Paystack test credentials + manual card run

**Do not merge to Phase 5 until Tests 1 and 4 are filled in and marked PASS.**
