/*
 * @lenzi/ui-kit/backgrounds: what is behind a page. A plain background (a colour, a gradient, a
 * photo) and the glowing ones (blobs, a flock), drawn with WebGL2 and no library; and the light the
 * glowing ones shed on the page's lit surfaces.
 */
export * from './background/background';
export * from './glow-background/glow-background';
export * from './blob-background/blob-background';
export * from './flock-background/flock-background';
export * from './blob-flock-background/blob-flock-background';
export * from './scene/scene';
export * from './sights/sights';
export * from './scare/scare';
export * from './scare/scares';
export * from './ambient-light/ambient-light';
export * from './ambient-light/lit';
export * from './glow/glow';
export * from './glow/light-field';
export * from './glow/solid';

// The numbers behind them: shapes, colours, the flock (for an app that draws its own).
export * from './engine/color';
export * from './engine/shapes';
export * from './engine/boids';
export * from './engine/blob-field';
export * from './engine/blob-throw';
export * from './engine/currents';
export { BOID_STRETCH, type BoidShape } from './engine/flock-scene';
export { BLOB_MATERIALS, type BlobMaterial } from './engine/blob-materials';
