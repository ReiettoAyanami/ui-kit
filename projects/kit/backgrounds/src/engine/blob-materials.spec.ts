import { describe, expect, it } from 'vitest';

import { glassBlurOf, shadowCasts } from './blob-materials';
import { GLASS_BLUR } from './glow-engine';

describe('shadowCasts', () => {
  it('shades a level with solid things on it, and every level under it', () => {
    expect(shadowCasts([true, false])).toEqual([1, 0, 0, 0]);
    expect(shadowCasts([false, true])).toEqual([1, 1, 0, 0]);
    expect(shadowCasts([false, false, true, false])).toEqual([1, 1, 1, 0]);
  });

  it('never shades a level above every solid thing: glass over a solid thing is not in its shadow', () => {
    // lamps and solid things on 0, glass on 1 (the levels of their materials)
    expect(shadowCasts([true, false])[1]).toBe(0);
  });

  it('shades nothing without solid things (and the blur of each glass is below)', () => {
    expect(shadowCasts([])).toEqual([0, 0, 0, 0]);
    expect(shadowCasts([false, false, false, false])).toEqual([0, 0, 0, 0]);
  });
});

describe('glassBlurOf (lenzi, 2026-11-21: "tre proprietà indipendenti per ogni vetro")', () => {
  it("is its own blur, within sharp and the page glass's", () => {
    expect(glassBlurOf({ blur: 6 }, true)).toBe(6);
    expect(glassBlurOf({ blur: 6 }, false)).toBe(6);
    expect(glassBlurOf({ blur: 99 }, false)).toBe(GLASS_BLUR);
    expect(glassBlurOf({ blur: -3 }, true)).toBe(0);
  });

  it("not said, is its glass's: frosted the page glass's, liquid sharp", () => {
    expect(glassBlurOf({}, false)).toBe(GLASS_BLUR);
    expect(glassBlurOf({}, true)).toBe(0);
    expect(GLASS_BLUR).toBe(24);
  });
});
