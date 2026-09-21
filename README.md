# Oh Stuffing!

Grocery & meal planning — shopping list by aisle, pantry photos, **What can I make?**, recipes, flyer check, leftover countdown. **Paid accounts** ($7.99/mo or $49/yr) via email signup + Stripe Checkout.

## Deploy (like Fiona)

**Push to GitHub → Vercel auto-deploys.**

Same flow as Fiona: the **whole** app lives on GitHub (`package.json`, `src/`, `public/`, API routes). Vercel imports that project and updates the live site when you push.

1. Push this full repo to [horrigan2019/stash-flow](https://github.com/horrigan2019/stash-flow) (`main`)
2. In [Vercel](https://vercel.com): Import **stash-flow** (or refresh if already connected)
3. Framework: **Next.js** · Build: `next build`
4. Add environment variables (names below) → **Save** → **Deployments** → ⋮ on the latest → **Redeploy**
5. Open the `*.vercel.app` URL → sign up → subscribe → try **What's My Stock** / meal planning
6. Optional later: Domains → add **ohstuffing.com**

**Never paste secret keys into chat** — only into Vercel Environment Variables.

---

## Environment variables (Vercel)

Set these under **Project → Settings → Environment Variables** (Production, and Preview if you want). After changing any of them, **Redeploy**.

### Required for Photo / AI (existing)

| Name | Notes |
| --- | --- |
| `ANTHROPIC_API_KEY` | Server-only Anthropic key for `/api/vision` |

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

**Local / missing Stripe or Redis:** the app still boots. Auth uses an in-memory store; choosing a plan **mock-unlocks** without charging a card.

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

### How to test paid flow locally (mock)

1. Open the site → you should see the **Oh Stuffing!** signup / pricing gate
2. **Sign up** with any email + password (8+ chars)
3. Tap **Monthly** or **Yearly** → mock unlock (no Stripe keys needed)
4. Core features (list, Meal Planning, Countdown, What's My Stock, etc.) work
5. Settings → **Clear mock unlock** or **Log out** to re-test the gate

### How to test with real Stripe (test mode)

1. Set test-mode Stripe + Upstash env vars, restart `npm run dev`
2. Use Stripe CLI: `stripe listen --forward-to localhost:3847/api/stripe/webhook`
3. Put the CLI webhook secret in `STRIPE_WEBHOOK_SECRET`
4. Sign up → Checkout with card `4242 4242 4242 4242` → return to app subscribed
5. **Manage** opens Customer Portal

---

## Install on your phone (PWA)

Oh Stuffing! can live on your home screen like an app (no App Store). After the site is live on HTTPS:

- **iPhone (Safari):** open [ohstuffing.com](https://www.ohstuffing.com) → tap **Share** → **Add to Home Screen** → Add.
- **Android (Chrome):** open the site → tap the browser menu **⋮** → **Install app** or **Add to Home screen**. Or open **Settings** (gear) in the app and tap **Install app** when that button appears.

Then open the home-screen icon for a full-screen Oh Stuffing! experience. Photo / AI still needs a network connection.

## What’s in this repo

| Piece | Role |
| --- | --- |
| `public/index.html` | The Oh Stuffing UI (Photo & AI, What can I make?, paid gate) |
| `public/manifest.webmanifest` + `public/icons/` | Home-screen name, colors, and icons |
| `public/sw.js` | Light offline shell cache (does not touch `/api/*`) |
| `src/app/api/vision` | Next.js proxy — uses server `ANTHROPIC_API_KEY` |
| `src/app/api/auth/*` | Email signup / login / logout / session |
| `src/app/api/stripe/*` | Checkout, Customer Portal, webhook, mock cancel |
| `package.json` / `vercel.json` | Normal Vercel Next.js app (like Fiona’s full-project deploy) |

## Photo / AI

Photo scan, meal ideas, recipe helpers, and flyer check use the **server** key (`ANTHROPIC_API_KEY` on Vercel). End users never see or paste an API key. Live site calls `/api/vision`.

A Claude Pro *chat* plan is not an API key — create one at [console.anthropic.com](https://console.anthropic.com) for the site owner only.

GitHub Pages can host HTML only; use **Vercel** for Photo & AI helper and paid signup.
