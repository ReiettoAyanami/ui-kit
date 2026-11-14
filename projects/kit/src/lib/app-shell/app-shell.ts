import { Component, DOCUMENT, DestroyRef, ElementRef, ViewEncapsulation, computed, inject, input, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { ActivatedRouteSnapshot, NavigationEnd, Router } from '@angular/router';
import { filter, map } from 'rxjs';

/** The title of the deepest active route that has one. */
function routeTitle(route: ActivatedRouteSnapshot): string {
  let title = route.title ?? '';
  for (let child = route.firstChild; child; child = child.firstChild) title = child.title ?? title;
  return title;
}

/** Does the active route ask to be shown alone, without the app around it (`data: { bare: true }`: a sign-in page)? */
function routeIsBare(route: ActivatedRouteSnapshot): boolean {
  for (let current: ActivatedRouteSnapshot | null = route; current; current = current.firstChild) {
    if (current.data['bare'] === true) return true;
  }
  return false;
}

/**
 * The app shell (RULES.md, "App shell"; substance-tracker and vtiger-reader `app.html`): a top bar
 * that floats away from the screen's edges and sticks while the page scrolls under its glass, with
 * the menu button and the current route's title; a navigation drawer that opens from it on every
 * screen (lenzi, 2026-10-02: "la barra di fianco si apra con un tasto come la versione android"),
 * closed after a tap on a link; and the page. The document scrolls, not the shell, so a page window
 * can stop it scrolling under itself.
 *
 * What it holds comes in by attribute: `lenziShellNav` (the drawer's content, a LenziNavList),
 * `lenziShellActions` (the end of the top bar: a bell), `lenziShellBanner` (a bar above the top bar that
 * cannot be closed: "Viewing as"), `lenziShellBelow` (bars under it: offline, update), and the page
 * (a router outlet). Global styles (encapsulation none): every class starts with `lenzi-shell`.
 */
@Component({
  selector: 'lenzi-app-shell',
  imports: [MatButtonModule, MatIconModule, MatSidenavModule, MatToolbarModule],
  templateUrl: './app-shell.html',
  styleUrl: './app-shell.css',
  encapsulation: ViewEncapsulation.None,
})
export class LenziAppShell {
  /** The top bar's title; null: the title of the deepest active route (`title` in the routes). */
  readonly title = input<string | null>(null);
  /**
   * The page alone, without the top bar and the drawer. 'route' (the default): when the active route
   * says so (`data: { bare: true }`, a sign-in page); true or false: always, or never, whatever the
   * route says (a shell shown inside a bare page, like the catalog's demo).
   */
  readonly bare = input<boolean | 'route', boolean | 'route' | '' | null | undefined>('route', {
    transform: (value) => (value === '' ? true : (value ?? 'route')),
  });
  /** The menu button's accessible name. */
  readonly menuLabel = input('Menu');

  private readonly drawer = viewChild.required(MatSidenav);
  private readonly router = inject(Router);
  private readonly navigated$ = this.router.events.pipe(filter((event) => event instanceof NavigationEnd));

  private readonly routeTitle = toSignal(this.navigated$.pipe(map(() => routeTitle(this.router.routerState.snapshot.root))), {
    initialValue: routeTitle(this.router.routerState.snapshot.root),
  });
  private readonly routeBare = toSignal(this.navigated$.pipe(map(() => routeIsBare(this.router.routerState.snapshot.root))), {
    initialValue: routeIsBare(this.router.routerState.snapshot.root),
  });

  protected readonly shownTitle = computed(() => this.title() ?? this.routeTitle());
  protected readonly isBare = computed(() => {
    const bare = this.bare();
    return bare === 'route' ? this.routeBare() : bare;
  });

  /**
   * Scrolled past the top bar: it has shrunk to its menu button, without the title (lenzi, 2026-11-14:
   * "quando scendi oltre la sua altezza dovrebbe compattarsi con un animazione verso l'icona di
   * apertura/chiusura, non mostrando il titolo della pagina"); a `LenziShellSearch` moves beside it.
   */
  readonly compact = signal(false);

  /**
   * Where the page lays its search bar out (`LenziShellSearch` says it), px; null: the page has none. Closed, the
   * bar holds the button and the search bar, and ends where the search bar does (lenzi, 2026-11-14: "if there's
   * a search bar make it slide there ... and incorporate it into the top bar").
   */
  protected readonly search = signal<{ left: number; right: number } | null>(null);

  /** A page's search bar tells where the page lays it out (null when it leaves). For LenziShellSearch. */
  searchAt(edges: { left: number; right: number } | null): void {
    this.search.set(edges);
  }

  /** The top bar's box on the screen now, while it opens and closes too. For LenziShellSearch. */
  barBox(): DOMRect | null {
    return this.host.querySelector<HTMLElement>(':scope > .mat-drawer-container > .mat-drawer-content > .lenzi-shell-bar')?.getBoundingClientRect() ?? null;
  }

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  constructor() {
    const view = inject(DOCUMENT).defaultView;
    if (!view) return;
    let pending = 0;
    const check = () => {
      pending = 0;
      this.compact.set(!this.isBare() && view.scrollY > this.barBottom());
    };
    const onScroll = () => (pending ||= view.requestAnimationFrame(check));
    view.addEventListener('scroll', onScroll, { passive: true });
    inject(DestroyRef).onDestroy(() => {
      view.removeEventListener('scroll', onScroll);
      if (pending) view.cancelAnimationFrame(pending);
    });
  }

  /** Where the top bar ends when the page is at its top, px: its height, its gap and the banner's above it. */
  private barBottom(): number {
    const view = this.host.ownerDocument.defaultView;
    let bottom = 0;
    for (const selector of [':scope > .mat-drawer-container > .mat-drawer-content > .lenzi-shell-banner', ':scope > .mat-drawer-container > .mat-drawer-content > .lenzi-shell-bar']) {
      const element = this.host.querySelector<HTMLElement>(selector);
      if (!element || element.offsetHeight === 0) continue;
      bottom += element.offsetHeight + (parseFloat(view?.getComputedStyle(element).marginTop ?? '') || 0);
    }
    return bottom;
  }

  /**
   * Opens the drawer. Its origin goes with it: closing gives the focus back to the menu button,
   * with a focus ring only when the drawer was opened from the keyboard (a click from a keyboard
   * has detail 0).
   */
  openNav(click?: MouseEvent): void {
    void this.drawer().open(click && click.detail === 0 ? 'keyboard' : 'mouse');
  }

  /** Closes the drawer: LenziNavList does it after a tap on a link. */
  closeNav(): void {
    void this.drawer().close();
  }
}
