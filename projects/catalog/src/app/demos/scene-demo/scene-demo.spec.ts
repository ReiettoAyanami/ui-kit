import { TestBed } from '@angular/core/testing';

import { HOME_PHONE_SCENE, HOME_SCENE } from '../../scenes';
import { SceneDemo, sceneOf } from './scene-demo';

describe('SceneDemo', () => {
  it('takes the chosen scene of the catalog, with the pointer and the throwing the playground says', () => {
    expect(sceneOf({})).toEqual(HOME_SCENE);
    expect(sceneOf({ scene: 'HOME_PHONE_SCENE', follow: 'near', throwable: false })).toEqual({ ...HOME_PHONE_SCENE, follow: 'near', throwable: false });
    expect(sceneOf({ scene: 'nothing', follow: 'sideways' }).name).toBe('Home');
    expect(sceneOf({ scene: 'nothing', follow: 'sideways' }).follow).toBe('near');
  });

  it('puts the scene behind a lit card', async () => {
    const fixture = TestBed.createComponent(SceneDemo);
    await fixture.whenStable();
    const page = fixture.nativeElement as HTMLElement;
    expect(page.querySelector('lenzi-scene lenzi-blob-flock-background')).not.toBeNull();
    expect(page.querySelector('.card')?.textContent).toContain('Home');
  });
});
