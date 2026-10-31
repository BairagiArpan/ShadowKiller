const zlib = require('zlib');
const { crc32, encodePng, renderRgba } = require('../icons');

function chunks(png) {
  const out = [];
  let o = 8;
  while (o < png.length) {
    const len = png.readUInt32BE(o);
    const type = png.toString('ascii', o + 4, o + 8);
    const data = png.subarray(o + 8, o + 8 + len);
    const crc = png.readUInt32BE(o + 8 + len);
    out.push({ type, data, crc, body: png.subarray(o + 4, o + 8 + len) });
    o += 12 + len;
  }
  return out;
}

describe('PNG encoder', () => {
  const rgba = renderRgba(32, { bg: true, scale: 1 });
  const png = encodePng(32, 32, rgba);

  it('writes a valid signature, header and checksums', () => {
    expect([...png.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
    const cs = chunks(png);
    expect(cs.map((c) => c.type)).toEqual(['IHDR', 'IDAT', 'IEND']);
    expect(cs[0].data.readUInt32BE(0)).toBe(32);
    expect(cs[0].data.readUInt32BE(4)).toBe(32);
    expect(cs[0].data[8]).toBe(8);
    expect(cs[0].data[9]).toBe(6);
    cs.forEach((c) => expect(crc32(c.body)).toBe(c.crc));
  });
  it('round-trips the pixel data', () => {
    const raw = zlib.inflateSync(chunks(png)[1].data);
    expect(raw.length).toBe((32 * 4 + 1) * 32);
    for (let y = 0; y < 32; y++) {
      expect(raw[y * 129]).toBe(0);
      expect(raw.subarray(y * 129 + 1, y * 129 + 129).equals(rgba.subarray(y * 128, (y + 1) * 128))).toBe(true);
    }
  });
  it('matches the known CRC-32 of "123456789"', () => {
    expect(crc32(Buffer.from('123456789'))).toBe(0xcbf43926);
  });
});

describe('artwork', () => {
  const N = 128;
  it('the app icon is fully opaque and contains moon-colored pixels', () => {
    const b = renderRgba(N, { bg: true, scale: 1 });
    for (let i = 3; i < b.length; i += 4) expect(b[i]).toBe(255);
    let moon = 0;
    for (let i = 0; i < b.length; i += 4) if (b[i] > 190 && b[i + 1] > 190 && b[i + 2] > 230) moon += 1;
    expect(moon).toBeGreaterThan(200);
  });
  it('the adaptive foreground is transparent at the corners and stays inside the safe zone', () => {
    const b = renderRgba(N, { bg: false, scale: 0.62 });
    expect(b[3]).toBe(0);
    let visible = 0;
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        if (b[(y * N + x) * 4 + 3] === 0) continue;
        visible += 1;
        expect(Math.hypot(x + 0.5 - N / 2, y + 0.5 - N / 2)).toBeLessThanOrEqual(0.31 * N);
      }
    }
    expect(visible).toBeGreaterThan(100);
  });
  it('is deterministic', () => {
    expect(renderRgba(48, { bg: true, scale: 1 }).equals(renderRgba(48, { bg: true, scale: 1 }))).toBe(true);
  });
});