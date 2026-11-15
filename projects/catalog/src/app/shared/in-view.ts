import { DestroyRef, Directive, ElementRef, inject, input, output } from '@angular/core';

/**
 * Says when its element comes near the window and when it leaves (`(appInView)`: true, false). The gallery of
 * scenes keeps a scene's frame only while its card is there: a browser draws a few WebGL pictures at once, not
 * a whole gallery of them. Where the browser cannot tell, the element counts as there.
 */
@Directive({
  selector: '[appInView]',
})
export class InView {
  /** How far outside the window still counts, CSS margins. */
  readonly margin = input('200px', { alias: 'appInViewMargin' });
  readonly appInView = output<boolean>();

  constructor() {
    const element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    if (typeof IntersectionObserver === 'undefined') {
      queueMicrotask(() => this.appInView.emit(true));
      return;
    }
    let observer: IntersectionObserver | null = null;
    // after the inputs are set: the margin is read once
    queueMicrotask(() => {
      observer = new IntersectionObserver((entries) => this.appInView.emit(entries.at(-1)!.isIntersecting), { rootMargin: this.margin() });
      observer.observe(element);
    });
    inject(DestroyRef).onDestroy(() => observer?.disconnect());
  }
}
