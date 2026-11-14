import { TestBed } from '@angular/core/testing';

import { LenziSights } from '../sights/sights';
import { LenziBlobFlockBackground, MATERIAL_LAYERS, stops } from './blob-flock-background';

describe('what stops what, by layer', () => {
  const boids = { material: null, layer: MATERIAL_LAYERS.lamp };
  const lampDrops = { material: 'lamp' as const, layer: MATERIAL_LAYERS.lamp };
  const glassDrops = { material: 'glass' as const, layer: MATERIAL_LAYERS.glass };

  it('the boids and the lamp drops stop each other as before: one layer', () => {
    expect(stops({ material: 'lamp', layer: 0 }, boids)).toBe(true);
    expect(stops(lampDrops, boids)).toBe(true);
    expect(stops({ material: 'solid', layer: 0 }, lampDrops)).toBe(true);
    // their own material melts in
    expect(stops({ material: 'lamp', layer: 0 }, lampDrops)).toBe(false);
  });

  it('glass is on the layer above: the boids and the lamp drops fly under it, and the glass drops over them', () => {
    expect(stops({ material: 'glass', layer: MATERIAL_LAYERS.glass }, boids)).toBe(false);
    expect(stops(glassDrops, lampDrops)).toBe(false);
    expect(stops(lampDrops, glassDrops)).toBe(false);
    expect(stops({ material: 'lamp', layer: 0 }, glassDrops)).toBe(false);
  });

  it('on the same layer, glass stops the others too', () => {
    expect(stops({ material: 'glass', layer: 0 }, boids)).toBe(true);
    expect(stops({ material: 'lamp', layer: 1 }, glassDrops)).toBe(true);
  });
});

describe('LenziBlobFlockBackground', () => {
  it('without WebGL2 shows a still picture, has no canvas, and is hidden from screen readers', async () => {
    const fixture = TestBed.createComponent(LenziBlobFlockBackground);
    fixture.componentRef.setInput('boids', 500);
    fixture.componentRef.setInput('blobs', 4);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.getAttribute('aria-hidden')).toBe('true');
    expect(element.classList.contains('lenzi-background-still')).toBe(true);
    expect(element.querySelector('canvas')).toBeNull();
  });

  it("flies each boid fleet as its own flock, with its leader's ways; without fleets, one flock as the inputs say", () => {
    const fixture = TestBed.createComponent(LenziBlobFlockBackground);
    fixture.componentRef.setInput('maxSpeed', 150);
    // the flocks, as the frame loop asks for them (private: no WebGL2 here, so no frame loop)
    const flocks = () => (fixture.componentInstance as unknown as { current(): { spec: unknown; boids: { count: number; leaders: number; settings: { maxSpeed: number; cohesion: number; sizeVariety: number } } }[] }).current();

    fixture.componentRef.setInput('boids', 120);
    fixture.componentRef.setInput('colonies', 3);
    expect(flocks().map((fleet) => [fleet.boids.count, fleet.boids.leaders])).toEqual([[120, 3]]);

    fixture.componentRef.setInput('boidFlocks', [
      { count: 40, maxSpeed: 260, cohesion: 2, sizeVariety: 0.9 },
      { count: 25, colonies: 2 },
    ]);
    const [fast, plain] = flocks();
    expect([fast!.boids.count, plain!.boids.count, plain!.boids.leaders]).toEqual([40, 25, 2]);
    expect([fast!.boids.settings.maxSpeed, fast!.boids.settings.cohesion, fast!.boids.settings.sizeVariety]).toEqual([260, 2, 0.9]);
    // what a fleet does not say is the background's
    expect(plain!.boids.settings.maxSpeed).toBe(150);
  });

  it('is a source of sights while it is there; with no flock drawn yet it has none', () => {
    const sights = TestBed.inject(LenziSights);
    const fixture = TestBed.createComponent(LenziBlobFlockBackground);
    expect(sights.nearest({ x: 0, y: 0 })).toBeNull();
    fixture.destroy();
    expect(sights.nearest({ x: 0, y: 0 })).toBeNull();
  });
});
