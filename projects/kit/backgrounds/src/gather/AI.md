# AI notes: Gathering the boids

- `import { LenziGather } from '@lenzi/ui-kit/backgrounds'`; `<div lenziGather>…</div>`. Nothing else to wire:
  `LenziGathers` lists the zones, the flock backgrounds read them at every step.
- Never move the flock from the app (a scroll listener, a target that follows the text): mark the zones.
- Mark the text itself (a heading and its paragraph in one wrapper), not a full-height section.
- Do not put `lenziGather` and `lenziScare` on the same element.
