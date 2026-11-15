import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { LenziScene } from '@lenzi/ui-kit/backgrounds';

import { SavedScene, SavedScenes } from './saved-scenes';

const SCENE: LenziScene = { name: 'Dusk', blobs: [{ material: 'lamp', size: 0.2 }], fleets: [{ kind: 'boid', count: 80 }] };
const KEPT = { id: 'abc12345', name: 'Dusk', scene: SCENE, createdAt: '2026-11-15T12:00:00.000Z', updatedAt: '2026-11-15T12:00:00.000Z' };

describe('SavedScenes', () => {
  let scenes: SavedScenes;
  let server: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    scenes = TestBed.inject(SavedScenes);
    server = TestBed.inject(HttpTestingController);
  });

  afterEach(() => server.verify());

  it('lists the scenes kept, each checked: what is no scene is left out, what is out of bounds brought in', () => {
    let listed: SavedScene[] = [];
    scenes.list().subscribe((answer) => (listed = answer));
    server.expectOne({ method: 'GET', url: 'api/scenes' }).flush({
      scenes: [
        KEPT,
        { ...KEPT, id: 'broken00', scene: { blobs: 'none' } },
        { ...KEPT, id: 'toolarge', scene: { blobs: [{ material: 'lamp', size: 9 }], fleets: [] } },
      ],
    });
    expect(listed.map((scene) => scene.id)).toEqual(['abc12345', 'toolarge']);
    expect(listed[0]!.scene).toEqual(SCENE);
    expect(listed[1]!.scene.blobs[0]!.size).toBe(0.5);
  });

  it('keeps a new scene, saves one again, takes one out and puts it back', () => {
    let kept: SavedScene | null = null;
    scenes.add(SCENE).subscribe((answer) => (kept = answer));
    const made = server.expectOne({ method: 'POST', url: 'api/scenes' });
    expect(made.request.body).toEqual({ scene: SCENE });
    made.flush(KEPT);
    expect(kept!.id).toBe('abc12345');

    scenes.update('abc12345', { ...SCENE, name: 'Dawn' }).subscribe((answer) => (kept = answer));
    const changed = server.expectOne({ method: 'PUT', url: 'api/scenes/abc12345' });
    expect(changed.request.body.scene.name).toBe('Dawn');
    changed.flush({ ...KEPT, name: 'Dawn', scene: { ...SCENE, name: 'Dawn' } });
    expect(kept!.name).toBe('Dawn');

    let removed = false;
    scenes.remove('abc12345').subscribe(() => (removed = true));
    server.expectOne({ method: 'DELETE', url: 'api/scenes/abc12345' }).flush(null, { status: 204, statusText: 'No Content' });
    expect(removed).toBe(true);

    let back: SavedScene | null = null;
    scenes.restore('abc12345').subscribe((answer) => (back = answer));
    server.expectOne({ method: 'POST', url: 'api/scenes/abc12345/restore' }).flush(KEPT);
    expect(back!.id).toBe('abc12345');
  });
});
