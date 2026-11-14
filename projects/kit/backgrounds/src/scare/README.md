# Scaring the boids

Any element the boids of a flock background are scared of (lenzi, 2026-11-14: "make it an option in the
kit itself to have an object that scares the boids away").

## What

- **`lenziScare`** on any element (a cat, a button, a card): near it the boids of `<lenzi-flock-background>`
  and `<lenzi-blob-flock-background>` fly away from it, faster the nearer, wherever it is (it may move).
- **`scareRadius`** (px, 120): how far beyond its edge they are scared of it.
- How much the boids fear these elements is the background's `scare` (3; 0: not at all).
- **The pointer** scares them too when the background's `follow` is `flee` (as far as `followRadius`, as
  much as `followWeight`): not an obstacle they fly round, something they run from.

## Rules

- A scare is for something that moves or should be left alone: few of them a page, or the flock has
  nowhere to go.
