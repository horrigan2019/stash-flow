# Oh Stuffing!

**Product app:** single-file UI in [`oh-stuffing/index.html`](./oh-stuffing/index.html) (also served from [`public/index.html`](./public/index.html)).

**AI photo features** call a small Next.js proxy at `/api/vision` so the browser does not hit Anthropic CORS. Paste your Anthropic API key in Settings (⚙️) — same personal-key UX as before.

## Run locally (Cursor preview)

```bash
npm run dev
```

Open [http://127.0.0.1:3847](http://127.0.0.1:3847).

## Deploy on Vercel (like Fiona)

**Important:** Vercel needs this **whole** Next.js project on GitHub (`package.json`, `src/`, `public/`, etc.). If the GitHub repo only has one `index.html`, push the full Cursor project first — then deploy.

1. Open [vercel.com](https://vercel.com) → **Add New Project** → Import **stash-flow**
2. Framework: **Next.js** (leave Build Command `next build`)
3. Env vars: **none required** if you paste your API key in the app Settings. Optional: `ANTHROPIC_API_KEY` for a shared server key.
4. Click **Deploy**. Open the `*.vercel.app` URL, put your key in Settings, try **What's My Stock**.
5. Later: in Vercel → Project → Domains, add **ohstuffing.com** (same idea as Fiona).

GitHub Pages cannot run `/api/vision`. Use Vercel for the live site with AI photo features.

## Older React scaffold

The `src/components/*` grocery prototype is unused by the shipped UI. Keep it; `/` is rewritten to the HTML app.
