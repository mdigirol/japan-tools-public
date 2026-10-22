// Draws the app icons (a red sun rising over indigo water on a cream ground, with an amber BETA ribbon across the top-left corner) as PNGs and an SVG, with no image tools.
// Run once: node scripts/make-icons.mjs
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

// Geometry in a 100×100 box, shared by the PNGs and the SVG.
const CREAM = [250, 247, 242], RED = [183, 40, 46], INDIGO = [38, 52, 99], AMBER = [242, 169, 0];
const hex = (c) => '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');
const SUN = { cx: 50, cy: 64, r: 24 };            // half disc sitting on the horizon (y = 64)
const RAY_W = 6, RAY_IN = 31, RAY_OUT = 41;       // short detached rays, kept inside the maskable safe zone
const rays = [30, 60, 90, 120, 150].map((deg) => {
  const a = (deg * Math.PI) / 180;
  return [SUN.cx + Math.cos(a) * RAY_IN, SUN.cy - Math.sin(a) * RAY_IN, SUN.cx + Math.cos(a) * RAY_OUT, SUN.cy - Math.sin(a) * RAY_OUT];
});
const GLINT_W = 4;
const glints = [[34, 76, 66, 76], [42, 86, 58, 86]]; // sun's reflection on the water

// BETA ribbon across the top-left corner: the band is 38 <= x + y <= 54, so its centerline is x + y = 46.
// The word is centered on the midpoint of that centerline (23, 23) and on the band's width, so the padding above and below it is equal.
const BAND = [38, 54], BAND_MID = 23;
const TEXT_K = 0.66, TEXT_W = 1.8;                // glyph scale (glyphs are 6 x 8) and stroke width, in icon units
const GLYPHS = {
  B: [[[0, 8], [0, 0], [4, 0], [5.5, 1], [5.5, 3], [4, 4], [0, 4]], [[4, 4], [6, 5], [6, 7], [4.5, 8], [0, 8]]],
  E: [[[6, 0], [0, 0], [0, 8], [6, 8]], [[0, 4], [5, 4]]],
  T: [[[0, 0], [6, 0]], [[3, 0], [3, 8]]],
  A: [[[0, 8], [3, 0], [6, 8]], [[1.2, 5.5], [4.8, 5.5]]]
};
const WORD = 'BETA', ADV = 8, WORD_W = (WORD.length - 1) * ADV + 6;
const COS = Math.SQRT1_2;                         // the word runs up and to the right at 45 degrees
const place = ([gx, gy], i) => {
  const x = ((i * ADV + gx) - WORD_W / 2) * TEXT_K, y = (gy - 4) * TEXT_K;
  return [BAND_MID + (x + y) * COS, BAND_MID + (y - x) * COS];
};
const textPaths = [...WORD].flatMap((ch, i) => GLYPHS[ch].map((pts) => pts.map((p) => place(p, i))));
const textSegs = textPaths.flatMap((pts) => pts.slice(1).map((p, j) => [...pts[j], ...p]));

const segDist = (px, py, [x1, y1, x2, y2]) => {
  const dx = x2 - x1, dy = y2 - y1;
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
};

function colorAt(x, y) {
  if (textSegs.some((g) => segDist(x, y, g) < TEXT_W / 2)) return INDIGO;
  if (x + y >= BAND[0] && x + y <= BAND[1]) return AMBER;
  if (y > SUN.cy) return glints.some((g) => segDist(x, y, g) < GLINT_W / 2) ? CREAM : INDIGO;
  if ((x - SUN.cx) ** 2 + (y - SUN.cy) ** 2 < SUN.r ** 2) return RED;
  if (rays.some((r) => segDist(x, y, r) < RAY_W / 2)) return RED;
  return CREAM;
}

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc = (buf) => { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const c = Buffer.alloc(4); c.writeUInt32BE(crc(td));
  return Buffer.concat([len, td, c]);
};

function png(size) {
  const rows = [];
  const k = 100 / size;
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 3);
    for (let x = 0; x < size; x++) {
      // 3x3 supersampling for smooth edges
      let acc = [0, 0, 0];
      for (let sy = 0; sy < 3; sy++) for (let sx = 0; sx < 3; sx++) {
        const c = colorAt((x + (sx + 0.5) / 3) * k, (y + (sy + 0.5) / 3) * k);
        acc = acc.map((v, i) => v + c[i]);
      }
      acc.forEach((v, i) => { row[1 + x * 3 + i] = Math.round(v / 9); });
    }
    rows.push(row);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(Buffer.concat(rows))), chunk('IEND', Buffer.alloc(0))
  ]);
}

const n = (v) => +v.toFixed(2);
const line = ([x1, y1, x2, y2]) => `<line x1="${n(x1)}" y1="${n(y1)}" x2="${n(x2)}" y2="${n(y2)}"/>`;
const path = (pts) => 'M' + pts.map(([x, y]) => `${n(x)} ${n(y)}`).join('L');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><clipPath id="c"><rect width="100" height="100" rx="22"/></clipPath></defs>`
  + `<rect width="100" height="100" rx="22" fill="${hex(CREAM)}"/>`
  + `<path d="M${SUN.cx - SUN.r} ${SUN.cy} A${SUN.r} ${SUN.r} 0 0 1 ${SUN.cx + SUN.r} ${SUN.cy}Z" fill="${hex(RED)}"/>`
  + `<g stroke="${hex(RED)}" stroke-width="${RAY_W}" stroke-linecap="round">${rays.map(line).join('')}</g>`
  + `<path d="M0 ${SUN.cy}H100V78A22 22 0 0 1 78 100H22A22 22 0 0 1 0 78Z" fill="${hex(INDIGO)}"/>`
  + `<g stroke="${hex(CREAM)}" stroke-width="${GLINT_W}" stroke-linecap="round">${glints.map(line).join('')}</g>`
  + `<g clip-path="url(#c)"><path d="M${BAND[0] + 6} -6L-6 ${BAND[0] + 6}L-6 ${BAND[1] + 6}L${BAND[1] + 6} -6Z" fill="${hex(AMBER)}"/></g>`
  + `<path d="${textPaths.map(path).join('')}" fill="none" stroke="${hex(INDIGO)}" stroke-width="${TEXT_W}" stroke-linecap="round" stroke-linejoin="round"/>`
  + `</svg>\n`;

writeFileSync('public/icons/icon-192.png', png(192));
writeFileSync('public/icons/icon-512.png', png(512));
writeFileSync('public/icons/apple-touch-icon.png', png(180));
writeFileSync('public/icons/icon.svg', svg);
console.log('icons written');
