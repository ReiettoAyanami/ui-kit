import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { KIT_PULL_THRESHOLD_PX, KitPullToRefresh } from './pull-to-refresh';

@Component({
  imports: [KitPullToRefresh],
  template: `<div class="area"><kit-pull-to-refresh [refresh]="refresh" /><p>page</p></div>`,
})
class Host {
  pulls = 0;
  release: () => void = () => undefined;
  readonly refresh = () => {
    this.pulls++;
    return new Promise<void>((resolve) => (this.release = resolve));
  };
}

function touch(target: Element, type: string, y: number, x = 100): void {
  const event = new Event(type, { bubbles: true }) as Event & { touches: { clientX: number; clientY: number }[] };
  Object.defineProperty(event, 'touches', { value: type === 'touchend' ? [] : [{ clientX: x, clientY: y }] });
  target.dispatchEvent(event);
}

describe('KitPullToRefresh', () => {
  async function page() {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const area = element.querySelector('.area')!;
    const disc = () => element.querySelector<HTMLElement>('.disc')!;
    return { fixture, area, disc };
  }

  it('a pull past the threshold refreshes, the disc spins until it is done, then goes back up', async () => {
    const { fixture, area, disc } = await page();
    const pullTo = 10 + (KIT_PULL_THRESHOLD_PX + 10) * 2;
    touch(area, 'touchstart', 0);
    touch(area, 'touchmove', 20);
    touch(area, 'touchmove', pullTo);
    fixture.detectChanges();
    expect(disc().classList.contains('dragging')).toBe(true);
    touch(area, 'touchend', pullTo);
    fixture.detectChanges();
    expect(fixture.componentInstance.pulls).toBe(1);
    expect(disc().classList.contains('spinning')).toBe(true);
    expect(disc().getAttribute('role')).toBe('progressbar');

    fixture.componentInstance.release();
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(disc().classList.contains('spinning')).toBe(false);
    });
    expect(disc().style.transform).toBe('translateY(0px)');
  });

  it('a short pull, or a sideways one, is let go without refreshing', async () => {
    const { fixture, area } = await page();
    touch(area, 'touchstart', 0);
    touch(area, 'touchmove', 60);
    touch(area, 'touchend', 60);
    touch(area, 'touchstart', 0, 0);
    touch(area, 'touchmove', 15, 200);
    touch(area, 'touchmove', 400, 200);
    touch(area, 'touchend', 400, 200);
    expect(fixture.componentInstance.pulls).toBe(0);
  });
});
