import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { LenziScene, LenziSceneBackground, sceneLayout } from './scene';

const HOME: LenziScene = {
  name: 'Home',
  blobs: [
    { material: 'lamp', size: 0.2 },
    { material: 'glass', size: 0.2 },
    { material: 'lamp', size: 0.085 },
  ],
  fleets: [
    { kind: 'boid', count: 380, colonies: 4 },
    { kind: 'blob-boid', material: 'glass', count: 42, colonies: 3 },
    { kind: 'blob-boid', material: 'lamp', count: 48, colonies: 3 },
  ],
  follow: 'flee',
  throwable: true,
};

describe('sceneLayout', () => {
  it('gives the backgrounds the blobs in order and every fleet as its own flock', () => {
    const layout = sceneLayout(HOME);
    expect(layout.flocking).toBe(true);
    expect(layout.blobs).toEqual(HOME.blobs);
    expect(layout.boidFlocks).toEqual([{ count: 380, colonies: 4 }]);
    expect(layout.blobFlocks).toEqual([
      { material: 'glass', count: 42, colonies: 3 },
      { material: 'lamp', count: 48, colonies: 3 },
    ]);
    expect(layout.follow).toBe('flee');
    expect(layout.throwable).toBe(true);
  });

  it("each fleet keeps its leader's ways, its size and its sizes' variety; a fleet without boids is left out", () => {
    const layout = sceneLayout({
      blobs: [],
      fleets: [
        { kind: 'boid', count: 100, size: 12, maxSpeed: 220, cohesion: 2, sizeVariety: 0.8 },
        { kind: 'boid', count: 50, colonies: 2 },
        { kind: 'blob-boid', count: 0 },
        { kind: 'blob-boid', material: 'glass', count: 20, wander: 1, colour: '#88ccff', tint: 0.7 },
      ],
    });
    expect(layout.boidFlocks).toEqual([
      { count: 100, size: 12, maxSpeed: 220, cohesion: 2, sizeVariety: 0.8 },
      { count: 50, colonies: 2 },
    ]);
    expect(layout.blobFlocks).toEqual([{ material: 'glass', count: 20, wander: 1, tint: 0.7, colour: '#88ccff' }]);
    expect(layout.follow).toBe('near');
    expect(layout.throwable).toBe(false);
  });

  it("each fleet says what it does with the pointer, or takes the scene's", () => {
    const layout = sceneLayout({
      blobs: [],
      fleets: [
        { kind: 'boid', count: 10, follow: 'target' },
        { kind: 'boid', count: 10 },
        { kind: 'blob-boid', material: 'glass', count: 5, follow: 'none' },
      ],
      follow: 'flee',
    });
    expect(layout.boidFlocks).toEqual([{ count: 10, follow: 'target' }, { count: 10 }]);
    expect(layout.blobFlocks).toEqual([{ material: 'glass', count: 5, follow: 'none' }]);
    expect(layout.follow).toBe('flee');
  });

  it('a blob-boid fleet without a material is of lamps', () => {
    expect(sceneLayout({ blobs: [], fleets: [{ kind: 'blob-boid', count: 5 }] }).blobFlocks).toEqual([{ material: 'lamp', count: 5 }]);
  });

  it('a scene is plain data: it goes through JSON unchanged', () => {
    expect(JSON.parse(JSON.stringify(HOME))).toEqual(HOME);
  });
});

@Component({
  imports: [LenziSceneBackground],
  template: `<lenzi-scene [scene]="scene()" [animate]="false" />`,
})
class Host {
  readonly scene = signal<LenziScene>(HOME);
}

describe('LenziSceneBackground', () => {
  it('draws the blobs and the flocks with fleets, only the blobs without', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('lenzi-blob-flock-background')).not.toBeNull();
    expect(element.querySelector('lenzi-blob-background')).toBeNull();

    fixture.componentInstance.scene.set({ ...HOME, fleets: [] });
    fixture.detectChanges();
    await fixture.whenStable();
    expect(element.querySelector('lenzi-blob-flock-background')).toBeNull();
    expect(element.querySelector('lenzi-blob-background')).not.toBeNull();
  });
});
