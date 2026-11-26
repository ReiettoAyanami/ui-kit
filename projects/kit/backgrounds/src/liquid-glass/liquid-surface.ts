// The Liquid Glass of one element, as a plain object: its filter drawn for its size and corners, its edge lit by the
// light under it. `lenziLiquidGlass` makes one for its element; `provideLenziLiquidGlass()` one for every surface of the
// app (2026-11-25). A plain module (no schematic makes one).
import { LenziGlassSurface, LenziLiquidGlassMaps, LenziLiquidGlassShape, liquidGlassMaps, liquidGlassOutlineMaps } from './liquid-glass-maps';

const SVG = 'http://www.w3.org/2000/svg';
/** How many frames apart the glass looks at its corners again (about half a second). */
const RADIUS_FRAMES = 30;
let made = 0;

/** How the glass bends and shines (the directive's inputs). */
export interface LenziLiquidGlassSettings {
  bezel: number;
  thickness: number;
  ior: number;
  refraction: number;
  surface: LenziGlassSurface;
  blur: number;
  saturation: number;
  /**
   * How bright the edge gets where the light under it is full, 0 to 1 (kube.io's "specular opacity"): the light of what
   * is under the glass, on the side it is on (lenzi, 2026-11-26: "la direzione della luce deve cambiare rispetto a quello
   * che sta sotto, no il mouse").
   */
  specularOpacity: number;
  /** How saturated the copy of what is behind is, on the edge (kube.io's "specular saturation"): the edge takes its colour. */
  specularSaturation: number;
  /** How far round each point of the edge the light under it is gathered, px: wider, a light farther in lights the edge. */
  lightReach: number;
  /**
   * How much of the edge's light it has with nothing bright under it, 0 to 1 (LIGHT_BASE, 0.1: the shape just reads). A
   * small control over a dark glass panel takes more, the same all round, so it shows as glass (lenzi, 2026-11-26: "la barra di ricerca nella overview non é glass e non il pomello del toggle ancora non lo é, o comunque si vede poco"); the light
   * under it adds to it as on any glass.
   */
  lightBase: number;
  /**
   * Colour fringes where it bends, 0 to 1 (ybouane's "chromatic aberration", lenzi 2026-11-26): the red of what is behind
   * bent that much more, the blue that much less. 0: none (and no cost).
   */
  chromaticAberration: number;
  /** Brighter or darker than what is behind, -0.5 to 0.5 (ybouane's "brightness"). 0: as it is. */
  brightness: number;
  /** A fine ripple all over it, 0 to 1 (ybouane's "distortion": rough glass). 0: smooth. */
  distortion: number;
  /**
   * Curved all over, a dome, as a real pill (lenzi, 2026-11-26: "le pillole così voglio che siano più rotonde sopra come
   * una pillola vera, senza che si tagli a metà"): its bezel reaches its middle (half its smaller side), no flat middle
   * where what is behind shows cut in two (a slider's thumb: the filled rail on one side, the empty on the other), and a
   * circle's profile (a pill's), not the squircle's flat top. The kit's thumbs and capsules. ybouane's "dome" bevel.
   */
  dome: boolean;
  glassPath: string | null;
  glassViewBox: string;
}

export const LIQUID_GLASS_SETTINGS: LenziLiquidGlassSettings = {
  bezel: 28,
  thickness: 56,
  ior: 1.5,
  refraction: 1,
  surface: 'squircle',
  blur: 0.2,
  saturation: 1,
  specularOpacity: 0.5,
  specularSaturation: 6,
  lightReach: 24,
  lightBase: 0,
  chromaticAberration: 0,
  brightness: 0,
  distortion: 0,
  dome: false,
  glassPath: null,
  glassViewBox: '0 0 100 100',
};

/** A piece of one of a glass's maps: a picture (a data URL) and where it lies in the glass, px (stretched to fit). */
export interface LenziGlassTile {
  href: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * A glass's map as pieces to lay in its filter (red and green its bending, blue the line on its edge), and the largest
 * shift (the bending's scale). One map, not three: every picture the filter lays is drawn again at every frame the page
 * draws, as large as the glass (measured 2026-11-26: three maps of whole pictures under six cards took the page from 200
 * to 51 frames a second, nine pieces of each to 118).
 */
export interface LenziGlassTiles {
  map: LenziGlassTile[];
  scale: number;
}

/**
 * A glass larger than this, px², has its map made in pieces (lenziGlassPage's pane is as tall as its page; and every
 * card of a page is glass, lenzi, 2026-11-26: "Non c'è ancora nulla che sia stato convertito in liquid glass, come i
 * pannelli"): the pieces of one corner's radius are drawn once and shared by every glass with those corners, and the
 * filter draws a few small pictures instead of one as large as the glass. Small glass too (2026-11-26, every panel glass,
 * the previews of the Components page: one picture each took the page from 5 to 10 ms a frame on the RTX, in pieces 7):
 * only a glass too small or narrow for its corners is one picture.
 */
export const SLICE_AREA = 4_000;

/** The pictures of the pieces, by what they are made of (the corners, the bezel, the optics): shared by every glass. */
const PIECES = new Map<string, { map: string[]; scale: number }>();
const MOST_PIECES = 64;

/** Pixels (RGBA, `width` a row) as a data URL. */
function pictureOf(document: Document, data: Uint8ClampedArray, width: number, height: number): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d')?.putImageData(new ImageData(new Uint8ClampedArray(data), width, height), 0, 0);
  return canvas.toDataURL();
}

/** The map, one picture as large as the glass. */
function wholeTiles(maps: LenziLiquidGlassMaps, document: Document): LenziGlassTiles {
  return { map: [{ href: pictureOf(document, maps.displacement, maps.width, maps.height), x: 0, y: 0, width: maps.width, height: maps.height }], scale: maps.scale };
}

/**
 * A glass's corners (lenzi, 2026-11-26: "i border-radius qui sono impostati male. Usa la formula giusta per ogni tipo
 * arrotondazione differente"): their radii across and down, px (an ellipse's when the gaps round what it holds differ),
 * and their shape, CSS corner-shape's: `round` a circle's or an ellipse's arc, `squircle` a superellipse of exponent 4.
 */
export interface LenziGlassCorner {
  rx: number;
  ry: number;
  shape: 'round' | 'squircle';
}

/**
 * How many times the gap a corner d px inside another has its radius shrink, to be concentric with it: the gap is d
 * across the corner too, where it is widest (the diagonal). (1 − 2^−1/2) / (1 − 2^−1/n), n the corner's exponent: 1 for
 * a round corner (R − d), 1.84 for a squircle (its curve is flatter, it reaches nearer its corner).
 */
export const SQUIRCLE_CONCENTRIC = (1 - 2 ** -0.5) / (1 - 2 ** -0.25);

export function concentric(shape: LenziGlassCorner['shape']): number {
  return shape === 'squircle' ? SQUIRCLE_CONCENTRIC : 1;
}

/** The corners of an element of this size, from its computed style (its top left corner: one for all four). */
export function cornerOf(style: CSSStyleDeclaration | undefined, width: number, height: number): LenziGlassCorner {
  const [across = '0', down = across] = (style?.borderTopLeftRadius || '0').trim().split(/\s+/);
  const length = (value: string, of: number) => (value.endsWith('%') ? (parseFloat(value) / 100) * of : parseFloat(value)) || 0;
  const shapeName = `${style?.getPropertyValue('corner-top-left-shape') ?? ''} ${style?.getPropertyValue('corner-shape') ?? ''}`;
  return {
    rx: Math.min(width / 2, Math.max(0, length(across, width))),
    ry: Math.min(height / 2, Math.max(0, length(down, height))),
    shape: /squircle|superellipse\(2\)/.test(shapeName) ? 'squircle' : 'round',
  };
}

export function cornerKey(corner: LenziGlassCorner): string {
  return `${corner.shape} ${corner.rx.toFixed(2)} ${corner.ry.toFixed(2)}`;
}

/** What a box of this size and these corners covers, one alpha a pixel, drawn by a canvas; null without one. */
function boxInside(document: Document, width: number, height: number, corner: LenziGlassCorner): Uint8ClampedArray | null {
  const context = Object.assign(document.createElement('canvas'), { width, height }).getContext('2d');
  if (!context) return null;
  const { rx, ry } = corner;
  // a corner's quarter, centred on (cx, cy), from angle a: an ellipse's, or a superellipse of exponent 4
  // (|x/rx|^4 + |y/ry|^4 = 1)
  const curve = (cx: number, cy: number, a: number) => {
    const steps = 24;
    for (let i = 0; i <= steps; i++) {
      const t = a + ((Math.PI / 2) * i) / steps;
      const c = Math.cos(t);
      const n = Math.sin(t);
      const x = corner.shape === 'squircle' ? Math.sign(c) * Math.sqrt(Math.abs(c)) : c;
      const y = corner.shape === 'squircle' ? Math.sign(n) * Math.sqrt(Math.abs(n)) : n;
      context.lineTo(cx + x * rx, cy + y * ry);
    }
  };
  context.beginPath();
  curve(width - rx, ry, -Math.PI / 2);
  curve(width - rx, height - ry, 0);
  curve(rx, height - ry, Math.PI / 2);
  curve(rx, ry, Math.PI);
  context.closePath();
  context.fill();
  const pixels = context.getImageData(0, 0, width, height).data;
  const inside = new Uint8ClampedArray(width * height);
  for (let i = 0; i < inside.length; i++) inside[i] = pixels[i * 4 + 3]!;
  return inside;
}

/**
 * The maps of a box with these corners: a round corner of one radius from its exact distance (liquidGlassMaps), any
 * other (an ellipse's, a squircle's) from its outline drawn into pixels, as the cat's: the bezel follows the corner the
 * browser draws.
 */
function boxMaps(width: number, height: number, corner: LenziGlassCorner, optics: Omit<LenziLiquidGlassShape, 'width' | 'height' | 'radius'>, document: Document): LenziLiquidGlassMaps {
  if (corner.shape === 'round' && Math.abs(corner.rx - corner.ry) < 0.5) return liquidGlassMaps({ width, height, radius: corner.rx, ...optics });
  const inside = boxInside(document, width, height, corner);
  return inside ? liquidGlassOutlineMaps({ width, height, inside, ...optics }) : liquidGlassMaps({ width, height, radius: Math.min(corner.rx, corner.ry), ...optics });
}

/**
 * The whole map of a box, made once for every glass of that size, corners and optics (2026-11-26: every card's preview
 * of the Components page is a glass now, fifty of one size; each made its own, 275 ms each in headless Chrome).
 */
const WHOLES = new Map<string, LenziGlassTiles>();

function sharedWholeTiles(width: number, height: number, corner: LenziGlassCorner, optics: Omit<LenziLiquidGlassShape, 'width' | 'height' | 'radius'>, document: Document): LenziGlassTiles {
  const key = `${width}x${height}|${cornerKey(corner)}|${optics.bezel}|${optics.thickness}|${optics.ior}|${optics.surface}`;
  let tiles = WHOLES.get(key);
  if (!tiles) {
    tiles = wholeTiles(boxMaps(width, height, corner, optics, document), document);
    if (WHOLES.size >= MOST_PIECES) WHOLES.delete(WHOLES.keys().next().value!);
    WHOLES.set(key, tiles);
  }
  return tiles;
}

/**
 * The map of a large rounded box in nine pieces (lenzi, 2026-11-25: "I pannelli dietro ... devono essere in vetro": a
 * page's pane is thousands of px tall, its map would be millions of px drawn in script): the map of a small box with the
 * same corners and bezel, cut into its four corners, its four sides (one px across, stretched along the glass) and its
 * middle (one px, stretched). Past the corners the glass is the same all along its sides, so the pieces are the same
 * map. Each piece overlaps the next by one px of the same colours (opaque: the upper one is all there is): no seam where
 * they meet. Null when the glass is small (one picture) or too narrow for its corners.
 */
export function slicedTiles(
  width: number,
  height: number,
  corner: LenziGlassCorner,
  optics: Omit<LenziLiquidGlassShape, 'width' | 'height' | 'radius'>,
  document: Document,
): LenziGlassTiles | null {
  const cuts = glassCuts(width, height, Math.max(corner.rx, corner.ry), optics.bezel);
  if (!cuts) return null;
  const side = cuts.side;
  const key = `${side}|${cornerKey(corner)}|${optics.bezel}|${optics.thickness}|${optics.ior}|${optics.surface}`;
  let pictures = PIECES.get(key);
  if (!pictures) {
    const maps = boxMaps(side, side, corner, optics, document);
    const map = cuts.pieces.map(([fx, fy, fw, fh]) => {
      const piece = new Uint8ClampedArray(fw * fh * 4);
      for (let row = 0; row < fh; row++) piece.set(maps.displacement.subarray(((fy + row) * side + fx) * 4, ((fy + row) * side + fx + fw) * 4), row * fw * 4);
      return pictureOf(document, piece, fw, fh);
    });
    pictures = { map, scale: maps.scale };
    if (PIECES.size >= MOST_PIECES) PIECES.delete(PIECES.keys().next().value!);
    PIECES.set(key, pictures);
  }
  return { map: cuts.pieces.map(([, , , , x, y, w, h], k) => ({ href: pictures.map[k]!, x, y, width: w, height: h })), scale: pictures.scale };
}

/**
 * Where the nine pieces of a large glass come from and go: the small box's side (px), and for each piece, the middle
 * first and the corners last, `[from x, from y, width, height]` in the small box's maps and `[x, y, width, height]` in
 * the glass. Null when the glass is not larger than SLICE_AREA, or too narrow for its corners.
 */
export function glassCuts(width: number, height: number, radius: number, bezel: number): { side: number; pieces: [number, number, number, number, number, number, number, number][] } | null {
  const c = Math.ceil(Math.max(radius, bezel)) + 2;
  if (width * height <= SLICE_AREA || width < 2 * c + 4 || height < 2 * c + 4) return null;
  const across = width - 2 * c + 2;
  const along = height - 2 * c + 2;
  return {
    side: 2 * c + 1,
    pieces: [
      [c, c, 1, 1, c - 1, c - 1, across, along],
      [c, 0, 1, c + 1, c - 1, 0, across, c + 1],
      [c, c, 1, c + 1, c - 1, height - c - 1, across, c + 1],
      [0, c, c + 1, 1, 0, c - 1, c + 1, along],
      [c, c, c + 1, 1, width - c - 1, c - 1, c + 1, along],
      [0, 0, c + 1, c + 1, 0, 0, c + 1, c + 1],
      [c, 0, c + 1, c + 1, width - c - 1, 0, c + 1, c + 1],
      [0, c, c + 1, c + 1, 0, height - c - 1, c + 1, c + 1],
      [c, c, c + 1, c + 1, width - c - 1, height - c - 1, c + 1, c + 1],
    ],
  };
}

/** The filter's images for the map, its pieces merged into `result` (one piece: the image itself). */
function imagesOf(tiles: readonly LenziGlassTile[], result: string): string {
  const image = (tile: LenziGlassTile, name: string) =>
    `<feImage href="${tile.href}" x="${tile.x}" y="${tile.y}" width="${tile.width}" height="${tile.height}" preserveAspectRatio="none" result="${name}"/>`;
  if (tiles.length === 1) return image(tiles[0]!, result);
  const images = tiles.map((tile, k) => image(tile, `${result}-${k}`)).join('\n  ');
  return `${images}\n  <feMerge result="${result}">${tiles.map((_, k) => `<feMergeNode in="${result}-${k}"/>`).join('')}</feMerge>`;
}

/**
 * The most a glass of this size may bend, px: a point of its bezel takes what is inside it, never past its middle, or
 * what lies beyond the middle comes back upside down (lenzi, 2026-11-26, a segmented control's capsule over its words:
 * "cosí é buggato", the word mirrored above and below it). Half its smaller side less half its bezel.
 */
export function bendLimit(width: number, height: number, bezel: number): number {
  return Math.max(1, Math.min(width, height) / 2 - bezel / 2);
}

/**
 * Where a glass draws its bending. On a layer behind what it holds (its `::before`, the class `lenzi-liquid-layered`;
 * lenzi, 2026-11-26: "il liquidglass non funziona bene, non funziona con altri layer di liquidglass ... funziona solo con
 * quello che gli sta sotto direttamente ma non con gli altri livelli"): an element with a backdrop-filter is the root of
 * the backdrop of every glass inside it (Chromium, the spec's Backdrop Root), so a glass in a glass saw only what the
 * outer one holds, never the outer glass itself nor what is under it; on a layer, the outer glass is no root and the
 * inner one bends every level under it. On the glass itself (`self`) where a layer cannot be: a glass that scrolls (its
 * layer would scroll away with what it holds), a glass that is a root anyway (a mask, a clip-path, a filter, a blend: the
 * cat's shape), a thumb (it holds no glass, and its own fill lies over its glass). The layer covers the border when the
 * border is clear and nothing is cut at it (a kit surface whose border shows keeps it over the glass: the layer lies
 * inside it); its map is the layer's size, its corners the layer's.
 */
export interface LenziGlassPlace {
  layer: boolean;
  /** How far the layer reaches past the padding box, px (the border it covers). */
  edge: number;
  width: number;
  height: number;
  corner: LenziGlassCorner;
}

/**
 * Where the glass's bending goes (above), from its computed style and its size and corners with its border. A layer
 * inside the border has its corners concentric with the glass's (`concentric`, each axis its own border).
 */
export function glassPlace(style: CSSStyleDeclaration | undefined, width: number, height: number, corner: LenziGlassCorner, layered: boolean): LenziGlassPlace {
  const self = { layer: false, edge: 0, width, height, corner };
  if (!layered || !style) return self;
  const overflow = `${style.overflowX} ${style.overflowY}`;
  if (/auto|scroll/.test(overflow)) return self;
  const mask = style.getPropertyValue('mask-image') || style.getPropertyValue('-webkit-mask-image');
  const blend = style.mixBlendMode || 'normal';
  if ((mask && mask !== 'none') || (style.clipPath && style.clipPath !== 'none') || (style.filter && style.filter !== 'none') || blend !== 'normal') return self;
  const top = parseFloat(style.borderTopWidth) || 0;
  const right = parseFloat(style.borderRightWidth) || 0;
  const bottom = parseFloat(style.borderBottomWidth) || 0;
  const left = parseFloat(style.borderLeftWidth) || 0;
  // its border, when clear and not cut away (it cuts nothing, or cuts at the border's outer edge: overflow-clip-margin)
  const cutAtBorder = /^(visible|clip) (visible|clip)$/.test(overflow) && (/^visible visible$/.test(overflow) || /border-box/.test(style.getPropertyValue('overflow-clip-margin')));
  const covers = cutAtBorder && clearColour(style.borderTopColor);
  if (covers || !(top || right || bottom || left)) return { layer: true, edge: top, width, height, corner };
  const k = concentric(corner.shape);
  return {
    layer: true,
    edge: 0,
    width: Math.max(2, width - left - right),
    height: Math.max(2, height - top - bottom),
    corner: { shape: corner.shape, rx: Math.max(0, corner.rx - k * left), ry: Math.max(0, corner.ry - k * top) },
  };
}

function placeKey(place: LenziGlassPlace): string {
  return place.layer ? `layer ${place.edge} ${place.width}x${place.height} ${cornerKey(place.corner)}` : 'self';
}

/** Whether a computed colour is see-through (no border to keep). */
function clearColour(colour: string): boolean {
  if (!colour || colour === 'transparent') return true;
  const parts = colour.match(/rgba?\(([^)]*)\)/)?.[1]?.split(/[\s,/]+/).filter(Boolean);
  return parts?.length === 4 && parseFloat(parts[3]!) === 0;
}

/** Whether this browser draws an SVG filter as a backdrop-filter (only Chromium does). */
export function refracts(view: Window | null): boolean {
  const brands = (view?.navigator as Navigator & { userAgentData?: { brands?: { brand: string }[] } } | undefined)?.userAgentData?.brands;
  return !!brands?.some((brand) => /Chromium/i.test(brand.brand));
}

/**
 * The light under the glass (lenzi, 2026-11-26: "i bordi ancora non sono dinamici alle luci, sono tutti scattanti e la
 * direzione della luce deve cambiare rispetto a quello che sta sotto, no il mouse o roba che ti inventi"): what is behind,
 * gathered round each point (`lightReach`), is as much light as it is bright past LIGHT_FLOOR (the page's dark colour),
 * whole a little past half; over the page's dark colour only LIGHT_BASE, so the glass's shape still reads where nothing
 * is under it (a card over a dark phone's page vanished, 2026-11-26). Its colour is what is behind, paler. The filter
 * lights the edge with it at every frame the page draws: a bright thing under the glass lights the edge on its side, and
 * the light follows it smoothly.
 */
export const LIGHT_FLOOR = 0.12;
export const LIGHT_GAIN = 2.4;
export const LIGHT_BASE = 0;

/**
 * How the edge's light rises and dies along it: smoothly at both ends (a smoothstep), so a highlight ends soft, almost
 * faded (lenzi, 2026-11-26: "voglio che vengano disegnati che terminano così ... che terminano bene soffici quasi
 * sfumati, ma come venivano calcolate le posizioni degli highlight andava bene").
 */
export const LIGHT_EASE = '0 0.028 0.104 0.216 0.352 0.5 0.648 0.784 0.896 0.972 1';

/** The light's colour matrix: its colour what is behind halfway to white, its alpha how bright that is (luminance). */
export function lightMatrix(floor = LIGHT_FLOOR, gain = LIGHT_GAIN, base = LIGHT_BASE): string {
  const g = (n: number) => +(n * gain).toFixed(4);
  return `0.5 0 0 0 0.5 0 0.5 0 0 0.5 0 0 0.5 0 0.5 ${g(0.2126)} ${g(0.7152)} ${g(0.0722)} 0 ${+(base - floor * gain).toFixed(4)}`;
}

/**
 * One element's Liquid Glass. `build()` draws its filter for its size now (nothing when nothing it is made of
 * changed); `check()`, called at every frame, looks at its corners now and then; `destroy()` takes it away. It never
 * runs a frame or watches a size by itself: who made it does. Its edge needs nothing from script to live: the filter
 * lights it with what is under it, at every frame.
 */
export class LenziLiquidSurface {
  private readonly id = `lenzi-liquid-glass-${++made}`;
  private svg: SVGSVGElement | null = null;
  private size = '';
  /** The share of its bending it shows (`bending()`), and the whole of it, px. */
  private bend = 1;
  private fullBend = 0;
  /** The most it may bend, px (`bendLimit`): never past its middle. */
  private limit = Infinity;
  /** The corners the filter was drawn for (`cornerKey`); and the frames since they were last looked at. */
  private corners = '';
  /** The tint (`--lenzi-liquid-fill`) the filter was drawn with. */
  private fill = '';
  private framesSinceRadius = 0;
  /** The filter draws the glass's tint, its CSS fill is hidden by an inline transparent one. */
  private tinted = false;
  /** Where its bending is drawn (`glassPlace`), as the filter was drawn for it. */
  private place = '';

  /**
   * `layered`: the glass may hold others, so its bending goes on a layer behind what it holds (`glassPlace`); a thumb
   * says no (it holds none, and its fill lies over its glass).
   */
  constructor(
    readonly element: HTMLElement,
    private readonly document: Document,
    private readonly settings: () => LenziLiquidGlassSettings,
    private readonly layered = true,
  ) {}

  /** The filter for the glass's size now: its maps drawn, its SVG in the page, then the glass pointed at it. */
  build(): void {
    const s = this.settings();
    // its own size, not its box on the screen: a glass that is scaled by an animation keeps the maps of its size
    const box = this.element.getBoundingClientRect();
    const outerWidth = Math.round(this.element.offsetWidth || box.width);
    const outerHeight = Math.round(this.element.offsetHeight || box.height);
    if (outerWidth < 2 || outerHeight < 2) return;
    const computed = this.document.defaultView?.getComputedStyle(this.element);
    const outer = cornerOf(computed, outerWidth, outerHeight);
    this.corners = cornerKey(outer);
    // on a layer behind what it holds, or on itself (glassPlace): the maps are the size of what bends, its corners
    const place = glassPlace(computed, outerWidth, outerHeight, outer, this.layered);
    const { width, height, corner } = place;
    this.place = placeKey(place);
    const path = s.glassPath;
    // A glass of the app's (`--lenzi-liquid-fill`, the kit's styles give it) has its tint drawn by the filter, under its
    // edge, so the edge's light is never behind the tint (the CSS fill would lie over the filter's output): the fill is
    // read from the variable (a fill read while it moves, in a transition, would stay) and hidden by an inline
    // transparent one. The body is clear (lenzi, 2026-11-26: "i pannelli di vetro devono tutti essere convertiti in
    // liquid glass, adesso sono solo glass blurrati"); `--lenzi-liquid-frost` (px) frosts it, for a glass that asks.
    const style = this.document.defaultView?.getComputedStyle(this.element);
    const frost = Math.max(0, parseFloat(style?.getPropertyValue('--lenzi-liquid-frost') ?? '') || 0);
    if (this.tinted) this.element.style.removeProperty('background-color');
    const fill = style?.getPropertyValue('--lenzi-liquid-fill').trim() ?? '';
    this.fill = fill;
    const tint = fill || (frost && style ? style.backgroundColor : '');
    this.tinted = !!tint;
    if (this.tinted) this.element.style.setProperty('background-color', 'transparent');
    const reach = Math.max(0, s.lightReach);
    const key = `${this.place}|${width}x${height}|${cornerKey(corner)}|${s.bezel}|${s.thickness}|${s.ior}|${s.surface}|${s.refraction}|${s.blur}|${s.saturation}|${s.specularOpacity}|${s.specularSaturation}|${reach}|${s.lightBase}|${s.chromaticAberration}|${s.brightness}|${s.distortion}|${s.dome}|${s.glassViewBox}|${path ?? ''}|${frost}|${tint}`;
    if (key === this.size) return;
    this.size = key;
    // A bezel wider than half the glass would bend the whole of it: never more than a third of its smaller side.
    // (a dome: curved to its middle, all of it bending)
    const bezel = s.dome ? Math.max(4, Math.min(width, height) / 2) : Math.min(s.bezel, Math.max(4, Math.min(width, height) / 3));
    // a dome is a circle's profile (a pill's), not the squircle's flat top: it bends evenly to its middle
    const optics = { bezel, thickness: s.thickness, ior: s.ior, surface: s.dome ? ('circle' as const) : s.surface };
    const inside = path ? this.outline(path, width, height) : null;
    const tiles = inside
      ? wholeTiles(liquidGlassOutlineMaps({ width, height, inside, ...optics }), this.document)
      : slicedTiles(width, height, corner, optics, this.document) ?? sharedWholeTiles(width, height, corner, optics, this.document);
    const svg = this.svg ?? (this.document.createElementNS(SVG, 'svg') as SVGSVGElement);
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('width', '0');
    svg.setAttribute('height', '0');
    svg.setAttribute('color-interpolation-filters', 'sRGB');
    svg.style.position = 'absolute';
    svg.style.pointerEvents = 'none';
    const scale = (tiles.scale * Math.max(0, s.refraction)).toFixed(2);
    this.fullBend = Number(scale);
    this.limit = bendLimit(width, height, bezel);
    const saturation = Math.max(0, s.saturation);
    const bending = this.shownBend();
    const shine = Math.max(0, s.specularOpacity);
    // The body: what is behind bent (frosted: from a blurred copy), and the tint over it.
    const frosted = frost
      ? `<feGaussianBlur in="SourceGraphic" stdDeviation="${frost}" result="frosted"/>
  <feDisplacementMap class="lenzi-liquid-glass-bend" in="frosted" in2="map" scale="${bending}" xChannelSelector="R" yChannelSelector="G" result="bent-frosted"/>`
      : '';
    const body = `${frosted}
  <feColorMatrix in="${frost ? 'bent-frosted' : 'bent'}" type="saturate" values="${saturation}" result="${tint ? 'clear' : 'refracted'}"/>${
    tint
      ? `
  <feFlood style="flood-color: ${tint}" result="tint"/>
  <feBlend in="tint" in2="clear" mode="normal" result="refracted"/>`
      : ''
  }`;
    // Rough glass (ybouane's distortion): what is behind shifted a little by a fine noise, before it bends.
    const distortion = Math.max(0, s.distortion);
    const rough = distortion
      ? `<feTurbulence type="fractalNoise" baseFrequency="0.09" numOctaves="1" seed="3" result="noise"/>
  <feDisplacementMap in="soft" in2="noise" scale="${(distortion * 8).toFixed(2)}" xChannelSelector="R" yChannelSelector="G" result="soft"/>`
      : '';
    // Colour fringes (ybouane's chromatic aberration): red bent more, blue less, green as it is, put back together. Only
    // where it bends: the bezel. Each bend keeps its share of the bending (data-k), so a thumb's bending moves them all.
    const aberration = Math.min(1, Math.max(0, s.chromaticAberration));
    const channel = (r: number, g: number, b: number) => `${r} 0 0 0 0 0 ${g} 0 0 0 0 0 ${b} 0 0 0 0 0 1 0`;
    const fringes = aberration
      ? `<feDisplacementMap class="lenzi-liquid-glass-bend" data-k="${(1 + aberration).toFixed(3)}" in="soft" in2="map" scale="${(Number(bending) * (1 + aberration)).toFixed(2)}" xChannelSelector="R" yChannelSelector="G" result="bent-red"/>
  <feDisplacementMap class="lenzi-liquid-glass-bend" data-k="${(1 - aberration).toFixed(3)}" in="soft" in2="map" scale="${(Number(bending) * (1 - aberration)).toFixed(2)}" xChannelSelector="R" yChannelSelector="G" result="bent-blue"/>
  <feColorMatrix in="bent-red" type="matrix" values="${channel(1, 0, 0)}" result="red"/>
  <feColorMatrix in="bent" type="matrix" values="${channel(0, 1, 0)}" result="green"/>
  <feColorMatrix in="bent-blue" type="matrix" values="${channel(0, 0, 1)}" result="blue"/>
  <feComposite in="red" in2="green" operator="arithmetic" k2="1" k3="1" result="red-green"/>
  <feComposite in="red-green" in2="blue" operator="arithmetic" k2="1" k3="1" result="bent"/>`
      : '';
    // Brighter or darker (ybouane's brightness): the body, before its edge's light.
    const brightness = Math.min(0.5, Math.max(-0.5, s.brightness));
    const slope = (1 + brightness).toFixed(3);
    const bright = brightness
      ? `<feComponentTransfer in="refracted" result="refracted"><feFuncR type="linear" slope="${slope}"/><feFuncG type="linear" slope="${slope}"/><feFuncB type="linear" slope="${slope}"/></feComponentTransfer>`
      : '';
    // the light, gathered round each point: from the frosted copy when it is frosted as far (one blur less)
    const fromFrost = frost > 0 && frost >= reach;
    // kube.io's chain (lenzi, 2026-11-25: "guarda come i bordi prendono il colore di quello che sta sotto"): what is behind,
    // softened and bent; on the edge a much more saturated copy of it, so the edge takes the colour of what is under it.
    // And only where there is light under it (lenzi, 2026-11-26: "i bordi ancora non sono dinamici alle luci ... la
    // direzione della luce deve cambiare rispetto a quello che sta sotto", LIGHT_FLOOR): the edge's line is as strong as
    // what is under each point of it is bright, dark over the dark page, and over it a highlight in the light's own
    // colour. No side of its own, nothing from script: at every frame the page draws, the edge lights where the light
    // under it is. The line is the map's blue (its colour the glint, its alpha the glint squared: kube.io's). Frosted
    // glass gathers its light from its frosted copy, as far as it is frosted (one blur less for the GPU).
    svg.innerHTML = `<filter id="${this.id}" x="0" y="0" width="${width}" height="${height}" filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse">
  <feGaussianBlur in="SourceGraphic" stdDeviation="${Math.max(0, s.blur)}" result="soft"/>
  ${imagesOf(tiles.map, 'map')}
  <feColorMatrix in="map" type="matrix" values="0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0" result="glint"/>
  <feComponentTransfer in="glint" result="specular"><feFuncA type="gamma" exponent="2"/></feComponentTransfer>
  ${rough}
  <feDisplacementMap class="lenzi-liquid-glass-bend" in="soft" in2="map" scale="${bending}" xChannelSelector="R" yChannelSelector="G" result="bent"/>
  ${fringes}
  ${body}
  ${bright}
  ${fromFrost ? '' : `<feGaussianBlur in="SourceGraphic" stdDeviation="${reach}" result="around"/>`}
  <feColorMatrix in="${fromFrost ? 'frosted' : 'around'}" type="matrix" values="${lightMatrix(LIGHT_FLOOR, LIGHT_GAIN, Math.max(0, s.lightBase))}" result="light"/>
  <feComponentTransfer in="light" result="light"><feFuncA type="table" tableValues="${LIGHT_EASE}"/></feComponentTransfer>
  <feComposite in="light" in2="specular" operator="in" result="lit-line"/>
  <feColorMatrix in="${fromFrost ? 'frosted' : 'around'}" type="saturate" values="${Math.max(0, s.specularSaturation)}" result="vivid"/>
  <feComposite in="vivid" in2="lit-line" operator="in" result="edge"/>
  <feBlend in="edge" in2="refracted" mode="normal" result="coloured"/>
  <feComponentTransfer in="lit-line" result="highlight"><feFuncA type="linear" slope="${(shine * 2).toFixed(2)}"/></feComponentTransfer>
  <feBlend in="highlight" in2="coloured" mode="screen"/>
</filter>`;
    // the filter in the page before the glass points at it (pointed at first, Chromium shows nothing)
    if (!this.svg) {
      this.document.body.append(svg);
      this.svg = svg;
    }
    this.point(place);
  }

  /** The glass pointed at its filter: its layer (the kit's styles draw it from these variables), or itself. */
  private point(place: LenziGlassPlace): void {
    const style = this.element.style;
    if (place.layer) {
      style.removeProperty('backdrop-filter');
      style.setProperty('--lenzi-liquid-filter', `url(#${this.id})`);
      style.setProperty('--lenzi-liquid-inset', `${-place.edge}px`);
      style.setProperty('--lenzi-liquid-radius', `${place.corner.rx}px / ${place.corner.ry}px`);
      this.element.classList.add('lenzi-liquid-layered');
    } else {
      this.unlayer();
      style.setProperty('backdrop-filter', `url(#${this.id})`);
    }
  }

  private unlayer(): void {
    this.element.classList.remove('lenzi-liquid-layered');
    for (const name of ['--lenzi-liquid-filter', '--lenzi-liquid-inset', '--lenzi-liquid-radius']) this.element.style.removeProperty(name);
  }

  /**
   * How much of its bending the glass shows now, 0 to 1 (kube.io's switch: 0.4 at rest, 0.9 while held): changes the
   * filter's scale only, the maps stay.
   */
  bending(share: number): void {
    this.bend = Math.max(0, share);
    const shown = Number(this.shownBend());
    this.svg
      ?.querySelectorAll('.lenzi-liquid-glass-bend')
      .forEach((bend) => bend.setAttribute('scale', (shown * Number(bend.getAttribute('data-k') ?? 1)).toFixed(2)));
  }

  /** The filter's scale now: its share of the whole bending, never past `limit`. */
  private shownBend(): string {
    return Math.min(this.fullBend * this.bend, this.limit).toFixed(2);
  }

  /** Draws the filter again at the next build, even for the same size (a setting changed). */
  invalidate(): void {
    this.size = '';
  }

  /**
   * Called at every frame: about twice a second it looks at its corners, changed by the app's CSS (a class, a variable;
   * lenzi, 2026-11-21: "tanti input non si aggiornano automaticamente"). Says whether they changed (the filter must be
   * drawn again for them).
   */
  check(): boolean {
    if (!this.svg || ++this.framesSinceRadius < RADIUS_FRAMES) return false;
    this.framesSinceRadius = 0;
    // its corners, or its tint (a variable the app changed: the filter draws it), or where it may lie (it began to
    // scroll, its border shows now)
    const style = this.document.defaultView?.getComputedStyle(this.element);
    const width = Math.round(this.element.offsetWidth);
    const height = Math.round(this.element.offsetHeight);
    if (width < 2 || height < 2) return false;
    const corner = cornerOf(style, width, height);
    if (cornerKey(corner) !== this.corners || (style?.getPropertyValue('--lenzi-liquid-fill').trim() ?? '') !== this.fill) return true;
    return placeKey(glassPlace(style, width, height, corner, this.layered)) !== this.place;
  }

  destroy(): void {
    this.svg?.remove();
    this.svg = null;
    this.unlayer();
    this.element.style.removeProperty('backdrop-filter');
    if (this.tinted) this.element.style.removeProperty('background-color');
    this.tinted = false;
  }

  /** What the path covers at this size, one alpha a pixel (0 out, 255 in); null when it cannot be drawn. */
  private outline(path: string, width: number, height: number): Uint8ClampedArray | null {
    const [minX = 0, minY = 0, boxWidth = 100, boxHeight = 100] = this.settings().glassViewBox.trim().split(/[\s,]+/).map(Number);
    const context = Object.assign(this.document.createElement('canvas'), { width, height }).getContext('2d');
    if (!context || typeof Path2D !== 'function' || !(boxWidth > 0) || !(boxHeight > 0)) return null;
    const sx = width / boxWidth;
    const sy = height / boxHeight;
    context.setTransform(sx, 0, 0, sy, -minX * sx, -minY * sy);
    context.fill(new Path2D(path), 'evenodd');
    const pixels = context.getImageData(0, 0, width, height).data;
    const inside = new Uint8ClampedArray(width * height);
    for (let i = 0; i < inside.length; i++) inside[i] = pixels[i * 4 + 3]!;
    return inside;
  }
}
