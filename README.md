# Catcha

A Palworld-themed idle/clicker in the spirit of PokéClicker. Browser-only, saves to `localStorage`.

Design notes: [DESIGN.md](DESIGN.md).

## Play

Hosted build (no Pal art — see *Art* below): **https://boubou666.github.io/Catcha/**

It installs as a PWA (Chrome/Edge: install icon in the address bar; Android: "Add to Home screen"; iOS Safari:
Share → Add to Home Screen) and keeps working offline after the first load. When a new version is deployed, open tabs show a
"Reload" banner (checked on every visit, every 30 minutes, and whenever the tab regains focus); Settings
→ About shows the running version and a "What's new" button; after an update the changelog entries you
haven't seen open once. Entries live in `src/data/changelog.ts` — add one at the top when shipping
something players should know about.

New saves get a ten-step tutorial card above the tabs (attack → catch → party → clear a route → research → worker →
build → craft → Alpha). Each step checks the save state and advances on its own, with a "Take me there" button
for steps that live on another tab; it can be skipped at any time and replayed from Settings → About. Steps live
in `src/engine/tutorial.ts`; saves from before it existed are marked done.

Progress → Stats shows lifetime statistics (they survive Ascension): time played, gold earned and spent, defeats by
kind and by element, spheres thrown and catch rate per tier, Paldeck and Box counts, strongest Pal, base output
counters and world completion. Counters live in `save.stats`; the report is built by `src/engine/stats.ts`.

Saves live in the browser's localStorage, so the hosted copy starts fresh; use **Export** on one copy and
**Import** on the other (Settings tab) to move a save.

Toast notifications for catches, level-ups, boss and tower wins, hatches, achievements, quests, expedition
returns, Lucky spawns, new daily quests and ascension; click one to dismiss.

Sound effects are synthesized with the Web Audio API (no audio files): clicks and click-kills, catches, level-ups,
boss and tower wins, hatches, achievements, quests, Lucky spawns, raid summons, ascension. Toggle and volume
under Settings, stored per device. On touch devices with `navigator.vibrate` (Android browsers; not iOS
Safari) the same events also give short haptic buzzes — toggle in Settings.

Works on phones: below 800 px the arena becomes a sticky bar under the header and the routes, bosses and
log move into a World tab group; touch targets are enlarged.

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
| `npm run icons` | Regenerate the PWA icons (`public/icons/`) |
| `npm run fetch-art` | Download Pal art into `public/pals/` (see below) |
| `npm run balance` | Print the headless balance model (per-region times, plus hours per run across ascensions; `-- --runs N`) |
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
Without them the UI shows element-coloured placeholder discs — which is what the GitHub Pages build
shows, since the images are never committed or deployed.

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
parents' average (`src/data/combos.ts` for fixed pairs). Every egg has the wild Lucky chance plus 10% per
Lucky parent; a Lucky egg hatches as a Lucky Pal. Works offline.

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
Legendary Sphere chance and the boss's egg, which inherits passives from the party that won
(same rule as breeding, with your five fighters as the parent pool) and has a 10% / 15% / 25% chance to
be Lucky. Data in `src/data/raids.ts`.

Daily quests: three per day (UTC or local midnight — Settings tab) (defeat / catch / earn gold / craft / element kills / a specific route,
plus hatch, expedition and Sealed Realm once those are unlocked), scaled to your furthest region and
seeded by the date, so refreshing never rerolls. Claim for gold, spheres and Paldium; claim all three
for an Effigy. Engine in `src/engine/daily.ts`.

Achievements: 63 across combat, collection, base, breeding, exploration and economy, worth 179 points;
every point is a permanent +1% gold from defeated Pals. Lifetime stats (defeats, catches, crafts, gold…)
are tracked from save v13 onward. Defined in `src/data/achievements.ts`.

Box search and filters: the search box matches name, Paldeck number, element and passive names (every word
must match); Filters adds element, work suitability, status (idle / party / base / breeding / expedition),
Lucky-only, starred-only, duplicates-only, and sort (stars, level, attack, name, Paldeck number, newest).
Logic in `src/engine/boxfilter.ts`; the bar itself is `src/ui/BoxFilterBar.svelte`. The Party tab reuses it as
an "Add from the Box" picker under the slots — idle Pals sorted by attack by default, with Add buttons (base
workers and breeding pairs can be pulled; expedition members can't). The Base tab uses it twice: over the
Workers list (status pinned to the base) and as the "Assign from the Box" picker; both default to the
"Work suitability" sort, which ranks by the job chosen in the work filter, or overall suitability if none.

Paldeck search and filters work the same way (`src/engine/paldeckfilter.ts`): search by name, number or
element; filter by status (caught / seen / never seen), region (met on its routes, Alphas or tower), element,
work, rarity, subspecies only; sort by number, name, copies or rarity. Pals you haven't seen only ever
match by number and region, and sort last, so the filters don't reveal what a "???" entry is.

Compare: pick up to four Pals (⚖ in the Box, or the Compare tab) for a side-by-side table — attack,
base stats, effective work per job (stars, passives, sanity applied), food cost, SAN, expedition score,
breeding rank, status — with the best value per row highlighted.

Paldeck detail: click any entry for stats, work, drops, every place it spawns (with odds and lock
requirements, and a Go button), and how to breed it — special combos plus rank-formula pairs from species
you already own.

Ascension (prestige): after clearing a tower, start the map over for Ancient Relics — towers weigh 1–7 by
region, plus one per 10 species owned and per 10 levels. Relics buy permanent upgrades (party attack,
base output, catch rate, exp, gold, bigger Ark, head-start tech points, shorter route quotas, starting
spheres). You carry 1 Pal (+1 per Ark level) with levels, stars and passives; Paldeck records,
achievements, stats and daily quests survive. Defined in `src/data/prestige.ts`.

Every system in DESIGN.md is built and the numbers have been through a model-based balance pass
(`npm run balance`): on-level kills sit at 4–6 s from region 1 to 7, Alphas at 2–4 min, towers at
~60–65% of their 10-minute limit for an on-level party, raids at 75–96%. Real play will still find things.
