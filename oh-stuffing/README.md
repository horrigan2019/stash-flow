# Oh Stuffing!

Your grocery & meal-planning app — ready to use in the browser.

**Paid access:** email signup + Stripe ($7.99/mo or $49/yr). Core features (customize grocery, meal planning, leftover countdown, What's My Stock, etc.) unlock after an active subscription. See the root `README.md` for Vercel env vars and Stripe setup.

Local lists/meals still save on the device; accounts are for paid access (no Supabase).

## Run it (with photo AI proxy)

From the **repo root** (not this folder):

```bash
# optional for Photo AI locally:
# export ANTHROPIC_API_KEY=sk-ant-...
npm run dev
```

Then open [http://127.0.0.1:3847](http://127.0.0.1:3847).

That starts Next.js, which serves this HTML app and `/api/vision` (Anthropic proxy — uses server `ANTHROPIC_API_KEY`, avoids browser CORS). Without Stripe keys, signup + plan buttons **mock-unlock** the app for local testing.

Static-only (no proxy):

```bash
npx --yes serve -l 3847
```

Or open `index.html` directly in Chrome / Edge / Safari.

## What’s included

- Shopping list sorted by aisle
- Voice add (in a real browser / live site)
- Meal planning, events, pantry, recipes, flyer check helpers
- **What can I make?** — after a pantry/fridge scan (or from saved stock), get easy meal ideas and “upgrade what you have” dinners
- Leftover & open-food countdown
- Settings (text size, contrast, theme, accent color)
- Email signup / Stripe subscribe gate

## Photo / AI features

Pantry scan, meal ideas from stock, recipe photo scan, flyer check, and recipe scaling/diet swaps work when the **site owner** sets `ANTHROPIC_API_KEY` on Vercel (Environment Variables → Production → Redeploy). **Customers never need an API key.**

- Owner key: [console.anthropic.com](https://console.anthropic.com) — a Claude Pro *chat* subscription is **not** an API key.
- Calls go through `/api/vision` when hosted on Next/Vercel (recommended).
- If AI isn’t configured on the server, the app says Photo AI is temporarily unavailable — it does **not** ask shoppers for a key.

## Install on your phone

From the live HTTPS site:

- **iPhone (Safari):** Share → **Add to Home Screen**
- **Android (Chrome):** menu ⋮ → **Install app** / **Add to Home screen** (or Settings → Install app when shown)

## Live site

**Deploy like Fiona:** push the **whole** repo to GitHub → Vercel auto-deploys → add env vars from the root README (`ANTHROPIC_API_KEY`, Stripe, `AUTH_SECRET`, Upstash) → **Redeploy**.

Do not upload only this `index.html` to GitHub — that is what made Oh Stuffing feel broken compared to Fiona. Vercel needs `package.json`, `src/app/api/*`, and `public/` so Photo & AI helper and paid signup work.

GitHub Pages can host HTML only. For Photo & AI and Stripe, use Vercel.
