import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { Miniature } from './miniature';

@Component({
  imports: [Miniature],
  template: `<div class="box"><iframe [appMiniature]="800"></iframe></div>`,
})
class Host {}

describe('Miniature', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('lays its frame out as wide as a screen and scales it down to its box; again when the box changes', async () => {
    let resized: (() => void) | null = null;
    let disconnected = false;
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: () => void) {
          resized = callback;
        }
        observe() {}
        disconnect() {
          disconnected = true;
        }
      },
    );
    const fixture = TestBed.createComponent(Host);
    const box = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('.box')!;
    const size = (width: number, height: number) => {
      Object.defineProperty(box, 'clientWidth', { value: width, configurable: true });
      Object.defineProperty(box, 'clientHeight', { value: height, configurable: true });
    };
    size(320, 180);
    fixture.detectChanges();
    await Promise.resolve();
    const frame = box.querySelector('iframe')!;
    expect(frame.style.width).toBe('800px');
    expect(frame.style.height).toBe('450px');
    expect(frame.style.transform).toBe('scale(0.4)');
    expect(frame.style.transformOrigin).toBe('0 0');

    size(400, 225);
    resized!();
    expect(frame.style.height).toBe('450px');
    expect(frame.style.transform).toBe('scale(0.5)');

    fixture.destroy();
    expect(disconnected).toBe(true);
  });
});
