import { describe, expect, it } from 'vitest';

import { bezelShift } from '../liquid-glass/liquid-glass-maps';
import { LIQUID_GLASS, LIQUID_GLASS_LIMITS, LIQUID_GLASS_SURFACES, LIQUID_STEPS, cleanLiquidGlass, liquidLookOf, liquidProfile } from './liquid-profile';

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

  it('is the first lens half as large again: the same shape, bending 1.5 times as far (lenzi, 2026-11-20)', () => {
    const first = liquidProfile({ ...LIQUID_GLASS, bezel: 22, thickness: 48 });
    const now = liquidProfile(LIQUID_GLASS);
    expect(now.largest).toBeCloseTo(first.largest * 1.5, 3);
    for (let i = 0; i <= LIQUID_STEPS; i++) expect(now.shifts[i]).toBeCloseTo(first.shifts[i]!, 4);
  });
});

describe('liquidLookOf', () => {
  it('is none for frosted glass, the defaults with what is said for liquid', () => {
    expect(liquidLookOf('frosted', { bezel: 10 })).toBeNull();
    expect(liquidLookOf(null)).toBeNull();
    expect(liquidLookOf('liquid')).toEqual(LIQUID_GLASS);
    expect(liquidLookOf('liquid', { bezel: 10 })).toEqual({ ...LIQUID_GLASS, bezel: 10 });
  });

  it('takes a setting said as undefined as not said', () => {
    expect(liquidLookOf('liquid', { bezel: undefined, blur: 2 })).toEqual({ ...LIQUID_GLASS, blur: 2 });
  });
});

describe('the blobs’ liquid glass settings (lenzi, 2026-11-20: "per regolare le varie proprietá")', () => {
  it('bends by the bezel’s profile it says: a round one bends more at once than the squircle', () => {
    const squircle = liquidProfile(LIQUID_GLASS);
    const circle = liquidProfile({ ...LIQUID_GLASS, surface: 'circle' });
    expect(Array.from(circle.shifts)).not.toEqual(Array.from(squircle.shifts));
    expect(liquidProfile({ ...LIQUID_GLASS, surface: undefined }).shifts).toEqual(squircle.shifts);
  });

  it('is sharp and a little more saturated than the picture unless told', () => {
    expect(LIQUID_GLASS.surface).toBe('squircle');
    expect(LIQUID_GLASS.saturation).toBe(1.4);
    expect(LIQUID_GLASS.blur).toBe(0);
  });

  it('keeps from a link only its settings, each within its bounds', () => {
    expect(cleanLiquidGlass({ bezel: 1000, thickness: -5, ior: 2, surface: 'lip', blur: 3, colour: '#fff', saturation: Number.NaN })).toEqual({
      bezel: LIQUID_GLASS_LIMITS.bezel.max,
      thickness: LIQUID_GLASS_LIMITS.thickness.min,
      ior: 2,
      surface: 'lip',
      blur: 3,
    });
    expect(cleanLiquidGlass({ surface: 'wavy' })).toBeNull();
    expect(cleanLiquidGlass('liquid')).toBeNull();
    expect(cleanLiquidGlass(null)).toBeNull();
  });

  it('has every default inside its bounds, and every profile as a choice', () => {
    for (const [key, limits] of Object.entries(LIQUID_GLASS_LIMITS)) {
      const value = LIQUID_GLASS[key as keyof typeof LIQUID_GLASS_LIMITS];
      expect(value).toBeGreaterThanOrEqual(limits.min);
      expect(value).toBeLessThanOrEqual(limits.max);
    }
    expect(LIQUID_GLASS_SURFACES).toEqual(['squircle', 'circle', 'lip']);
  });
});
