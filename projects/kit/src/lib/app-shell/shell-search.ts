import { DOCUMENT, DestroyRef, Directive, ElementRef, afterNextRender, inject, signal } from '@angular/core';

/**
 * A page's search bar that stays in sight beside the shell's top bar (lenzi, 2026-11-14: "quando scendi
 * oltre la sua altezza dovrebbe compattarsi ... verso l'icona di apertura/chiusura ... ma (se c'é) deve
 * affiancare la barra di ricerca"): it sticks at the top of the screen, level with the bar, and once the bar
 * has shrunk to its menu button it moves just past it, on glass. Put it on the page's `LenziSearchBar`, a
 * child of the page's own column (it sticks inside its parent).
 *
 * It only measures where the search bar sits in the page (its left edge, kept in
 * `--lenzi-shell-search-left`): the shell's global styles do the rest.
 */
@Directive({
  selector: '[lenziShellSearch]',
  host: {
    class: 'lenzi-shell-search',
    '[style.--lenzi-shell-search-left.px]': 'left()',
  },
})
export class LenziShellSearch {
  /** Its left edge on the screen, px, as the page lays it out (its own padding does not move it). */
  protected readonly left = signal(0);

  constructor() {
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const view = inject(DOCUMENT).defaultView;
    const measure = () => this.left.set(Math.round(host.getBoundingClientRect().left));
    afterNextRender(() => measure());
    if (!view) return;
    view.addEventListener('resize', measure, { passive: true });
    inject(DestroyRef).onDestroy(() => view.removeEventListener('resize', measure));
  }
}
