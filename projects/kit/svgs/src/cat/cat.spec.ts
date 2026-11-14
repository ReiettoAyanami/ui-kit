import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LenziCat } from './cat';
import { CAT_BACKS, CAT_EXPRESSIONS } from './cat-art';

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
