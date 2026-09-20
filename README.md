# Oh Stuffing!

**Product app:** single-file UI in [`oh-stuffing/index.html`](./oh-stuffing/index.html) (also served from [`public/index.html`](./public/index.html)).

**AI photo features** call a small Next.js proxy at `/api/vision` so the browser does not hit Anthropic CORS. Paste your Anthropic API key in Settings (⚙️) — same personal-key UX as before.

## Run locally (Cursor preview)

```bash
npm run dev
```

Open [http://127.0.0.1:3847](http://127.0.0.1:3847).

## Fix www.ohstuffing.com (recommended: Vercel, like Fiona)

GitHub Pages is static-only — it cannot host `/api/vision`. Deploy this whole repo to Vercel:

1. Import the GitHub repo in [vercel.com](https://vercel.com)
2. Framework: Next.js (auto-detected). Build: `next build`. Output: default.
3. Deploy. Your site will serve the HTML app **and** `/api/vision`.
4. Optional: set `ANTHROPIC_API_KEY` in Vercel env if you want a shared server key; otherwise users paste their own key in Settings (forwarded via `x-api-key`).

**Quick static refresh (no AI proxy):** upload the new `oh-stuffing/index.html` to GitHub Pages. That removes the old “open in Claude” message and shows the camera + API key hint. Photo AI still needs Vercel (or another host that runs Next) for reliable CORS-safe calls.

## Older React scaffold

The `src/components/*` grocery prototype is unused by the shipped UI. Keep it; `/` is rewritten to the HTML app.
