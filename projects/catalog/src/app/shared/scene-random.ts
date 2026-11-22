// A scene made by chance (lenzi, 2026-11-15: "put a random gen button"): many blobs of every look, two to five fleets,
// often a current or two, in a few colours that go together (2026-11-22: "aggiungi più entità nelle scene randomiche";
// it was three to seven blobs, one to three fleets, now and then one current). Within the bounds a link keeps
// (SCENE_LIMITS). Pure: the chance is given (Math.random when not said), so a test can repeat one. A plain module
// (no schematic makes one).
import { BLOB_SHAPE_NAMES, BlobMaterial, BoidsFollow, LenziCurrent, LenziScene, LenziSceneBlob, LenziSceneFleet } from '@lenzi/ui-kit/backgrounds';

/** The colours a random scene picks its few from: the theme's own, and some that sit well on its dark base. */
export const RANDOM_COLOURS = ['#d5baff', '#7fd4ff', '#ffb0cd', '#6ed889', '#ffd27a', '#5a00ff', '#ff7a59', '#4dd0c4'] as const;

/** What a random scene is called: one of each. */
const NAMES_FIRST = ['Quiet', 'Deep', 'Bright', 'Slow', 'Violet', 'Glass', 'Night', 'Warm'] as const;
const NAMES_SECOND = ['reef', 'tide', 'garden', 'lanterns', 'drift', 'swarm', 'pond', 'sky'] as const;

/** What a thing looks like: its material, and whether glass shines. */
type Look = { material: BlobMaterial; emitting?: true };

/** A scene by chance. `random` gives numbers from 0 (included) to 1 (not), as Math.random. */
export function randomScene(random: () => number = Math.random): LenziScene {
  const between = (least: number, most: number) => least + (most - least) * random();
  const whole = (least: number, most: number) => Math.min(most, Math.floor(between(least, most + 1)));
  const chance = (share: number) => random() < share;
  const pick = <T>(list: readonly T[]): T => list[Math.min(list.length - 1, Math.floor(random() * list.length))]!;
  const round = (value: number, digits = 3) => Math.round(value * 10 ** digits) / 10 ** digits;

  // a few colours for the whole scene, so its things go together
  const mood: string[] = [];
  for (const wanted = whole(2, 3); mood.length < wanted; ) {
    const colour = pick(RANDOM_COLOURS);
    if (!mood.includes(colour)) mood.push(colour);
  }
  // most things in the theme's own colour; some in one of the scene's; a few shifting among them
  const paint = (): { colour?: string; colours?: string[] } => {
    const roll = random();
    if (roll < 0.45) return {};
    if (roll < 0.85) return { colour: pick(mood) };
    return { colours: [...mood] };
  };
  const look = (): Look => {
    const roll = random();
    if (roll < 0.35) return { material: 'lamp' };
    if (roll < 0.65) return { material: 'glass' };
    if (roll < 0.85) return { material: 'solid' };
    return { material: 'glass', emitting: true };
  };
  // glass now and then says how much it tints and shows through, and how much it blurs (each glass its own, 2026-11-21)
  const glassy = (thing: Look): { tint?: number; transparency?: number; blur?: number } =>
    thing.material !== 'glass'
      ? {}
      : {
          ...(chance(0.35) ? { tint: round(between(0.2, 0.8), 2), transparency: round(between(0.4, 0.9), 2) } : {}),
          ...(chance(0.3) ? { blur: whole(0, 24) } : {}),
        };
  // most things on their material's own level (glass above the rest); some on the other of those two. Never a level more:
  // every level is the whole picture's work once more (2026-11-22, on an integrated GPU a scene of many things on four
  // levels ran at 24 frames a second, on two at 40)
  const level = (): { layer?: number } => (chance(0.3) ? { layer: whole(0, 1) } : {});

  const blobs = Array.from({ length: whole(6, 12) }, (_, index): LenziSceneBlob => {
    const thing = look();
    return {
      ...thing,
      // one large, the rest mostly small (many of them: smaller than when they were few)
      size: round(index === 0 ? between(0.14, 0.22) : 0.04 + 0.11 * random() ** 2),
      x: round(between(0.1, 0.9)),
      y: round(between(0.12, 0.88)),
      ...level(),
      ...(chance(0.4) ? { shape: pick(BLOB_SHAPE_NAMES) } : {}),
      ...paint(),
      ...glassy(thing),
      ...(chance(0.1) ? { fixed: true } : {}),
      ...(chance(0.25) ? { weight: round(between(0.5, 2.5), 2) } : {}),
      // now and then one the blobs of another material bounce off
      ...(chance(0.2) ? { obstacle: true } : {}),
    };
  });
  // something has to shine, or nothing solid is seen: the large one a lamp (with nothing only glass says)
  if (!blobs.some((blob) => blob.material === 'lamp' || blob.emitting)) {
    const { tint: _tint, transparency: _transparency, ...rest } = blobs[0]!;
    blobs[0] = { ...rest, material: 'lamp' };
  }

  // what a fleet does with the pointer, each its own (2026-11-17): mostly flees it or flies near it
  const pointer = (): BoidsFollow => {
    const roll = random();
    return roll < 0.4 ? 'flee' : roll < 0.7 ? 'near' : roll < 0.85 ? 'target' : 'none';
  };
  const fleets = Array.from({ length: whole(2, 5) }, (_, index): LenziSceneFleet => {
    const place = { x: round(between(0.15, 0.85)), y: round(between(0.15, 0.85)), ...level(), follow: pointer() };
    // now and then a leader with ways of its own
    const ways = chance(0.35)
      ? { maxSpeed: whole(10, 24) * 10, separation: round(between(0.8, 2.2), 1), alignment: round(between(0.6, 1.8), 1), cohesion: round(between(0.6, 1.8), 1), wander: round(between(0, 0.6), 2) }
      : {};
    // the first fleet is boids: the many; then boids or blob-boids, fewer
    if (index === 0 || chance(0.45)) {
      return { kind: 'boid', count: index === 0 ? whole(15, 40) * 10 : whole(5, 18) * 10, colonies: whole(2, 5), ...place, ...paint(), ...ways };
    }
    const thing = look();
    return { kind: 'blob-boid', ...thing, count: whole(20, 70), colonies: whole(1, 3), size: whole(8, 16), ...place, ...paint(), ...glassy(thing), ...ways };
  });

  // often a current, now and then two, each from one side across to the other, bending on its way
  const currents: LenziCurrent[] = [];
  for (let count = chance(0.5) ? (chance(0.4) ? 2 : 1) : 0; currents.length < count; ) {
    const points = whole(3, 4);
    const leftToRight = chance(0.5);
    const strength = whole(10, 30) * 10;
    currents.push({
      points: Array.from({ length: points }, (_, index) => {
        const along = 0.1 + (0.8 * index) / (points - 1);
        return { x: round(leftToRight ? along : 1 - along), y: round(between(0.2, 0.8)) };
      }),
      strengths: Array.from({ length: points - 1 }, () => strength),
      width: round(between(0.06, 0.14), 2),
    });
  }

  return {
    name: `${pick(NAMES_FIRST)} ${pick(NAMES_SECOND)}`,
    blobs,
    fleets,
    ...(currents.length ? { currents } : {}),
    throwable: true,
    // now and then its glass liquid
    ...(chance(0.3) ? { glass: 'liquid' as const } : {}),
  };
}
