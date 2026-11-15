import { DestroyRef, Directive, ElementRef, inject, input } from '@angular/core';

/**
 * Shows its element (a frame) as a miniature of a page: laid out as wide as a screen (`appMiniature`, px), then
 * scaled down to fill the box it is in, whatever the box's width. A scene's preview in the gallery is the scene
 * as on a screen, small: its boids are a few px wide on any screen, so in a frame as small as a card they would
 * crowd it.
 */
@Directive({
  selector: '[appMiniature]',
})
export class Miniature {
  /** How wide the page is laid out, px. */
  readonly width = input(800, { alias: 'appMiniature' });

  constructor() {
    const element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    let observer: ResizeObserver | null = null;
    const fit = () => {
      const box = element.parentElement;
      if (!box?.clientWidth) return;
      const scale = box.clientWidth / this.width();
      Object.assign(element.style, {
        width: `${this.width()}px`,
        height: `${Math.round(box.clientHeight / scale)}px`,
        transform: `scale(${scale})`,
        transformOrigin: '0 0',
      });
    };
    // once it is in its box (and the inputs are set); again whenever the box changes size
    queueMicrotask(() => {
      fit();
      if (typeof ResizeObserver === 'undefined' || !element.parentElement) return;
      observer = new ResizeObserver(fit);
      observer.observe(element.parentElement);
    });
    inject(DestroyRef).onDestroy(() => observer?.disconnect());
  }
}
