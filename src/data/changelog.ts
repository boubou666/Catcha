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
    version: '0.8.0', date: '2026-09-12', title: 'Tutorial',
    items: [
      'A ten-step tutorial for new saves that follows what you actually do — attack, catch, clear a route, research, put a Pal to work, build, craft, beat an Alpha.',
      'Skip it any time; replay it from Settings → About.',
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
