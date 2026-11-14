import { DOCUMENT, DestroyRef, Directive, ElementRef, OnChanges, afterNextRender, booleanAttribute, inject, input, numberAttribute, signal } from '@angular/core';

import { LenziAmbientLight } from '../ambient-light/ambient-light';
import { DEFAULT_SPREAD, LinearRgb, displacedColors, linearToHex, luminance } from '../engine/color';
import { GlowEngine, GlowLayers, LIGHT_HEIGHT, LIGHT_WIDTH } from '../engine/glow-engine';
import { LenziLightField, LenziSourceLamp } from '../glow/light-field';

/** Where a background is: behind the whole page, or behind the box it is in (`.lenzi-backdrop`). */
export type LenziBackgroundFill = 'page' | 'box';

/**
 * What a glowing background draws with: its light, made by its own scene, and what the engine's layers may
 * add (its own targets before the light, a shadow on the glow, surfaces over the picture).
 */
export interface LenziGlowScene extends GlowLayers {
  /** Time goes on by `delta` seconds (not called for a still picture). */
  advance(delta: number): void;
  dispose?(): void;
}

/**
 * The page's own glass and solid, for the backgrounds' glass and solid blobs (lenzi, 2026-11-14: "interagire
 * allo stesso modo delle componenti che abbiamo fatto oggi"): read from the page's variables, linear colours.
 */
export interface LenziSurfaceLook {
  /** The glass's colour (the page's surface, `base`), how much of it (`--lenzi-lit-glass`), its light (`--lenzi-lit-veil`, `--lenzi-lit-rim`). */
  glass: LinearRgb;
  glassAmount: number;
  veil: number;
  rim: number;
  /** The line along an edge (`--mat-sys-outline-variant`) and its width (`--lenzi-border`), px. */
  border: LinearRgb;
  borderWidth: number;
  /** A solid thing's colour (`--mat-sys-surface-container-high`), and how much of the light a shadow takes (`--lenzi-shadow`). */
  solid: LinearRgb;
  shadow: number;
}

/** What the page takes itself: pressing on it never grabs the background. */
const PAGE_TAKES = 'a, button, input, select, textarea, label, summary, [role="button"], [role="link"], [role="tab"], [contenteditable=""], [contenteditable="true"], .mat-mdc-form-field, .cdk-drag';

/** How often the light goes to the page's lit surfaces, in ms. */
const LIGHT_EVERY = 80;
/** How often the theme's colours are read again while it moves, in ms (the catalog changes them live). */
const COLOURS_EVERY = 500;

/**
 * What the glowing backgrounds share (blobs, a flock): the WebGL2 canvas behind the page or a box,
 * the frame loop that stops while it is out of view or the tab is hidden, one still picture with
 * reduced motion, the pointer, the theme's colours read again when they change, the light given to
 * the page's lit surfaces, and a still picture in CSS where there is no WebGL2. A background is
 * decoration: screen readers do not see it, and it never takes a click.
 */
@Directive({
  host: {
    class: 'lenzi-glow-background',
    'aria-hidden': 'true',
    '[class.lenzi-background-box]': "fill() === 'box'",
    '[class.lenzi-background-still]': 'unavailable()',
  },
})
export abstract class LenziGlowBackground implements OnChanges {
  /** Behind the whole page (fixed to the window), or behind the box it is in. */
  readonly fill = input<LenziBackgroundFill>('page');
  /** The colour of the objects: a CSS variable (`'--mat-sys-primary'`) or any CSS colour. */
  readonly accent = input('--mat-sys-primary');
  /** The solid colour under them: a CSS variable or any CSS colour. Dark or light, the glow follows. */
  readonly base = input('--mat-sys-surface');
  /** How much every object's colour moves away from the accent: 0 all the same, 1 a lot. */
  readonly spread = input(DEFAULT_SPREAD, { transform: numberAttribute });
  /** Another seed, another arrangement and other colours; the same seed, always the same. */
  readonly seed = input(1, { transform: numberAttribute });
  /** How bright the objects themselves are. */
  readonly brightness = input(1, { transform: numberAttribute });
  /** How strong the glow around them is, and how wide (0 tight, 1 wide). */
  readonly glow = input(1, { transform: numberAttribute });
  readonly halo = input(0.6, { transform: numberAttribute });
  /** A blur over the finished picture, in px: 0 none. */
  readonly blur = input(0, { transform: numberAttribute });
  /** How fast time goes: 1 as designed, 0 stopped. */
  readonly speed = input(1, { transform: numberAttribute });
  /** It moves (false: one still picture). Reduced motion stops it too. */
  readonly animate = input(true, { transform: booleanAttribute });
  /** It follows the pointer. */
  readonly pointer = input(true, { transform: booleanAttribute });
  /** Device px drawn for one CSS px, never more than the screen has: lower is cheaper and softer. */
  readonly resolution = input(1, { transform: numberAttribute });
  /** It lights the page's lit surfaces (`lenziLit`). */
  readonly lights = input(true, { transform: booleanAttribute });

  /** No WebGL2 here: the styles show a still picture instead. */
  protected readonly unavailable = signal(false);

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly document = inject(DOCUMENT);
  private readonly ambient = inject(LenziAmbientLight);
  private readonly field = inject(LenziLightField);

  private engine: GlowEngine | null = null;
  private scene: LenziGlowScene | null = null;
  private frameId: number | null = null;
  private stillId: number | null = null;
  private visible = true;
  private reducedMotion = false;
  private last = 0;
  private lastLight = 0;
  private lastColours = 0;
  private shining = false;
  private pointerAt: { x: number; y: number } | null = null;
  private accentColour: LinearRgb = [0.66, 0.5, 1];
  private baseColour: LinearRgb = [0.014, 0.014, 0.016];
  /** The page's glass and solid, read with the colours. */
  protected surfaceLook: LenziSurfaceLook = {
    glass: [0.014, 0.014, 0.016],
    glassAmount: 0.46,
    veil: 0.34,
    rim: 0.8,
    border: [0.08, 0.075, 0.09],
    borderWidth: 2,
    solid: [0.04, 0.04, 0.045],
    shadow: 0.6,
  };
  private colourKey = '';
  private tints: Float32Array = new Float32Array(0);
  private tintKey = '';
  private probe: { element: HTMLElement; context: CanvasRenderingContext2D | null } | null = null;

  /** The scene of this background, made once the engine is there. */
  protected abstract createScene(engine: GlowEngine): LenziGlowScene;
  /** How much of the last frame stays in the next (trails): 0 none. */
  protected trail(): number {
    return 0;
  }

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const view = this.document.defaultView;
      if (!view) return;
      this.readColours();
      const canvas = this.document.createElement('canvas');
      canvas.style.cssText = 'display:block;width:100%;height:100%';
      const engine = GlowEngine.create(canvas);
      if (!engine) {
        this.unavailable.set(true);
        return;
      }
      try {
        this.scene = this.createScene(engine);
      } catch {
        // a shader this GPU does not take: the still picture
        engine.dispose();
        this.unavailable.set(true);
        return;
      }
      this.engine = engine;
      this.host.appendChild(canvas);

      const motion = view.matchMedia?.('(prefers-reduced-motion: reduce)');
      this.reducedMotion = motion?.matches ?? false;
      const onMotion = (event: MediaQueryListEvent) => {
        this.reducedMotion = event.matches;
        this.loop();
      };
      motion?.addEventListener?.('change', onMotion);

      const resized = new ResizeObserver(() => this.resize());
      resized.observe(this.host);
      const seen = new IntersectionObserver((entries) => {
        this.visible = entries.some((entry) => entry.isIntersecting);
        this.loop();
      });
      seen.observe(this.host);
      const onVisibility = () => this.loop();
      this.document.addEventListener('visibilitychange', onVisibility);

      // the background is behind the page and takes no pointer: the window says where it is
      const root = this.document.documentElement;
      let dragging = false;
      let cursor = false;
      const now = () => view.performance.now() / 1000;
      const local = (event: PointerEvent) => {
        const origin = this.origin();
        return { x: event.clientX - origin.x, y: event.clientY - origin.y };
      };
      // what the page itself takes (a link, a button, a field) is never a grab of the background
      const free = (event: PointerEvent) => !(event.target instanceof Element && event.target.closest(PAGE_TAKES));
      const setCursor = (value: string | null) => {
        if (value) root.style.cursor = value;
        else if (cursor) root.style.removeProperty('cursor');
        cursor = value !== null;
      };
      const onPointer = (event: PointerEvent) => {
        this.pointerAt = { x: event.clientX, y: event.clientY };
        const at = local(event);
        if (dragging) this.dragTo(at.x, at.y, now());
        else if (event.pointerType === 'mouse') setCursor(free(event) && this.grabbable(at.x, at.y) ? 'grab' : null);
      };
      const onDown = (event: PointerEvent) => {
        onPointer(event);
        if (dragging || event.button !== 0 || !free(event)) return;
        const at = local(event);
        if (!this.grab(at.x, at.y, now())) return;
        dragging = true;
        event.preventDefault();
        root.style.userSelect = 'none';
        this.document.getSelection()?.removeAllRanges();
        setCursor('grabbing');
      };
      const onPointerGone = (event: PointerEvent) => {
        if (dragging && event.type !== 'pointerout') {
          dragging = false;
          this.letGo(now());
          root.style.removeProperty('user-select');
          setCursor(null);
        }
        if (event.type === 'pointerout' ? event.relatedTarget === null : event.pointerType !== 'mouse') this.pointerAt = null;
      };
      view.addEventListener('pointermove', onPointer, { passive: true });
      view.addEventListener('pointerdown', onDown);
      view.addEventListener('pointerup', onPointerGone, { passive: true });
      view.addEventListener('pointercancel', onPointerGone, { passive: true });
      this.document.addEventListener('pointerout', onPointerGone, { passive: true });

      this.resize();
      this.loop();

      destroyRef.onDestroy(() => {
        this.stop();
        if (this.stillId !== null) view.cancelAnimationFrame(this.stillId);
        resized.disconnect();
        seen.disconnect();
        motion?.removeEventListener?.('change', onMotion);
        this.document.removeEventListener('visibilitychange', onVisibility);
        view.removeEventListener('pointermove', onPointer);
        view.removeEventListener('pointerdown', onDown);
        if (dragging) root.style.removeProperty('user-select');
        setCursor(null);
        view.removeEventListener('pointerup', onPointerGone);
        view.removeEventListener('pointercancel', onPointerGone);
        this.document.removeEventListener('pointerout', onPointerGone);
        this.ambient.dim(this);
        this.scene?.dispose?.();
        this.scene = null;
        engine.dispose();
        this.engine = null;
        canvas.remove();
        this.probe?.element.remove();
      });
    });
    destroyRef.onDestroy(() => {
      this.ambient.dim(this);
      this.field.setSourceLamps(this, []);
    });
  }

  /** Any parameter changed: a moving background takes it at its next frame, a still one is drawn again. */
  ngOnChanges(): void {
    this.fit();
    this.loop();
    this.drawSoon();
  }

  /** The space the scene lives in, in CSS px. */
  protected get width(): number {
    return this.engine?.cssWidth ?? 1;
  }

  protected get height(): number {
    return this.engine?.cssHeight ?? 1;
  }

  /**
   * Whether something of the background can be taken at a point of the space (a blob that can be thrown):
   * the pointer shows a hand over it. Nothing, unless a background has such things.
   */
  protected grabbable(_x: number, _y: number): boolean {
    return false;
  }

  /** The pointer pressed at a point of the space, on nothing of the page's: takes what is there; false when nothing. */
  protected grab(_x: number, _y: number, _time: number): boolean {
    return false;
  }

  /** The pointer moved, holding what it took (time in seconds). */
  protected dragTo(_x: number, _y: number, _time: number): void {}

  /** The pointer let go of what it held. */
  protected letGo(_time: number): void {}

  /** Where the space is on the screen (its top left, CSS px from the window's). */
  protected origin(): { x: number; y: number } {
    const box = this.host.getBoundingClientRect();
    return { x: box.left, y: box.top };
  }

  /** Where the pointer is in that space, or null (not there, or not followed). */
  protected pointerInside(): { x: number; y: number } | null {
    if (!this.pointer() || !this.pointerAt) return null;
    const box = this.host.getBoundingClientRect();
    return { x: this.pointerAt.x - box.left, y: this.pointerAt.y - box.top };
  }

  /**
   * The colours of `count` objects (r, g, b, …, linear): the accent, moved a little for each. The
   * same array until the accent, the spread, the seed or the count change.
   */
  protected colours(count: number): Float32Array {
    const key = `${count}|${this.accentColour.join(',')}|${this.spread()}|${this.seed()}`;
    if (key !== this.tintKey) {
      this.tintKey = key;
      this.tints = displacedColors(this.accentColour, count, Math.min(1, Math.max(0, this.spread())), this.seed());
    }
    return this.tints;
  }

  /** The theme's colours, as the browser resolves them now. */
  private readColours(): void {
    const key = `${this.accent()}|${this.base()}`;
    const accent = this.resolve(this.accent());
    const base = this.resolve(this.base());
    if (accent) this.accentColour = accent;
    if (base) this.baseColour = base;
    this.readSurfaceLook();
    const colours = `${key}|${this.accentColour.join(',')}|${this.baseColour.join(',')}`;
    if (colours === this.colourKey) return;
    this.colourKey = colours;
    // for the styles: the colour under the canvas before its first frame, and the still picture
    this.host.style.setProperty('--lenzi-glow-accent', linearToHex(this.accentColour));
    this.host.style.setProperty('--lenzi-glow-base', linearToHex(this.baseColour));
  }

  /** The page's glass and solid, from its variables (the catalog changes them live). */
  private readSurfaceLook(): void {
    const view = this.document.defaultView;
    if (!view) return;
    const root = view.getComputedStyle(this.host);
    const share = (name: string, otherwise: number) => {
      const value = parseFloat(root.getPropertyValue(name));
      return Number.isFinite(value) ? Math.min(1, Math.max(0, value / 100)) : otherwise;
    };
    const px = (name: string, otherwise: number) => {
      const value = parseFloat(root.getPropertyValue(name));
      return Number.isFinite(value) ? value : otherwise;
    };
    const look = this.surfaceLook;
    this.surfaceLook = {
      glass: this.baseColour,
      glassAmount: share('--lenzi-lit-glass', look.glassAmount),
      veil: share('--lenzi-lit-veil', look.veil),
      rim: share('--lenzi-lit-rim', look.rim),
      border: this.resolve('--mat-sys-outline-variant') ?? look.border,
      borderWidth: px('--lenzi-border', look.borderWidth),
      solid: this.resolve('--mat-sys-surface-container-high') ?? look.solid,
      shadow: share('--lenzi-shadow', look.shadow),
    };
  }

  /** A CSS variable or colour as linear RGB, resolved by the browser (variables, oklch); null where it cannot. */
  private resolve(css: string): LinearRgb | null {
    const view = this.document.defaultView;
    if (!view) return null;
    if (!this.probe) {
      const element = this.document.createElement('span');
      element.style.display = 'none';
      this.host.appendChild(element);
      const canvas = this.document.createElement('canvas');
      canvas.width = canvas.height = 1;
      let context: CanvasRenderingContext2D | null = null;
      try {
        context = canvas.getContext('2d', { willReadFrequently: true });
      } catch {
        context = null;
      }
      this.probe = { element, context };
    }
    const { element, context } = this.probe;
    element.style.color = '';
    element.style.color = css.trim().startsWith('--') ? `var(${css.trim()})` : css;
    const computed = view.getComputedStyle(element).color;
    if (!computed || !context) return null;
    context.clearRect(0, 0, 1, 1);
    context.fillStyle = '#000';
    context.fillStyle = computed;
    context.fillRect(0, 0, 1, 1);
    const [r = 0, g = 0, b = 0] = context.getImageData(0, 0, 1, 1).data;
    const linear = (channel: number) => (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
    return [linear(r / 255), linear(g / 255), linear(b / 255)];
  }

  /** The canvas takes its box's size (and the resolution asked for). */
  private fit(): void {
    const engine = this.engine;
    const view = this.document.defaultView;
    if (!engine || !view) return;
    const width = this.host.clientWidth;
    const height = this.host.clientHeight;
    if (width === 0 || height === 0) return;
    const scale = Math.min(view.devicePixelRatio || 1, Math.max(0.25, this.resolution()));
    engine.resize(width, height, scale);
    this.resized(width, height);
  }

  /** The box changed size: drawn again at once (a canvas that changes size is emptied). */
  private resize(): void {
    this.fit();
    this.draw();
  }

  /** The space changed size. */
  protected resized(_width: number, _height: number): void {}

  /** One picture: the scene's light, the glow, the base colour, the blur. */
  private draw(): void {
    const engine = this.engine;
    const scene = this.scene;
    if (!engine || !scene) return;
    engine.render(
      {
        base: this.baseColour,
        light: luminance(this.baseColour) > 0.4,
        core: Math.max(0, this.brightness()),
        glow: Math.max(0, this.glow()),
        halo: this.halo(),
        blur: Math.max(0, this.blur()),
        trail: this.moving() ? Math.min(0.98, Math.max(0, this.trail())) : 0,
        shadow: this.surfaceLook.shadow,
      },
      scene,
    );
  }

  /** A still background is drawn again at the next frame (its parameters or its colours changed). */
  private drawSoon(): void {
    const view = this.document.defaultView;
    if (!this.engine || !view || this.frameId !== null || this.stillId !== null) return;
    this.stillId = view.requestAnimationFrame((now) => {
      this.stillId = null;
      this.fit();
      this.readColours();
      this.draw();
      this.shine(now, true);
    });
  }

  /**
   * The background's objects as lights for the page's surfaces (lenzi, 2026-11-14: the blobs' light
   * "should act more like this on the glass surfaces"), in the space's px; null: the background lights
   * them with its picture instead (LenziAmbientLight).
   */
  protected lamps(): LenziSourceLamp[] | null {
    return null;
  }

  /** The light of the picture just drawn, for the page's lit surfaces. */
  private shine(now: number, always = false): void {
    const engine = this.engine;
    if (!engine) return;
    if (!this.lights()) {
      if (this.shining) this.ambient.dim(this);
      this.field.setSourceLamps(this, []);
      this.shining = false;
      return;
    }
    const lamps = this.lamps();
    if (lamps) {
      // as lights of their own, every frame: they move
      const box = this.host.getBoundingClientRect();
      this.field.setSourceLamps(
        this,
        lamps.map((lamp) => ({ ...lamp, left: lamp.left + box.left, right: lamp.right + box.left, top: lamp.top + box.top, bottom: lamp.bottom + box.top })),
      );
      return;
    }
    if (!this.ambient.wanted || (!always && now - this.lastLight < LIGHT_EVERY)) return;
    this.lastLight = now;
    this.shining = true;
    this.ambient.shine(this, engine.readLight(), LIGHT_WIDTH, LIGHT_HEIGHT, () => this.host.getBoundingClientRect(), luminance(this.baseColour) > 0.4);
  }

  private moving(): boolean {
    return !!this.engine && this.animate() && this.visible && !this.reducedMotion && !this.document.hidden;
  }

  /** Starts the frame loop when it should run, stops it when it should not (then: one still picture). */
  private loop(): void {
    const view = this.document.defaultView;
    if (!this.engine || !view) return;
    if (!this.moving()) {
      this.stop();
      this.drawSoon();
      return;
    }
    if (this.frameId !== null) return;
    this.last = view.performance.now();
    const tick = (now: number) => {
      if (!this.moving()) {
        this.frameId = null;
        this.drawSoon();
        return;
      }
      const delta = Math.min(0.1, Math.max(0, (now - this.last) / 1000)) * Math.max(0, this.speed());
      this.last = now;
      if (now - this.lastColours > COLOURS_EVERY) {
        this.lastColours = now;
        this.readColours();
      }
      this.scene?.advance(delta);
      this.draw();
      this.shine(now);
      this.frameId = view.requestAnimationFrame(tick);
    };
    this.frameId = view.requestAnimationFrame(tick);
  }

  private stop(): void {
    if (this.frameId !== null) this.document.defaultView?.cancelAnimationFrame(this.frameId);
    this.frameId = null;
  }
}
