# Identity colours

`identityColor(id, offset)`, the pipe `lenziIdentityColor` and `<lenzi-identity-dot>`: a colour computed from an
entity's id, so the same thing is the same colour everywhere: its dot next to its name, its segment in a bar,
its line in a chart.

## Rules

- **Computed from the id, every time; never stored** (lenzi chose this over storing it).
- **Never a status colour**: it never means anything ("red = almost finished" is not allowed).
- **All violet** (lenzi, 2026-10-02: "terrei tutto viola anche per le sostanze e i batch"): a band of hues from
  blue-violet to magenta (oklch 260° to 340°), the hue walking it by the golden ratio, three lightnesses by
  `id % 3`, the most chroma sRGB can show up to 0.22.
- **Two kinds of entity with their own ids** (substances and batches) must not share colours: the second
  starts half the band away (`offset 0.5`).
- **FROZEN**: changing the algorithm repaints every entity of every app. Its tests pin the colours.
- Known limit: past a dozen entities two colours come close; the separator of a bar keeps neighbours apart.

## API

- `identityColor(id: number, offset = 0): string` — an `oklch()` string.
- `{{ id | lenziIdentityColor }}`, `{{ id | lenziIdentityColor: 0.5 }}`.
- `<lenzi-identity-dot [id]="id" [offset]="0.5" />`, or `[color]` for something without an id ("One-time":
  `var(--mat-sys-outline)`).

## Variables

`--lenzi-dot-size`.

## Origin

substance-tracker `ui/identity-color-pipe.ts` (frozen; all violet since 2026-10-02).
