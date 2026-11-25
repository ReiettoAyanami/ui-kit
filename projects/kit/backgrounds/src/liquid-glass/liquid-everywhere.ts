import {
  DOCUMENT,
  EnvironmentProviders,
  Injectable,
  inject,
  makeEnvironmentProviders,
  provideEnvironmentInitializer,
} from '@angular/core';

import { LenziSights } from '../sights/sights';
import { LIQUID_GLASS_SETTINGS, LenziLiquidGlassSettings, LenziLiquidSurface, refracts } from './liquid-surface';

/**
 * What floats over the page, Liquid Glass by default (lenzi, 2026-11-25: "Diminuisci un po' le cose che usano sto
 * liquidglass e rendile solide"): the top bar and the drawer, dialogs, menus and the panels of selects and
 * autocompletes, and what the app marks as floating (`.lenzi-floating`: a bar of actions over the page).
 */
export const LENZI_LIQUID_SURFACES: readonly string[] = [
  '.lenzi-shell-bar',
  '.lenzi-shell-drawer',
  '.mat-mdc-dialog-surface',
  '.mat-mdc-menu-panel',
  '.mat-mdc-select-panel',
  '.mat-mdc-autocomplete-panel',
  '.lenzi-floating',
];

/** The surfaces of the page itself, glass too only when asked (`pages: true`): cards, the grid's and the table's boxes. */
export const LENZI_LIQUID_PAGE_SURFACES: readonly string[] = ['.mat-mdc-card', '.lenzi-surface'];

/** The optics of the whole app's glass: a narrower bezel than a single window's, and a little more blur to read on. */
export const LIQUID_EVERYWHERE_SETTINGS: LenziLiquidGlassSettings = { ...LIQUID_GLASS_SETTINGS, bezel: 18, thickness: 40, blur: 3 };

export interface LenziLiquidGlassOptions {
  /** The surfaces to turn into glass; what floats over the page by default. */
  selectors?: readonly string[];
  /** The page's own surfaces too (cards, boxes): every surface glass. */
  pages?: boolean;
  /** Their optics; the whole app's by default. */
  settings?: Partial<LenziLiquidGlassSettings>;
}

/**
 * The app's floating surfaces made of Liquid Glass, or every surface (`pages`) (lenzi, 2026-11-25, the shifts app: "qui
 * usiamo liquid glass"; then "Diminuisci un po' ... e rendile solide"). It finds them as they come and go (a dialog opened, a page changed), gives each the class
 * `lenzi-liquid-glass lenzi-liquid-everywhere` (the kit's styles take away its fill and border and give it a light tint
 * to read on, `--lenzi-liquid-tint`) and, in Chromium, its own bending filter, drawn again when it changes size. One
 * frame loop lights the rims of all of them. Reduce transparency (`LenziAppearance`, or the system's wish) turns it all
 * off: the surfaces are the kit's frosted ones again.
 */
@Injectable({ providedIn: 'root' })
export class LenziLiquidEverywhere {
  private readonly document = inject(DOCUMENT);
  private readonly sights = inject(LenziSights);
  private readonly surfaces = new Map<HTMLElement, LenziLiquidSurface>();
  private readonly marked = new Set<HTMLElement>();
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
    this.selectors = [...(options.selectors ?? LENZI_LIQUID_SURFACES), ...(options.pages ? LENZI_LIQUID_PAGE_SURFACES : [])];
    this.settings = { ...LIQUID_EVERYWHERE_SETTINGS, ...options.settings };
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
    new MutationObserver(scan).observe(this.document.body, { childList: true, subtree: true });
    // Reduce transparency, from the app's choice (a class on <html>) or the system's.
    new MutationObserver(scan).observe(this.document.documentElement, { attributes: true, attributeFilter: ['class'] });
    view.matchMedia?.('(prefers-reduced-transparency: reduce)').addEventListener?.('change', scan);
    scan();
    // One loop for every glass: the filters a resize or new corners asked for, then the rims.
    const frame = () => {
      for (const surface of this.pending) surface.build();
      this.pending.clear();
      for (const surface of this.surfaces.values()) if (surface.light()) this.pending.add(surface);
      view.requestAnimationFrame(frame);
    };
    if (bends) view.requestAnimationFrame(frame);
  }

  /** How many surfaces are glass now. */
  get count(): number {
    return this.marked.size;
  }

  private reduced(): boolean {
    const view = this.document.defaultView;
    return this.document.documentElement.classList.contains('reduce-transparency') || !!view?.matchMedia?.('(prefers-reduced-transparency: reduce)').matches;
  }

  private scan(bends: boolean): void {
    const found = this.reduced() ? new Set<HTMLElement>() : new Set(this.document.querySelectorAll<HTMLElement>(this.selectors.join(',')));
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
      const surface = new LenziLiquidSurface(element, this.document, this.sights, () => this.settings);
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
