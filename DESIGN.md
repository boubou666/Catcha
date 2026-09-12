# Catcha — Palworld idle/clicker design

A PokéClicker-style incremental game themed on Palworld. Browser-only, no backend.

## 1. Mapping PokéClicker → Palworld

| PokéClicker            | Palworld equivalent                          | Notes |
|------------------------|----------------------------------------------|-------|
| Pokémon (~1000)        | Pals (~140 base + ~40 variants + Feybreak)   | Smaller roster = manageable data |
| Pokédex                | Paldeck                                      | seen / caught / count / condense stars |
| Pokéballs (4 tiers)    | Pal Spheres (Pal, Mega, Giga, Hyper, Ultra, Legendary) | 6 tiers, crafted not bought |
| Regions (Kanto…)       | Islands / tower zones (7)                    | one tower boss per region |
| Gyms                   | Alpha Pals (field bosses)                    | 1–5 per region, gate routes |
| Elite 4 / Champion     | Syndicate Tower boss (Zoe & Grizzbolt…)      | HP sponge with time limit, like the real thing |
| Types (18)             | Elements (9)                                 | simpler chart, cyclic |
| Farming / Mining minigames | **Base work suitability** (12 job types)  | the whole idle economy |
| Hatchery               | Breeding Farm + Cake + Incubator             | Palworld combi-rank formula |
| Shiny                  | Lucky Pals                                   | rare sparkle variant |
| Oak items              | Technology tree (Tech Points)                | weapons = click damage, structures = unlocks — implemented in `data/tech.ts` |
| Dungeons               | Sealed Realms                                | timed run, boss at end |
| —                      | Condensing (dupes → stars)                   | gives duplicates value |
| —                      | Lifmunk Effigies → Capture Power             | catch-rate upgrade collectible |
| —                      | Expeditions                                  | send box Pals away for timed loot |
| —                      | Raids (Bellanoir, Xenolord)                  | endgame DPS check |

## 2. Core loop

```
every 100 ms tick:
  wild Pal on current route takes: click damage (on click) + party DPS × elementMult
  on defeat:
    grant EXP to party, gold, route drops (Pal Fluids, Wool, Ore…)
    mark Paldeck "seen"
    roll catch with best equipped sphere tier the player allows for that rarity
    spawn next wild Pal (weighted by route table; small chance of Lucky)
every 1000 ms tick:
  base production (per assigned worker per job type)
  incubator / expedition / dungeon timers
  autosave every 30 s
```

Offline progress: only closed-form systems run (base production, timers). Combat does not simulate offline. Cap at 24 h.
Implemented in `engine/offline.ts`: the gap is replayed through `tickBase` in 60 s chunks so running out of
food or ore part-way is priced in; the same path handles a suspended tab mid-session.

## 3. Progression

Regions, in order, each = a set of routes + Alphas + one tower:

| # | Region                 | Tower boss              | Level band |
|---|------------------------|-------------------------|-----------|
| 1 | Windswept Hills        | Zoe & Grizzbolt         | 1–15 | ✓ |
| 2 | Marsh & Bamboo Groves  | Lily & Lyleen           | 15–25 | ✓ |
| 3 | Twilight Dunes         | Axel & Orserk           | 25–35 | ✓ |
| 4 | Mount Obsidian         | Marcus & Faleris        | 35–45 | ✓ |
| 5 | Astral Mountains       | Victor & Shadowbeak     | 45–55 |
| 6 | Sakurajima             | Saya & Selyne           | 55–60 |
| 7 | Feybreak               | Bjorn & Bastigor        | 60+ |

Gating: routes unlock by reaching the previous route's kill quota or beating an Alpha. Tower unlocks after all Alphas in the region. Next region unlocks after the tower.

Element chart (attacker → 2× vs):
Fire → Grass, Ice · Water → Fire · Grass → Ground · Ground → Electric · Electric → Water ·
Ice → Dragon · Dragon → Dark · Dark → Neutral. Reverse direction = 0.5×. Everything else 1×.

Each route has a dominant element so party composition matters.

## 4. Base (the idle economy)

Player assigns box Pals to the base (slot cap grows with tech). Each Pal contributes its work levels:

| Job         | Produces / does                                  |
|-------------|--------------------------------------------------|
| Mining      | Stone, Ore, Coal, Sulfur (later Quartz)          |
| Lumbering   | Wood                                             |
| Planting + Watering + Gathering | Berries, Wheat, Tomato, Lettuce (needs all three) |
| Kindling    | smelts Ore → Ingots, cooks food                  |
| Electricity | powers Gen-2 structures (multiplier)             |
| Handiwork   | crafting speed for spheres / weapons             |
| Cooling     | fridge = food doesn't spoil (removes food decay) |
| Farming     | Pal-specific drops (Chikipi eggs, Mozzarina milk, Beegarde honey, Vixy spheres!) |
| Transporting| +% overall base output                           |
| Medicine    | SAN recovery (workers below SAN threshold stop)  |

Rate = Σ over workers of `workLevel × baseRate × structureMult`. Food consumption per worker per minute; no food → output halts (light punishment, not death).

Crafting (spheres, weapons, structures) consumes resources and takes time scaled by Handiwork.

## 5. Breeding & condensing

- Breeding Farm: pick 2 box Pals + 1 Cake → egg after T minutes → incubator → hatch.
- Child = lookup in `specialCombos` table (e.g. Relaxaurus + Sparkit = Relaxaurus Lux), else the Pal whose `breedPower` is closest to `(a + b) / 2` (ties → lower Paldeck #). This is the real game's rule and it's cheap to implement.
- Hatched Pals inherit up to 4 passive skills from a small pool (`+10% attack`, `+work speed`…). *(not yet)*
- Implemented: `engine/breeding.ts`. Simplifications for now: Cake is a Workbench recipe (no cooking station), eggs
  incubate automatically and hatch straight into the box, parents are locked out of party/base while paired.
- Condensing: feed N duplicates → star 1–4, each star +10% stats & work. N = 4, 16, 32, 64.

## 6. Catching

```
chance = baseRate[rarity] × sphereMult[tier] × capturePower × luckyPenalty
baseRate:   common 0.6 · uncommon 0.35 · rare 0.15 · epic 0.06 · legendary 0.02
sphereMult: Pal 1 · Mega 1.5 · Giga 2.2 · Hyper 3.2 · Ultra 4.5 · Legendary 6.5
capturePower: 1 + 0.02 × effigies collected (effigies drop from routes / dungeons)
```
Roll once per defeated Pal. Player sets per-rarity policy: "don't catch / catch new only / catch all / stop after N".

## 7. Data model

```ts
type Element  = 'Neutral'|'Fire'|'Water'|'Grass'|'Electric'|'Ice'|'Ground'|'Dark'|'Dragon';
type WorkType = 'Kindling'|'Watering'|'Planting'|'Electricity'|'Handiwork'|'Gathering'
              | 'Lumbering'|'Mining'|'Medicine'|'Cooling'|'Transporting'|'Farming';
type Rarity   = 'common'|'uncommon'|'rare'|'epic'|'legendary';

interface PalDef {
  id: number;                 // Paldeck #
  name: string;
  variantOf?: number;         // e.g. Jolthog Cryst → 12
  elements: Element[];        // 1–2
  rarity: Rarity;
  baseHp: number; baseAttack: number; baseDefense: number;
  work: Partial<Record<WorkType, 1|2|3|4>>;
  farmDrop?: { itemId: string; perMinute: number };
  drops: { itemId: string; chance: number; min: number; max: number }[];
  breedPower: number;         // combi rank
  partnerSkill?: string;      // flavour + maybe a small buff
}

interface RouteDef  { id: string; regionId: string; name: string; level: number;
                      dominant: Element; spawns: { palId: number; weight: number }[];
                      unlock: Requirement; killsToClear: number; }
interface AlphaDef  { id: string; regionId: string; palId: number; level: number;
                      hpMult: number; unlock: Requirement; reward: Reward; }
interface TowerDef  { id: string; regionId: string; boss: string; palId: number;
                      hp: number; timeLimitSec: number; unlock: Requirement; }
interface ItemDef   { id: string; name: string; category: 'material'|'food'|'sphere'|'consumable'; }
interface TechDef   { id: string; name: string; cost: number; level: number;
                      requires?: string[]; effect: Effect; }
type Requirement = { kind:'routeCleared'; id:string } | { kind:'alpha'; id:string }
                 | { kind:'tower'; id:string }       | { kind:'tech'; id:string } | { kind:'level'; n:number };

// ---- player state (the thing that gets saved) ----
interface PalInstance { uid: string; palId: number; level: number; exp: number;
                        stars: 0|1|2|3|4; lucky: boolean; passives: string[]; }
interface SaveState {
  version: number;
  player: { level: number; exp: number; gold: number; techPoints: number; effigies: number };
  paldeck: Record<number, { seen: boolean; caught: number }>;
  party: string[];                     // ≤ 5 PalInstance uids
  box: PalInstance[];
  base: { workers: string[]; structures: Record<string, number>; food: number };
  inventory: Record<string, number>;   // itemId → count (spheres are items)
  tech: string[];
  progress: { region: string; route: string; routeKills: Record<string, number>;
              alphas: string[]; towers: string[]; };
  timers: { eggs: { palId: number; readyAt: number }[]; expeditions: Expedition[]; dungeon?: DungeonRun };
  settings: { catchPolicy: Record<Rarity, 'none'|'new'|'all'>; };
  lastTick: number;
}
```

All `*Def` types are static content in `src/data/*.ts`. Only `SaveState` is mutable.

## 8. Formulas (starting values — expect to retune)

```
wildHp(level)        = 12 × level² + 30
palAttack(inst)      = def.baseAttack × (1 + 0.06 × level) × (1 + 0.1 × stars) × passiveMult
partyDps             = Σ palAttack × elementMult(pal, route.dominant)
clickDamage          = 5 × weaponTier × (1 + 0.03 × playerLevel)
expToLevel(n)        = 25 × n^1.8
alphaHp              = wildHp(level) × hpMult (20–60)
towerHp              = 30 000 → 500 000 across regions, must be beaten inside timeLimitSec
```

## 9. Architecture

```
src/
  data/        pals.ts regions.ts items.ts tech.ts elements.ts   (static content, no logic)
  engine/      loop.ts combat.ts catch.ts base.ts breeding.ts save.ts offline.ts
               → pure functions: (state, dt) => state.  No DOM, unit-tested with Vitest.
  state/       store.svelte.ts  — a single $state(SaveState) + derived selectors
  ui/          Route.svelte Party.svelte Base.svelte Paldeck.svelte Breeding.svelte Tech.svelte
  assets/      placeholder sprites (element-coloured silhouettes) until real art is sorted
```

Stack: **Vite + Svelte 5 + TypeScript**, Vitest for the engine, `localStorage` + export/import string for saves, deploy as a static site (GitHub Pages / Netlify).

Why Svelte 5: the whole game is "a thousand numbers that change 10× a second"; runes make that cheap and the code stays readable.

## 10. Content plan (build order)

1. Region 1 only: ~30 Pals (Lamball, Cattiva, Chikipi, Lifmunk, Foxparks, Fuack, Sparkit, Tanzee, Rooby, Pengullet, Penking, Jolthog, Gumoss, Vixy, Hoocrates, Teafant, Depresso, Cremis, Daedream, Rushoar, Nox, Fuddler, Killamari, Mau, Celaray, Direhowl, Tocotoco, Flopie, Mozzarina, Bristla) + Grizzbolt.
2. Combat + catch + party + Paldeck + save. **Playable.**
3. Base with Mining / Lumbering / Kindling / Handiwork → sphere crafting.
4. Breeding, condensing, tech tree.
5. Regions 2–7, one at a time, balancing as you go.
6. Dungeons, expeditions, raids, Lucky Pals, achievements.

## 11. Legal / assets

Palworld IP belongs to Pocketpair. Check their fan-content guidelines before shipping with any official art. Plan on placeholder icons during development and either commissioned/original sprites or a neutral art style at release. Names and stats as data are lower-risk than ripped sprites, but it's still a fan game — non-commercial only.
