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

Six regions: Windswept Hills (Lv 1–15, Zoe & Grizzbolt), Marsh & Bamboo Groves (Lv 15–25, Lily &
Lyleen), Twilight Dunes (Lv 25–35, Axel & Orserk), Mount Obsidian (Lv 35–45, Marcus & Faleris),
Astral Mountains (Lv 45–55, Victor & Shadowbeak) and Sakurajima (Lv 55–62, Saya & Selyne) — 42
routes, 17 Alphas, 155 Pals including 29 subspecies and the legendaries. Subspecies use
id = 1000 + base, show as `#031B`, and only come from same-species pairs or `SPECIAL_COMBOS`. Catching,
party, Paldeck, merchant, save/export/import. Each region opens when the previous tower falls; a region
switcher appears above the routes.

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

Breeding: build the Breeding Farm, bake Cake at the Workbench (8 Red Berries, 8 Eggs, 5 Milk), pair two
idle Pals. One Cake → one egg every 5 min; eggs incubate by rarity (2–40 min) and hatch into the box at
level 1. Same species breeds true, otherwise the child is the species with breeding power closest to the
parents' average (`SPECIAL_COMBOS` in `engine/breeding.ts` for fixed pairs). Works offline.

Tech tree: 2 tech points per level. Structures and recipes must be researched (level-gated, some with
prerequisites) before they can be built or crafted; passive techs multiply click damage, party attack,
base output, catch rate, exp and gold. Tree lives in `src/data/tech.ts`.

Next: passives, Feybreak, dungeons — see DESIGN.md §10.
