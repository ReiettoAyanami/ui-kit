import { Component, booleanAttribute, computed, input, viewChild } from '@angular/core';

import { lenziPhone } from '@lenzi/ui-kit';

import { LenziBlobBackground } from '../blob-background/blob-background';
import { LenziBlobFlock, LenziBlobFlockBackground, LenziBoidFlock, LenziFleetWays } from '../blob-flock-background/blob-flock-background';
import { BlobState, DEFAULT_BLOBS, LenziBlobSpec } from '../engine/blob-field';
import { BlobMaterial } from '../engine/blob-materials';
import { LenziGlassKind, LenziLiquidBlobGlass, cleanLiquidGlass } from '../engine/liquid-profile';
import { BoidsFollow } from '../engine/boids';
import { BlobShapeName } from '../engine/shapes';
import { LenziCurrent } from '../engine/currents';
import { LenziBackgroundFill } from '../glow-background/glow-background';

/**
 * Where an object of a scene is put, as a share of the space (0 to 1 each way), and its level (z): an object
 * stops only what is on its own level (lenzi, 2026-11-14: "make every object selectable and moveable ... when
 * paused", "make the user decide the z index also by a property"). Not said: a blob's seeded place, a fleet born
 * anywhere; the level of its material (glass above, the rest on 0).
 */
export interface LenziScenePlace {
  x?: number;
  y?: number;
  layer?: number;
}

/**
 * A blob of a scene, as the backgrounds take it (`LenziBlobSpec`): what it is made of, its size (a share of the
 * screen's shorter side) and, when said, its place and level, its shape (lenzi, 2026-11-14: "make user choose
 * shape of blob": kept; not said, changing from one into another), its colour ("every blob ... should have a
 * configurable color") and, glass, its tint ("glass should have a tint parameter"), whether it stays put and its
 * weight (2026-11-15: "an option to make a blob unmovable and a weigh parameter so that it spins more/less").
 */
export type LenziSceneBlob = LenziBlobSpec;

/** What a fleet's leader is, and so every one of its boids: a boid (a drop of light) or a blob-boid. */
export type LenziSceneFleetKind = 'boid' | 'blob-boid';

/**
 * A fleet of a scene: a leader and the n that follow it (lenzi, 2026-11-14: "si decide un capo e ogni capo avrá una
 * flotta di n boidi. questa flotta avrá tutte le proprietá del leader, tranne la grandezza che va configurata a parte
 * e anche il displacement della stessa"). Its ways (speeds, the three rules, wandering, what it does with the
 * pointer) are its leader's, and every one of it takes them; its size and how different the sizes are
 * (`sizeVariety`) are said apart.
 */
export interface LenziSceneFleet extends LenziFleetWays, LenziScenePlace {
  kind: LenziSceneFleetKind;
  /** A blob-boid's material (lamp when not said); boids have none. */
  material?: BlobMaterial;
  count: number;
  /** Flocks of their own inside it, each with its leader (1 when not said). */
  colonies?: number;
  /** How wide one of them is, px (boids 9, blob-boids 11 when not said). */
  size?: number;
  /** Its colour (a `#rrggbb`, each one moved a little from it); none: the accent's. */
  colour?: string;
  /** Two or more colours it shifts among, each one at its own place along the loop ("color: multi"). */
  colours?: string[];
  /** Glass blob-boids: how much their colour colours what is seen through them, and how much shows through, 0 to 1. */
  tint?: number;
  transparency?: number;
  /** Glass blob-boids that shine too (solid ones that shine are of lamps). */
  emitting?: boolean;
  /** Blob-boids: the shapes they take instead of drops, each one of them at random ("a forma di fiore ... anche randomici"). */
  shapes?: BlobShapeName[];
}

/**
 * A scene (lenzi, 2026-11-14: "una Scena ... é tipo la scena che usiamo nel background della home"): a glowing
 * background as data, the blobs and the fleets behind a page, nothing else. Plain JSON, so a scene can be
 * kept, listed, and later shared by a link.
 */
export interface LenziScene {
  /** What it is called. */
  name?: string;
  blobs: readonly LenziSceneBlob[];
  fleets: readonly LenziSceneFleet[];
  /**
   * Currents (lenzi, 2026-11-14: "una corrente (definita da una serie di segmenti, con ognuno le sue forze
   * indipendenti) che instrada i boidi e i blob verso la direzione del segmento"): its points (shares of the space),
   * each segment's push, its reach.
   */
  currents?: readonly LenziCurrent[];
  /**
   * What the boids do with the pointer, for every fleet that does not say its own (`LenziSceneFleet.follow`; lenzi,
   * 2026-11-17: "This should be configurable for every boid"); 'near' when not said.
   */
  follow?: BoidsFollow;
  /** The pointer throws the blobs about. */
  throwable?: boolean;
  /**
   * Where the fleets live (lenzi, 2026-11-19: "La posizione dei boidi non deve ignorare la pagina"): 'page', on the
   * whole page, scrolling with it and flying across it; 'screen' or not said, the window, fixed behind the page.
   */
  space?: 'screen' | 'page';
  /**
   * How its glass blobs look (lenzi, 2026-11-19): 'frosted' or not said, the page's glass; 'liquid', clear glass that
   * bends what is behind it near its edge (`LenziBlobBackground.glass`).
   */
  glass?: LenziGlassKind;
  /**
   * Its liquid glass, when `glass` is 'liquid' (lenzi, 2026-11-20: "una sezione per il liquidglass ... per regolare le
   * varie proprietá dello stesso"): only what it says differently from `LIQUID_GLASS` (the bezel, its profile, the
   * thickness, the refractive index, the refraction, the saturation, the blur).
   */
  liquid?: Partial<LenziLiquidBlobGlass>;
}

/** What the backgrounds are given for a scene. */
export interface LenziSceneLayout {
  /** With fleets the blobs and the flocks (LenziBlobFlockBackground), without only the blobs (LenziBlobBackground). */
  flocking: boolean;
  /** The blobs, one by one. */
  blobs: LenziBlobSpec[];
  /** The boid fleets, each its own flock with its leader's ways. */
  boidFlocks: LenziBoidFlock[];
  /** The blob-boid fleets, each its own flock of its material. */
  blobFlocks: LenziBlobFlock[];
  /** The currents, carrying blobs and boids; null: none. */
  currents: readonly LenziCurrent[] | null;
  /** What a fleet that does not say its own does with the pointer. */
  follow: BoidsFollow;
  throwable: boolean;
  /** Where the fleets live: the window, or the whole page. */
  space: 'screen' | 'page';
  /** How the glass blobs look. */
  glass: LenziGlassKind;
  /** Their liquid glass, what it says (liquid only); null: `LIQUID_GLASS`. */
  liquid: Partial<LenziLiquidBlobGlass> | null;
}

type FleetSettings = LenziFleetWays & LenziScenePlace & { colonies?: number; size?: number; colour?: string; colours?: string[]; tint?: number; transparency?: number; emitting?: boolean; shapes?: BlobShapeName[] };

/** A fleet's ways, sizes, place, level, colour and tint, only the ones it says. */
function fleetSettings(fleet: LenziSceneFleet): FleetSettings {
  const out: FleetSettings = {};
  for (const key of ['colonies', 'size', 'maxSpeed', 'minSpeed', 'separation', 'alignment', 'cohesion', 'wander', 'sizeVariety', 'x', 'y', 'layer', 'tint', 'transparency'] as const) {
    const value = fleet[key];
    if (typeof value === 'number' && Number.isFinite(value)) out[key] = value;
  }
  if (fleet.colour) out.colour = fleet.colour;
  if (fleet.colours?.length) out.colours = [...fleet.colours];
  if (fleet.emitting) out.emitting = true;
  if (fleet.shapes?.length) out.shapes = [...fleet.shapes];
  if (fleet.follow) out.follow = fleet.follow;
  return out;
}

/** A scene as the backgrounds take it: every fleet its own flock, with its leader's ways. */
export function sceneLayout(scene: LenziScene): LenziSceneLayout {
  const boidFleets = scene.fleets.filter((fleet) => fleet.kind === 'boid' && fleet.count > 0);
  const blobFleets = scene.fleets.filter((fleet) => fleet.kind === 'blob-boid' && fleet.count > 0);
  return {
    flocking: boidFleets.length + blobFleets.length > 0,
    blobs: [...scene.blobs],
    boidFlocks: boidFleets.map((fleet) => ({ count: fleet.count, ...fleetSettings(fleet) })),
    blobFlocks: blobFleets.map((fleet) => ({ material: fleet.material ?? 'lamp', count: fleet.count, ...fleetSettings(fleet) })),
    currents: scene.currents?.length ? scene.currents : null,
    follow: scene.follow ?? 'near',
    throwable: scene.throwable === true,
    glass: scene.glass === 'liquid' ? 'liquid' : 'frosted',
    liquid: scene.glass === 'liquid' ? cleanLiquidGlass(scene.liquid) : null,
    space: scene.space === 'page' ? 'page' : 'screen',
  };
}

/**
 * A scene behind the page (or behind a box): the blob background when it has only blobs, the blobs and their
 * flocks when it has fleets. The page's lit surfaces take its light, as they take any glowing background's.
 */
@Component({
  selector: 'lenzi-scene',
  imports: [LenziBlobBackground, LenziBlobFlockBackground],
  templateUrl: './scene.html',
  styleUrl: './scene.css',
})
export class LenziSceneBackground {
  readonly scene = input.required<LenziScene>();
  /**
   * On a phone (`lenziPhone()`, a window under 600 px), this one instead: a lighter scene of its own (fewer blobs, no
   * fleets); none, `scene` everywhere. It changes with the window (lenzi, 2026-11-20: "B: A, più la scena che sceglie
   * da sola": the app writes no code to choose it).
   */
  readonly phoneScene = input<LenziScene | null>(null);
  /** It changes the scene with the window. */
  private readonly phone = lenziPhone();
  /** Behind the whole page (fixed) or behind the box it is in (`.lenzi-backdrop`). */
  readonly fill = input<LenziBackgroundFill>('page');
  /** It moves; off: a still frame. */
  readonly animate = input(true, { transform: booleanAttribute });
  /**
   * Being made (a scene maker, paused): no fleets ("the fleet should only be visible when playing the
   * simulation"), the blobs still on their places (they do not wander: "not subject to phisics"), nothing thrown.
   */
  readonly editing = input(false, { transform: booleanAttribute });

  /** The scene it draws: the phone's on a phone, when it has one. */
  protected readonly drawn = computed(() => (this.phone() ? this.phoneScene() : null) ?? this.scene());
  protected readonly layout = computed(() => sceneLayout(this.drawn()));
  /** No fleets, while it is being made (one list, so the background is not told something new every time). */
  protected readonly noFleets: readonly never[] = [];
  private readonly flocking = viewChild(LenziBlobFlockBackground);
  private readonly blobsOnly = viewChild(LenziBlobBackground);

  /** The blobs as drawn in the last picture (a scene maker outlines them), in the space's px. */
  blobsDrawn(): readonly BlobState[] {
    return this.flocking()?.blobsDrawn() ?? this.blobsOnly()?.blobsDrawn() ?? [];
  }

  /** How far the blobs wander: the backgrounds' own, or not at all while it is being made. */
  protected readonly travel = computed(() => (this.editing() ? 0 : DEFAULT_BLOBS.travel));
}
