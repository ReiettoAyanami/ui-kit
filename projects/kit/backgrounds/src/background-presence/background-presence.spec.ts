import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { LenziBackground } from '../background/background';
import { LenziBackgroundFill } from '../glow-background/glow-background';
import { LenziBlobBackground } from '../blob-background/blob-background';
import { LenziScene, LenziSceneBackground } from '../scene/scene';
import { LenziBackgroundPresence, lenziOverBackground } from './background-presence';

const SCENE: LenziScene = { name: 'Two blobs', blobs: [], fleets: [] };

@Component({
  imports: [LenziBackground, LenziBlobBackground, LenziSceneBackground],
  template: `
    @if (blobs()) {
      <lenzi-blob-background [fill]="fill()" />
    }
    @if (picture()) {
      <lenzi-background [fill]="fill()" [image]="image()" />
    }
    @if (scene()) {
      <lenzi-scene [scene]="scene()!" [fill]="fill()" />
    }
  `,
})
class APage {
  readonly blobs = signal(false);
  readonly picture = signal(false);
  readonly image = signal('');
  readonly scene = signal<LenziScene | null>(null);
  readonly fill = signal<LenziBackgroundFill>('page');
  readonly lit = lenziOverBackground();
}

async function render() {
  const fixture = TestBed.createComponent(APage);
  const stable = async () => {
    fixture.detectChanges();
    await fixture.whenStable();
  };
  await stable();
  return { page: fixture.componentInstance, stable };
}

describe('LenziBackgroundPresence', () => {
  it('is there while any background says so, each saying it is gone once', () => {
    const presence = TestBed.inject(LenziBackgroundPresence);
    expect(presence.present()).toBe(false);
    const gone = presence.add();
    const other = presence.add();
    expect(presence.present()).toBe(true);
    gone();
    gone();
    expect(presence.present()).toBe(true);
    other();
    expect(presence.present()).toBe(false);
  });

  it('a glowing background behind the page says so while it is there; one behind a box does not', async () => {
    const { page, stable } = await render();
    expect(page.lit()).toBe(false);

    page.blobs.set(true);
    await stable();
    expect(page.lit()).toBe(true);

    page.fill.set('box');
    await stable();
    expect(page.lit()).toBe(false);

    page.fill.set('page');
    await stable();
    expect(page.lit()).toBe(true);
    page.blobs.set(false);
    await stable();
    expect(page.lit()).toBe(false);
  });

  it('a scene behind the page says so', async () => {
    const { page, stable } = await render();
    page.scene.set(SCENE);
    await stable();
    expect(page.lit()).toBe(true);
    page.scene.set(null);
    await stable();
    expect(page.lit()).toBe(false);
  });

  it('a plain background counts with a picture, not as a colour alone', async () => {
    const { page, stable } = await render();
    page.picture.set(true);
    await stable();
    expect(page.lit()).toBe(false);

    page.image.set('demo/hills.svg');
    await stable();
    expect(page.lit()).toBe(true);
  });
});
