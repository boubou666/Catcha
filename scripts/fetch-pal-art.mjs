// Downloads Pal art from palworld.wiki.gg into public/pals/ (gitignored — private use only).
//   node scripts/fetch-pal-art.mjs          # fetch missing files
//   node scripts/fetch-pal-art.mjs --force  # re-download everything
// Produces public/pals/<paldeck-id>_icon.png (128px icon) and <paldeck-id>.png (render).

import { mkdir, writeFile, access } from 'node:fs/promises';
import { join } from 'node:path';
import { PALS } from '../src/data/pals.ts';

const API = 'https://palworld.wiki.gg/api.php';
const OUT = join(import.meta.dirname, '..', 'public', 'pals');
const UA = 'Catcha-dev/0.1 (private fan project; one-off asset fetch)';
const force = process.argv.includes('--force');

const exists = (p) => access(p).then(() => true, () => false);

/** Resolve File: titles to URLs via the MediaWiki API, 50 at a time. */
async function resolveUrls(titles) {
  const urls = new Map();
  for (let i = 0; i < titles.length; i += 50) {
    const batch = titles.slice(i, i + 50);
    const qs = new URLSearchParams({
      action: 'query', prop: 'imageinfo', iiprop: 'url', format: 'json',
      titles: batch.map((t) => `File:${t}`).join('|'),
    });
    const res = await fetch(`${API}?${qs}`, { headers: { 'User-Agent': UA } });
    if (!res.ok) throw new Error(`API ${res.status}`);
    const json = await res.json();
    for (const page of Object.values(json.query.pages)) {
      const url = page.imageinfo?.[0]?.url;
      if (url) urls.set(page.title.replace(/^File:/, '').replaceAll(' ', '_'), url);
    }
  }
  return urls;
}

async function main() {
  await mkdir(OUT, { recursive: true });

  const wanted = PALS.flatMap((p) => [
    { title: `${p.name.replaceAll(' ', '_')}_icon.png`, file: `${p.id}_icon.png` },
    { title: `${p.name.replaceAll(' ', '_')}.png`, file: `${p.id}.png` },
  ]);
  const todo = [];
  for (const w of wanted) if (force || !(await exists(join(OUT, w.file)))) todo.push(w);
  if (todo.length === 0) return console.log('All art present.');

  const urls = await resolveUrls(todo.map((w) => w.title));
  let ok = 0;
  for (const w of todo) {
    const url = urls.get(w.title);
    if (!url) { console.warn(`  missing on wiki: ${w.title}`); continue; }
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (!res.ok) { console.warn(`  ${res.status} for ${w.title}`); continue; }
    await writeFile(join(OUT, w.file), Buffer.from(await res.arrayBuffer()));
    ok++;
    await new Promise((r) => setTimeout(r, 150)); // be polite
  }
  console.log(`Downloaded ${ok} / ${todo.length} files into public/pals/`);
}

main().catch((e) => { console.error(e); process.exit(1); });
