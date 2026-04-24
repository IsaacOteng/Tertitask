# Vercel Deploy Runbook

Deploy the TertiTask frontend (React + Vite) to Vercel.

---

## Prerequisites

- Vercel account at [vercel.com](https://vercel.com)
- GitHub repo `tertitask-web` connected to Vercel (Vercel Dashboard → Settings → Git Integration)
- Render backend deployed and its URL known (see `deploy-render.md`)

---

## Step 1 — Create the Vercel project

1. Vercel Dashboard → **Add New** → **Project**
2. Import the `tertitask-web` repository
3. Configure the project:
   | Field | Value |
   |-------|-------|
   | Framework Preset | **Vite** |
   | Root Directory | `frontend` (if monorepo) or leave blank |
   | Build Command | `npm run build` |
   | Output Directory | `dist` |
   | Install Command | `npm install` |
4. Do **not** deploy yet — add env vars first (Step 2)

---

## Step 2 — Add environment variables

In the project settings → **Environment Variables**, add:

| Key | Value | Environment |
|-----|-------|-------------|
| `VITE_API_BASE_URL` | `https://tertitask-api.onrender.com` | Production, Preview |
| `VITE_FIREBASE_API_KEY` | From Firebase Console → Project Settings → Your apps | Production, Preview |
| `VITE_FIREBASE_AUTH_DOMAIN` | `<project-id>.firebaseapp.com` | Production, Preview |
| `VITE_FIREBASE_PROJECT_ID` | Your Firebase project ID | Production, Preview |
| `VITE_SENTRY_DSN` | From Sentry → Project → SDK Setup (optional but recommended) | Production |

> **Where to find Firebase values**: Firebase Console → Project Settings → General → Your apps → SDK setup and configuration → Config object. Copy `apiKey`, `authDomain`, `projectId`.

---

## Step 3 — Confirm vercel.json SPA rewrite

The file `frontend/vercel.json` must exist and contain:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

This was added in Phase 1. Verify with:
```bash
cat frontend/vercel.json
```

Without this, any direct navigation to `/browse`, `/gig/:id`, etc. returns a 404 from Vercel's CDN.

---

## Step 4 — Deploy

1. Click **Deploy** in Vercel
2. Watch the build log — it should complete in ~30 seconds
3. Once green, Vercel assigns a URL like `https://tertitask-web.vercel.app`
4. Click the URL to confirm the landing page loads and the hero search works

---

## Step 5 — Update Render CORS + ALLOWED_HOSTS

After getting your Vercel URL, go back to the Render web service:

1. **Environment** tab → update `CORS_ALLOWED_ORIGINS`:
   ```
   https://tertitask-web.vercel.app
   ```
   If you later add a custom domain (e.g. `tertitask.app`), append it comma-separated:
   ```
   https://tertitask-web.vercel.app,https://tertitask.app
   ```

2. Update `ALLOWED_HOSTS`:
   ```
   tertitask-api.onrender.com
   ```
   (No `https://` prefix — this is just the hostname.)

3. Update `FRONTEND_URL`:
   ```
   https://tertitask-web.vercel.app
   ```
   (Used for Paystack callback URL in order creation.)

4. Click **Save Changes** → Render triggers a redeploy automatically

---

## Step 6 — Authorize the Vercel domain in Firebase

Firebase blocks sign-in from unknown domains by default.

1. Firebase Console → **Authentication** → **Settings** tab → **Authorized domains**
2. Click **Add domain**
3. Enter: `tertitask-web.vercel.app` (no `https://`)
4. If you have a custom domain, add that too
5. Click **Add**

Test: open the Vercel URL in an incognito window → click Sign in → Firebase should not throw `auth/unauthorized-domain`

---

## Step 7 — Configure Paystack webhook

1. Paystack Dashboard → **Settings** → **API Keys & Webhooks**
2. Under **Webhook URL**, enter:
   ```
   https://tertitask-api.onrender.com/api/webhooks/paystack/
   ```
3. Paystack will show a **secret hash** — copy it
4. In Render, set `PAYSTACK_WEBHOOK_SECRET` to that value (redeploy if changing)
5. Back in Paystack, click **Send Test Event** → the Render logs should show a 200 response

> **Test webhook**: Render Dashboard → web service → **Logs** tab. Filter for `webhooks`.

---

## Smoke test checklist

After wiring everything together, verify:

- [ ] `https://tertitask-web.vercel.app` loads the landing page
- [ ] Category tiles link correctly to `/browse?category=...`
- [ ] Sign-in via Firebase works (no `unauthorized-domain` error)
- [ ] Onboarding form saves to the Render API (`GET /api/me/` returns data)
- [ ] Browse gigs loads (categories and gigs from Render DB)
- [ ] `https://tertitask-api.onrender.com/api/health/` returns `{"status": "ok"}`
- [ ] Paystack test webhook returns 200 in Render logs

---

## Custom domain (optional)

1. Vercel → Project → **Settings** → **Domains** → Add `tertitask.app`
2. Add DNS records at your registrar as Vercel instructs (usually A + CNAME)
3. Repeat Step 5 and Step 6 with the custom domain
4. For Render: also add `tertitask.app` to `ALLOWED_HOSTS` if you route API traffic through it

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Blank page on direct URL (e.g. `/browse`) | `vercel.json` rewrite missing or wrong |
| Firebase `auth/unauthorized-domain` | Add the Vercel domain in Firebase Console → Auth → Settings → Authorized domains |
| API calls fail with CORS error | `CORS_ALLOWED_ORIGINS` on Render doesn't match exact Vercel URL (no trailing slash) |
| `VITE_API_BASE_URL` undefined | Env var not set in Vercel or not prefixed with `VITE_` |
| Paystack webhook returns 401 | `PAYSTACK_WEBHOOK_SECRET` on Render doesn't match the Paystack dashboard secret |
| Vercel build fails | Check build log — usually a missing dependency or wrong root directory |
