import {
  DOCUMENT,
  EnvironmentProviders,
  Injectable,
  inject,
  makeEnvironmentProviders,
  provideEnvironmentInitializer,
  signal,
} from '@angular/core';

import { LIQUID_GLASS_SETTINGS, LenziLiquidGlassSettings, LenziLiquidSurface, refracts } from './liquid-surface';

/**
 * What floats over the content (Apple's Human Interface Guidelines, Materials: "a distinct functional layer for controls
 * and navigation elements"): the top bar and the drawer, dialogs, menus and the panels of selects and autocompletes, the
 * floating "+" (`LenziAddButton`), and what the app marks as floating (`.lenzi-floating`: a bar of actions). And the pane
 * behind a page over a background (`lenziGlassPage`; lenzi, 2026-11-25: "I pannelli dietro per esempio devono essere in
 * vetro"), frosted to read on.
 */
export const LENZI_LIQUID_SURFACES: readonly string[] = [
  '.lenzi-glass-page-pane',
  '.lenzi-shell-bar',
  '.lenzi-shell-drawer',
  '.mat-mdc-dialog-surface',
  '.mat-mdc-menu-panel',
  '.mat-mdc-select-panel',
  '.mat-mdc-autocomplete-panel',
  'lenzi-add-button .mat-mdc-fab',
  '.lenzi-floating',
];

/** How long a frame may spend drawing glass filters, ms; the rest wait for the next frames. */
const BUILD_BUDGET = 4;

/** What may open over a window: frosted, not glass, when a window is open. */
const OVER_WINDOWS = '.mat-mdc-menu-panel, .mat-mdc-select-panel, .mat-mdc-autocomplete-panel';

/**
 * The surfaces of the page itself: cards, the app's panels (`.lenzi-surface`), and every lit surface (`lenziLit`, which
 * gives itself to the app's glass). Glass too, unless the app says `pages: false` (lenzi, 2026-11-26: "Non c'è ancora
 * nulla che sia stato convertito in liquid glass, come i pannelli o altro, stiamo rifacendo l'interfaccia del kit
 * praticamente": the kit's interface is Liquid Glass, its panels too; Apple keeps the content solid, lenzi does not).
 */
export const LENZI_LIQUID_PAGE_SURFACES: readonly string[] = ['.mat-mdc-card', '.lenzi-surface'];

/**
 * The kit's glass, one for everything that is glass (lenzi, 2026-11-25: "non c'è niente di costante nell'app ... ti ho
 * detto come dovevano essere calcolati i bordi ma in cima c'è ancora questo che cambia a caso, fallo come la barra di
 * fianco"): the side bar's (LenziGlassTabBar): a squircle bezel 14 px wide, 28 thick; the default optics (lenzi,
 * 2026-11-25: "per il vetro tieni i valori default di apple per ora": kube.io's: refraction 1, blur 0.2, specular
 * opacity 0.5, specular saturation 6), the edge in the colours under it and lit by the light under it (lenzi,
 * 2026-11-26: "la direzione della luce deve cambiare rispetto a quello che sta sotto, no il mouse").
 */
export const LIQUID_EVERYWHERE_SETTINGS: LenziLiquidGlassSettings = {
  ...LIQUID_GLASS_SETTINGS,
  surface: 'squircle',
  bezel: 14,
  thickness: 28,
};

export interface LenziLiquidGlassOptions {
  /** The surfaces to turn into glass; what floats over the page by default. */
  selectors?: readonly string[];
  /** The page's own surfaces too (cards, panels, lit surfaces): every surface glass. Yes by default (2026-11-26). */
  pages?: boolean;
  /** Their optics; the whole app's by default. */
  settings?: Partial<LenziLiquidGlassSettings>;
}

/**
 * Every surface of the app made of Liquid Glass (lenzi, 2026-11-25, the shifts app: "qui usiamo liquid glass"; 2026-11-26:
 * the panels too), or only what floats (`pages: false`). It finds them as they come and go (a dialog opened, a page
 * changed), and takes those given to it (`adopt`: a lit surface), gives each the class
 * `lenzi-liquid-glass lenzi-liquid-everywhere` (the kit's styles take away its fill and border and give it a light tint
 * to read on, `--lenzi-liquid-tint`) and, in Chromium, its own bending filter, drawn again when it changes size. One
 * frame loop draws again those that changed size or corners. Reduce transparency (`LenziAppearance`, or the system's wish) turns it all
 * off: the surfaces are the kit's frosted ones again.
 */
@Injectable({ providedIn: 'root' })
export class LenziLiquidEverywhere {
  private readonly document = inject(DOCUMENT);
  private readonly surfaces = new Map<HTMLElement, LenziLiquidSurface>();
  private readonly marked = new Set<HTMLElement>();
  /** The surfaces given to the glass by their own directive (`lenziLit`), wherever they are. */
  private readonly adopted = new Set<HTMLElement>();
  private rescan: () => void = () => undefined;
  private selectors: readonly string[] = LENZI_LIQUID_SURFACES;
  private settings: LenziLiquidGlassSettings = LIQUID_EVERYWHERE_SETTINGS;
  private resize: ResizeObserver | null = null;
  private pending = new Set<LenziLiquidSurface>();
  private scanning: number | null = null;
  private started = false;

  /** Starts watching the page (once). */
  start(options: LenziLiquidGlassOptions = {}): void {
    const view = this.document.defaultView;
    if (this.started || !view || typeof MutationObserver !== 'function') return;
    this.started = true;
    this.pages = options.pages ?? true;
    this.selectors = [...(options.selectors ?? LENZI_LIQUID_SURFACES), ...(this.pages ? LENZI_LIQUID_PAGE_SURFACES : [])];
    this.settings = { ...LIQUID_EVERYWHERE_SETTINGS, ...options.settings };
    this.on.set(!this.reduced());
    const bends = refracts(view);
    if (bends && typeof ResizeObserver === 'function') {
      this.resize = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const surface = this.surfaces.get(entry.target as HTMLElement);
          if (surface) this.pending.add(surface);
        }
      });
    }
    const scan = () => {
      if (this.scanning === null) this.scanning = view.requestAnimationFrame(() => ((this.scanning = null), this.scan(bends)));
    };
    this.rescan = scan;
    new MutationObserver(scan).observe(this.document.body, { childList: true, subtree: true });
    // Reduce transparency, from the app's choice (a class on <html>) or the system's.
    new MutationObserver(scan).observe(this.document.documentElement, { attributes: true, attributeFilter: ['class'] });
    view.matchMedia?.('(prefers-reduced-transparency: reduce)').addEventListener?.('change', scan);
    scan();
    // One loop for every glass: the filters a resize or new corners asked for, a few milliseconds of them a frame (a page of
    // fifty cards built them all in one frame and the menu's capsule stood still for 300 ms, measured 2026-11-26 with the
    // CPU slowed four times: lenzi, 2026-11-25, "L'animazione del menu lagga"); then their corners now and then.
    const frame = () => {
      const until = view.performance.now() + BUILD_BUDGET;
      for (const surface of this.pending) {
        surface.build();
        this.pending.delete(surface);
        if (view.performance.now() > until) break;
      }
      for (const surface of this.surfaces.values()) if (surface.check()) this.pending.add(surface);
      view.requestAnimationFrame(frame);
    };
    if (bends) view.requestAnimationFrame(frame);
  }

  /** How many surfaces are glass now. */
  get count(): number {
    return this.marked.size;
  }

  /**
   * The app's surfaces are Liquid Glass now (started, and transparency not reduced): a page's pane, and the page's lit
   * surfaces, are Liquid Glass then, not lit glass (`pages`, the default).
   */
  readonly on = signal(false);
  /** The page's own surfaces are glass too (`pages`, yes by default). */
  pages = true;

  /**
   * A surface made glass by its own directive (`lenziLit` in an app of Liquid Glass: a card, a panel): glass from the next
   * frame, until the function it gives back is called.
   */
  adopt(element: HTMLElement): () => void {
    this.adopted.add(element);
    this.rescan();
    return () => {
      this.adopted.delete(element);
      this.rescan();
    };
  }

  private reduced(): boolean {
    const view = this.document.defaultView;
    return this.document.documentElement.classList.contains('reduce-transparency') || !!view?.matchMedia?.('(prefers-reduced-transparency: reduce)').matches;
  }

  private scan(bends: boolean): void {
    this.on.set(!this.reduced());
    const found = this.reduced()
      ? new Set<HTMLElement>()
      : new Set(
          [...this.document.querySelectorAll<HTMLElement>(this.selectors.join(',')), ...[...this.adopted].filter((e) => e.isConnected)]
            // a surface kept lit glass (`lenziLit litOnly`: a demo of that material) stays so
            .filter((e) => !e.classList.contains('lenzi-lit-only')),
        );
    // Never glass on glass (Apple, Adopting Liquid Glass: "avoid overcrowding or layering Liquid Glass elements on top of
    // each other"): a menu or a select opened over a window stays the kit's frosted glass.
    if ([...found].some((e) => e.matches('.mat-mdc-dialog-surface'))) {
      for (const element of [...found]) if (element.matches(OVER_WINDOWS)) found.delete(element);
    }
    for (const element of [...this.marked]) {
      if (found.has(element) && element.isConnected) continue;
      this.marked.delete(element);
      element.classList.remove('lenzi-liquid-glass', 'lenzi-liquid-everywhere');
      const surface = this.surfaces.get(element);
      if (surface) {
        surface.destroy();
        this.surfaces.delete(element);
        this.pending.delete(surface);
        this.resize?.unobserve(element);
      }
    }
    for (const element of found) {
      if (this.marked.has(element)) continue;
      this.marked.add(element);
      element.classList.add('lenzi-liquid-glass', 'lenzi-liquid-everywhere');
      if (!bends) continue;
      const surface = new LenziLiquidSurface(element, this.document, () => this.settings);
      this.surfaces.set(element, surface);
      this.resize?.observe(element);
      this.pending.add(surface);
    }
  }
}

/**
 * Makes the whole app Liquid Glass: `providers: [provideLenziLiquidGlass()]` (it needs a background behind the pages:
 * a scene, a picture).
 */
export function provideLenziLiquidGlass(options: LenziLiquidGlassOptions = {}): EnvironmentProviders {
  return makeEnvironmentProviders([provideEnvironmentInitializer(() => inject(LenziLiquidEverywhere).start(options))]);
}
