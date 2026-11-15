import { Component, DOCUMENT, DestroyRef, ElementRef, computed, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSliderModule } from '@angular/material/slider';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NgTemplateOutlet } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

import { LenziColorPicker } from '@lenzi/ui-kit';

import {
  BlobMaterial,
  BoidsFollow,
  DEFAULT_BOIDS,
  DEFAULT_BOID_SIZES,
  LenziLit,
  BLOB_SHAPE_NAMES,
  BlobShapeName,
  MATERIAL_LAYERS,
  blobHome,
  shapeOutline,
  LenziScene,
  LenziSceneBackground,
  LenziSceneFleet,
  LenziSceneFleetKind,
} from '@lenzi/ui-kit/backgrounds';

import { HOME_SCENE } from '../../scenes';
import { SCENE_LAYERS, SCENE_LIMITS, SCENE_WEIGHTS, sceneFromCode, sceneToCode } from '../../shared/scene-code';

/**
 * A scene with every object put somewhere: a blob without a place where the background would have it (its
 * seeded place), a leader without one spread along the middle. In the maker every object is where it is shown,
 * and a fleet is born around its leader.
 */
export function placed(scene: LenziScene): LenziScene {
  return {
    ...scene,
    blobs: scene.blobs.map((blob, i) => (typeof blob.x === 'number' && typeof blob.y === 'number' ? blob : { ...blob, ...blobHome(i, 1) })),
    fleets: scene.fleets.map((fleet, i, all) =>
      typeof fleet.x === 'number' && typeof fleet.y === 'number' ? fleet : { ...fleet, x: Math.round((0.2 + (0.6 * (i + 0.5)) / all.length) * 1000) / 1000, y: 0.5 },
    ),
  };
}

/** What a blob's (or a blob-boid's) body is: glass, or solid (lenzi, 2026-11-15: "it should be solid/glass and emitting/not emitting"). */
export type SceneBody = 'solid' | 'glass';

export function bodyOf(material: BlobMaterial): SceneBody {
  return material === 'glass' ? 'glass' : 'solid';
}

/** Whether it shines: a lamp (a solid thing that shines), or glass that shines. */
export function emitsOf(thing: { material?: BlobMaterial; emitting?: boolean }): boolean {
  return (thing.material ?? 'lamp') === 'lamp' || (thing.material === 'glass' && thing.emitting === true);
}

/** The material (and the glass's shining) of a body that shines or not. */
export function lookFor(body: SceneBody, emits: boolean): { material: BlobMaterial; emitting?: true } {
  if (body === 'glass') return emits ? { material: 'glass', emitting: true } : { material: 'glass' };
  return { material: emits ? 'lamp' : 'solid' };
}

/** What a look is called: a glowing solid (a lamp), glowing glass, glass, solid. */
export function lookName(thing: { material?: BlobMaterial; emitting?: boolean }): string {
  const material = thing.material ?? 'lamp';
  if (material === 'lamp') return 'Glowing';
  if (material === 'glass') return thing.emitting ? 'Glowing glass' : 'Glass';
  return 'Solid';
}

/** An object's level when it does not say: its material's (glass above); boids on 0. */
export function layerOf(object: { material?: BlobMaterial; layer?: number }, kind: 'blob' | LenziSceneFleetKind): number {
  return object.layer ?? (kind === 'boid' ? 0 : MATERIAL_LAYERS[object.material ?? 'lamp']);
}

/** What the window on the left shows: the scene's own settings, a blob, or a fleet's leader. */
export type SceneObject = { type: 'scene' } | { type: 'blob'; index: number } | { type: 'fleet'; index: number };

/** A number of a fleet the window changes, with its bounds. */
interface FleetField {
  key: 'count' | 'size' | 'sizeVariety' | 'maxSpeed' | 'minSpeed' | 'separation' | 'alignment' | 'cohesion' | 'wander';
  label: string;
  min: number;
  max: number;
  step: number;
}

/** The fleet: how many, and their size apart from the leader's ways ("tranne la grandezza ... e anche il displacement"). */
const FLEET_FIELDS: readonly FleetField[] = [
  { key: 'count', label: 'How many follow it', min: 1, max: 600, step: 1 },
  { key: 'size', label: 'Width of one (px)', min: 2, max: 40, step: 1 },
  { key: 'sizeVariety', label: 'How different their sizes are', min: 0, max: 1, step: 0.05 },
];

/** The leader's ways: every one of its fleet takes them. */
const LEADER_FIELDS: readonly FleetField[] = [
  { key: 'maxSpeed', label: 'Fastest (px/s)', min: 20, max: 600, step: 10 },
  { key: 'minSpeed', label: 'Slowest (px/s)', min: 0, max: 300, step: 10 },
  { key: 'separation', label: 'Keep apart', min: 0, max: 5, step: 0.1 },
  { key: 'alignment', label: 'Head the same way', min: 0, max: 5, step: 0.1 },
  { key: 'cohesion', label: 'Stay together', min: 0, max: 5, step: 0.1 },
  { key: 'wander', label: 'Turns of its own', min: 0, max: 2, step: 0.05 },
];

const MATERIAL_ICONS: Readonly<Record<BlobMaterial, string>> = { lamp: 'lightbulb', glass: 'blur_on', solid: 'circle' };

/** The colours an object has by default, as the picker shows them: the accent (the theme's primary); plain glass, the page's. */
const DEFAULT_ACCENT = '#d5baff';
const DEFAULT_GLASS = '#1f1f22';
/** The colours offered next when a colour becomes many: the theme's own (its tertiary, secondary, and the good status). */
const PALETTE_NEXT = ['#7fd4ff', '#ffb0cd', '#6ed889', '#ffd27a'];

/** What each shape is called in the picker. */
const SHAPE_LABELS: Readonly<Record<BlobShapeName, string>> = {
  circle: 'Circle',
  squircle: 'Squircle',
  triangle: 'Triangle',
  pentagon: 'Pentagon',
  hexagon: 'Hexagon',
  clover4: 'Clover, 4 leaves',
  clover8: 'Clover, 8 leaves',
  flower: 'Flower',
  cookie6: 'Cookie, 6 bumps',
  cookie9: 'Cookie, 9 bumps',
  cookie12: 'Cookie, 12 bumps',
  sunny: 'Sun',
  burst: 'Burst',
};

/** The shapes a blob may keep, each with its outline; first "changing" (it turns into one after another). */
export const SHAPE_CHOICES: readonly { value: BlobShapeName | ''; label: string; outline: string | null }[] = [
  { value: '', label: 'Changing', outline: null },
  ...BLOB_SHAPE_NAMES.map((name) => ({ value: name, label: SHAPE_LABELS[name], outline: shapeOutline(name) })),
];
const MATERIAL_NAMES: Readonly<Record<BlobMaterial, string>> = { lamp: 'Lamp', glass: 'Glass', solid: 'Solid' };

/** A fleet's number when it does not say: what the background gives its kind (blob-boids a little slower and closer). */
export function fleetDefault(fleet: LenziSceneFleet, key: FleetField['key']): number {
  const blob = fleet.kind === 'blob-boid';
  switch (key) {
    case 'count':
      return fleet.count;
    case 'size':
      return blob ? 11 : 9;
    case 'sizeVariety':
      return DEFAULT_BOID_SIZES.sizeVariety;
    case 'maxSpeed':
      return blob ? DEFAULT_BOIDS.maxSpeed * 0.7 : DEFAULT_BOIDS.maxSpeed;
    case 'minSpeed':
      return blob ? DEFAULT_BOIDS.minSpeed * 0.7 : DEFAULT_BOIDS.minSpeed;
    case 'cohesion':
      return blob ? Math.max(DEFAULT_BOIDS.cohesion, 1.6) : DEFAULT_BOIDS.cohesion;
    case 'alignment':
      return blob ? Math.min(DEFAULT_BOIDS.alignment, 0.8) : DEFAULT_BOIDS.alignment;
    default:
      return DEFAULT_BOIDS[key];
  }
}

/**
 * The scene maker (lenzi, 2026-11-14: "Fai una pagina, lo scene maker come ti ho descritto prima. gli utenti
 * devono finire lí!"): the scene, live, behind the page; on the left its objects with their icons, one under the
 * other ("sulla sinistra direttamente all'entrata del pannello di configurazione scena i vari oggetti (con icona)
 * disposti verticalmente"); a click on one opens its window beside them, with all its properties ("al click di un
 * oggetto configurabile ... si apra una finestra sulla sinistra"). A fleet is its leader: the boids exist only
 * once it flies ("boid singoli non esistono prima del partire della simulazione"); a boid or a blob-boid, a toggle
 * in its window. The scene is in the page's address (`?s=`): a link is the scene; Copy gives it, and an iframe.
 */
@Component({
  selector: 'app-scene-maker-page',
  imports: [
    LenziColorPicker,
    LenziLit,
    LenziSceneBackground,
    NgTemplateOutlet,
    MatButtonModule,
    MatButtonToggleModule,
    MatCardModule,
    MatChipsModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatListModule,
    MatSlideToggleModule,
    MatSliderModule,
  ],
  templateUrl: './scene-maker-page.html',
  styleUrl: './scene-maker-page.css',
})
export class SceneMakerPage {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly snackBar = inject(MatSnackBar);
  private readonly document = inject(DOCUMENT);

  protected readonly limits = SCENE_LIMITS;
  protected readonly fleetFields = FLEET_FIELDS;
  protected readonly leaderFields = LEADER_FIELDS;
  protected readonly materialNames = MATERIAL_NAMES;
  protected readonly layerOf = layerOf;
  protected readonly shapeChoices = SHAPE_CHOICES;
  protected readonly bodyOf = bodyOf;
  protected readonly emitsOf = emitsOf;
  protected readonly weights = SCENE_WEIGHTS;
  protected readonly materials: readonly BlobMaterial[] = ['lamp', 'glass', 'solid'];

  protected readonly layers = Array.from({ length: SCENE_LAYERS[1] - SCENE_LAYERS[0] + 1 }, (_, i) => SCENE_LAYERS[0] + i);

  /** The scene being made: the link's, or the home's to start from; every object put somewhere. */
  readonly scene = signal<LenziScene>(placed(structuredClone(HOME_SCENE)));
  /** The object whose window is open. */
  readonly chosen = signal<SceneObject | null>(null);
  /**
   * The simulation runs; paused, the scene is being made: no fleets, every object still, chosen and moved by the
   * pointer (lenzi, 2026-11-14: "the fleet should only be visible when playing the simulation. make every object
   * selectable and moveable (not subject to phisics) when paused and add an highlight when doing so").
   */
  readonly playing = signal(false);
  /** The object the pointer is moving. */
  readonly moving = signal<SceneObject | null>(null);
  /** The scene's code, as in the link. */
  readonly code = signal('');

  /** The space the scene fills (as the background does), px: where the objects' places are. */
  protected readonly space = signal({ width: 1, height: 1 });
  private readonly stage = viewChild<ElementRef<HTMLElement>>('stage');

  /** The objects in the column: the scene itself, its blobs, its fleets' leaders. */
  protected readonly objects = computed(() => {
    const scene = this.scene();
    return [
      { object: { type: 'scene' } as SceneObject, icon: 'landscape', title: scene.name || 'The scene', detail: 'The pointer, throwing' },
      ...scene.blobs.map((blob, index) => ({
        object: { type: 'blob', index } as SceneObject,
        icon: blob.material === 'glass' && blob.emitting ? 'flare' : MATERIAL_ICONS[blob.material],
        title: `${lookName(blob)} blob`,
        detail: `${Math.round(blob.size * 100)}% of the screen${blob.fixed ? ', stays put' : ''}`,
      })),
      ...scene.fleets.map((fleet, index) => ({
        object: { type: 'fleet', index } as SceneObject,
        icon: fleet.kind === 'boid' ? 'navigation' : 'bubble_chart',
        title: fleet.kind === 'boid' ? 'Boids' : `${lookName(fleet)} blob-boids`,
        detail: `Leader of ${fleet.count}`,
      })),
    ];
  });

  protected readonly chosenBlob = computed(() => {
    const chosen = this.chosen();
    return chosen?.type === 'blob' ? (this.scene().blobs[chosen.index] ?? null) : null;
  });

  protected readonly chosenFleet = computed(() => {
    const chosen = this.chosen();
    return chosen?.type === 'fleet' ? (this.scene().fleets[chosen.index] ?? null) : null;
  });

  constructor() {
    // the link's scene, if it holds one
    void sceneFromCode(this.route.snapshot.queryParamMap.get('s')).then((scene) => {
      if (scene) this.scene.set(placed(scene));
    });
    // the space's size, while the objects are shown on it
    effect((onCleanup) => {
      const stage = this.stage()?.nativeElement;
      if (!stage || typeof ResizeObserver === 'undefined') return;
      const measure = () => {
        const box = stage.getBoundingClientRect();
        this.space.set({ width: Math.max(1, box.width), height: Math.max(1, box.height) });
      };
      const observer = new ResizeObserver(measure);
      observer.observe(stage);
      measure();
      onCleanup(() => observer.disconnect());
    });
    // the scene into the address, a moment after the last change
    let timer: ReturnType<typeof setTimeout> | undefined;
    effect(() => {
      const scene = this.scene();
      untracked(() => {
        clearTimeout(timer);
        timer = setTimeout(async () => {
          const code = await sceneToCode(scene);
          this.code.set(code);
          void this.router.navigate([], { relativeTo: this.route, queryParams: { s: code }, replaceUrl: true });
        }, 300);
      });
    });
    inject(DestroyRef).onDestroy(() => clearTimeout(timer));
  }

  protected isChosen(object: SceneObject): boolean {
    const chosen = this.chosen();
    return !!chosen && chosen.type === object.type && ('index' in chosen ? chosen.index : -1) === ('index' in object ? object.index : -1);
  }

  protected choose(object: SceneObject): void {
    this.chosen.set(this.isChosen(object) ? null : object);
  }

  protected addBlob(): void {
    this.scene.update((scene) => ({ ...scene, blobs: [...scene.blobs, { material: 'lamp', size: 0.12, x: 0.5, y: 0.5 }] }));
    this.chosen.set({ type: 'blob', index: this.scene().blobs.length - 1 });
  }

  protected addFleet(): void {
    this.scene.update((scene) => ({ ...scene, fleets: [...scene.fleets, { kind: 'boid', count: 120, x: 0.5, y: 0.5 }] }));
    this.chosen.set({ type: 'fleet', index: this.scene().fleets.length - 1 });
  }

  /** Where an object is put, as a share of the space. */
  protected placeOf(object: SceneObject): { x: number; y: number } {
    const thing = object.type === 'blob' ? this.scene().blobs[object.index] : object.type === 'fleet' ? this.scene().fleets[object.index] : null;
    return { x: thing?.x ?? 0.5, y: thing?.y ?? 0.5 };
  }

  /** Puts an object somewhere (inside the space). */
  protected put(object: SceneObject, x: number, y: number): void {
    const place = { x: Math.round(Math.min(1, Math.max(0, x)) * 1000) / 1000, y: Math.round(Math.min(1, Math.max(0, y)) * 1000) / 1000 };
    this.scene.update((scene) =>
      object.type === 'blob'
        ? { ...scene, blobs: scene.blobs.map((blob, i) => (i === object.index ? { ...blob, ...place } : blob)) }
        : object.type === 'fleet'
          ? { ...scene, fleets: scene.fleets.map((fleet, i) => (i === object.index ? { ...fleet, ...place } : fleet)) }
          : scene,
    );
  }

  /** The pointer takes an object: it is chosen (its window opens) and follows the pointer until let go. */
  protected grab(event: PointerEvent, object: SceneObject): void {
    if (event.button !== 0) return;
    event.preventDefault();
    this.chosen.set(object);
    this.moving.set(object);
    try {
      (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
    } catch {
      // a pointer already gone: it is moved as long as the events come
    }
  }

  protected drag(event: PointerEvent): void {
    const object = this.moving();
    const stage = this.stage()?.nativeElement;
    if (!object || !stage) return;
    const box = stage.getBoundingClientRect();
    this.put(object, (event.clientX - box.left) / Math.max(1, box.width), (event.clientY - box.top) / Math.max(1, box.height));
  }

  protected letGo(): void {
    this.moving.set(null);
  }

  /** The keyboard moves the chosen object too: the arrows a little, with Shift more. */
  protected nudge(event: KeyboardEvent, object: SceneObject): void {
    const step = event.shiftKey ? 0.05 : 0.01;
    const moves: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    const move = moves[event.key];
    if (!move) return;
    event.preventDefault();
    const place = this.placeOf(object);
    this.chosen.set(object);
    this.put(object, place.x + move[0], place.y + move[1]);
  }

  protected isMoving(object: SceneObject): boolean {
    const moving = this.moving();
    return !!moving && moving.type === object.type && ('index' in moving ? moving.index : -1) === ('index' in object ? object.index : -1);
  }

  /** A blob's width on the screen, px (its size is a share of the space's shorter side). */
  protected blobWidth(size: number): number {
    const { width, height } = this.space();
    return 2 * size * Math.min(width, height);
  }

  protected setLayer(layer: number): void {
    const chosen = this.chosen();
    if (chosen?.type === 'blob') this.setBlob({ layer });
    if (chosen?.type === 'fleet') this.setFleet({ layer });
  }

  /** Takes the chosen blob or fleet out of the scene. */
  protected remove(): void {
    const chosen = this.chosen();
    if (!chosen || chosen.type === 'scene') return;
    this.scene.update((scene) =>
      chosen.type === 'blob' ? { ...scene, blobs: scene.blobs.filter((_, i) => i !== chosen.index) } : { ...scene, fleets: scene.fleets.filter((_, i) => i !== chosen.index) },
    );
    this.chosen.set(null);
  }

  protected setName(name: string): void {
    this.scene.update((scene) => ({ ...scene, name: name.slice(0, SCENE_LIMITS.name) }));
  }

  protected setFollow(follow: BoidsFollow): void {
    this.scene.update((scene) => ({ ...scene, follow }));
  }

  protected setThrowable(throwable: boolean): void {
    this.scene.update((scene) => ({ ...scene, throwable }));
  }

  /** A shape the blob keeps, or none ('': it changes from one into another). */
  protected setShape(shape: BlobShapeName | '' | undefined): void {
    const chosen = this.chosen();
    if (chosen?.type !== 'blob') return;
    this.scene.update((scene) => ({
      ...scene,
      blobs: scene.blobs.map((blob, i) => {
        if (i !== chosen.index) return blob;
        const { shape: _old, ...rest } = blob;
        return shape ? { ...rest, shape } : rest;
      }),
    }));
  }

  /** A body and its light, for the chosen blob or blob-boid fleet. */
  protected setLook(body: SceneBody, emits: boolean): void {
    this.changeChosen((thing) => {
      const { emitting: _old, ...rest } = thing as { emitting?: boolean };
      return { ...rest, ...lookFor(body, emits) };
    });
  }

  /** The colour shown on the picker: its own, or the one it has by default (the accent; plain glass, the page's). */
  protected colourOf(thing: { material?: BlobMaterial; emitting?: boolean; colour?: string; kind?: string }): string {
    if (thing.colour) return thing.colour;
    return thing.kind !== 'boid' && thing.material === 'glass' && !thing.emitting ? DEFAULT_GLASS : DEFAULT_ACCENT;
  }

  /** Its own colour, or (null) back to the default. */
  protected setColour(colour: string | null): void {
    this.changeChosen((thing) => {
      const { colour: _old, ...rest } = thing as { colour?: string };
      return colour ? { ...rest, colour } : rest;
    });
  }

  /** Several colours it shifts among ("color: multi"), or one. */
  protected isMulti(thing: { colours?: string[] }): boolean {
    return (thing.colours?.length ?? 0) >= 2;
  }

  /** Many colours (its own first, then another of the theme's) or back to one (the first of them). */
  protected setMulti(many: boolean): void {
    this.changeChosen((thing) => {
      const { colour, colours, ...rest } = thing as { colour?: string; colours?: string[] };
      if (many) return { ...rest, colours: colours?.length ? colours : [colour ?? this.colourOf(thing), PALETTE_NEXT[0]!] };
      const first = colours?.[0] ?? colour;
      return first ? { ...rest, colour: first } : rest;
    });
  }

  protected setPaletteColour(index: number, colour: string): void {
    this.changeChosen((thing) => {
      const colours = [...((thing as { colours?: string[] }).colours ?? [])];
      colours[index] = colour;
      return { ...thing, colours };
    });
  }

  protected addPaletteColour(): void {
    this.changeChosen((thing) => {
      const colours = (thing as { colours?: string[] }).colours ?? [];
      if (colours.length >= SCENE_LIMITS.colours) return thing;
      return { ...thing, colours: [...colours, PALETTE_NEXT[colours.length % PALETTE_NEXT.length]!] };
    });
  }

  protected removePaletteColour(index: number): void {
    this.changeChosen((thing) => {
      const colours = (thing as { colours?: string[] }).colours ?? [];
      return colours.length > 2 ? { ...thing, colours: colours.filter((_, i) => i !== index) } : thing;
    });
  }

  protected setTint(tint: number): void {
    if (Number.isFinite(tint)) this.changeChosen((thing) => ({ ...thing, tint }));
  }

  /** Glass only: a solid thing is always opaque (lenzi, 2026-11-15: "solid should alway be locked at 100"). */
  protected setTransparency(transparency: number): void {
    if (Number.isFinite(transparency)) this.changeChosen((thing) => ({ ...thing, transparency }));
  }

  /** Glass's tint and transparency when it does not say (the renderer's): with a colour of its own, or the page's glass. */
  protected glassDefaults(thing: { colour?: string; colours?: string[]; emitting?: boolean }): { tint: number; transparency: number } {
    return thing.colour || (thing.colours?.length ?? 0) >= 2 || thing.emitting ? { tint: 0.5, transparency: 0.7 } : { tint: 0, transparency: 0.45 };
  }

  /** The chosen blob or fleet, changed. */
  private changeChosen(change: (thing: object) => object): void {
    const chosen = this.chosen();
    if (chosen?.type === 'blob') {
      this.scene.update((scene) => ({ ...scene, blobs: scene.blobs.map((blob, i) => (i === chosen.index ? (change(blob) as typeof blob) : blob)) }));
    } else if (chosen?.type === 'fleet') {
      this.scene.update((scene) => ({ ...scene, fleets: scene.fleets.map((fleet, i) => (i === chosen.index ? (change(fleet) as typeof fleet) : fleet)) }));
    }
  }

  protected setBlob(change: Partial<{ material: BlobMaterial; size: number; layer: number; fixed: boolean; weight: number }>): void {
    const chosen = this.chosen();
    if (chosen?.type !== 'blob') return;
    this.scene.update((scene) => ({ ...scene, blobs: scene.blobs.map((blob, i) => (i === chosen.index ? { ...blob, ...change } : blob)) }));
  }

  protected setFleet(change: Partial<LenziSceneFleet>): void {
    const chosen = this.chosen();
    if (chosen?.type !== 'fleet') return;
    this.scene.update((scene) => ({ ...scene, fleets: scene.fleets.map((fleet, i) => (i === chosen.index ? { ...fleet, ...change } : fleet)) }));
  }

  /** A boid or a blob-boid: the toggle in the leader's window. */
  protected setKind(kind: LenziSceneFleetKind): void {
    this.setFleet(kind === 'blob-boid' ? { kind, material: this.chosenFleet()?.material ?? 'glass' } : { kind });
  }

  protected setFleetNumber(key: FleetField['key'], value: number): void {
    if (Number.isFinite(value)) this.setFleet({ [key]: value });
  }

  protected fleetValue(fleet: LenziSceneFleet, key: FleetField['key']): number {
    return fleet[key] ?? fleetDefault(fleet, key);
  }

  /** A number as shown beside its slider: at most two decimals. */
  protected shown(value: number): string {
    return String(Math.round(value * 100) / 100);
  }

  /** The link that recreates the scene (the view page: only the scene, for a tab or an iframe). */
  protected link(): string {
    return new URL(`scene?s=${this.code()}`, this.document.baseURI).href;
  }

  protected async copy(what: 'link' | 'iframe'): Promise<void> {
    const text = what === 'link' ? this.link() : `<iframe src="${this.link()}" title="${this.scene().name || 'A scene'}" style="border: 0; width: 100%; height: 100%"></iframe>`;
    await navigator.clipboard?.writeText(text);
    this.snackBar.open(what === 'link' ? 'The link to the scene is in the clipboard' : 'The iframe is in the clipboard', 'OK', { duration: 3000 });
  }
}
