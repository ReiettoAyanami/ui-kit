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

/** Every scene of the catalog, as the Scenes page and the playground list them. */
export const SCENES: readonly LenziScene[] = [HOME_SCENE, HOME_PHONE_SCENE];

/** A phone, as the pages' styles say it. */
export const PHONE_QUERY = '(max-width: 599px)';
