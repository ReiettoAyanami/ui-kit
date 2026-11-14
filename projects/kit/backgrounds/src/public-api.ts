/*
 * @lenzi/ui-kit/backgrounds: what is behind a page. A plain background (a colour, a gradient, a
 * photo) and the glowing ones (blobs, a flock), drawn with WebGL2 and no library; and the light the
 * glowing ones shed on the page's lit surfaces.
 */
export * from './background/background';
export * from './glow-background/glow-background';
export * from './blob-background/blob-background';
export * from './flock-background/flock-background';
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
