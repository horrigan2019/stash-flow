# Oh Stuffing!

Grocery & meal planning — shopping list by aisle, pantry photos, **What can I make?**, recipes, flyer check, leftover countdown.

**Freemium:** core list tools are free; **Photo & AI** (What's My Stock pantry camera + AI meal ideas) is **$7.99/mo or $49/yr** via email signup + Stripe Checkout.

## Deploy (like Fiona)

**Push to GitHub → Vercel auto-deploys.**

Same flow as Fiona: the **whole** app lives on GitHub (`package.json`, `src/`, `public/`, API routes). Vercel imports that project and updates the live site when you push.

1. Push this full repo to [horrigan2019/stash-flow](https://github.com/horrigan2019/stash-flow) (`main`)
2. In [Vercel](https://vercel.com): Import **stash-flow** (or refresh if already connected)
3. Framework: **Next.js** · Build: `next build`
4. Add environment variables (names below) → **Save** → **Deployments** → ⋮ on the latest → **Redeploy**
5. Open the `*.vercel.app` URL → use the free list/meal/countdown tools → tap **What's My Stock** to see the upgrade path → sign up → subscribe for Photo & AI
6. Optional later: Domains → add **ohstuffing.com**

**Never paste secret keys into chat** — only into Vercel Environment Variables.

---

## Environment variables (Vercel)

Set these under **Project → Settings → Environment Variables** (Production, and Preview if you want). After changing any of them, **Redeploy**.

### Required for Photo / AI (existing)

| Name | Notes |
| --- | --- |
| `ANTHROPIC_API_KEY` | Server-only Anthropic key for `/api/vision` (subscribers only) |

### Required for paid signup (production)

| Name | Notes |
| --- | --- |
| `AUTH_SECRET` | Long random string used to sign login cookies (e.g. `openssl rand -hex 32`) |
| `STRIPE_SECRET_KEY` | Stripe secret key (`sk_live_…` or `sk_test_…`) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret (`whsec_…`) |
| `STRIPE_PRICE_MONTHLY` | Stripe Price ID for **$7.99/month** |
| `STRIPE_PRICE_YEARLY` | Stripe Price ID for **$49/year** |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST URL (account storage) |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST token |

### Optional

| Name | Notes |
| --- | --- |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Only if you later add Stripe.js on the client (Checkout uses server redirects today) |
| `NEXT_PUBLIC_APP_URL` | Canonical site URL (e.g. `https://www.ohstuffing.com`) for Checkout success/cancel links |

**Local / missing Stripe or Redis:** the app still boots. Auth uses an in-memory store; choosing a plan **mock-unlocks Photo & AI** without charging a card. Free features work without an account.

---

## Stripe Dashboard steps (Debra)

1. [Stripe Dashboard](https://dashboard.stripe.com) → **Product catalog** → create a product **Oh Stuffing**
2. Add two **recurring** prices:
   - **$7.99 USD / month** → copy Price ID → `STRIPE_PRICE_MONTHLY`
   - **$49 USD / year** → copy Price ID → `STRIPE_PRICE_YEARLY`
3. **Developers → API keys** → copy Secret key → `STRIPE_SECRET_KEY` (Publishable key optional for now)
4. **Developers → Webhooks → Add endpoint**
   - URL: `https://www.ohstuffing.com/api/stripe/webhook` (or your `*.vercel.app` URL + `/api/stripe/webhook`)
   - Events: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`
   - Copy **Signing secret** → `STRIPE_WEBHOOK_SECRET`
5. **Settings → Billing → Customer portal** → enable so customers can cancel / update payment method
6. Paste all env vars in Vercel → **Redeploy**

### Upstash (account database — no Supabase)

1. Create a free Redis database at [Upstash](https://upstash.com)
2. Copy **REST URL** and **REST TOKEN** into Vercel as `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`
3. Redeploy

Without Upstash, signups only live in that one server instance’s memory (fine for local testing, not for production).

---

## Run locally

```bash
npm install
# optional for Photo AI locally:
# export ANTHROPIC_API_KEY=sk-ant-...
# optional paid stack (omit to use mock unlock + memory store):
# export AUTH_SECRET=dev-secret
# export STRIPE_SECRET_KEY=sk_test_...
# export STRIPE_WEBHOOK_SECRET=whsec_...
# export STRIPE_PRICE_MONTHLY=price_...
# export STRIPE_PRICE_YEARLY=price_...
# export UPSTASH_REDIS_REST_URL=...
# export UPSTASH_REDIS_REST_TOKEN=...
npm run dev
```

Open [http://127.0.0.1:3847](http://127.0.0.1:3847).

### How to test freemium locally (mock)

1. Open the site → **no paywall** — grocery list, Meal Planning, Countdown, Recipe vault, Share, Send to store work immediately
2. Tap **What's My Stock** → upgrade overlay (free vs Photo & AI). Tap **Continue with free** to return
3. Settings → **Upgrade Photo & AI** → **Sign up** → **Monthly** or **Yearly** → mock unlock (no Stripe keys needed)
4. What's My Stock / Photo AI work; Settings → **Clear mock Photo & AI unlock** to re-test

### How to test with real Stripe (test mode)

1. Set test-mode Stripe + Upstash env vars, restart `npm run dev`
2. Use Stripe CLI: `stripe listen --forward-to localhost:3847/api/stripe/webhook`
3. Put the CLI webhook secret in `STRIPE_WEBHOOK_SECRET`
4. Sign up → Checkout with card `4242 4242 4242 4242` → return to app with Photo & AI unlocked
5. **Manage** opens Customer Portal

---

## Install on your phone (PWA)

Oh Stuffing! can live on your home screen like an app (no App Store). After the site is live on HTTPS:

- **iPhone (Safari):** open [ohstuffing.com](https://www.ohstuffing.com) → tap **Share** → **Add to Home Screen** → Add.
- **Android (Chrome):** open the site → tap the browser menu **⋮** → **Install app** or **Add to Home screen**. Or open **Settings** (gear) in the app and tap **Install app** when that button appears.

Then open the home-screen icon for a full-screen Oh Stuffing! experience. Photo / AI still needs a network connection and a subscription.

## What’s in this repo

| Piece | Role |
| --- | --- |
| `public/index.html` | The Oh Stuffing UI (free core + Photo & AI upgrade) |
| `public/manifest.webmanifest` + `public/icons/` | Home-screen name, colors, and icons |
| `public/sw.js` | Light offline shell cache (does not touch `/api/*`) |
| `src/app/api/vision` | Next.js proxy — `ANTHROPIC_API_KEY`; requires signed-in subscriber |
| `src/app/api/auth/*` | Email signup / login / logout / session |
| `src/app/api/stripe/*` | Checkout, Customer Portal, webhook, mock cancel |
| `package.json` / `vercel.json` | Normal Vercel Next.js app (like Fiona’s full-project deploy) |

## Photo / AI (paid)

Photo scan, meal ideas from stock photos, recipe helpers that call Anthropic, and flyer check use the **server** key (`ANTHROPIC_API_KEY` on Vercel). `/api/vision` returns **401** if not signed in and **402** if not subscribed. End users never see or paste an API key.

A Claude Pro *chat* plan is not an API key — create one at [console.anthropic.com](https://console.anthropic.com) for the site owner only.

GitHub Pages can host HTML only; use **Vercel** for Photo & AI helper and paid signup.

### Debra: “Photo AI is temporarily unavailable” / scans fail after updating the key

**Most common live cause (checked on ohstuffing.com):** Production is running with `storeBackend: "memory"` — meaning **Upstash Redis is not set**. On Vercel, `/api/auth/session` and `/api/vision` are separate serverless functions, so a mock Upgrade can look unlocked in Settings while Photo AI still returns “session could not be loaded” / vague unavailable. Updating `ANTHROPIC_API_KEY` alone does **not** fix that.

**Do this in order:**

1. Open [Vercel](https://vercel.com) → **stash-flow** → **Settings → Environment Variables** (Production)  
2. Add **Upstash** (required for accounts across Photo AI):  
   - `UPSTASH_REDIS_REST_URL`  
   - `UPSTASH_REDIS_REST_TOKEN`  
   Free Redis at [upstash.com](https://upstash.com) → copy REST URL + token  
3. Confirm **`ANTHROPIC_API_KEY`** is also set for **Production** (`sk-ant-…` from [console.anthropic.com](https://console.anthropic.com) → API keys — not a Claude chat login). Preview-only does not count.  
4. **Deployments** → ⋮ on latest Production → **Redeploy** (env changes need a redeploy)  
5. On the phone: hard-refresh (or clear site data / reopen PWA), **log out → sign back in → Upgrade again**, then What’s My Stock → **See what’s there**  
6. If it still fails: Vercel → **Logs** while you tap scan — look for `/api/vision` status (401/402/503). Anthropic console → usage/billing if you get past auth.

Subscription unlock only means the **account** may call Photo & AI. The **server** still needs a working Anthropic key **and** shared account storage (Upstash) in production.

App models used: `claude-haiku-4-5` (quick scans) and `claude-sonnet-4-5` (heavier helpers). Invalid test names like `claude-opus-5` are **not** used by the live app.

If the key is missing or Anthropic rejects it, the app shows an owner-actionable message (not a vague “try again later”), and never asks shoppers for a key.
