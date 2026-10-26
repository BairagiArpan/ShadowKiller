/**
 * Watches frame times and says when to drop one graphics level. Pure and testable.
 * It judges windows of frames, ignores hitches (app switches, pauses) and never raises quality.
 */
export class PerfGovernor {
  private acc = 0;
  private frames = 0;
  private cooldown = 0;

  constructor(
    private readonly targetMs: number,
    private readonly windowMs = 2000,
    private readonly slack = 1.35,
  ) {}

  /** Feed one frame time in milliseconds. Returns true when quality should drop one level. */
  sample(ms: number): boolean {
    if (!(ms > 0) || ms > 100) return false;
    this.acc += ms;
    this.frames += 1;
    if (this.acc < this.windowMs) return false;
    const avg = this.acc / this.frames;
    this.acc = 0;
    this.frames = 0;
    if (this.cooldown > 0) { this.cooldown -= 1; return false; } // let a change settle for one window
    if (avg > this.targetMs * this.slack) { this.cooldown = 1; return true; }
    return false;
  }
}