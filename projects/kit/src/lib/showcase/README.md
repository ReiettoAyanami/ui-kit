# Showcase

`<lenzi-showcase>` and its slides, `<ng-template lenziShowcaseSlide>`: one large slide at a time, live, and the list of
every slide beside it; they take turns by themselves (lenzi, 2026-11-26, the catalog's components, proposal F: "Fai la
f, ma nella vetrina ci circolano i pezzi / vari esempi di come utilizzarli"). The App Store's Today, Apple TV's top
shelf.

## When to use

- At the top of a page, to show a few things worth seeing first: what is new, examples of a piece in use.
- Not for content a person must read or act on: what turns by itself is missed. Not for more than eight slides.

## Rules

- **One slide at a time, large; the list of every slide beside it** (under it as a row of names where the showcase is
  narrow, under 720 px of its own width). Each name bold, what the slide shows under it.
- **They take turns by themselves** (`interval`, 7 s by default): a line under the current name fills for as long as it
  stays. **They hold** while pointed at or focused, out of sight, or with the tab hidden; **"Pause"** stops them (WCAG
  2.2.2: whatever moves by itself can be stopped), "Play" starts them again. **With reduced motion they start stopped.**
- **Only the slide on show is made**: a slide that moves (a scene, a chart) runs only while it is shown.
- A slide rises into place (8 px, 300 ms) as every panel that appears; none of it with reduced motion.
- **The list is tabs**: a tap or Enter shows a slide; the arrows walk the list, Home and End go to its ends.
- **It is a panel of the page** (`.lenzi-surface`): in an app of Liquid Glass it is glass. What a slide holds sits on it
  with no panel of its own: never glass on glass.
- A slide that leads somewhere says so with a button inside it ("Open the page"), never by making the whole slide a link.

## API

| | Name | Type | Default | What |
| --- | --- | --- | --- | --- |
| input | `label` | `string` | required | what it shows, for a screen reader |
| input | `interval` | `number` (ms) | `7000` | how long a slide stays |
| model | `index` | `number` | `0` | the slide on show; `[(index)]` |
| signal | `running()`, `paused` | | | they turn now; stopped by "Pause" |
| method | `go(i)`, `next()` | | | show a slide; the next |
| directive | `ng-template[lenziShowcaseSlide]` | `string` | required | a slide; the value is its name |
| input | `caption` (on the slide) | `string \| null` | `null` | what it shows, under its name |
| variable | `--lenzi-showcase-height` | length | `320px` | the slide's least height |

## Example

```html
<lenzi-showcase label="Pieces of the kit in use">
  <ng-template lenziShowcaseSlide="Glass slider" caption="A player's volume">
    <lenzi-glass-slider label="Volume" track="wave" [(value)]="volume" />
    <a mat-button routerLink="/components/glass-slider">Open the page</a>
  </ng-template>
  <ng-template lenziShowcaseSlide="Glass switch" caption="A list of settings">…</ng-template>
</lenzi-showcase>
```

## Origin

New in the kit (2026-11-26), for the catalog's components page (proposal F, a showcase over shelves).
