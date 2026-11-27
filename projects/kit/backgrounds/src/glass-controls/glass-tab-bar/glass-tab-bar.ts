import { Component, ElementRef, afterRenderEffect, computed, effect, inject, input, output, signal, untracked, viewChild, viewChildren } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { IsActiveMatchOptions, NavigationCancel, NavigationEnd, NavigationError, NavigationSkipped, Router, RouterLink, RouterLinkActive } from '@angular/router';

import { LenziAppShell, LenziNavEntry } from '@lenzi/ui-kit';

import { LIQUID_EVERYWHERE_SETTINGS } from '../../liquid-glass/liquid-everywhere';
import { LenziLiquidGlassSettings } from '../../liquid-glass/liquid-surface';
import { LenziLandingMaterial, LenziLandingTone, resolveLanding } from '../landing';
import { CAPSULE_SETTINGS, LENS_BENDING, glassLens } from '../lens';

/** A box in the bar, px. */
interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

const EXACT: IsActiveMatchOptions = { paths: 'exact', queryParams: 'ignored', matrixParams: 'ignored', fragment: 'ignored' };
const SUBTREE: IsActiveMatchOptions = { paths: 'subset', queryParams: 'ignored', matrixParams: 'ignored', fragment: 'ignored' };

/**
 * The bar's own glass (lenzi, 2026-11-25: "la barra di lato ... non è liquidglass, solo di nome"): Liquid Glass of its
 * own, whatever the app: the kit's glass, which is this bar's (a squircle bezel, the default optics, its edge lit by what is under it).
 */
const BAR_GLASS: LenziLiquidGlassSettings = LIQUID_EVERYWHERE_SETTINGS;

/** How long the capsule stays glass on its way to the next page, ms. */
const SETTLE = 420;

/**
 * The navigation as a bar instead of a drawer (lenzi, 2026-11-25: "un nuovo tipo di barra laterale/degli strumenti che
 * deve fare la stessa cosa di questa ... una barra orizzontale (magari da usare su mobile invece che su web, ma in realtà
 * anche su web deve funzionare e può essere un'alternativa) ... una cosa come questa o come il selettore che abbiamo
 * creato prima"): Apple's tab bar (HIG, Tab bars: "A tab bar floats above content at the bottom of the screen. Its items
 * rest on a Liquid Glass background"). One capsule with a tab per page, its icon and its name (one word, Apple: "Use
 * single words whenever possible"); the current page on a capsule that is glass under a solid fill and, when the page
 * changes, slides there as glass (the segmented control's way); the rest (Admin, Sign out) in a capsule of its own at the
 * end, as Apple keeps search apart. The same entries as `LenziNavList`; in a `LenziAppShell` it goes in
 * `lenziShellTabs` and the shell floats it at the bottom.
 */
@Component({
  selector: 'lenzi-glass-tab-bar',
  imports: [MatIconModule, MatTooltipModule, RouterLink, RouterLinkActive],
  host: { '[class.upright]': 'upright()', '[attr.data-landing]': 'landed().material', '[attr.data-tone]': 'landed().tone' },
  templateUrl: './glass-tab-bar.html',
  styleUrl: './glass-tab-bar.css',
})
export class LenziGlassTabBar {
  /** The pages: a tab each. */
  readonly pages = input.required<readonly LenziNavEntry[]>();
  /** Apart from the pages, at the end: Settings, Admin, Sign out. */
  readonly bottom = input<readonly LenziNavEntry[]>([]);
  /** The navigation's accessible name. */
  readonly label = input('Pages');
  /**
   * Lying at the bottom or upright on the left: 'auto' (the default) follows the shell (upright on a computer with
   * navigation 'bar'), lying elsewhere.
   */
  readonly orientation = input<'auto' | 'horizontal' | 'vertical'>('auto');
  /** What its lens becomes where it lands (the app's, `provideLenziGlassLanding`, by default): a lens, milky, solid. */
  readonly landing = input<LenziLandingMaterial | null>(null);
  /** A solid landing's colour. */
  readonly landingTone = input<LenziLandingTone | null>(null);
  protected readonly landed = resolveLanding(this.landing, this.landingTone);

  /** A link was tapped. */
  readonly navigated = output<LenziNavEntry>();
  /** A button entry (no link) was tapped: its id. */
  readonly pressed = output<string>();

  /** The current page's tab, -1 when the current page is none of them. */
  protected readonly active = signal(-1);
  /** Where the current page's lens is in the bar, px: its middle (it is drawn round it) and its size. */
  protected readonly pill = signal<Box | null>(null);
  /** Where the capsules' glass is in the bar, px. */
  protected readonly glasses = signal<{ pages: Box | null; rest: Box | null }>({ pages: null, rest: null });
  /**
   * The lens changing size on its way (a tab of another width): it takes its new size at once (one filter) and is drawn
   * as large as it was, then grows or shrinks to it by its scale (FLIP; RULES.md: a glass that moves never changes size).
   */
  protected readonly flip = signal('none');
  protected readonly flipping = signal(false);
  /** The capsule has been drawn where it is once: from then on it slides (the first time it is just there). */
  protected readonly placed = signal(false);
  /** On its way to another tab: the capsule is glass. */
  protected readonly moving = signal(false);

  private readonly tabs = viewChildren<ElementRef<HTMLElement>>('tab');
  /** The tabs whose page the router says is the current one (the capsule may have set off before it says so). */
  private readonly routed = new Set<number>();
  private readonly router = inject(Router);
  private readonly bar = viewChild.required<ElementRef<HTMLElement>>('bar');
  private readonly capsule = viewChild.required<ElementRef<HTMLElement>>('capsule');
  private readonly rest = viewChild<ElementRef<HTMLElement>>('rest');
  private readonly pagesGlass = viewChild.required<ElementRef<HTMLElement>>('pagesGlass');
  private readonly restGlass = viewChild<ElementRef<HTMLElement>>('restGlass');
  private readonly lens = viewChild.required<ElementRef<HTMLElement>>('lens');
  private readonly resized = signal(0);
  private settle: ReturnType<typeof setTimeout> | null = null;
  /** The last tab that was the current one. */
  private last = -1;
  private readonly shell = inject(LenziAppShell, { optional: true });
  /** Upright: a column of tabs on the left, the capsule sliding up and down. */
  protected readonly upright = computed(() => this.orientation() === 'vertical' || (this.orientation() === 'auto' && !!this.shell?.tabsUpright()));

  constructor() {
    // the capsules' glass, Liquid Glass bending all of its bending, behind them; the current page's lens over it, its own
    glassLens(() => this.pagesGlass().nativeElement, BAR_GLASS, 1);
    glassLens(() => this.restGlass()?.nativeElement, BAR_GLASS, 1);
    // over the icons and names on its way: a flat middle, never a dome
    const glass = glassLens(() => this.lens().nativeElement, CAPSULE_SETTINGS);
    effect(() => glass.bending(this.moving() ? LENS_BENDING.held : LENS_BENDING.rest));
    // the lens under the current tab and the glass under each capsule, measured after the tabs are drawn (their widths
    // are their words')
    afterRenderEffect(() => {
      this.resized();
      this.upright();
      this.active();
      this.tabs();
      untracked(() => this.measure());
    });
    afterRenderEffect(() => {
      if (typeof ResizeObserver !== 'function') return;
      const observer = new ResizeObserver(() => this.resized.update((n) => n + 1));
      observer.observe(this.bar().nativeElement);
      observer.observe(this.capsule().nativeElement);
      const rest = this.rest()?.nativeElement;
      if (rest) observer.observe(rest);
      return () => observer.disconnect();
    });
  }

  /** Where the capsules' glass and the current tab's lens are in the bar now (again when the pages scroll). */
  protected measure(): void {
    const bar = this.bar().nativeElement;
    const boxOf = (element: HTMLElement | undefined): Box | null =>
      element ? { left: element.offsetLeft, top: element.offsetTop, width: element.offsetWidth, height: element.offsetHeight } : null;
    const glasses = { pages: boxOf(this.capsule().nativeElement), rest: boxOf(this.rest()?.nativeElement) };
    const was = this.glasses();
    if (JSON.stringify(glasses) !== JSON.stringify(was)) this.glasses.set(glasses);
    const tab = this.tabs()[this.active()]?.nativeElement;
    let box: Box | null = null;
    if (tab) {
      const outer = bar.getBoundingClientRect();
      const inner = tab.getBoundingClientRect();
      box = { left: inner.left - outer.left, top: inner.top - outer.top, width: tab.offsetWidth, height: tab.offsetHeight };
    }
    const now = this.pill();
    if (box?.left === now?.left && box?.top === now?.top && box?.width === now?.width && box?.height === now?.height) return;
    // another size on its way: drawn as large as it was, then to its own (FLIP), its filter made once
    if (box && now && this.placed() && (box.width !== now.width || box.height !== now.height)) {
      this.flipping.set(true);
      this.flip.set(`scale(${(now.width / box.width).toFixed(4)}, ${(now.height / box.height).toFixed(4)})`);
      this.pill.set(box);
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          this.flipping.set(false);
          this.flip.set('none');
        }),
      );
    } else {
      this.pill.set(box);
    }
    if (box && !this.placed()) setTimeout(() => this.placed.set(true), 50);
  }

  protected match(entry: LenziNavEntry): IsActiveMatchOptions {
    const exact = entry.exact ?? (entry.link === '' || entry.link === '/');
    return exact ? EXACT : SUBTREE;
  }

  protected key(entry: LenziNavEntry): string {
    return entry.id ?? JSON.stringify(entry.link ?? entry.label);
  }

  /** The router says a tab's page became the current one (or stopped being it). */
  protected routeActive(index: number, active: boolean): void {
    if (active) this.routed.add(index);
    else this.routed.delete(index);
    this.activated(index, active);
  }

  /** A tab's page became the current one (or stopped being it). */
  protected activated(index: number, active: boolean): void {
    if (!active) {
      if (this.active() === index) this.active.set(-1);
      return;
    }
    // the first page shown: the capsule is there; another one after: it goes there as glass (the page left says so
    // before the new one does, so the last tab shown is kept)
    if (this.last >= 0 && this.last !== index) {
      if (this.settle) clearTimeout(this.settle);
      this.moving.set(true);
      this.settle = setTimeout(() => this.moving.set(false), SETTLE);
    }
    this.active.set(index);
    this.last = index;
  }

  /**
   * A link was tapped. A page's tab: the capsule sets off now, not when the page is there (lenzi, 2026-11-25: "L'animazione
   * del menu lagga"; a page that takes long to build kept it still); if the page never comes (a guard said no), it goes
   * back to the page that is still the current one.
   */
  protected follow(entry: LenziNavEntry, index?: number): void {
    if (index !== undefined && this.active() !== index) {
      this.activated(index, true);
      const off = this.router.events.subscribe((event) => {
        if (event instanceof NavigationEnd) off.unsubscribe();
        else if (event instanceof NavigationCancel || event instanceof NavigationError || event instanceof NavigationSkipped) {
          off.unsubscribe();
          const [current = -1] = this.routed;
          if (current === this.active()) return;
          if (current >= 0) this.activated(current, true);
          else this.active.set(-1);
        }
      });
    }
    this.shell?.closeNav();
    this.navigated.emit(entry);
  }

  protected press(entry: LenziNavEntry): void {
    this.pressed.emit(entry.id ?? entry.label);
  }
}
