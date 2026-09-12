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
| `npm run balance` | Print the headless balance model (kill / boss / tower / raid times per region) |
| `npm run fetch-data` | Regenerate `src/data/pals.ts`, `combos.ts` and drop items from the wiki (`--dry-run` to preview) |

## Layout

```
src/
  data/     static content: Pals, routes, items, spheres, element chart  (no logic)
  engine/   pure game logic: combat, catching, party, progress, save     (no DOM, tested)
  state/    game.svelte.ts — the single reactive Game store the UI reads
  ui/       Svelte components, one per screen
```

Balance knobs live in `src/engine/formulas.ts` and `src/data/spheres.ts`.

## Data

`src/data/pals.ts` and `src/data/combos.ts` are generated from palworld.wiki.gg infoboxes by
`npm run fetch-data`: elements, stats, work suitability, breeding rank, drops, partner skills and the
special breeding combos are the wiki's. Internal `id`s, `variantOf` and `farmDrop` are preserved across
runs; `no` is the wiki's current Paldeck number (Pocketpair renumbered the deck, so it no longer equals
`id`). Rarity is derived from egg tier and breeding rank. To add a Pal, append a stub with a unique id
and the wiki page name, then rerun.

## Art

Pal images are Pocketpair's and are **not** in the repo. `npm run fetch-art` pulls the Paldeck icon and
render for every Pal in `src/data/pals.ts` from palworld.wiki.gg into `public/pals/` (gitignored).
Without them the UI shows element-coloured placeholder discs. Private use only — don't publish a build
that includes them.

## Status

All seven regions from the design: Windswept Hills (Lv 1–15, Zoe & Grizzbolt), Marsh & Bamboo Groves
(Lv 15–25, Lily & Lyleen), Twilight Dunes (Lv 25–35, Axel & Orserk), Mount Obsidian (Lv 35–45, Marcus &
Faleris), Astral Mountains (Lv 45–55, Victor & Shadowbeak), Sakurajima (Lv 55–62, Saya & Selyne) and
Feybreak (Lv 62–70, Bjorn & Bastigor) — 49 routes, 20 Alphas, 184 Pals including 42 subspecies and
every legendary. Subspecies use
id = 1000 + base, show as `#031B`, and only come from same-species pairs or `SPECIAL_COMBOS`. Catching,
party, Paldeck, merchant, save/export/import. Each region opens when the previous tower falls; a region
switcher appears above the routes.

Base building is in: assign box Pals as workers (party and base are exclusive), each work
suitability produces something — Lumbering/Mining raw materials, Planting+Watering+Gathering
berries, Kindling smelts, Handiwork crafts spheres and weapons, Farming yields Pal produce,
Transporting/Electricity multiply, Cooling cuts food use, Medicine makes Medical Supplies. Structures
gate and multiply jobs; workers eat Red Berries and slow down when hungry.

Sanity: every Pal has SAN 0–100. Working drains it (0.5/min, doubled when hungry; Hot Spring cuts
40%/70%), resting recovers it (2/min). Below 50 a worker is stressed (75% output), below 20 depressed
(40%), at 0 sick (stops). Medical Supplies — made by Medicine Pals at the Medicine Workbench, or found
as drops — are used automatically on the worst-off worker under 50 (+30). Runs offline; the
welcome-back summary says if anyone came back sick. Knobs: `src/data/base.ts` (RATES).

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

Passive skills: wild catches roll 0–4 from an 18-skill pool (Brave, Artisan, Diet Lover, Slacker…)
affecting attack, work and food; Lucky Pals always carry *Lucky*, legendary species *Legend*. Eggs
inherit a random subset of both parents' passives with a 10% mutation chance per free slot. Pool in
`src/data/passives.ts`.

Dungeons: one Sealed Realm per region (unlocked by clearing its last route) — five waves at the region
cap with 1.5–1.8× HP, then a catchable guardian, inside five minutes. Clearing pays a loot chest scaled
by region and Effigies on the first clear; leaving or timing out keeps what the waves dropped. Defined
in `src/data/dungeons.ts`.

Expeditions: build the Expedition Post (1–3 concurrent trips) and send idle Pals on seven timed
destinations (10 min → 8 h). Success odds depend on members' levels, stars and attack passives against
a full party at the recommended level; success pays a chest, failure a quarter of the gold; members
gain exp either way and are locked until they return. Resolves offline. Data in `src/data/expeditions.ts`.

Raids: build the Summoning Altar (tech Lv 35), assemble a slab from Slab Fragments (Sealed Realms
from region 3, long expeditions), and summon Bellanoir (500k HP), Xenolord (1.5M) or Bellanoir Libero
(3M) for a ten-minute DPS check. The slab is spent on summon. Winning pays Diamonds, Ingots, a
Legendary Sphere chance and the boss's egg. Data in `src/data/raids.ts`.

Every system in DESIGN.md is built and the numbers have been through a model-based balance pass
(`npm run balance`): on-level kills sit at 4–6 s from region 1 to 7, Alphas at 2–4 min, towers at
~60–65% of their 10-minute limit for an on-level party, raids at 75–96%. Real play will still find things.
