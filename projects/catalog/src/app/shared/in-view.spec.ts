import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { InView } from './in-view';

@Component({
  imports: [InView],
  template: `<div class="card" appInViewMargin="50px" (appInView)="said.push($event)"></div>`,
})
class Host {
  said: boolean[] = [];
}

describe('InView', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('says when its element comes near the window and when it leaves', async () => {
    const observers: { callback: IntersectionObserverCallback; options?: IntersectionObserverInit; watched: Element[]; disconnected: boolean }[] = [];
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        private readonly self;
        constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
          this.self = { callback, options, watched: [] as Element[], disconnected: false };
          observers.push(this.self);
        }
        observe(element: Element) {
          this.self.watched.push(element);
        }
        disconnect() {
          this.self.disconnected = true;
        }
      },
    );
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();
    await Promise.resolve();
    const [observer] = observers;
    expect(observer!.options?.rootMargin).toBe('50px');
    expect(observer!.watched).toEqual([(fixture.nativeElement as HTMLElement).querySelector('.card')]);

    const entry = (isIntersecting: boolean) => [{ isIntersecting } as IntersectionObserverEntry];
    observer!.callback(entry(true), observer as unknown as IntersectionObserver);
    observer!.callback(entry(false), observer as unknown as IntersectionObserver);
    expect(fixture.componentInstance.said).toEqual([true, false]);

    fixture.destroy();
    expect(observer!.disconnected).toBe(true);
  });

  it('where the browser cannot tell, the element counts as there', async () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await Promise.resolve();
    expect(fixture.componentInstance.said).toEqual([true]);
  });
});
