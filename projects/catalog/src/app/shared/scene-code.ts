// A scene in a link and back (lenzi, 2026-11-14: "Voglio che peró una scena sia ricreabile tramite un link
// (corto) condivisibile e iframe"): the scene's JSON, deflated, in base64url; read back, everything in it is
// checked and kept within bounds (a link comes from anyone). A plain module (no schematic makes one).
import { BLOB_SHAPE_NAMES, BlobMaterial, BlobShapeName, BoidsFollow, LenziScene, LenziSceneBlob, LenziSceneFleet } from '@lenzi/ui-kit/backgrounds';

/** How much a scene may hold: what a phone and a page can carry. */
export const SCENE_LIMITS = { blobs: 16, fleets: 8, perFleet: 1000, name: 60 } as const;

const MATERIALS: readonly BlobMaterial[] = ['lamp', 'glass', 'solid'];
const FOLLOWS: readonly BoidsFollow[] = ['flee', 'near', 'target', 'none'];

/** Each number a fleet may say, and its bounds. */
const FLEET_NUMBERS = {
  colonies: [1, 12],
  size: [2, 40],
  sizeVariety: [0, 1],
  maxSpeed: [10, 600],
  minSpeed: [0, 300],
  separation: [0, 5],
  alignment: [0, 5],
  cohesion: [0, 5],
  wander: [0, 2],
} as const;

const clamp = (value: number, [least, most]: readonly [number, number]) => Math.min(most, Math.max(least, value));
const isNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const record = (value: unknown): Record<string, unknown> | null => (value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null);

/** The levels an object may be on. */
export const SCENE_LAYERS = [0, 3] as const;

/** An object's place (both or neither, inside the space) and level, as far as the link says them. */
function placeOf(raw: Record<string, unknown>): { x?: number; y?: number; layer?: number } {
  const place: { x?: number; y?: number; layer?: number } = {};
  if (isNumber(raw['x']) && isNumber(raw['y'])) {
    place.x = clamp(raw['x'], [0, 1]);
    place.y = clamp(raw['y'], [0, 1]);
  }
  if (isNumber(raw['layer'])) place.layer = Math.round(clamp(raw['layer'], SCENE_LAYERS));
  return place;
}

/** A scene from anything (a link's JSON): what is a scene in it, within bounds; null when there is none. */
export function cleanScene(raw: unknown): LenziScene | null {
  const scene = record(raw);
  if (!scene || !Array.isArray(scene['blobs']) || !Array.isArray(scene['fleets'])) return null;
  const blobs: LenziSceneBlob[] = scene['blobs']
    .map(record)
    .filter((blob): blob is Record<string, unknown> => blob !== null && MATERIALS.includes(blob['material'] as BlobMaterial) && isNumber(blob['size']))
    .slice(0, SCENE_LIMITS.blobs)
    .map((blob) => ({
      material: blob['material'] as BlobMaterial,
      size: clamp(blob['size'] as number, [0.02, 0.5]),
      ...placeOf(blob),
      ...(BLOB_SHAPE_NAMES.includes(blob['shape'] as BlobShapeName) ? { shape: blob['shape'] as BlobShapeName } : {}),
    }));
  const fleets: LenziSceneFleet[] = scene['fleets']
    .map(record)
    .filter((fleet): fleet is Record<string, unknown> => fleet !== null && (fleet['kind'] === 'boid' || fleet['kind'] === 'blob-boid') && isNumber(fleet['count']))
    .slice(0, SCENE_LIMITS.fleets)
    .map((fleet) => {
      const clean: LenziSceneFleet = { kind: fleet['kind'] as LenziSceneFleet['kind'], count: Math.round(clamp(fleet['count'] as number, [0, SCENE_LIMITS.perFleet])) };
      if (clean.kind === 'blob-boid' && MATERIALS.includes(fleet['material'] as BlobMaterial)) clean.material = fleet['material'] as BlobMaterial;
      for (const [key, bounds] of Object.entries(FLEET_NUMBERS) as [keyof typeof FLEET_NUMBERS, readonly [number, number]][]) {
        const value = fleet[key];
        if (isNumber(value)) clean[key] = key === 'colonies' ? Math.round(clamp(value, bounds)) : clamp(value, bounds);
      }
      return { ...clean, ...placeOf(fleet) };
    });
  const out: LenziScene = { blobs, fleets };
  if (typeof scene['name'] === 'string' && scene['name'].trim()) out.name = scene['name'].trim().slice(0, SCENE_LIMITS.name);
  if (FOLLOWS.includes(scene['follow'] as BoidsFollow)) out.follow = scene['follow'] as BoidsFollow;
  if (scene['throwable'] === true) out.throwable = true;
  return out;
}

const toBase64Url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromBase64Url = (text: string) => Uint8Array.from(atob(text.replace(/-/g, '+').replace(/_/g, '/')), (char) => char.charCodeAt(0));

/** Bytes through a (de)compression stream. */
async function through(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const source = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  });
  const reader = source.pipeThrough(stream as unknown as ReadableWritablePair<Uint8Array, Uint8Array>).getReader();
  const parts: Uint8Array[] = [];
  for (let read = await reader.read(); !read.done; read = await reader.read()) parts.push(read.value);
  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let at = 0;
  for (const part of parts) {
    out.set(part, at);
    at += part.length;
  }
  return out;
}

/**
 * A scene as the code of a link: "z" and its JSON deflated (where the browser deflates), or "j" and its JSON;
 * both in base64url, so it goes in a URL as it is.
 */
export async function sceneToCode(scene: LenziScene): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(cleanScene(scene) ?? { blobs: [], fleets: [] }));
  if (typeof CompressionStream === 'undefined') return `j${toBase64Url(json)}`;
  return `z${toBase64Url(await through(json, new CompressionStream('deflate-raw')))}`;
}

/** A link's code as a scene; null when it holds none. */
export async function sceneFromCode(code: string | null | undefined): Promise<LenziScene | null> {
  if (!code || code.length > 20000 || !/^[zj][A-Za-z0-9_-]*$/.test(code)) return null;
  try {
    const bytes = fromBase64Url(code.slice(1));
    const json = code[0] === 'z' ? await through(bytes, new DecompressionStream('deflate-raw')) : bytes;
    return cleanScene(JSON.parse(new TextDecoder().decode(json)));
  } catch {
    return null;
  }
}
