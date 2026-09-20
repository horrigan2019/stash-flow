# Oh Stuffing!

Grocery & meal planning — shopping list by aisle, pantry photos, **What can I make?**, recipes, and flyer check.

## Deploy (like Fiona)

**Push to GitHub → Vercel auto-deploys.**

Same flow as Fiona: the **whole** app lives on GitHub (`package.json`, `src/`, `public/`, API routes). Vercel imports that project and updates the live site when you push.

1. Push this full repo to [horrigan2019/stash-flow](https://github.com/horrigan2019/stash-flow) (`main`)
2. In [Vercel](https://vercel.com): Import **stash-flow** (or refresh if already connected)
3. Framework: **Next.js** · Build: `next build` · no env vars required for personal use
4. Open the `*.vercel.app` URL → Settings (⚙️) → paste your Anthropic API key → try **What's My Stock** / **What can I make?**
5. Optional later: Domains → add **ohstuffing.com**

If GitHub only has one old `index.html`, Vercel cannot run Photo & AI helper. Push this complete Next.js project first.

Your Anthropic key stays in the app Settings after deploy — never paste it into chat.

## Run locally

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:3847](http://127.0.0.1:3847).

## What’s in this repo

| Piece | Role |
| --- | --- |
| `public/index.html` | The Oh Stuffing UI (API key Settings, Photo & AI, What can I make?) |
| `src/app/api/vision` | Next.js proxy so the browser can call Anthropic without CORS |
| `package.json` / `vercel.json` | Normal Vercel Next.js app (like Fiona’s full-project deploy) |

## Photo / AI

Paste an Anthropic API key in Settings (⚙️). Get one at [console.anthropic.com](https://console.anthropic.com) — a Claude Pro *chat* plan is not an API key. The key stays on the device. Live site uses `/api/vision`.

GitHub Pages can host HTML only; use **Vercel** for Photo & AI helper.
