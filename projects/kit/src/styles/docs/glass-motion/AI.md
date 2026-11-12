# AI notes: Glass and motion

- Get the glass by using Material's overlays and the kit's shell: never add `backdrop-filter` or
  transparency to a component of an app.
- A surface of your own that floats over the page (a page window) uses the same recipe:
  `background: color-mix(in srgb, var(--mat-sys-surface) var(--kit-glass), transparent);
  backdrop-filter: var(--kit-glass-filter); animation: var(--kit-window-in);` and a border
  (`var(--kit-border) solid var(--mat-sys-outline-variant)`).
- Cards, tables and panels of a page stay solid: no glass on them.
- Never animate a window's size; never fade the glass itself.
- A dialog whose content loads after it opens: mark the loading part `kit-not-ready` until its first
  numbers are on screen.
- `provideKit()` sets the dialog timing (250 / 150 ms): do not set other durations on `MatDialog`.
