# Render Deploy Runbook

Complete step-by-step guide for deploying the TertiTask backend to Render.

---

## Prerequisites

- Render account at [render.com](https://render.com)
- GitHub repo `tertitask-api` connected to Render (Settings → Connected Accounts → GitHub)
- All env var values ready (Firebase JSON, Paystack keys, R2 keys)

---

## Step 1 — Create PostgreSQL database

1. Render Dashboard → **New** → **PostgreSQL**
2. Settings:
   | Field | Value |
   |-------|-------|
   | Name | `tertitask-db` |
   | Database | `tertitask` |
   | User | `tertitask` |
   | Region | Frankfurt (EU) — or closest to Ghana |
   | Plan | **Starter** (free for 90 days, then ~$7/mo) |
3. Click **Create Database**
4. On the database info page, copy the **Internal Database URL** — you'll use this as `DATABASE_URL` in the web service (internal URLs are faster and free of egress charges on Render)

> Screenshot location: Database page → "Connections" tab → "Internal Database URL"

---

## Step 2 — Create Redis instance

1. Render Dashboard → **New** → **Redis**
2. Settings:
   | Field | Value |
   |-------|-------|
   | Name | `tertitask-redis` |
   | Region | Same region as PostgreSQL |
   | Plan | **Starter** |
3. Click **Create Redis**
4. Copy the **Internal Redis URL** — use this as `CACHE_URL`

> Screenshot location: Redis page → "Connect" tab → "Internal Redis URL"

---

## Step 3 — Create the Web Service

1. Render Dashboard → **New** → **Web Service**
2. Connect repo: select `tertitask-api`, branch `main`
3. Settings:
   | Field | Value |
   |-------|-------|
   | Name | `tertitask-api` |
   | Region | Same as database |
   | Environment | **Python 3** |
   | Build Command | `pip install -r requirements.txt && python manage.py collectstatic --noinput && python manage.py migrate` |
   | Start Command | `gunicorn tertitask.wsgi` |
   | Plan | **Starter** (free tier, spins down after inactivity — upgrade for production) |
4. Click **Create Web Service** — it will fail on first deploy because env vars aren't set yet. That's fine; proceed to Step 4.

> **Note**: Render auto-deploys on every push to `main` once configured.

---

## Step 4 — Add environment variables

On the web service page → **Environment** tab → **Add Environment Variable** for each:

### Core Django

| Key | Value |
|-----|-------|
| `SECRET_KEY` | Generate with: `python -c "import secrets; print(secrets.token_urlsafe(50))"` |
| `DEBUG` | `False` |
| `ALLOWED_HOSTS` | `tertitask-api.onrender.com` (your Render URL — found on service dashboard) |
| `DATABASE_URL` | Internal Database URL from Step 1 |
| `CACHE_URL` | Internal Redis URL from Step 2 |

### CORS — set after Vercel deploy

| Key | Value |
|-----|-------|
| `CORS_ALLOWED_ORIGINS` | `https://tertitask.vercel.app` (your Vercel URL — add after deploying frontend) |

### Firebase

| Key | Value |
|-----|-------|
| `FIREBASE_CREDENTIALS_JSON` | Paste the **entire** service account JSON as a single line. In Firebase Console → Project Settings → Service Accounts → Generate new private key. Minify with: `python -c "import json,sys; print(json.dumps(json.load(open(sys.argv[1]))))" serviceAccountKey.json` |

### Paystack

| Key | Value |
|-----|-------|
| `PAYSTACK_SECRET_KEY` | Test key: `sk_test_...` (Paystack Dashboard → Settings → API Keys) |
| `PAYSTACK_WEBHOOK_SECRET` | Set in Paystack Dashboard → Settings → Webhooks → add endpoint `https://tertitask-api.onrender.com/api/webhooks/paystack/` → copy the generated secret |

### Cloudflare R2 (six keys)

| Key | Value |
|-----|-------|
| `R2_ACCOUNT_ID` | Cloudflare Dashboard → R2 → Account ID (top right) |
| `R2_ACCESS_KEY_ID` | R2 → Manage R2 API Tokens → Create API Token |
| `R2_SECRET_ACCESS_KEY` | From the same API token creation step |
| `R2_PUBLIC_BUCKET` | `tertitask-public` |
| `R2_DELIVERIES_BUCKET` | `tertitask-deliveries` |
| `R2_PUBLIC_BASE_URL` | Custom domain on public bucket, e.g. `https://media.tertitask.app` |
| `R2_DELIVERIES_BASE_URL` | Custom domain on deliveries bucket, e.g. `https://deliveries.tertitask.app` |

> If you don't have custom R2 domains yet, use the R2 public bucket URL from the bucket settings page.

### Business logic

| Key | Value |
|-----|-------|
| `PLATFORM_FEE_PERCENT` | `10` |
| `CLEARING_DAYS` | `7` |
| `AUTO_APPROVE_DAYS` | `3` |
| `MIN_WITHDRAWAL_AMOUNT` | `5000` |
| `FRONTEND_URL` | `https://tertitask.vercel.app` |

After adding all vars, click **Save Changes** — Render will trigger a new deploy.

---

## Step 5 — Create Cron Jobs

1. Render Dashboard → **New** → **Cron Job**
2. Create the first cron:
   | Field | Value |
   |-------|-------|
   | Name | `auto-approve-orders` |
   | Repo | `tertitask-api` (same repo, `main` branch) |
   | Schedule | `0 2 * * *` (02:00 UTC daily) |
   | Build Command | `pip install -r requirements.txt` |
   | Command | `python manage.py auto_approve_orders` |
   | Environment | Same env vars as the web service (Render lets you link env groups) |

3. Create the second cron:
   | Field | Value |
   |-------|-------|
   | Name | `release-cleared-orders` |
   | Repo | `tertitask-api` |
   | Schedule | `15 2 * * *` (02:15 UTC daily) |
   | Build Command | `pip install -r requirements.txt` |
   | Command | `python manage.py release_cleared_orders` |

> **Tip**: Create an **Environment Group** (Render Dashboard → Environment Groups) with all shared vars, then link it to the web service and both cron jobs so you only manage them in one place.

---

## Step 6 — Verify the deploy

Once the web service shows **Live**:

```bash
curl https://tertitask-api.onrender.com/api/health/
# Expected: {"status": "ok", "service": "tertitask-api"}
```

Also check:
```bash
curl https://tertitask-api.onrender.com/api/categories/
# Expected: JSON array of 10 categories (seeded by migration 0002)
```

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `ModuleNotFoundError: decouple` | Build command didn't run — check build logs |
| `django.db.OperationalError` | DATABASE_URL is wrong or DB not ready — check internal URL |
| CORS errors in browser | CORS_ALLOWED_ORIGINS doesn't match your Vercel domain exactly (no trailing slash) |
| Firebase auth fails | FIREBASE_CREDENTIALS_JSON is not valid JSON — try minifying again |
| 502 on Paystack webhook | PAYSTACK_WEBHOOK_SECRET doesn't match the Paystack dashboard secret |
| Render free tier sleeping | Upgrade to Starter paid plan or use a cron ping to keep it warm |

---

## Environment variable checklist

```
SECRET_KEY                  ✓
DEBUG                       ✓
ALLOWED_HOSTS               ✓
DATABASE_URL                ✓
CACHE_URL                   ✓
CORS_ALLOWED_ORIGINS        ✓ (update after Vercel deploy)
FIREBASE_CREDENTIALS_JSON   ✓
PAYSTACK_SECRET_KEY         ✓
PAYSTACK_WEBHOOK_SECRET     ✓
R2_ACCOUNT_ID               ✓
R2_ACCESS_KEY_ID            ✓
R2_SECRET_ACCESS_KEY        ✓
R2_PUBLIC_BUCKET            ✓
R2_DELIVERIES_BUCKET        ✓
R2_PUBLIC_BASE_URL          ✓
R2_DELIVERIES_BASE_URL      ✓
PLATFORM_FEE_PERCENT        ✓
CLEARING_DAYS               ✓
AUTO_APPROVE_DAYS           ✓
MIN_WITHDRAWAL_AMOUNT       ✓
FRONTEND_URL                ✓
```
