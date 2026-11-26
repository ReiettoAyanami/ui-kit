// The catalog's scenes (LenziScene, @lenzi/ui-kit/backgrounds): the backgrounds of its pages, as data. The
// overview and the components page show the home's (lenzi, 2026-11-14: "put the same scene that there's on
// the overview in the background of the components"); a phone gets a lighter one. A plain data module (no
// schematic makes one).
import { LenziScene } from '@lenzi/ui-kit/backgrounds';

/**
 * The home's (lenzi, 2026-11-14): lamp and glass blobs, one large and two small of each; the boids, flying round
 * every blob and scared of the pointer; a fleet of glass blob-boids that take the light and one of lamp
 * blob-boids, each melting into its own material ("una flotta di boidi normali, una flotta di boidi blob vetro
 * ... per ogni flotta un blob grande, un/due blob piccoli dello stesso materiale"). The blobs can be thrown.
 */
export const HOME_SCENE: LenziScene = {
  name: 'Home',
  blobs: [
    { material: 'lamp', size: 0.2 },
    { material: 'glass', size: 0.2 },
    { material: 'lamp', size: 0.085 },
    { material: 'glass', size: 0.085 },
    { material: 'lamp', size: 0.065 },
    { material: 'glass', size: 0.065 },
  ],
  fleets: [
    { kind: 'boid', count: 380, colonies: 4 },
    { kind: 'blob-boid', material: 'glass', count: 42, colonies: 3 },
    { kind: 'blob-boid', material: 'lamp', count: 48, colonies: 3 },
  ],
  follow: 'flee',
  throwable: true,
};

/** The home's on a phone ("on mobile ... put only the blobs and less around (50%)"): half the blobs, no fleets. */
export const HOME_PHONE_SCENE: LenziScene = {
  name: 'Home on a phone',
  blobs: [
    { material: 'lamp', size: 0.2 },
    { material: 'glass', size: 0.2 },
    { material: 'lamp', size: 0.085 },
  ],
  fleets: [],
  throwable: true,
};

/**
 * The overview's background (lenzi, 2026-11-26: "Per le scene comunque, al posto di metterle come sfondo vorrei
 * applicarlo ad una delle schede della overview, magari nello sfondo mettiamo dei blob che stanno dietro alle finestre,
 * della pagina "statici" ma di diversi materiali, per fare questo imposta anche i blob a liquid nella pagina della
 * overview"; then "I blob devono stare dietro, ma almeno hoverare non completamente statici"): blobs that hover where
 * they are behind its tiles, each of its own material and shape: lamps, liquid glass, solids. No
 * fleets, nothing thrown: the home's scene moves inside the overview's Scenes tile instead. Their places are shares of
 * the window: the tiles bend what is under them, the gaps show the rest.
 */
export const OVERVIEW_SCENE: LenziScene = {
  name: 'Overview',
  blobs: [
    { material: 'lamp', size: 0.2, x: 0.2, y: 0.3, shape: 'circle', hover: 0.03 },
    { material: 'glass', size: 0.22, x: 0.64, y: 0.6, shape: 'squircle', hover: 0.03 },
    { material: 'solid', size: 0.13, x: 0.88, y: 0.2, shape: 'flower', hover: 0.03 },
    { material: 'lamp', size: 0.09, x: 0.82, y: 0.86, shape: 'sunny', hover: 0.03 },
    { material: 'glass', size: 0.1, x: 0.42, y: 0.12, shape: 'hexagon', hover: 0.03 },
    { material: 'solid', size: 0.08, x: 0.12, y: 0.82, shape: 'pentagon', hover: 0.03 },
    { material: 'lamp', size: 0.07, x: 0.5, y: 0.9, shape: 'circle', hover: 0.03 },
  ],
  fleets: [],
  throwable: false,
  glass: 'liquid',
};

/** The overview's on a phone: fewer of them, larger, the same three materials. */
export const OVERVIEW_PHONE_SCENE: LenziScene = {
  name: 'Overview on a phone',
  blobs: [
    { material: 'lamp', size: 0.26, x: 0.25, y: 0.2, shape: 'circle', hover: 0.03 },
    { material: 'glass', size: 0.3, x: 0.7, y: 0.55, shape: 'squircle', hover: 0.03 },
    { material: 'solid', size: 0.16, x: 0.2, y: 0.85, shape: 'flower', hover: 0.03 },
  ],
  fleets: [],
  throwable: false,
  glass: 'liquid',
};

/** Every scene of the catalog, as the Scenes page and the playground list them. */
export const SCENES: readonly LenziScene[] = [HOME_SCENE, HOME_PHONE_SCENE, OVERVIEW_SCENE, OVERVIEW_PHONE_SCENE];

/**
 * The catalog's scenes by the name a page's background gives them (`{ code: 'home' }`, kept on the server): a name
 * here is a promise, renaming one leaves the pages that chose it with their own background again.
 */
export const CODE_SCENES: Readonly<Record<string, LenziScene>> = {
  home: HOME_SCENE,
  'home-phone': HOME_PHONE_SCENE,
  overview: OVERVIEW_SCENE,
  'overview-phone': OVERVIEW_PHONE_SCENE,
};
