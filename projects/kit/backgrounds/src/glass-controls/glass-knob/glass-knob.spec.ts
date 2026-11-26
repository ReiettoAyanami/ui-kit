import { TestBed } from '@angular/core/testing';

import { KNOB_GROW, KNOB_SIZES, LenziGlassKnob, knobOutline } from './glass-knob';

describe('LenziGlassKnob', () => {
  function make(inputs: Record<string, unknown> = {}) {
    const fixture = TestBed.createComponent(LenziGlassKnob);
    for (const [name, value] of Object.entries(inputs)) fixture.componentRef.setInput(name, value);
    fixture.detectChanges();
    return { fixture, element: fixture.nativeElement as HTMLElement, knob: fixture.componentInstance };
  }

  it('is thin by default, a little taller than a rail (lenzi, 2026-11-26: "i pomelli più fini"), its lens 1.35 times it', () => {
    const { knob, element } = make();
    expect(knob.size()).toEqual(KNOB_SIZES.capsule);
    expect(knob.lensSize()).toEqual({ width: Math.round(32 * KNOB_GROW), height: Math.round(14 * KNOB_GROW) });
    expect(element.style.getPropertyValue('--knob-grow')).toBe(String(KNOB_GROW));
    expect(element.querySelector('span.solid')).not.toBeNull();
  });

  it('takes a blob\'s shape, drawn as its outline; grows as much as asked, never past twice', () => {
    const { knob, element, fixture } = make({ shape: 'flower', grow: 1.5 });
    expect(element.classList.contains('shape-blob')).toBe(true);
    expect(element.querySelector('svg.solid path')?.getAttribute('d')).toMatch(/^M[\d.]+ [\d.]+L/);
    expect(knob.lensSize()).toEqual({ width: 36, height: 36 });
    fixture.componentRef.setInput('grow', 5);
    fixture.detectChanges();
    expect(knob.lensSize().width).toBe(48);
  });

  it('held, it is glass (the class its styles grow it by)', () => {
    const { knob, element, fixture } = make();
    knob.held.set(true);
    fixture.detectChanges();
    expect(element.classList.contains('held')).toBe(true);
  });

  it('turns from one blob shape to another by mixing their radii: halfway between, never torn', () => {
    const start = knobOutline(24, 24, 'circle');
    const end = knobOutline(24, 24, 'flower');
    const half = knobOutline(24, 24, 'circle', 'flower', 0.5);
    expect(half).not.toBe(start);
    expect(half).not.toBe(end);
    const points = (path: string) => path.slice(1, -1).split('L').map((p) => p.split(' ').map(Number));
    // every point of the half way lies between its two ends' (the same angle, the radius mixed)
    const [a, b, h] = [points(start), points(end), points(half)];
    expect(h.length).toBe(a.length);
    for (let i = 0; i < h.length; i++) {
      const r = (p: number[]) => Math.hypot(p[0]! - 12, p[1]! - 12);
      expect(r(h[i]!)).toBeCloseTo((r(a[i]!) + r(b[i]!)) / 2, 1);
    }
  });
});
