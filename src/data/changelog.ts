// Player-facing changelog, newest first. Add an entry at the top when shipping something worth telling
// players about; the "What's new" panel shows every entry above the one they last saw.

export interface ChangelogEntry {
  version: string;
  date: string;        // YYYY-MM-DD
  title: string;
  items: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '0.12.0', date: '2026-09-14', title: 'En français',
    items: [
      'The whole game in French: Settings → Language. Menus, every view, filters, the log, toasts and the tutorial; Pal, route and item names keep their wiki names, as Palworld itself does. Missing strings fall back to English.',
      'Log lines and toasts now travel as templates with their values, so they render in the current language (and the Log filter works on data rather than wording).',
      'Save codes: Settings → Save shows a compact code (gzip, about a fifth of the old string) with Copy, and a box to paste one from another device. Old export strings still load.',
      'Under the hood: defeat resolution and encounter starters moved out of the store into their own modules.',
    ],
  },
  {
    version: '0.11.0', date: '2026-09-14', title: 'The map',
    items: [
      'The Routes panel is now a map: the official Palpagos map (from the wiki, like the Pal art) with a pin for every route, tower, Alpha and Sealed Realm, plus your base and the Summoning Altar. Tap a pin for its status and odds, tap again to travel, fight, enter — or summon a raid from the altar. Zoom from the whole archipelago to a region; locked regions say what opens them; the fight you are in glows red.',
      '🗺 buttons on a Pal’s habitat lines open the map on that spot. J switches map ⇄ list, Shift+J folds the panel to one line; ☰ List and ▴ do the same by mouse. A tutorial step introduces it.',
      'Partner skills now do something. Every Pal’s skill (shown on its page and when hovering its name) gives +3–12% by rarity while it is in the party: damage for party members of its element for fighting skills, exp for mounts and gliders, gold for diggers and anglers, catch odds for senses and glares — and base output for helper-type skills while the Pal works at the base. Party and Base show the totals.',
      'Some partner skills have a trick of their own: diggers and anglers (Gold Digger, Dig Here!, Master Night Angler…) add a 15% chance of an extra drop per defeat; Egg Layer, Milk Maker and the wool skills double that Pal’s ranch output; Sixth Sense, Hawk Eye and Ultrasonic Sensor name species you have never met on spawn tables; Travel Companion and Happy-Go-Lucky Bunny give a 25% chance to get a sphere back when a throw fails; Fluffy Shield and the armour skills add 15% to Alpha and tower clocks. Stackable; the Party tab lists them.',
      'Bellanoir Libero has 2.3M HP instead of 2.8M: the balance model had a party from Feybreak finishing it with 25 seconds to spare, where the other raids leave about two minutes.',
      'A deploy no longer throws away the cached Pal and item art, and a few accessibility nits from Lighthouse are fixed.',
    ],
  },
  {
    version: '0.10.0', date: '2026-09-14', title: 'Know your odds',
    items: [
      'Catch odds wherever a species or a sphere comes up. Towers and raids say what a win gives instead (a tower boss cannot be caught; a raid gives an egg, with its ✨ Lucky odds); Sealed Realm buttons show the guardian’s and the waves’ odds.',
      '“Who lives here?” — on a route or inside a realm — lists every species with its 🎯 odds next to its spawn share, the guardian included.',
      'Paldeck: odds on every seen card, a new “Easiest to catch” sort, and a Catching section on each Pal’s page — odds per sphere you have unlocked, wild and as an Alpha, with your stock — plus the best place to hunt it (spawn share × odds).',
      'Box, Party, Base, Compare and Expedition lists show the odds of catching another of that species; Compare gets a “Catch another” row; Breeding shows what catching the offspring in the wild would take instead.',
      'Sphere rows in the Merchant, Items and Craft, and the header chips, say what that sphere would do on the Pal in front of you; Capture Technique shows before → after.',
      'Route tooltips list species odds; search results and watch toasts carry the figure.',
      'Log lines get a 🎯 badge (green landed, grey broke free, cyan on a boss’s arrival) and the Catching category sums up throws landed vs average odds. Stats: lifetime landed vs expected, your catch bonus and its parts, the odds by rarity. Catching achievements hint at what the odds say.',
      'Settings → Catching: a switch to hide the 🎯 chips in lists if you find them noisy — the arena line and the Pal page keep theirs.',
    ],
  },
  {
    version: '0.9.0', date: '2026-09-13', title: 'A Palworld look',
    items: [
      'New interface styled after Palworld’s menus: a sunny Palpagos backdrop, dark glass HUD panels with cyan edge-light and chamfered corners, bold rounded type (Nunito), yellow-orange for the actions that matter.',
      'Fresh app icons to match; the real Pal art is now included in the hosted build, and every item has its icon (shop, Items, recipes and costs, base output, drops).',
      'Settings → Appearance: dark HUD, light HUD, or follow the system.',
      'A compact two-line header on phones: the search folds behind a 🔍 button and the numbers become chips.',
      'A one-line arena bar on phones with a tall ⚔ Attack button.',
      'Tighter tab rows on phones.',
      'Alpha fights are now timed: 5 minutes to win, like the towers’ 10.',
      'Alphas can be caught, like in Palworld: a sphere is thrown when you beat one, at 35% of the normal rate — better spheres and Effigies help. A caught Alpha keeps its boss level.',
      'The arena and the Alpha buttons show your catch odds (or why nothing would be thrown — the “Already caught” policy defaults to no throw, to save spheres early on). Catch settings moved from the Merchant to Settings → Catching; the 🎯 line in the arena jumps there.',
      'The page no longer scrolls as a whole — the columns scroll on their own, so the header and arena stay put.',
    ],
  },
  {
    version: '0.8.0', date: '2026-09-12', title: 'Tutorial and statistics',
    items: [
      'A Stats tab under Progress: time played, gold, defeats by kind and element, catch rates per sphere, Paldeck, base and world completion.',
      'A ten-step tutorial for new saves that follows what you actually do — attack, catch, clear a route, research, put a Pal to work, build, craft, beat an Alpha.',
      'Skip it any time; replay it from Settings → About.',
      'Box search now matches Paldeck numbers, elements and passives; a Filters bar adds element, work, status, Lucky, starred and duplicate filters plus sort options.',
      'Paldeck search and filters: status, region, element, work, rarity, subspecies, and sort — without revealing unseen Pals.',
      'The Party tab has an "Add from the Box" picker with the same search and filters, so you can build a party without switching tabs.',
      'Base: the Workers list and the Assign picker get the same search and filters, plus a Work suitability sort that follows the job you filter on.',
      'Breeding: parents are picked from a searchable, filterable list; with one parent chosen, every candidate shows the offspring it would give and the search matches that too.',
      'Compare: Pals are added from a searchable, filterable list instead of a dropdown.',
      'Items: each item now shows where it comes from and what uses it; search and filter by category, usage, missing items, and sort.',
      'Craft: search recipes by name, output or ingredient; filter by kind and status (craftable now / unlocked / locked); sort by work or name.',
      'Tech: search by name, what it unlocks or effect; filter by kind, boosted stat, status (researchable now / researched) and hide levels above yours.',
      'Achievements: search and filter by category and status (unlocked / locked / almost there), sort by closest first, points or name.',
      'Daily quests: search and filter by status and kind, like every other list.',
      'Settings → Keyboard: rebind or switch off any single-key shortcut; clashes are flagged and the help list follows your bindings.',
      'Keyboard shortcuts: 1–9 and letters for tabs, arrows for tabs and groups, Shift+arrows / Shift+1–9 for regions, Space/A to attack, Backspace to retreat, Shift+A/T/D/M to start an Alpha, tower, realm or raid, Shift+Q to claim quests, W and N for the spawn list and notifications, / for search, S to save, ? for the list.',
      'Base structures, the production table and the incubator get search and filters too — every list in the game now has them.',
      'Craft queue: search jobs, group by recipe, cancel a whole recipe or the whole queue with refunds.',
      'Box bulk actions: select Pals (or everything the filter shows) and send them to the party or base, compare them, or release them — Lucky, starred and busy Pals are never released.',
      'Party loadouts: save up to 12 named teams and swap the whole party in one click; members at the base or breeding are pulled in, away or released ones are skipped. Search, readiness filter and sort.',
      'Global search in the header (Ctrl+K): find tabs, Pals, Paldeck entries, routes, bosses, items, recipes, techs, upgrades, achievements and settings, and jump straight there.',
      'Compare: search the comparison rows, pick a group (identity / combat / work / other), or show differences only.',
      'Paldeck detail: search a Pal\'s habitat and breeding pairs, show reachable places only, or only special combos / rank pairs; up to 40 rank pairs listed.',
      'What\'s new: search the whole changelog or pin a version.',
      'Notification centre: a 🔔 in the header keeps every toast of the session with an unread badge, search, kind and unread filters — and lets you choose which kinds still pop up.',
      'Welcome-back summary: sorted by biggest change, with search and Gained / Consumed / Events views when there is a lot to read.',
      'Arena: "Who lives here?" shows the route\'s spawn odds and Paldeck status with search and filters, and a 👀 watch that pops a toast when a species spawns.',
      'Tutorial: an All steps list (also "How to play" in Settings → About) with done / current / upcoming status, search and Go buttons.',
      'Stats: search any statistic, pick a section, hide zero rows.',
      'Log: keeps 200 entries with time and category (combat, catching, base, breeding, quests, expeditions & realms, merchant, system); search, category filter and Show all.',
      'Bosses: search Alphas, towers, Sealed Realms and raids across reachable regions, with kind / beaten / available / locked / element filters.',
      'Routes: search across every reachable region by route, region, element or a Pal you have seen, with cleared / in progress / locked and element filters.',
      'Settings: search by keyword (vibration, export, timezone, tutorial…) and section chips.',
      'Ascension: search and filter the upgrades; the Ark picker gets the Box search and filters plus a Pick best button.',
      'Merchant: now a real shop — buy base materials as you progress and sell drops and produce for gold, with search, category, sort and affordable / hide-locked filters.',
      'Expeditions: search destinations by name or loot (also filters reports), hide locked ones, search and filter idle Pals for the party, and a Pick best button.',
      'Quest history: past days are kept (90 days) with what you claimed or missed, plus a streak counter, totals and gold from quests.',
      'Fix: Low Grade Medical Supplies dropped by Pals were a separate item from the Medicine consumable — merged, so drops now treat workers.',
    ],
  },
  {
    version: '0.7.0', date: '2026-09-12', title: 'Polish: sounds, toasts, install',
    items: [
      'Sound effects, synthesized in the browser — toggle and volume in Settings.',
      'Toast notifications for catches, level-ups, wins, hatches, achievements and more.',
      'Haptic buzzes on Android touch devices.',
      'Installable as an app (PWA) and playable offline after the first load.',
      'A reload banner appears when a new version is deployed; Settings → About shows the version.',
      'This “What’s new” panel.',
    ],
  },
  {
    version: '0.6.0', date: '2026-09-12', title: 'Ascension and quality of life',
    items: [
      'Ascension: after any tower, start over for Ancient Relics and permanent upgrades; carry chosen Pals through.',
      'Paldeck detail view: habitat with spawn odds and a Go button, breeding recipes from species you own.',
      'Compare up to four Pals side by side (⚖ in the Box).',
      'Tabs grouped into Pals / Base / Progress; mobile layout with a sticky arena and a World group.',
    ],
  },
  {
    version: '0.5.0', date: '2026-09-12', title: 'Progression layers',
    items: [
      'Achievements (63) with a permanent gold bonus per point.',
      'Daily quests scaled to your progress; a Settings tab with UTC or local reset.',
      'Raid eggs inherit passives from the winning party; Lucky breeding and Lucky raid eggs.',
      'Hosted on GitHub Pages.',
    ],
  },
  {
    version: '0.4.0', date: '2026-09-12', title: 'Endgame systems',
    items: [
      'Passive skills on wild catches and bred eggs.',
      'Sealed Realms (one per region), expeditions, and raids against Bellanoir, Xenolord and Bellanoir Libero.',
      'Sanity: workers tire, Medicine Pals make supplies, Hot Springs help.',
      'A model-based balance pass across all seven regions.',
    ],
  },
  {
    version: '0.3.0', date: '2026-09-12', title: 'The whole map',
    items: [
      'Regions 2–7: Marsh & Bamboo Groves, Twilight Dunes, Mount Obsidian, Astral Mountains, Sakurajima, Feybreak.',
      '185 Pals including 42 subspecies, with stats, work suitability and breeding combos imported from the wiki.',
    ],
  },
  {
    version: '0.2.0', date: '2026-09-12', title: 'Base and breeding',
    items: [
      'Base building driven by work suitability; crafting; offline progress.',
      'Breeding with Palworld’s combi-rank rule, condensing, and the technology tree.',
    ],
  },
  {
    version: '0.1.0', date: '2026-09-12', title: 'First playable',
    items: ['Windswept Hills: routes, Alphas, the Rayne Syndicate Tower, catching, party, Paldeck, merchant, saves.'],
  },
];

export const LATEST_VERSION = CHANGELOG[0].version;

// ---- filtering ----------------------------------------------------------------------

export interface ChangelogFilter { query: string; version: string | 'any' }
export const DEFAULT_CHANGELOG_FILTER: ChangelogFilter = { query: '', version: 'any' };

export function isChangelogFiltering(f: ChangelogFilter): boolean {
  return f.query.trim() !== '' || f.version !== 'any';
}

/**
 * Entries reduced to the items that match every search word (against the item, or the entry's version
 * and title — a title match keeps the whole entry); entries with nothing left are dropped.
 */
export function filterChangelog(entries: ChangelogEntry[], f: ChangelogFilter): ChangelogEntry[] {
  const words = f.query.toLowerCase().split(/\s+/).filter(Boolean);
  const out: ChangelogEntry[] = [];
  for (const e of entries) {
    if (f.version !== 'any' && e.version !== f.version) continue;
    if (words.length === 0) { out.push(e); continue; }
    const head = `v${e.version} ${e.title}`.toLowerCase();
    const items = words.every((w) => head.includes(w)) ? e.items : e.items.filter((it) => words.every((w) => it.toLowerCase().includes(w)));
    if (items.length) out.push({ ...e, items });
  }
  return out;
}
