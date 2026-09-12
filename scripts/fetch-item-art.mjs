// Downloads item icons from palworld.wiki.gg into public/items/<itemId>.png.
// The wiki names them "<Item name> icon.png"; a few use other names (aliases below).
// Usage: node scripts/fetch-item-art.mjs [--force]
import { mkdir, writeFile, access } from 'node:fs/promises';
import { join } from 'node:path';
import { ITEMS } from '../src/data/items.ts';

const API = 'https://palworld.wiki.gg/api.php';
const UA = 'Catcha/1.0 (fan project; https://github.com/boubou666/Catcha)';
const OUT = 'public/items';
const force = process.argv.includes('--force');

/** Item ids whose wiki file name isn't "<name> icon.png". */
const ALIAS = {
  paldium: 'Paldium Fragment icon.png',
  gold_coin: 'Gold Coin icon.png',
  slab_fragment: "Bellanoir's Slab Fragment icon.png",
  slab_bellanoir: "Bellanoir's Slab icon.png",
  slab_xenolord: "Xenolord's Slab icon.png",
  slab_libero: "Bellanoir Libero's Slab icon.png",
  low_grade_medical: 'Low Grade Medical Supplies icon.png',
};

const exists = (p) => access(p).then(() => true, () => false);

async function resolveUrls(titles) {
  const urls = new Map();
  for (let i = 0; i < titles.length; i += 50) {
    const batch = titles.slice(i, i + 50);
    const qs = new URLSearchParams({ action: 'query', prop: 'imageinfo', iiprop: 'url', format: 'json', titles: batch.map((t) => `File:${t}`).join('|') });
    const res = await fetch(`${API}?${qs}`, { headers: { 'User-Agent': UA } });
    const json = await res.json();
    // the API may normalise titles; map back through query.normalized
    const norm = new Map((json.query?.normalized ?? []).map((n) => [n.to, n.from]));
    for (const page of Object.values(json.query?.pages ?? {})) {
      const url = page.imageinfo?.[0]?.url;
      if (url) urls.set((norm.get(page.title) ?? page.title).replace(/^File:/, ''), url);
    }
  }
  return urls;
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const wanted = ITEMS.map((it) => ({ id: it.id, title: ALIAS[it.id] ?? `${it.name} icon.png`, file: `${it.id}.png` }));
  const todo = [];
  for (const w of wanted) if (force || !(await exists(join(OUT, w.file)))) todo.push(w);
  if (todo.length === 0) return console.log('All item art present.');

  const urls = await resolveUrls(todo.map((w) => w.title));
  let ok = 0;
  const missing = [];
  for (const w of todo) {
    const url = urls.get(w.title);
    if (!url) { missing.push(w.title); continue; }
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (!res.ok) { console.warn(`  ${res.status} for ${w.title}`); continue; }
    await writeFile(join(OUT, w.file), Buffer.from(await res.arrayBuffer()));
    ok++;
    await new Promise((r) => setTimeout(r, 120)); // be polite
  }
  console.log(`Downloaded ${ok} / ${todo.length} icons into ${OUT}/`);
  if (missing.length) console.log(`Missing on the wiki (${missing.length}): ${missing.join(', ')}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
