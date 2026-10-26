export interface FrameSummary { fps: number; avgMs: number; p95Ms: number; worstMs: number; samples: number }

/** Rolling frame-time statistics over the last `cap` frames. Ignores hitches over 250 ms (app switches). */
export class FrameStats {
  private buf: Float32Array;
  private n = 0;
  private i = 0;

  constructor(private readonly cap = 240) {
    this.buf = new Float32Array(cap);
  }

  add(ms: number): void {
    if (!(ms > 0) || ms > 250) return;
    this.buf[this.i] = ms;
    this.i = (this.i + 1) % this.cap;
    this.n = Math.min(this.n + 1, this.cap);
  }

  reset(): void { this.n = 0; this.i = 0; }

  summary(): FrameSummary {
    if (this.n === 0) return { fps: 0, avgMs: 0, p95Ms: 0, worstMs: 0, samples: 0 };
    const v = Array.from(this.buf.subarray(0, this.n)).sort((a, b) => a - b);
    const avg = v.reduce((s, x) => s + x, 0) / v.length;
    const p95 = v[Math.min(v.length - 1, Math.ceil(v.length * 0.95) - 1)];
    return { fps: 1000 / avg, avgMs: avg, p95Ms: p95, worstMs: v[v.length - 1], samples: v.length };
  }
}