// Refreshes src/data/pals.ts (and the breeding combo table, and any missing drop items) from
// palworld.wiki.gg infoboxes. Internal ids, variantOf and farmDrop are preserved from the current
// file; everything else comes from the wiki.
//   node scripts/fetch-pal-data.mjs            # rewrite data
//   node scripts/fetch-pal-data.mjs --dry-run  # report what would change

import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { PALS } from '../src/data/pals.ts';
import { ITEMS } from '../src/data/items.ts';

const API = 'https://palworld.wiki.gg/api.php';
const UA = 'Catcha-dev/0.1 (private fan project; one-off data fetch)';
const ROOT = join(import.meta.dirname, '..');
const dry = process.argv.includes('--dry-run');

const WORK = {
  'Kindling': 'Kindling', 'Watering': 'Watering', 'Planting': 'Planting', 'Generating Electricity': 'Electricity',
  'Handiwork': 'Handiwork', 'Gathering': 'Gathering', 'Lumbering': 'Lumbering', 'Mining': 'Mining',
  'Medicine Production': 'Medicine', 'Cooling': 'Cooling', 'Transporting': 'Transporting', 'Farming': 'Farming',
};
// wiki item names whose ids differ from a plain slug
const ITEM_ALIAS = {
  'Paldium Fragment': 'paldium', 'Pal Sphere': 'sphere_pal', 'Mega Sphere': 'sphere_mega', 'Giga Sphere': 'sphere_giga',
  'Hyper Sphere': 'sphere_hyper', 'Ultra Sphere': 'sphere_ultra', 'Legendary Sphere': 'sphere_legendary',
  'Low Grade Medical Supplies': 'low_grade_medical',   // the SAN consumable made by Medicine Pals
};
const FOOD_WORDS = /meat|mutton|poultry|pork|venison|egg|berries|mushroom|honey|milk|raw |cotton candy|tomato|lettuce|wheat|seeds|cake|jam/i;

// ---------------------------------------------------------------------------

async function fetchPages(titles) {
  const out = new Map();
  for (let i = 0; i < titles.length; i += 50) {
    const qs = new URLSearchParams({
      action: 'query', prop: 'revisions', rvprop: 'content', rvslots: 'main', format: 'json', formatversion: '2',
      titles: titles.slice(i, i + 50).join('|'),
    });
    const res = await fetch(`${API}?${qs}`, { headers: { 'User-Agent': UA } });
    if (!res.ok) throw new Error(`API ${res.status}`);
    const json = await res.json();
    for (const p of json.query.pages) if (!p.missing) out.set(p.title, p.revisions[0].slots.main.content);
    for (const n of json.query.normalized ?? []) if (out.has(n.to)) out.set(n.from, out.get(n.to));
  }
  return out;
}

/** `{{Name |k = v |k2 = v2 ... }}` → { k: v }. Params may share a line, so split on '|' not '\n'. */
function template(text, name) {
  const m = new RegExp('\{\{' + name + '(?=\s*[\n|])').exec(text);   // exact name: "{{Pal" must not match "{{Pal Navigation"
  if (!m) return null;
  const start = m.index;
  let depth = 0, i = start;
  for (; i < text.length - 1; i++) {
    if (text.startsWith('{{', i)) { depth++; i++; }
    else if (text.startsWith('}}', i)) { depth--; i++; if (depth === 0) break; }
  }
  const body = text.slice(start + 2, i - 1).replace(/<!--[\s\S]*?-->/g, '');
  const params = {};
  for (const part of body.split(/\n?\|/).slice(1)) {
    const eq = part.indexOf('=');
    if (eq < 0) continue;
    params[part.slice(0, eq).trim()] = part.slice(eq + 1).trim();
  }
  return params;
}

const slug = (name) => ITEM_ALIAS[name] ?? name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

/** "Wool*1-3@100; Lamball Mutton*1@100" → Drop[] */
function parseDrops(s) {
  const drops = [];
  for (const raw of (s ?? '').split(';')) {
    const m = raw.trim().match(/^(.+?)\*(\d+)(?:-(\d+))?@(\d+)$/);
    if (!m) continue;
    const name = m[1].trim();
    if (/\(|\+\d|slab/i.test(name)) continue;               // gear, slabs, ultra variants
    drops.push({ name, itemId: slug(name), chance: Number(m[4]) / 100, min: Number(m[2]), max: Number(m[3] ?? m[2]) });
  }
  return drops;
}

function parseWork(s) {
  const work = {};
  for (const raw of (s ?? '').split(';')) {
    const m = raw.trim().match(/^(.+?)@(\d+)$/);
    if (!m) continue;
    const key = WORK[m[1].trim()];
    if (key) work[key] = Number(m[2]);
  }
  return work;
}

function rarity(egg, rank) {
  if (/Huge/.test(egg)) return rank <= 110 ? 'legendary' : 'epic';
  if (/Large/.test(egg)) return 'rare';
  return rank <= 1000 ? 'uncommon' : 'common';
}

// ---------------------------------------------------------------------------

async function main() {
  const pages = await fetchPages(PALS.map((p) => p.name));
  const byName = new Map(PALS.map((p) => [p.name, p]));
  const rows = [];
  const changes = { elements: 0, work: 0, stats: 0, rarity: 0, breed: 0, drops: 0, missing: [] };
  const combos = [];
  const newItems = new Map();

  for (const p of PALS) {
    const text = pages.get(p.name);
    if (!text) { changes.missing.push(p.name); rows.push({ ...p, no: p.no ?? String(p.id).padStart(3, '0') }); continue; }
    const box = template(text, 'Pal') ?? {};
    const breed = template(text, 'Breeding') ?? {};
    const dropTpl = template(text, 'Item Drop') ?? {};

    const elements = [box.ele1, box.ele2].filter((e) => e && /^[A-Z][a-z]+$/.test(e));
    const work = parseWork(box.work_suitability);
    const rank = Number(breed.breeding_rank) || p.breedPower;
    const drops = parseDrops(dropTpl.normal_drops);
    for (const d of drops) if (!ITEMS.some((i) => i.id === d.itemId) && !newItems.has(d.itemId)) {
      newItems.set(d.itemId, { id: d.itemId, name: d.name, category: FOOD_WORDS.test(d.name) ? 'food' : 'material' });
    }
    const row = {
      id: p.id, no: box.no ?? String(p.id).padStart(3, '0'), name: p.name, variantOf: p.variantOf,
      elements: elements.length ? elements : p.elements,
      rarity: breed.egg ? rarity(breed.egg, rank) : p.rarity,
      baseHp: Number(box.hp) || p.baseHp, baseAttack: Number(box.attack) || p.baseAttack, baseDefense: Number(box.defense) || p.baseDefense,
      work: Object.keys(work).length ? work : p.work,
      farmDrop: p.farmDrop,
      drops: drops.length ? drops.map(({ itemId, chance, min, max }) => ({ itemId, chance, min, max })) : p.drops,
      breedPower: rank,
      partnerSkill: box.partner_skill_name || p.partnerSkill,
    };
    if (row.elements.join() !== p.elements.join()) changes.elements++;
    if (JSON.stringify(row.work) !== JSON.stringify(p.work)) changes.work++;
    if (row.baseHp !== p.baseHp || row.baseAttack !== p.baseAttack || row.baseDefense !== p.baseDefense) changes.stats++;
    if (row.rarity !== p.rarity) changes.rarity++;
    if (row.breedPower !== p.breedPower) changes.breed++;
    if (JSON.stringify(row.drops) !== JSON.stringify(p.drops)) changes.drops++;
    rows.push(row);

    for (const line of (breed.uniqueCombos ?? '').split(/;|\n/)) {
      const m = line.trim().match(/^(.+?) \+ (.+?) = (.+)$/);
      if (!m) continue;
      const [a, b, c] = [m[1], m[2], m[3]].map((n) => byName.get(n.trim()));
      if (a && b && c && a.id !== c.id) combos.push({ a: a.id, b: b.id, child: c.id, text: line.trim() });
    }
  }

  console.log(`fetched ${pages.size}/${PALS.length} pages; changes — elements: ${changes.elements}, work: ${changes.work}, stats: ${changes.stats}, rarity: ${changes.rarity}, breeding rank: ${changes.breed}, drops: ${changes.drops}; combos: ${combos.length}; new items: ${newItems.size}`);
  if (changes.missing.length) console.log('  no wiki page:', changes.missing.join(', '));
  if (dry) return;

  // ---- pals.ts
  const q = (s) => `'${String(s).replace(/'/g, "\\'")}'`;
  const fmtWork = (w) => `{ ${Object.entries(w).map(([k, v]) => `${k}: ${v}`).join(', ')} }`;
  const fmtDrops = (ds) => `[${ds.map((d) => `d(${q(d.itemId)}, ${d.chance}, ${d.min}, ${d.max})`).join(', ')}]`;
  const lines = rows.sort((a, b) => a.id - b.id).map((r) =>
    `  { id: ${r.id}, no: ${q(r.no)}, name: ${q(r.name)},${r.variantOf ? ` variantOf: ${r.variantOf},` : ''} elements: [${r.elements.map(q).join(', ')}], rarity: ${q(r.rarity)},\n` +
    `    baseHp: ${r.baseHp}, baseAttack: ${r.baseAttack}, baseDefense: ${r.baseDefense}, breedPower: ${r.breedPower},\n` +
    `    work: ${fmtWork(r.work)},${r.farmDrop ? ` farmDrop: { itemId: ${q(r.farmDrop.itemId)}, perMinute: ${r.farmDrop.perMinute} },` : ''}\n` +
    `    drops: ${fmtDrops(r.drops)}, partnerSkill: ${q(r.partnerSkill ?? '')} },`);
  const palsTs = `import type { Drop, PalDef } from './types';

// GENERATED by scripts/fetch-pal-data.mjs from palworld.wiki.gg — do not hand-edit stats.
// Internal ids, variantOf and farmDrop are preserved across runs; \`no\` is the wiki's Paldeck number.
// To add a Pal: append a stub with a unique id and the wiki page name, then rerun the script.

const d = (itemId: string, chance = 1, min = 1, max = 1): Drop => ({ itemId, chance, min, max });

export const PALS: PalDef[] = [
${lines.join('\n')}
];

const BY_ID = new Map(PALS.map((p) => [p.id, p]));

export function palById(id: number): PalDef {
  const p = BY_ID.get(id);
  if (!p) throw new Error(\`Unknown Pal #\${id}\`);
  return p;
}

/** Paldeck label as the wiki shows it: "#001", "#055B". */
export function paldeckNumber(def: PalDef): string {
  return \`#\${def.no}\`;
}

/** Sort key: numeric part, then the subspecies letter. */
export function paldeckOrder(def: PalDef): number {
  const m = def.no.match(/^(\\d+)([A-Z]?)$/);
  return m ? Number(m[1]) * 10 + (m[2] ? m[2].charCodeAt(0) - 64 : 0) : 0;
}
`;
  await writeFile(join(ROOT, 'src/data/pals.ts'), palsTs);

  // ---- combos.ts
  const combosTs = `// GENERATED by scripts/fetch-pal-data.mjs from the wiki's uniqueCombos. Keyed "lowerId+higherId".
export const SPECIAL_COMBOS: Record<string, number> = {
${combos.map((c) => `  '${Math.min(c.a, c.b)}+${Math.max(c.a, c.b)}': ${c.child}, // ${c.text}`).join('\n')}
};
`;
  await writeFile(join(ROOT, 'src/data/combos.ts'), combosTs);

  // ---- items.ts: append missing drop items in a generated block
  if (newItems.size) {
    let items = await readFile(join(ROOT, 'src/data/items.ts'), 'utf8');
    const marker = '  // ---- generated drop items (scripts/fetch-pal-data.mjs) ----';
    const block = [...newItems.values()].map((i) => `  { id: ${q(i.id)}, name: ${q(i.name)}, category: ${q(i.category)} },`).join('\n');
    items = items.includes(marker)
      ? items.replace(new RegExp(marker + '[\\s\\S]*?\\n\\];'), `${marker}\n${block}\n];`)
      : items.replace(/\n\];/, `\n${marker}\n${block}\n];`);
    await writeFile(join(ROOT, 'src/data/items.ts'), items);
  }
  console.log('wrote src/data/pals.ts, src/data/combos.ts' + (newItems.size ? ', items.ts' : ''));
}

main().catch((e) => { console.error(e); process.exit(1); });
