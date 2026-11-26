import { TestBed } from '@angular/core/testing';

import { LenziGlassSlider } from './glass-slider';

describe('LenziGlassSlider', () => {
  function make(value = 40) {
    const fixture = TestBed.createComponent(LenziGlassSlider);
    fixture.componentRef.setInput('label', 'Volume');
    fixture.componentRef.setInput('value', value);
    fixture.componentRef.setInput('step', 5);
    fixture.detectChanges();
    const track = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('.track')!;
    const key = (k: string) => track.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));
    return { fixture, track, key };
  }

  it('is a slider with its name, ends and value', () => {
    const { track } = make();
    expect(track.getAttribute('role')).toBe('slider');
    expect(track.getAttribute('aria-label')).toBe('Volume');
    expect([track.getAttribute('aria-valuemin'), track.getAttribute('aria-valuemax'), track.getAttribute('aria-valuenow')]).toEqual(['0', '100', '40']);
  });

  it('steps with the keys and keeps inside its ends', () => {
    const { fixture, key } = make(95);
    key('ArrowRight');
    expect(fixture.componentInstance.value()).toBe(100);
    key('ArrowRight');
    expect(fixture.componentInstance.value()).toBe(100);
    key('PageDown');
    expect(fixture.componentInstance.value()).toBe(50);
    key('Home');
    expect(fixture.componentInstance.value()).toBe(0);
  });

  it('dragged, the thumb is glass and the value follows the pointer, on its steps', () => {
    const { fixture, track } = make(0);
    track.querySelector<HTMLElement>('.rail')!.getBoundingClientRect = () => ({ left: 0, width: 200, top: 0, height: 40, right: 200, bottom: 40, x: 0, y: 0, toJSON: () => ({}) });
    track.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, button: 0, clientX: 103 }));
    fixture.detectChanges();
    expect(track.classList.contains('active')).toBe(true);
    expect(fixture.componentInstance.value()).toBe(50);
    track.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: 150 }));
    track.dispatchEvent(new MouseEvent('pointerup', { bubbles: true }));
    expect(fixture.componentInstance.value()).toBe(75);
  });

  it('pulled past an end, the value stays at it and the thumb stretches, less and less; let go, it springs back', () => {
    const { fixture, track } = make();
    track.querySelector<HTMLElement>('.rail')!.getBoundingClientRect = () => ({ left: 0, width: 200, top: 0, height: 40, right: 200, bottom: 40, x: 0, y: 0, toJSON: () => ({}) });
    track.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, button: 0, clientX: 190 }));
    track.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: 260 }));
    fixture.detectChanges();
    const over = () => parseFloat(track.style.getPropertyValue('--lenzi-slider-over'));
    expect(fixture.componentInstance.value()).toBe(100);
    const pulled = over();
    expect(pulled).toBeGreaterThan(0);
    track.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: 2000 }));
    fixture.detectChanges();
    // never further than its share of the glass, however far the pointer goes
    expect(over()).toBeGreaterThan(pulled);
    // its knob's lens: 32 × 1.35 (KNOB_SIZES.capsule, KNOB_GROW)
    expect(over()).toBeLessThanOrEqual(Math.round(32 * 1.35) * 0.4 + 0.01);
    track.dispatchEvent(new MouseEvent('pointerup', { bubbles: true }));
    fixture.detectChanges();
    expect(over()).toBe(0);
  });

  it("its knob takes the shapes asked for, or is the page's own; the fill may be a wave, flowing or still", () => {
    const { fixture, track } = make();
    const knob = () => track.querySelector<HTMLElement>('lenzi-glass-knob')!;
    expect(knob().classList.contains('shape-capsule')).toBe(true);
    // room at its ends for its knob's lens, half of it
    expect(track.style.getPropertyValue('--lenzi-slider-room')).toBe(`${Math.round(32 * 1.35) / 2}px`);
    fixture.componentRef.setInput('thumb', 'flower');
    fixture.componentRef.setInput('track', 'wave');
    fixture.componentRef.setInput('waveMoving', false);
    fixture.detectChanges();
    expect(knob().classList.contains('shape-blob')).toBe(true);
    expect(knob().querySelector('svg.solid path')?.getAttribute('d')).toMatch(/^M/);
    const wave = track.querySelector<HTMLElement>('.rail.wave')!;
    expect(wave.classList.contains('still')).toBe(true);
    expect(wave.style.getPropertyValue('--lenzi-wave')).toContain('data:image/svg+xml');
  });

  it('dragged, its knob is held (glass), and a moment after it is let go, white again', async () => {
    const { fixture, track } = make();
    track.querySelector<HTMLElement>('.rail')!.getBoundingClientRect = () => ({ left: 0, width: 200, top: 0, height: 40, right: 200, bottom: 40, x: 0, y: 0, toJSON: () => ({}) });
    track.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, button: 0, clientX: 100 }));
    fixture.detectChanges();
    expect(track.querySelector('lenzi-glass-knob')!.classList.contains('held')).toBe(true);
    track.dispatchEvent(new MouseEvent('pointerup', { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 320));
    fixture.detectChanges();
    expect(track.querySelector('lenzi-glass-knob')!.classList.contains('held')).toBe(false);
  });
});
