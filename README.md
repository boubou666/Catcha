# Catcha

A Palworld-themed idle/clicker in the spirit of PokéClicker. Browser-only, saves to `localStorage`.

Design notes: [DESIGN.md](DESIGN.md).

## Run

```bash
npm install
npm run dev
```

## Scripts

| Command         | What                                   |
|-----------------|----------------------------------------|
| `npm run dev`   | Vite dev server with HMR               |
| `npm run build` | Production build into `dist/`          |
| `npm run check` | Type-check `.ts` and `.svelte` files   |
| `npm test`      | Vitest — engine unit tests             |
| `npm run fetch-art` | Download Pal art into `public/pals/` (see below) |

## Layout

```
src/
  data/     static content: Pals, routes, items, spheres, element chart  (no logic)
  engine/   pure game logic: combat, catching, party, progress, save     (no DOM, tested)
  state/    game.svelte.ts — the single reactive Game store the UI reads
  ui/       Svelte components, one per screen
```

Balance knobs live in `src/engine/formulas.ts` and `src/data/spheres.ts`.

## Art

Pal images are Pocketpair's and are **not** in the repo. `npm run fetch-art` pulls the Paldeck icon and
render for every Pal in `src/data/pals.ts` from palworld.wiki.gg into `public/pals/` (gitignored).
Without them the UI shows element-coloured placeholder discs. Private use only — don't publish a build
that includes them.

## Status

Region 1 (Windswept Hills) is playable: 7 routes, 2 Alphas, the Rayne Syndicate Tower, 32 Pals,
catching, party, Paldeck, merchant, save/export/import.

Base building is in: assign box Pals as workers (party and base are exclusive), each work
suitability produces something — Lumbering/Mining raw materials, Planting+Watering+Gathering
berries, Kindling smelts, Handiwork crafts spheres and weapons, Farming yields Pal produce,
Transporting/Electricity multiply, Cooling cuts food use. Structures gate and multiply jobs;
workers eat Red Berries and slow down when hungry. Knobs: `src/data/base.ts` (RATES).

Offline progress: on load (and after a laptop-sleep gap) the base is simulated in 60 s chunks for the
time away, capped at 24 h, and a summary shows the deltas. Combat never runs offline.

Condensing: build the Pal Essence Condenser, then feed 4 / 16 / 32 / 64 idle duplicates into a Pal
from the Box for ★1–★4 (+10% attack and work per star). Lucky, starred, party and base Pals are never
consumed.

Next: breeding, tech tree — see DESIGN.md §10.
