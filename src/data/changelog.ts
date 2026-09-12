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
