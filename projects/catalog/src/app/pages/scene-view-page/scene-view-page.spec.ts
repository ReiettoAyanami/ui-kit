import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';

import { HOME_PHONE_SCENE } from '../../scenes';
import { sceneToCode } from '../../shared/scene-code';
import { SceneViewPage } from './scene-view-page';

async function at(query: Record<string, string>) {
  TestBed.configureTestingModule({
    providers: [provideRouter([]), { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(query) } } }],
  });
  const fixture = TestBed.createComponent(SceneViewPage);
  await vi.waitFor(async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    const page = fixture.nativeElement as HTMLElement;
    expect(page.querySelector('lenzi-scene, lenzi-status-message')).not.toBeNull();
  });
  return fixture.nativeElement as HTMLElement;
}

describe('SceneViewPage', () => {
  it("shows the link's scene, alone", async () => {
    const page = await at({ s: await sceneToCode(HOME_PHONE_SCENE) });
    expect(page.querySelector('lenzi-scene lenzi-blob-background')).not.toBeNull();
    expect(page.querySelector('lenzi-status-message')).toBeNull();
  });

  it('says so when the link holds no scene, and offers the maker', async () => {
    const page = await at({ s: 'nothing' });
    expect(page.querySelector('lenzi-scene')).toBeNull();
    expect(page.querySelector('a[href="/scenes/maker"]')).not.toBeNull();
  });
});
