import { describe, expect, it } from 'vitest';

import { shadowCasts } from './blob-materials';

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

  it('shades nothing without solid things', () => {
    expect(shadowCasts([])).toEqual([0, 0, 0, 0]);
    expect(shadowCasts([false, false, false, false])).toEqual([0, 0, 0, 0]);
  });
});
