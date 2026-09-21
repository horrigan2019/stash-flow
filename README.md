# Oh Stuffing!

Grocery & meal planning — shopping list by aisle, pantry photos, **What can I make?**, recipes, and flyer check.

## Deploy (like Fiona)

**Push to GitHub → Vercel auto-deploys.**

Same flow as Fiona: the **whole** app lives on GitHub (`package.json`, `src/`, `public/`, API routes). Vercel imports that project and updates the live site when you push.

1. Push this full repo to [horrigan2019/stash-flow](https://github.com/horrigan2019/stash-flow) (`main`)
2. In [Vercel](https://vercel.com): Import **stash-flow** (or refresh if already connected)
3. Framework: **Next.js** · Build: `next build`
4. Add the Anthropic key as a **server** env var (customers never paste a key in the app):
   - Vercel project → **Settings** → **Environment Variables**
   - Name: `ANTHROPIC_API_KEY`
   - Value: your Anthropic API key (from [console.anthropic.com](https://console.anthropic.com))
   - Environment: **Production** (and Preview if you want)
   - Save → **Deployments** → ⋮ on the latest → **Redeploy**
5. Open the `*.vercel.app` URL → try **What's My Stock** / **What can I make?** (no Settings key needed)
6. Optional later: Domains → add **ohstuffing.com**

If GitHub only has one old `index.html`, Vercel cannot run Photo & AI helper. Push this complete Next.js project first.

**Never paste your Anthropic key into chat** — only into the Vercel Environment Variables field.

## Run locally

```bash
npm install
# optional for Photo AI locally:
# export ANTHROPIC_API_KEY=sk-ant-...
npm run dev
```

Open [http://127.0.0.1:3847](http://127.0.0.1:3847).

## Install on your phone (PWA)

Oh Stuffing! can live on your home screen like an app (no App Store). After the site is live on HTTPS:

- **iPhone (Safari):** open [ohstuffing.com](https://www.ohstuffing.com) → tap **Share** → **Add to Home Screen** → Add.
- **Android (Chrome):** open the site → tap the browser menu **⋮** → **Install app** or **Add to Home screen**. Or open **Settings** (gear) in the app and tap **Install app** when that button appears.

Then open the home-screen icon for a full-screen Oh Stuffing! experience. Photo / AI still needs a network connection.

## What’s in this repo

| Piece | Role |
| --- | --- |
| `public/index.html` | The Oh Stuffing UI (Photo & AI, What can I make?) |
| `public/manifest.webmanifest` + `public/icons/` | Home-screen name, colors, and icons |
| `public/sw.js` | Light offline shell cache (does not touch `/api/vision`) |
| `src/app/api/vision` | Next.js proxy — uses server `ANTHROPIC_API_KEY` |
| `package.json` / `vercel.json` | Normal Vercel Next.js app (like Fiona’s full-project deploy) |

## Photo / AI

Photo scan, meal ideas, recipe helpers, and flyer check use the **server** key (`ANTHROPIC_API_KEY` on Vercel). End users never see or paste an API key. Live site calls `/api/vision`.

A Claude Pro *chat* plan is not an API key — create one at [console.anthropic.com](https://console.anthropic.com) for the site owner only.

GitHub Pages can host HTML only; use **Vercel** for Photo & AI helper.
