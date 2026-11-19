import { describe, expect, it } from 'vitest';

import { bezelShift } from '../liquid-glass/liquid-glass-maps';
import { LIQUID_GLASS, LIQUID_STEPS, liquidLookOf, liquidProfile } from './liquid-profile';

describe('liquidProfile', () => {
  it('is the directive’s bending over the bezel, a share of the largest', () => {
    const { shifts, largest } = liquidProfile(LIQUID_GLASS);
    expect(shifts.length).toBe(LIQUID_STEPS + 1);
    const shape = { ...LIQUID_GLASS, surface: 'squircle' as const };
    const middle = LIQUID_STEPS / 2;
    expect(shifts[middle]! * largest).toBeCloseTo(bezelShift(shape, (middle / LIQUID_STEPS) * LIQUID_GLASS.bezel), 4);
    expect(Math.max(...Array.from(shifts, Math.abs))).toBeCloseTo(1, 5);
  });

  it('bends nothing on the edge and where the glass is flat', () => {
    const { shifts } = liquidProfile(LIQUID_GLASS);
    expect(shifts[0]).toBe(0);
    expect(shifts[LIQUID_STEPS]).toBe(0);
  });

  it('bends more with thicker glass, and as much as refraction says', () => {
    const thin = liquidProfile({ ...LIQUID_GLASS, thickness: 20 }).largest;
    const thick = liquidProfile({ ...LIQUID_GLASS, thickness: 80 }).largest;
    expect(thick).toBeGreaterThan(thin);
    expect(liquidProfile({ ...LIQUID_GLASS, refraction: 0.5 }).largest).toBeCloseTo(liquidProfile(LIQUID_GLASS).largest / 2, 5);
    expect(liquidProfile({ ...LIQUID_GLASS, refraction: 0 }).largest).toBe(0);
  });

  it('bends nothing with the index of air', () => {
    expect(liquidProfile({ ...LIQUID_GLASS, ior: 1 }).largest).toBeCloseTo(0, 6);
  });
});

describe('liquidLookOf', () => {
  it('is none for frosted glass, the defaults with what is said for liquid', () => {
    expect(liquidLookOf('frosted', { bezel: 10 })).toBeNull();
    expect(liquidLookOf(null)).toBeNull();
    expect(liquidLookOf('liquid')).toEqual(LIQUID_GLASS);
    expect(liquidLookOf('liquid', { bezel: 10 })).toEqual({ ...LIQUID_GLASS, bezel: 10 });
  });
});
