# Oh Stuffing!

Your grocery & meal-planning app — ready to use in the browser.

It already saves your lists, meals, pantry, recipes, and settings on the device (no account / no Supabase needed for this version).

## Run it

From this folder:

```bash
npx --yes serve -l 3847
```

Then open [http://127.0.0.1:3847](http://127.0.0.1:3847).

Or open `index.html` directly in Chrome / Edge / Safari.

## What’s included

- Shopping list sorted by aisle
- Voice add (in a real browser / live site)
- Meal planning, events, pantry, recipes, flyer check helpers
- **What can I make?** — after a pantry/fridge scan (or from saved stock), get easy meal ideas and “upgrade what you have” dinners
- Settings (text size, contrast, theme, accent color, optional Anthropic API key)

## Photo / AI features (live site)

Pantry scan, meal ideas from stock, recipe photo scan, flyer check, and recipe scaling/diet swaps work on GitHub Pages / ohstuffing.com when you paste your own **Anthropic API key** in Settings (⚙️).

- Get a key at [console.anthropic.com](https://console.anthropic.com) — a Claude Pro *chat* subscription is **not** an API key.
- The key is stored only in this browser (localStorage). That’s fine for personal/demo use; don’t paste a shared or work key.
- Without a key, the camera and file pickers still work so you can take/pick photos; AI identification shows a clear “add your key” message.
