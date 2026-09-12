// Generates public/icons/*.png — an original "sphere" mark — with a minimal PNG encoder (zlib only).
//   node scripts/make-icons.mjs
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const OUT = join(import.meta.dirname, '..', 'public', 'icons');
mkdirSync(OUT, { recursive: true });

const BG = [0x0f, 0x1f, 0x34], TOP = [0x35, 0xd0, 0xff], BOTTOM = [0xee, 0xf6, 0xff], BAND = [0x0f, 0x1f, 0x34], BUTTON = [0xff, 0xb7, 0x03], RIM = [0x60, 0xd6, 0xff];

/** Colour at a point of the design, in unit coordinates (0..1). `pad` shrinks the sphere for maskable icons. */
function sample(u, v, pad) {
  const cx = 0.5, cy = 0.5, r = 0.42 * (1 - pad);
  const dx = u - cx, dy = v - cy, d = Math.hypot(dx, dy);
  if (d > r) return BG;
  if (d > r * 0.93) return RIM;
  const bandH = 0.045 * (1 - pad);
  if (Math.abs(dy) < bandH) return BAND;
  const button = Math.hypot(dx, dy) < r * 0.2;
  if (button) return Math.hypot(dx, dy) < r * 0.14 ? BUTTON : BAND;
  // subtle shading: lighter toward the top-left
  const shade = 1 + 0.18 * ((-dx - dy) / r);
  const base = dy < 0 ? TOP : BOTTOM;
  return base.map((c) => Math.max(0, Math.min(255, Math.round(c * shade))));
}

function render(size, pad, ss = 3) {
  const px = new Uint8Array(size * size * 3);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let r = 0, g = 0, b = 0;
    for (let sy = 0; sy < ss; sy++) for (let sx = 0; sx < ss; sx++) {
      const c = sample((x + (sx + 0.5) / ss) / size, (y + (sy + 0.5) / ss) / size, pad);
      r += c[0]; g += c[1]; b += c[2];
    }
    const n = ss * ss, i = (y * size + x) * 3;
    px[i] = r / n; px[i + 1] = g / n; px[i + 2] = b / n;
  }
  return px;
}

// ---- PNG encoding ----------------------------------------------------------------------------
const CRC = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
const crc32 = (buf) => { let c = -1; for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ -1) >>> 0; };
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(size, px) {
  const raw = Buffer.alloc((size * 3 + 1) * size);
  for (let y = 0; y < size; y++) { raw[y * (size * 3 + 1)] = 0; Buffer.from(px.buffer, y * size * 3, size * 3).copy(raw, y * (size * 3 + 1) + 1); }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

for (const [name, size, pad] of [['icon-192.png', 192, 0], ['icon-512.png', 512, 0], ['maskable-512.png', 512, 0.2], ['apple-touch-icon.png', 180, 0.05]]) {
  writeFileSync(join(OUT, name), png(size, render(size, pad)));
  console.log('wrote', name);
}
