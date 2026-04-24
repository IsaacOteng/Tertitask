# Cron Job Setup — Render

TertiTask uses two daily management commands for automated order lifecycle management.

## Commands

### `auto_approve_orders`
Finds all orders with `status='delivered'` and `auto_approve_at < now()`.  
Approves each one: transitions to `approved`, sets `clear_at`, writes an `earning_pending` ledger entry.  
**Configured by:** `AUTO_APPROVE_DAYS` env var (default: 3).

### `release_cleared_orders`
Finds all orders with `status='approved'` and `clear_at < now()`.  
Releases each one: transitions to `released`, writes a debit/credit ledger pair  
(`earning_pending -freelancer_amount`, `earning_cleared +freelancer_amount`).  
**Configured by:** `CLEARING_DAYS` env var (default: 7).

---

## Render Cron Job Configuration

In the [Render Dashboard](https://dashboard.render.com):

1. Go to **New → Cron Job**
2. Connect the same repo/branch as the web service
3. Set **Build Command** (same as web service):
   ```
   pip install -r requirements.txt && python manage.py migrate --noinput
   ```
4. Configure each job:

| Name | Schedule | Command |
|------|----------|---------|
| `tertitask-auto-approve` | `0 3 * * *` (3 AM UTC daily) | `python manage.py auto_approve_orders` |
| `tertitask-release-cleared` | `0 4 * * *` (4 AM UTC daily) | `python manage.py release_cleared_orders` |

5. Set the same environment variables as the web service (copy the env group).

---

## Running Manually

```bash
# Auto-approve overdue deliveries
python manage.py auto_approve_orders

# Release cleared earnings
python manage.py release_cleared_orders
```

Both commands are idempotent — running them multiple times is safe.

---

## Testing Locally

The cron functions are directly callable in tests and the Django shell:

```python
from orders.crons import auto_approve_orders, release_cleared_orders

auto_approve_orders()    # returns count of approved orders
release_cleared_orders() # returns count of released orders
```
