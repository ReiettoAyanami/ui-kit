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
  lightReach: 12,
  lightBase: 0.1,
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
 * filter draws a few small pictures instead of one as large as the glass.
 */
export const SLICE_AREA = 40_000;

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
  radius: number,
  optics: Omit<LenziLiquidGlassShape, 'width' | 'height' | 'radius'>,
  document: Document,
): LenziGlassTiles | null {
  const cuts = glassCuts(width, height, radius, optics.bezel);
  if (!cuts) return null;
  const side = cuts.side;
  const key = `${side}|${radius}|${optics.bezel}|${optics.thickness}|${optics.ior}|${optics.surface}`;
  let pictures = PIECES.get(key);
  if (!pictures) {
    const maps = liquidGlassMaps({ width: side, height: side, radius, ...optics });
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
export const LIGHT_BASE = 0.1;

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
  /** The corners' radius the filter was drawn for, px; and the frames since it was last looked at. */
  private radius = 0;
  private framesSinceRadius = 0;
  /** The filter draws the glass's tint, its CSS fill is hidden by an inline transparent one. */
  private tinted = false;

  constructor(
    readonly element: HTMLElement,
    private readonly document: Document,
    private readonly settings: () => LenziLiquidGlassSettings,
  ) {}

  /** The filter for the glass's size now: its maps drawn, its SVG in the page, then the glass pointed at it. */
  build(): void {
    const s = this.settings();
    // its own size, not its box on the screen: a glass that is scaled by an animation keeps the maps of its size
    const box = this.element.getBoundingClientRect();
    const width = Math.round(this.element.offsetWidth || box.width);
    const height = Math.round(this.element.offsetHeight || box.height);
    if (width < 2 || height < 2) return;
    const radius = this.cornerRadius();
    this.radius = radius;
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
    const tint = fill || (frost && style ? style.backgroundColor : '');
    this.tinted = !!tint;
    if (this.tinted) this.element.style.setProperty('background-color', 'transparent');
    const reach = Math.max(0, s.lightReach);
    const key = `${width}x${height}|${radius}|${s.bezel}|${s.thickness}|${s.ior}|${s.surface}|${s.refraction}|${s.blur}|${s.saturation}|${s.specularOpacity}|${s.specularSaturation}|${reach}|${s.lightBase}|${s.glassViewBox}|${path ?? ''}|${frost}|${tint}`;
    if (key === this.size) return;
    this.size = key;
    // A bezel wider than half the glass would bend the whole of it: never more than a third of its smaller side.
    const bezel = Math.min(s.bezel, Math.max(4, Math.min(width, height) / 3));
    const optics = { bezel, thickness: s.thickness, ior: s.ior, surface: s.surface };
    const inside = path ? this.outline(path, width, height) : null;
    const tiles = inside
      ? wholeTiles(liquidGlassOutlineMaps({ width, height, inside, ...optics }), this.document)
      : slicedTiles(width, height, radius, optics, this.document) ?? wholeTiles(liquidGlassMaps({ width, height, radius, ...optics }), this.document);
    const svg = this.svg ?? (this.document.createElementNS(SVG, 'svg') as SVGSVGElement);
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('width', '0');
    svg.setAttribute('height', '0');
    svg.setAttribute('color-interpolation-filters', 'sRGB');
    svg.style.position = 'absolute';
    svg.style.pointerEvents = 'none';
    const scale = (tiles.scale * Math.max(0, s.refraction)).toFixed(2);
    this.fullBend = Number(scale);
    const saturation = Math.max(0, s.saturation);
    const bending = (Number(scale) * this.bend).toFixed(2);
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
  <feDisplacementMap class="lenzi-liquid-glass-bend" in="soft" in2="map" scale="${bending}" xChannelSelector="R" yChannelSelector="G" result="bent"/>
  ${body}
  ${fromFrost ? '' : `<feGaussianBlur in="SourceGraphic" stdDeviation="${reach}" result="around"/>`}
  <feColorMatrix in="${fromFrost ? 'frosted' : 'around'}" type="matrix" values="${lightMatrix(LIGHT_FLOOR, LIGHT_GAIN, Math.max(0, s.lightBase))}" result="light"/>
  <feComposite in="light" in2="specular" operator="in" result="lit-line"/>
  <feColorMatrix in="bent" type="saturate" values="${Math.max(0, s.specularSaturation)}" result="vivid"/>
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
    this.element.style.setProperty('backdrop-filter', `url(#${this.id})`);
  }

  /**
   * How much of its bending the glass shows now, 0 to 1 (kube.io's switch: 0.4 at rest, 0.9 while held): changes the
   * filter's scale only, the maps stay.
   */
  bending(share: number): void {
    this.bend = Math.max(0, share);
    this.svg?.querySelectorAll('.lenzi-liquid-glass-bend').forEach((bend) => bend.setAttribute('scale', (this.fullBend * this.bend).toFixed(2)));
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
    return this.cornerRadius() !== this.radius;
  }

  destroy(): void {
    this.svg?.remove();
    this.svg = null;
    this.element.style.removeProperty('backdrop-filter');
    if (this.tinted) this.element.style.removeProperty('background-color');
    this.tinted = false;
  }

  /** The element's corners' radius now, px (its top left one: the glass's corners are one radius). */
  private cornerRadius(): number {
    return parseFloat(this.document.defaultView?.getComputedStyle(this.element).borderTopLeftRadius ?? '0') || 0;
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
