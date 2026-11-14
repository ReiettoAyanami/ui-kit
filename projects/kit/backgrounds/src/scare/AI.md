# AI notes: Scaring the boids

- `import { LenziScare } from '@lenzi/ui-kit/backgrounds'`; `<div lenziScare [scareRadius]="160">`. Nothing
  else to wire: `LenziScares` lists the elements, the flock backgrounds read them at every step.
- To make the pointer scary use the background's `follow="flee"`, not a `lenziScare` that follows the
  pointer.
- The fear is a circle round the element's box; do not try to make it follow a drawing's outline.
