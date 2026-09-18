# Oh Stuffing!

Mobile-first grocery and event budget app. Walk the store in aisle order, check items into your cart, and keep the Weekly Stash offline-ready on device.

## Stack

- Next.js (App Router) + React
- Tailwind CSS
- Lucide React icons
- LocalStorage persistence (no backend required)

## Run locally

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:3847](http://127.0.0.1:3847).

## What’s in this slice

- **Weekly Stash** (default tab) — brand header, voice intake mic (demo), aisle walk-flow cards, checkboxes that move items into **Stuffed in Cart**
- **Feast Runway** — placeholder for event menus / guest budgets
- **Pantry & Settings** — offline note + reset sample list

Frozen stays locked at the bottom of the aisle list so cold items stay last on the walk.
