export type LayerKind = 'peaks' | 'spires' | 'trees' | 'crystals' | 'towers' | 'shards';

export interface LayerDef {
  kind: LayerKind;
  factor: number; // parallax: how far the layer shifts as the player moves (0 = fixed)
  baseY: number;  // the layer's baseline (the ground is drawn on top at y=300)
  minH: number; maxH: number;
  tint: number;   // 0..1 blend from the sky color toward the world accent
}

/** Far to near, per world. PLACEHOLDER silhouettes built from simple polygons. */
export const BACKDROPS: Record<number, LayerDef[]> = {
  1: [
    { kind: 'peaks',   factor: 0.05, baseY: 250, minH: 90, maxH: 170, tint: 0.10 },
    { kind: 'spires',  factor: 0.12, baseY: 275, minH: 70, maxH: 150, tint: 0.16 },
    { kind: 'towers',  factor: 0.22, baseY: 302, minH: 40, maxH: 90,  tint: 0.22 },
  ],
  2: [
    { kind: 'peaks',   factor: 0.05, baseY: 250, minH: 80, maxH: 150, tint: 0.12 },
    { kind: 'trees',   factor: 0.12, baseY: 285, minH: 90, maxH: 170, tint: 0.18 },
    { kind: 'trees',   factor: 0.22, baseY: 302, minH: 70, maxH: 130, tint: 0.26 },
  ],
  3: [
    { kind: 'peaks',    factor: 0.05, baseY: 250, minH: 100, maxH: 180, tint: 0.14 },
    { kind: 'crystals', factor: 0.12, baseY: 280, minH: 60,  maxH: 140, tint: 0.20 },
    { kind: 'crystals', factor: 0.22, baseY: 302, minH: 40,  maxH: 90,  tint: 0.28 },
  ],
  4: [
    { kind: 'towers', factor: 0.05, baseY: 260, minH: 100, maxH: 170, tint: 0.12 },
    { kind: 'towers', factor: 0.12, baseY: 285, minH: 70,  maxH: 130, tint: 0.20 },
    { kind: 'spires', factor: 0.22, baseY: 302, minH: 50,  maxH: 110, tint: 0.28 },
  ],
  5: [
    { kind: 'shards',   factor: 0.05, baseY: 220, minH: 40, maxH: 90,  tint: 0.14 },
    { kind: 'shards',   factor: 0.12, baseY: 250, minH: 30, maxH: 70,  tint: 0.20 },
    { kind: 'crystals', factor: 0.22, baseY: 302, minH: 40, maxH: 100, tint: 0.28 },
  ],
};

/** Which layers to draw for a given count: 1 = the middle one, 2 = far + near, 3 = all. */
export function pickLayers(defs: LayerDef[], count: number): LayerDef[] {
  if (count <= 1) return [defs[1] ?? defs[0]];
  if (count === 2) return [defs[0], defs[defs.length - 1]];
  return defs;
}

export function mixHex(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (shift: number) =>
    Math.round(((pa >> shift) & 255) * (1 - t) + ((pb >> shift) & 255) * t);
  return `#${((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1)}`;
}

function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const f = (n: number) => Math.round(n * 10) / 10;

/** One SVG path string for a whole layer. Deterministic for a given seed. */
export function layerPath(def: LayerDef, seed: number, x0 = -420, x1 = 1220): string {
  const rnd = lcg(seed * 7919 + 13);
  const B = def.baseY;
  const parts: string[] = [];
  let x = x0;
  while (x < x1) {
    const h = def.minH + rnd() * (def.maxH - def.minH);
    switch (def.kind) {
      case 'peaks': {
        const w = 90 + rnd() * 70;
        parts.push(`M${f(x)} ${B}L${f(x + w / 2)} ${f(B - h)}L${f(x + w)} ${B}Z`);
        x += w * 0.6; break;
      }
      case 'spires': {
        const w = 18 + rnd() * 16;
        parts.push(`M${f(x)} ${B}L${f(x + w / 2)} ${f(B - h)}L${f(x + w)} ${B}Z`);
        x += w + 30 + rnd() * 40; break;
      }
      case 'trees': {
        const w = 34 + rnd() * 22;
        const cx = x + w / 2;
        parts.push(`M${f(x)} ${f(B - h * 0.25)}L${f(cx)} ${f(B - h * 0.7)}L${f(x + w)} ${f(B - h * 0.25)}Z`);
        parts.push(`M${f(x + w * 0.15)} ${f(B - h * 0.55)}L${f(cx)} ${f(B - h)}L${f(x + w * 0.85)} ${f(B - h * 0.55)}Z`);
        parts.push(`M${f(cx - 3)} ${B}L${f(cx - 3)} ${f(B - h * 0.3)}L${f(cx + 3)} ${f(B - h * 0.3)}L${f(cx + 3)} ${B}Z`);
        x += w + 14 + rnd() * 26; break;
      }
      case 'crystals': {
        const w = 20 + rnd() * 20;
        const cx = x + w / 2;
        parts.push(`M${f(cx)} ${f(B - h)}L${f(x + w)} ${f(B - h * 0.45)}L${f(cx)} ${B}L${f(x)} ${f(B - h * 0.45)}Z`);
        x += w + 20 + rnd() * 40; break;
      }
      case 'towers': {
        const w = 40 + rnd() * 30;
        const c = w / 5;
        parts.push(`M${f(x)} ${B}L${f(x)} ${f(B - h)}L${f(x + w)} ${f(B - h)}L${f(x + w)} ${B}Z`);
        for (let k = 0; k < 3; k++) {
          const cx = x + c * (k * 2);
          parts.push(`M${f(cx)} ${f(B - h)}L${f(cx)} ${f(B - h - 10)}L${f(cx + c)} ${f(B - h - 10)}L${f(cx + c)} ${f(B - h)}Z`);
        }
        x += w + 20 + rnd() * 50; break;
      }
      case 'shards': {
        const w = 24 + rnd() * 30;
        const y = B - h - rnd() * 60;
        parts.push(`M${f(x)} ${f(y)}L${f(x + w)} ${f(y)}L${f(x + w / 2)} ${f(y + h)}Z`);
        x += w + 60 + rnd() * 80; break;
      }
    }
  }
  return parts.join('');
}