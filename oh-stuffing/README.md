# Oh Stuffing!

Your grocery & meal-planning app — ready to use in the browser.

It already saves your lists, meals, pantry, recipes, and settings on the device (no account / no Supabase needed for this version).

## Run it (with photo AI proxy)

From the **repo root** (not this folder):

```bash
npm run dev
```

Then open [http://127.0.0.1:3847](http://127.0.0.1:3847).

That starts Next.js, which serves this HTML app and `/api/vision` (Anthropic proxy — avoids browser CORS).

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
- Settings (text size, contrast, theme, accent color, optional Anthropic API key)

## Photo / AI features

Pantry scan, meal ideas from stock, recipe photo scan, flyer check, and recipe scaling/diet swaps work when you paste your own **Anthropic API key** in Settings (⚙️).

- Get a key at [console.anthropic.com](https://console.anthropic.com) — a Claude Pro *chat* subscription is **not** an API key.
- The key is stored only in this browser (localStorage). Fine for personal/demo use; don’t paste a shared or work key.
- Calls go through `/api/vision` when hosted on Next/Vercel (recommended). No need to open the app inside Claude.
- Without a key, the camera still works; AI identification asks you to add a key.

## Live site

**Deploy like Fiona:** push the **whole** repo to GitHub → Vercel auto-deploys.

Do not upload only this `index.html` to GitHub — that is what made Oh Stuffing feel broken compared to Fiona. Vercel needs `package.json`, `src/app/api/vision`, and `public/` so Photo & AI helper works.

GitHub Pages can host HTML only. For Photo & AI, use Vercel.
