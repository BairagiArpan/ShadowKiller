import { createArena, emptyInput, stepArena } from '../arena';
import { TUTORIAL_STEPS, enterTutorialStep } from '../tutorial';
import { poseFor } from '../pose';
import { createFighter } from '../combat';
import { describe, expect, it } from "@jest/globals";

const calm = () => 0.99;

describe('tutorial', () => {
  it('starts passive on step 0 and advances after moving and jumping', () => {
    const a = createArena({ waves: [], tutorial: true }, calm);
    expect(a.tutorial?.index).toBe(0);
    expect(a.passive).toBe(true);
    for (let i = 0; i < 70; i++) stepArena(a, { ...emptyInput(), right: true, jump: i === 0 });
    expect(a.tutorial?.index).toBe(1);
  });

  it('the special step fills energy and completing it ends the tutorial in victory', () => {
    const a = createArena({ waves: [], tutorial: true }, calm);
    a.tutorial!.index = TUTORIAL_STEPS.length - 1;
    enterTutorialStep(a);
    expect(a.energy).toBe(100);
    stepArena(a, { ...emptyInput(), special: true });
    expect(a.tutorial!.done).toBe(true);
    expect(a.over).toBe('victory');
  });
});

describe('pose', () => {
  it('raises the weapon during telegraph and lays the fighter back when dead', () => {
    const f = createFighter(0, 1, 10, 'telegraph');
    expect(poseFor(f, null).weapon).toBeLessThan(0);
    f.state = 'dead'; f.t = 1;
    expect(poseFor(f, null).lean).toBeLessThan(-1);
  });
});



