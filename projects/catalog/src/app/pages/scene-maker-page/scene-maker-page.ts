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
import { MatTooltipModule } from '@angular/material/tooltip';
import { NgTemplateOutlet } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

import { LenziColorPicker, describeError } from '@lenzi/ui-kit';

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
  DEFAULT_CURRENT,
  LenziCurrent,
  STRONGEST_CURRENT,
  blobOutline,
} from '@lenzi/ui-kit/backgrounds';

import { HOME_SCENE } from '../../scenes';
import { KitServer } from '../../shared/kit-server';
import { SavedScenes } from '../../shared/saved-scenes';
import { SCENE_LAYERS, SCENE_LIMITS, SCENE_WEIGHTS, cleanScene, sceneFromCode, sceneToCode } from '../../shared/scene-code';
import { randomScene } from '../../shared/scene-random';

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
export type SceneObject =
  | { type: 'scene' }
  | { type: 'blob'; index: number }
  | { type: 'fleet'; index: number }
  | { type: 'current'; index: number }
  /** A current's point: moved by the pointer, its current's window open. */
  | { type: 'point'; current: number; point: number };

/** One key for an object, to tell whether two are the same. */
const keyOf = (object: SceneObject | null): string =>
  !object ? '' : object.type === 'point' ? `point:${object.current}:${object.point}` : 'index' in object ? `${object.type}:${object.index}` : object.type;

/** A new current: from the left across the middle to the right, a gentle bend, every segment pushing alike. */
const NEW_CURRENT: LenziCurrent = { points: [{ x: 0.2, y: 0.55 }, { x: 0.5, y: 0.42 }, { x: 0.8, y: 0.55 }], strengths: [160, 160], width: 0.08 };

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

/**
 * What a fleet does with the pointer (lenzi, 2026-11-17: "This should be configurable for every boid"): its own; a
 * fleet of a scene from before, which said it once for all, the scene's; else near, as the backgrounds.
 */
export function followOf(fleet: LenziSceneFleet, scene: LenziScene): BoidsFollow {
  return fleet.follow ?? scene.follow ?? 'near';
}

/** What a fleet does with the pointer, on its row. */
const FOLLOW_WORDS: Readonly<Record<BoidsFollow, string>> = {
  flee: 'flees the pointer',
  near: 'near the pointer',
  target: 'onto the pointer',
  none: 'minds no pointer',
};

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
 * The admin keeps scenes on the server too (2026-11-14: "la sezione admin puó creare varie scene"): Save puts the
 * scene in the gallery of the Scenes page; opened from there (`?id=`), Save saves that one again.
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
    MatTooltipModule,
  ],
  templateUrl: './scene-maker-page.html',
  styleUrl: './scene-maker-page.css',
})
export class SceneMakerPage {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly snackBar = inject(MatSnackBar);
  private readonly document = inject(DOCUMENT);
  protected readonly server = inject(KitServer);
  private readonly kept = inject(SavedScenes);

  protected readonly limits = SCENE_LIMITS;
  protected readonly fleetFields = FLEET_FIELDS;
  protected readonly leaderFields = LEADER_FIELDS;
  protected readonly materialNames = MATERIAL_NAMES;
  protected readonly layerOf = layerOf;
  protected readonly defaultCurrent = DEFAULT_CURRENT;
  protected readonly strongestCurrent = STRONGEST_CURRENT;
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
  /** The kept scene being changed (the gallery opened it: `?id=`), which Save saves again; none: Save keeps a new one. */
  readonly savedId = signal<string | null>(this.route.snapshot.queryParamMap.get('id'));
  /** A save is on its way: its buttons wait. */
  protected readonly saving = signal(false);

  /** The space the scene fills (as the background does), px: where the objects' places are. */
  protected readonly space = signal({ width: 1, height: 1 });
  private readonly stage = viewChild<ElementRef<HTMLElement>>('stage');
  private readonly sceneView = viewChild(LenziSceneBackground);

  /**
   * Paused, each blob's outline as the scene draws it (its shape, turned, half way through its change): the highlight
   * follows the blob itself (lenzi, 2026-11-15: the select highlight "a little off center" round a blob not round).
   */
  protected readonly outlines = signal<readonly string[]>([]);
  /** The object the pointer is over, or the keyboard on. */
  protected readonly pointed = signal<SceneObject | null>(null);

  /**
   * The objects in the column: the scene itself first, then its blobs and fleets' leaders from the highest level down,
   * each with its level (lenzi, 2026-11-15: "sort them by z-index also on the left. and display it as a tooltip when
   * hovering on the list item", then "display the z index and the delete button on the list items on the left"):
   * shown on its row (none: the scene, a current), and a button there that takes it out (not the scene).
   */
  protected readonly objects = computed(() => {
    const scene = this.scene();
    const [first, ...rest] = this.listed(scene);
    // a current carries every level: after them all
    const level = (object: SceneObject) =>
      object.type === 'blob' ? layerOf(scene.blobs[object.index]!, 'blob') : object.type === 'fleet' ? layerOf(scene.fleets[object.index]!, scene.fleets[object.index]!.kind) : -1;
    return [
      { ...first!, tooltip: '', level: null as number | null, removable: false },
      ...rest
        .map((item, order) => ({ ...item, order, level: level(item.object) }))
        .sort((a, b) => b.level - a.level || a.order - b.order)
        .map((item) => ({ ...item, tooltip: item.level < 0 ? 'It carries every level' : `Level ${item.level}`, level: item.level < 0 ? null : item.level, removable: true })),
    ];
  });

  /** The objects as the scene lists them. */
  private listed(scene: LenziScene) {
    return [
      // what the pointer does, as it is (2026-11-17: it said "throwing" for a scene that throws nothing)
      {
        object: { type: 'scene' } as SceneObject,
        icon: 'landscape',
        title: scene.name || 'The scene',
        detail: scene.throwable ? 'The pointer throws the blobs' : 'The pointer throws nothing',
      },
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
        detail: `Leader of ${fleet.count}, ${FOLLOW_WORDS[followOf(fleet, scene)]}`,
      })),
      ...(scene.currents ?? []).map((current, index) => ({
        object: { type: 'current', index } as SceneObject,
        icon: 'waves',
        title: 'Current',
        detail: current.points.length === 2 ? '1 segment' : `${current.points.length - 1} segments`,
      })),
    ];
  }

  protected readonly chosenBlob = computed(() => {
    const chosen = this.chosen();
    return chosen?.type === 'blob' ? (this.scene().blobs[chosen.index] ?? null) : null;
  });

  protected readonly chosenCurrent = computed(() => {
    const chosen = this.chosen();
    return chosen?.type === 'current' ? (this.scene().currents?.[chosen.index] ?? null) : null;
  });

  protected readonly chosenFleet = computed(() => {
    const chosen = this.chosen();
    return chosen?.type === 'fleet' ? (this.scene().fleets[chosen.index] ?? null) : null;
  });

  constructor() {
    // the link's scene, if it holds one
    const linked = this.route.snapshot.queryParamMap.get('s');
    void sceneFromCode(linked).then((scene) => {
      if (scene) this.scene.set(placed(scene));
    });
    // a kept scene's id without its scene: read from the gallery (the admin's), or the id is nobody's
    const id = this.savedId();
    if (id && !linked) {
      this.kept.list().subscribe({
        next: (scenes) => {
          const found = scenes.find((scene) => scene.id === id);
          if (found) this.scene.set(placed(found.scene));
          else this.savedId.set(null);
        },
        error: () => this.savedId.set(null),
      });
    }
    // paused: the blobs' outlines, read from the scene each frame (they change when a blob is moved or changed)
    const view = this.document.defaultView;
    let frame = 0;
    let last = '';
    const read = () => {
      const outlines = (this.sceneView()?.blobsDrawn() ?? []).map((blob) => blobOutline(blob, 72));
      const key = outlines.join('|');
      if (key !== last) {
        last = key;
        this.outlines.set(outlines);
      }
      frame = view && !this.playing() ? view.requestAnimationFrame(read) : 0;
    };
    effect(() => {
      if (this.playing() || !view) return;
      untracked(() => {
        if (!frame) frame = view.requestAnimationFrame(read);
      });
    });
    inject(DestroyRef).onDestroy(() => frame && view?.cancelAnimationFrame(frame));
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
          this.address(code);
        }, 300);
      });
    });
    inject(DestroyRef).onDestroy(() => clearTimeout(timer));
  }

  /** The scene (and the kept scene it is, if any) into the page's address. */
  private address(code: string): void {
    const id = this.savedId();
    void this.router.navigate([], { relativeTo: this.route, queryParams: { s: code, ...(id ? { id } : {}) }, replaceUrl: true });
  }

  /**
   * Keeps the scene on the server, in the gallery of the Scenes page (the admin's): the kept scene it was opened
   * from is saved again, otherwise (or `asNew`) a new one is kept, and the next Save saves that one.
   */
  protected save(asNew = false): void {
    if (this.saving()) return;
    this.saving.set(true);
    const scene = cleanScene(this.scene()) ?? this.scene();
    const id = asNew ? null : this.savedId();
    (id ? this.kept.update(id, scene) : this.kept.add(scene)).subscribe({
      next: (kept) => {
        this.saving.set(false);
        this.savedId.set(kept.id);
        if (this.code()) this.address(this.code());
        this.snackBar
          .open(id ? 'Saved' : 'Kept in your scenes', 'See them', { duration: 5000 })
          .onAction()
          .subscribe(() => void this.router.navigate(['/scenes']));
      },
      error: (error: unknown) => {
        this.saving.set(false);
        // taken out of the gallery meanwhile: the next Save keeps it as a new scene
        const gone = id !== null && (error as { status?: number } | null)?.status === 404;
        if (gone) this.savedId.set(null);
        this.snackBar.open(gone ? 'This scene is not in the gallery any more: Save keeps it as a new one' : `Could not save the scene: ${describeError(error)}`, 'OK', { duration: 8000 });
      },
    });
  }

  /**
   * Plays, or pauses. The marks go with the pause, without saying the pointer left them: nothing is pointed at or
   * being moved any more.
   */
  protected toggle(): void {
    this.playing.update((playing) => !playing);
    this.pointed.set(null);
    this.moving.set(null);
  }

  /**
   * Another scene, by chance (lenzi, 2026-11-15: "put a random gen button"): blobs, fleets, now and then a current,
   * in place of the one being made. It is one press, so the snackbar offers the scene that was there back.
   */
  protected randomize(): void {
    const before = this.scene();
    this.scene.set(placed(randomScene()));
    this.chosen.set(null);
    this.snackBar
      .open('A random scene took the place of yours', 'Undo', { duration: 8000 })
      .onAction()
      .subscribe(() => {
        this.scene.set(before);
        this.chosen.set(null);
      });
  }

  protected isChosen(object: SceneObject): boolean {
    return keyOf(this.chosen()) === keyOf(object);
  }

  protected choose(object: SceneObject): void {
    this.chosen.set(this.isChosen(object) ? null : object);
  }

  protected addBlob(): void {
    this.scene.update((scene) => ({ ...scene, blobs: [...scene.blobs, { material: 'lamp', size: 0.12, x: 0.5, y: 0.5 }] }));
    this.chosen.set({ type: 'blob', index: this.scene().blobs.length - 1 });
  }

  /** A current, across the middle (lenzi, 2026-11-14: "una corrente (definita da una serie di segmenti, con ognuno le sue forze indipendenti)"). */
  protected addCurrent(): void {
    this.scene.update((scene) => ({ ...scene, currents: [...(scene.currents ?? []), structuredClone(NEW_CURRENT)] }));
    this.chosen.set({ type: 'current', index: (this.scene().currents?.length ?? 1) - 1 });
  }

  /** The chosen current, changed. */
  private changeCurrent(change: (current: LenziCurrent) => LenziCurrent): void {
    const chosen = this.chosen();
    if (chosen?.type !== 'current') return;
    this.scene.update((scene) => ({ ...scene, currents: (scene.currents ?? []).map((current, i) => (i === chosen.index ? change(current) : current)) }));
  }

  protected setCurrentWidth(width: number): void {
    if (Number.isFinite(width)) this.changeCurrent((current) => ({ ...current, width }));
  }

  /** A segment's own push ("con ognuno le sue forze indipendenti"). */
  protected setStrength(segment: number, strength: number): void {
    if (!Number.isFinite(strength)) return;
    this.changeCurrent((current) => {
      const strengths = Array.from({ length: current.points.length - 1 }, (_, i) => current.strengths?.[Math.min(i, (current.strengths?.length ?? 1) - 1)] ?? DEFAULT_CURRENT.strength);
      strengths[segment] = strength;
      return { ...current, strengths };
    });
  }

  protected strengthOf(current: LenziCurrent, segment: number): number {
    const strengths = current.strengths ?? [];
    return strengths[Math.min(segment, strengths.length - 1)] ?? DEFAULT_CURRENT.strength;
  }

  /** One more point, on along the way of the last segment (inside the space), its segment as strong as the last. */
  protected addPoint(): void {
    this.changeCurrent((current) => {
      const last = current.points.at(-1)!;
      const before = current.points.at(-2) ?? { x: last.x - 0.1, y: last.y };
      const clamp = (value: number) => Math.round(Math.min(0.98, Math.max(0.02, value)) * 1000) / 1000;
      const next = { x: clamp(last.x + (last.x - before.x) * 0.7), y: clamp(last.y + (last.y - before.y) * 0.7) };
      const strengths = [...Array.from({ length: current.points.length - 1 }, (_, i) => this.strengthOf(current, i)), this.strengthOf(current, current.points.length - 2)];
      return { ...current, points: [...current.points, next], strengths };
    });
  }

  /** The last point out (two at least: one segment). */
  protected removePoint(): void {
    this.changeCurrent((current) =>
      current.points.length <= 2 ? current : { ...current, points: current.points.slice(0, -1), strengths: current.strengths?.slice(0, current.points.length - 2) },
    );
  }

  /** The other way round: its points backwards, each segment keeping its push. */
  protected reverseCurrent(): void {
    this.changeCurrent((current) => ({
      ...current,
      points: [...current.points].reverse(),
      strengths: Array.from({ length: current.points.length - 1 }, (_, i) => this.strengthOf(current, i)).reverse(),
    }));
  }

  /** A current's segments, as the screen shows them: from, to (px), and their number. */
  protected segmentsOf(current: LenziCurrent): { x1: number; y1: number; x2: number; y2: number; index: number }[] {
    const { width, height } = this.space();
    return current.points.slice(1).map((to, i) => {
      const from = current.points[i]!;
      return { x1: from.x * width, y1: from.y * height, x2: to.x * width, y2: to.y * height, index: i };
    });
  }

  /** A current's line through its points, px. */
  protected lineOf(current: LenziCurrent): string {
    const { width, height } = this.space();
    return current.points.map((point, i) => `${i === 0 ? 'M' : 'L'}${(point.x * width).toFixed(1)} ${(point.y * height).toFixed(1)}`).join(' ');
  }

  /** How wide its reach shows, px (both sides of its line). */
  protected reachOf(current: LenziCurrent): number {
    const { width, height } = this.space();
    return 2 * (current.width ?? DEFAULT_CURRENT.width) * Math.min(width, height);
  }

  protected addFleet(): void {
    this.scene.update((scene) => ({ ...scene, fleets: [...scene.fleets, { kind: 'boid', count: 120, x: 0.5, y: 0.5 }] }));
    this.chosen.set({ type: 'fleet', index: this.scene().fleets.length - 1 });
  }

  /** Where an object is put, as a share of the space. */
  protected placeOf(object: SceneObject): { x: number; y: number } {
    const scene = this.scene();
    const thing =
      object.type === 'blob'
        ? scene.blobs[object.index]
        : object.type === 'fleet'
          ? scene.fleets[object.index]
          : object.type === 'point'
            ? scene.currents?.[object.current]?.points[object.point]
            : null;
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
          : object.type === 'point'
            ? {
                ...scene,
                currents: (scene.currents ?? []).map((current, c) =>
                  c === object.current ? { ...current, points: current.points.map((point, p) => (p === object.point ? place : point)) } : current,
                ),
              }
            : scene,
    );
  }

  /** The pointer takes an object: it is chosen (its window opens) and follows the pointer until let go. */
  protected grab(event: PointerEvent, object: SceneObject): void {
    if (event.button !== 0) return;
    event.preventDefault();
    // a current's point: its current's window
    this.chosen.set(object.type === 'point' ? { type: 'current', index: object.current } : object);
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
    // a current's point: its current's window
    this.chosen.set(object.type === 'point' ? { type: 'current', index: object.current } : object);
    this.put(object, place.x + move[0], place.y + move[1]);
  }

  /** Whether the pointer or the keyboard is on this object. */
  protected isPointed(object: SceneObject): boolean {
    return keyOf(this.pointed()) === keyOf(object);
  }

  protected isMoving(object: SceneObject): boolean {
    return keyOf(this.moving()) === keyOf(object);
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

  /**
   * Takes a blob, a fleet or a current out of the scene: the chosen one (its window's button) or the one whose row's
   * button was pressed (lenzi, 2026-11-15: "the delete button on the list items on the left"). It is one press, so
   * the snackbar offers to put it back.
   */
  protected remove(object: SceneObject | null = this.chosen()): void {
    if (!object || object.type === 'scene' || object.type === 'point') return;
    const { type, index } = object;
    const scene = this.scene();
    const blob = type === 'blob' ? scene.blobs[index] : undefined;
    const fleet = type === 'fleet' ? scene.fleets[index] : undefined;
    const current = type === 'current' ? scene.currents?.[index] : undefined;
    if (!blob && !fleet && !current) return;
    const without = <T>(list: readonly T[] | undefined): T[] => (list ?? []).filter((_, i) => i !== index);
    this.scene.update((now) =>
      type === 'blob' ? { ...now, blobs: without(now.blobs) } : type === 'fleet' ? { ...now, fleets: without(now.fleets) } : { ...now, currents: without(now.currents) },
    );
    // the window stays on the object it showed: closed when that is the one taken out, one place up when it came after
    this.rechoose(type, (chosen) => (chosen === index ? null : chosen > index ? chosen - 1 : chosen));
    const withIt = <T>(list: readonly T[] | undefined, thing: T): T[] => {
      const next = [...(list ?? [])];
      next.splice(Math.min(index, next.length), 0, thing);
      return next;
    };
    this.snackBar
      .open(`The ${type} is out of the scene`, 'Undo', { duration: 6000 })
      .onAction()
      .subscribe(() => {
        this.scene.update((now) =>
          blob ? { ...now, blobs: withIt(now.blobs, blob) } : fleet ? { ...now, fleets: withIt(now.fleets, fleet) } : { ...now, currents: withIt(now.currents, current!) },
        );
        this.rechoose(type, (chosen) => (chosen >= index ? chosen + 1 : chosen));
      });
  }

  /** The chosen object's place in its list, after the list changed (null: its window closes). */
  private rechoose(type: 'blob' | 'fleet' | 'current', place: (index: number) => number | null): void {
    const chosen = this.chosen();
    if (!chosen || chosen.type !== type) return;
    const index = place(chosen.index);
    this.chosen.set(index === null ? null : { type, index });
  }

  protected setName(name: string): void {
    this.scene.update((scene) => ({ ...scene, name: name.slice(0, SCENE_LIMITS.name) }));
  }

  /** What the chosen fleet does with the pointer: its own (2026-11-17: "configurable for every boid"). */
  protected setFollow(follow: BoidsFollow): void {
    this.setFleet({ follow });
  }

  /** What a fleet does with the pointer: its own, or (a scene from before) the scene's, or near. */
  protected followOf(fleet: LenziSceneFleet): BoidsFollow {
    return followOf(fleet, this.scene());
  }

  protected setThrowable(throwable: boolean): void {
    this.scene.update((scene) => ({ ...scene, throwable }));
  }

  /** The glass of the scene: liquid, or the page's frosted glass (not said). */
  protected setLiquid(liquid: boolean): void {
    this.scene.update(({ glass: _, ...scene }) => (liquid ? { ...scene, glass: 'liquid' } : scene));
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

  protected setBlob(change: Partial<{ material: BlobMaterial; size: number; layer: number; fixed: boolean; weight: number; obstacle: boolean }>): void {
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
