import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LenziSights } from '@lenzi/ui-kit/backgrounds';

import { LenziCat, closingEye } from './cat';
import { CAT_BACKS, CAT_EXPRESSIONS, CAT_EYE_EDGES } from './cat-art';

describe('LenziCat', () => {
  let fixture: ComponentFixture<LenziCat>;
  const host = () => fixture.nativeElement as HTMLElement;
  const set = async (inputs: Record<string, unknown>) => {
    for (const [name, value] of Object.entries(inputs)) fixture.componentRef.setInput(name, value);
    await fixture.whenStable();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [LenziCat] }).compileComponents();
    fixture = TestBed.createComponent(LenziCat);
    await fixture.whenStable();
  });

  it('draws the happy cat: the back, its lines and its face, each piece on its own', () => {
    const paths = [...host().querySelectorAll('svg path')].map((path) => path.getAttribute('d'));
    expect(paths[0]).toBe(CAT_BACKS.plain.ink);
    expect(paths).toContain(CAT_EXPRESSIONS.happy.eyeLeft);
    expect(host().querySelectorAll('.eye')).toHaveLength(2);
    expect(host().querySelectorAll('.whiskers')).toHaveLength(2);
  });

  it('takes any expression over any back, or none (seen from behind)', async () => {
    await set({ expression: 'sleepy', back: 'hard-hat' });
    const paths = [...host().querySelectorAll('svg path')].map((path) => path.getAttribute('d'));
    expect(paths[0]).toBe(CAT_BACKS['hard-hat'].ink);
    expect(paths).toContain(CAT_EXPRESSIONS.sleepy.mouth);
    await set({ expression: 'none' });
    expect(host().querySelector('.eye')).toBeNull();
  });

  it('watching, turns its eyes (no pupils) to the pointer, or else to the nearest thing that moves', async () => {
    const sights = TestBed.inject(LenziSights);
    await set({ expression: 'watching' });
    expect(host().querySelector('.pupil, ellipse')).toBeNull();
    const eyes = host().querySelectorAll<SVGGElement>('.gaze');
    expect(eyes).toHaveLength(2);
    const shift = (element: Element) => Number(/translate\((-?[\d.]+)/.exec(element.getAttribute('transform') ?? '')?.[1] ?? 0);
    // no pointer: a boid far to the right
    const leave = sights.add({}, () => ({ x: 5000, y: 0 }));
    await new Promise((resolve) => setTimeout(resolve, 120));
    expect(shift(eyes[0]!)).toBeGreaterThan(0);
    expect(shift(host().querySelector('.face')!)).toBeGreaterThan(0);
    leave();
    // the pointer, far to the left
    window.dispatchEvent(new PointerEvent('pointermove', { clientX: -5000, clientY: 0 }));
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(shift(eyes[1]!)).toBeLessThan(0);
    // another expression: the face is back in its place
    await set({ expression: 'happy' });
    expect(host().querySelector('.face')?.getAttribute('transform')).toBeNull();
  });

  it('gives its body the material asked for, shaped as the cat', async () => {
    const shape = () => host().querySelector<HTMLElement>('.shape')!;
    expect(shape().style.maskImage).toContain('data:image/svg+xml');
    await set({ material: 'glass' });
    expect(shape().classList).toContain('lenzi-lit');
    await set({ material: 'lamp', glowColor: '#ff0000' });
    expect(shape().classList).toContain('lenzi-glow-on');
    expect(host().querySelector('.ink')?.classList).toContain('lit');
    await set({ material: 'solid' });
    expect(shape().classList).toContain('lenzi-solid');
  });

  it('as a lamp, its colour drifts slowly round its own when asked', async () => {
    await set({ material: 'lamp', glowColor: '#b388ff', drift: 40 });
    await new Promise((resolve) => setTimeout(resolve, 450));
    fixture.detectChanges();
    const ink = host().querySelector<SVGElement>('.ink')!;
    expect(ink.style.getPropertyValue('--lenzi-cat-lamp')).toMatch(/^oklch\(from #b388ff l c calc\(h \+ -?[\d.]+\)\)$/);
    await set({ drift: 0 });
    expect(ink.style.getPropertyValue('--lenzi-cat-lamp')).toBe('#b388ff');
  });

  it('pettable, closes its eyes at a stroke, keeps them closed while the pointer is on it, opens them when it leaves', async () => {
    await set({ expression: 'watching', pettable: true });
    host().getBoundingClientRect = () => new DOMRect(100, 100, 200, 280);
    const figure = host().querySelector('.figure')!;
    // a stroke over it
    window.dispatchEvent(new PointerEvent('pointermove', { clientX: 150, clientY: 200 }));
    window.dispatchEvent(new PointerEvent('pointermove', { clientX: 190, clientY: 210 }));
    fixture.detectChanges();
    expect(figure.classList).toContain('petted');
    // the hand rests on it: they stay closed
    await new Promise((resolve) => setTimeout(resolve, 900));
    fixture.detectChanges();
    expect(figure.classList).toContain('petted');
    // the hand leaves: they open at once
    window.dispatchEvent(new PointerEvent('pointermove', { clientX: 600, clientY: 220 }));
    fixture.detectChanges();
    expect(figure.classList).not.toContain('petted');
    // moving elsewhere does not pet it
    window.dispatchEvent(new PointerEvent('pointermove', { clientX: 900, clientY: 900 }));
    window.dispatchEvent(new PointerEvent('pointermove', { clientX: 950, clientY: 900 }));
    fixture.detectChanges();
    expect(figure.classList).not.toContain('petted');
  });

  it('closes an open eye into a U: the top comes down onto the lower stroke, the hole closes', () => {
    const edges = CAT_EYE_EDGES.happy.left;
    const open = closingEye(edges, 0);
    const shut = closingEye(edges, 1);
    const ys = (d: string, outline: number) => {
      const numbers = d.split('Z')[outline]!.match(/-?\d+(?:\.\d+)?/g)!.map(Number);
      return numbers.filter((_, i) => i % 2 === 1);
    };
    // open, the outer outline reaches the eye's top; shut, it goes no higher than the inner bottom edge
    const innerBottomTop = Math.min(...edges.innerBottom.filter((_, i) => i % 2 === 1));
    expect(Math.min(...ys(open, 0))).toBeLessThan(innerBottomTop - 50);
    expect(Math.min(...ys(shut, 0))).toBeGreaterThanOrEqual(innerBottomTop - 0.1);
  });

  it('petted, its eyes close into a U and open back into the drawing', async () => {
    await set({ expression: 'watching', pettable: true });
    host().getBoundingClientRect = () => new DOMRect(100, 100, 200, 280);
    const lid = host().querySelector<SVGPathElement>('.eye')!;
    window.dispatchEvent(new PointerEvent('pointermove', { clientX: 150, clientY: 200 }));
    window.dispatchEvent(new PointerEvent('pointermove', { clientX: 190, clientY: 210 }));
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve, 600));
    expect(lid.getAttribute('d')).toBe(closingEye(CAT_EYE_EDGES.happy.left, 1));
    window.dispatchEvent(new PointerEvent('pointermove', { clientX: 900, clientY: 210 }));
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve, 600));
    expect(lid.getAttribute('d')).toBe(CAT_EXPRESSIONS.happy.eyeLeft);
  });

  it('is decoration unless it is given a label', async () => {
    expect(host().getAttribute('aria-hidden')).toBe('true');
    await set({ label: 'A happy cat', size: 120 });
    expect(host().getAttribute('role')).toBe('img');
    expect(host().getAttribute('aria-label')).toBe('A happy cat');
    expect(host().style.width).toBe('120px');
  });

  it('moves only when animated', async () => {
    expect(host().querySelector('.figure')?.classList).toContain('animated');
    await set({ animated: false });
    expect(host().querySelector('.figure')?.classList).not.toContain('animated');
  });
});
