// Regenerates the placeholder app icons/splash used by app.json.
// Pure Node (zlib) — no image libs. Replace assets with real artwork before
// Play Store submission: node scripts/gen-icons.mjs
import { deflateSync } from 'node:zlib';

const crcTable = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function encodePng(width, height, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function makeCanvas(size) {
  return Buffer.alloc(size * size * 4);
}

function setPx(buf, size, x, y, [r, g, b, a]) {
  if (x < 0 || y < 0 || x >= size || y >= size) return;
  const i = (y * size + x) * 4;
  // simple source-over alpha blend
  const da = buf[i + 3];
  if (a === 255 && da === 0) {
    buf[i] = r;
    buf[i + 1] = g;
    buf[i + 2] = b;
    buf[i + 3] = a;
    return;
  }
  const na = a + (da * (255 - a)) / 255;
  buf[i] = Math.round((r * a + buf[i] * (da * (255 - a)) / 255) / na);
  buf[i + 1] = Math.round((g * a + buf[i + 1] * (da * (255 - a)) / 255) / na);
  buf[i + 2] = Math.round((b * a + buf[i + 2] * (da * (255 - a)) / 255) / na);
  buf[i + 3] = Math.round(na);
}

function fillRect(buf, size, cx, cy, w, h, color) {
  const x0 = Math.round(cx - w / 2);
  const y0 = Math.round(cy - h / 2);
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) setPx(buf, size, x, y, color);
}

function fillCircle(buf, size, cx, cy, r, color) {
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= r * r) setPx(buf, size, x, y, color);
    }
  }
}

function fillDiamond(buf, size, cx, cy, r, color) {
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
      if (Math.abs(x - cx) + Math.abs(y - cy) <= r) setPx(buf, size, x, y, color);
    }
  }
}

// Theme: deep navy bg, emerald ring, white card, red diamond.
const NAVY = [13, 17, 30, 255];
const EMERALD = [34, 197, 94, 255];
const GOLD = [251, 191, 36, 255];
const WHITE = [255, 255, 255, 255];
const RED = [220, 38, 38, 255];

function drawEmblem(buf, size, cx, cy, scale) {
  // outer ring
  fillCircle(buf, size, cx, cy, 0.32 * size * scale, EMERALD);
  fillCircle(buf, size, cx, cy, 0.24 * size * scale, NAVY);
  // card
  const cw = 0.30 * size * scale;
  const ch = 0.42 * size * scale;
  fillRect(buf, size, cx, cy, cw, ch, WHITE);
  fillDiamond(buf, size, cx, cy - ch * 0.2, ch * 0.16 * scale, RED);
}

function fullBleedIcon(size) {
  const buf = makeCanvas(size);
  fillRect(buf, size, size / 2, size / 2, size, size, NAVY);
  drawEmblem(buf, size, size / 2, size / 2, 1.05);
  return encodePng(size, size, buf);
}

function adaptiveIcon(size) {
  // foreground: transparent, emblem kept inside the 66% safe zone
  const buf = makeCanvas(size);
  drawEmblem(buf, size, size / 2, size / 2, 0.62);
  return encodePng(size, size, buf);
}

function splash(size) {
  const buf = makeCanvas(size);
  drawEmblem(buf, size, size / 2, size / 2, 0.42);
  return encodePng(size, size, buf);
}

const root = new URL('../assets/', import.meta.url);
const { mkdirSync, writeFileSync } = await import('node:fs');
mkdirSync(root, { recursive: true });

writeFileSync(new URL('icon.png', root), fullBleedIcon(1024));
writeFileSync(new URL('adaptive-icon.png', root), adaptiveIcon(1024));
writeFileSync(new URL('splash.png', root), splash(1024));

console.log('assets written:', root.pathname, '(icon.png, adaptive-icon.png, splash.png)');