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
export * from './background-presence/background-presence';
export * from './glass-page/glass-page';
export * from './sights/sights';
export * from './scare/scare';
export * from './scare/scares';
export * from './gather/gather';
export * from './gather/gathers';
export * from './ambient-light/ambient-light';
export * from './ambient-light/lit';
export * from './glow/glow';
export * from './glow/light-field';
export * from './glow/solid';
export * from './liquid-glass/liquid-glass';
export * from './liquid-glass/liquid-glass-maps';
export * from './liquid-glass/liquid-surface';
export * from './liquid-glass/liquid-everywhere';
export * from './glass-controls/lens';
export * from './glass-controls/glass-switch/glass-switch';
export * from './glass-controls/glass-segmented/glass-segmented';
export * from './glass-controls/glass-slider/glass-slider';
export * from './glass-controls/glass-search/glass-search';
export * from './glass-controls/glass-tab-bar/glass-tab-bar';
export * from './glass-controls/glass-list/glass-list';
export * from './showcase/showcase';
export * from './showcase/showcase-slide';

// The numbers behind them: shapes, colours, the flock (for an app that draws its own).
export * from './engine/color';
export * from './engine/shapes';
export * from './engine/boids';
export * from './engine/blob-field';
export * from './engine/blob-throw';
export * from './engine/currents';
export { BOID_STRETCH, type BoidShape } from './engine/flock-scene';
export { BLOB_MATERIALS, glassBlurOf, type BlobMaterial } from './engine/blob-materials';
export { GLASS_BLUR } from './engine/glow-engine';
export {
  LIQUID_GLASS,
  LIQUID_GLASS_LIMITS,
  LIQUID_GLASS_SURFACES,
  cleanLiquidGlass,
  liquidLookOf,
  liquidProfile,
  type LenziGlassKind,
  type LenziLiquidBlobGlass,
  type LenziLiquidGlassNumber,
} from './engine/liquid-profile';
