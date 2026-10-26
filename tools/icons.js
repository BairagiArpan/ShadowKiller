'use strict';
const zlib = require('zlib');

const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

/** 8-bit RGBA PNG, no dependencies besides Node's zlib. */
function encodePng(w, h, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8 bits per channel, RGBA
  const stride = w * 4;
  const raw = Buffer.alloc((stride + 1) * h);
  for (let y = 0; y < h; y++) rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const lerp = (a, b, t) => a + (b - a) * t;

/** Straight-alpha "source over". Colors are 0..255, alpha 0..1. */
function over(d, s) {
  const a = s[3] + d[3] * (1 - s[3]);
  if (a <= 0) return [0, 0, 0, 0];
  return [0, 1, 2].map((i) => (s[i] * s[3] + d[i] * d[3] * (1 - s[3])) / a).concat(a);
}

/** One sample of the artwork. nx, ny are 0..1. o = { bg: boolean, scale: number }. */
function shade(nx, ny, o) {
  let px = [0, 0, 0, 0];
  if (o.bg) px = [lerp(26, 5, ny), lerp(11, 5, ny), lerp(58, 10, ny), 1];
  const x = (nx - 0.5) / o.scale + 0.5;
  const y = (ny - 0.5) / o.scale + 0.5;

  const dg = Math.hypot(x - 0.5, y - 0.45); // violet glow
  if (dg < 0.4) px = over(px, [122, 44, 255, 0.35 * Math.pow(1 - dg / 0.4, 2)]);

  if (Math.hypot(x - 0.5, y - 0.45) < 0.24 && Math.hypot(x - 0.58, y - 0.4) >= 0.21) {
    px = over(px, [207, 214, 255, 1]); // crescent moon
  }

  const rx = x - 0.5, ry = y - 0.62; // diagonal blade
  const t = (rx - ry) * 0.7071;
  const n = (rx + ry) * 0.7071;
  if (t > -0.3 && t < 0.3) {
    const hw = 0.026 * (1 - (t + 0.3) / 0.6) + 0.003;
    if (t < -0.2 && Math.abs(n) < 0.014) px = over(px, [60, 40, 90, 1]);       // handle
    else if (Math.abs(n) < hw) px = over(px, [230, 220, 255, 1]);              // blade
  }
  if (Math.abs(t + 0.2) < 0.008 && Math.abs(n) < 0.075) px = over(px, [122, 44, 255, 1]); // guard
  return px;
}

/** Renders size x size RGBA with 2x2 supersampling (smooth edges). */
function renderRgba(size, o) {
  const out = Buffer.alloc(size * size * 4);
  const SS = 2;
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const s = shade((px + (sx + 0.5) / SS) / size, (py + (sy + 0.5) / SS) / size, o);
          r += s[0] * s[3]; g += s[1] * s[3]; b += s[2] * s[3]; a += s[3];
        }
      }
      const i = (py * size + px) * 4;
      const cnt = SS * SS;
      out[i] = a > 0 ? Math.round(r / a) : 0;
      out[i + 1] = a > 0 ? Math.round(g / a) : 0;
      out[i + 2] = a > 0 ? Math.round(b / a) : 0;
      out[i + 3] = Math.round((a / cnt) * 255);
    }
  }
  return out;
}

module.exports = { crc32, encodePng, renderRgba };