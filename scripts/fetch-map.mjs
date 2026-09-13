// Downloads the world map from palworld.wiki.gg into public/map/ at the two sizes the map view uses
// (1024 px for the world view, 2048 px for a zoomed region). The original is 8192 px; the wiki's thumbnailer
// serves the smaller renditions. Run: npm run fetch-map
import { mkdirSync, writeFileSync } from 'node:fs';

const UA = 'Catcha/1.0 (fan project; https://github.com/boubou666/Catcha)';
const FILE = 'World_Map.webp';
mkdirSync('public/map', { recursive: true });
for (const w of [1024, 2048]) {
  const url = `https://palworld.wiki.gg/images/thumb/${FILE}/${w}px-${FILE}`;
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(`public/map/world-${w}.webp`, buf);
  console.log(`world-${w}.webp  ${(buf.length / 1024).toFixed(0)} KB`);
}
