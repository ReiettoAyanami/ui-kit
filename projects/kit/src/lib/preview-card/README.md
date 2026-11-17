# Preview card

`<lenzi-preview-card>`: a card whose top is a preview of what it opens, from YouTube's video card (lenzi,
2026-11-14: a gallery "con una scheda che poi va aggiunta ... usa questa di youtube come base, paddin ai lati
leggermente meno, al posto della thumbnail metti iframe della scena, ma fai partire solo la simulazione di quella
on hover"). The preview in a rounded box; under it the title, bold, and its facts; the card's ⋮ beside the title.

## Rules

- **The preview on top, 16:9**, rounded, with the outline of every surface; what is put in the card fills it (a
  picture, a frame).
- **Nothing round the card until it is pointed at**: then a tinted surface behind it all (the keyboard on it:
  the same, and the focus outline). Less padding at its sides than above and under.
- **The title bold, two lines at most; its facts under it, one a line** (never two joined by "·").
- **The whole card opens on a tap** (`opened`); **its actions are in a ⋮** (`LenziCardMenu`) beside the title,
  and their taps never open the card.
- **A preview that moves starts only when the card is pointed at** (`activeChange`, or `active()`), and stops
  when the pointer leaves: a gallery of them is still.
- An icon in a round well before the title only when the cards of a list are of different kinds (YouTube's
  channel picture).
- **Over a background it is lit** (lenzi, 2026-11-17: "cards or any elements over the background should turn into
  lit elements"): `lenziLit` on it, and on its ⋮: a lit surface with the border every surface has, all the time.

## API

| | Name | Type | Default | |
| --- | --- | --- | --- | --- |
| input | `title` | `string` | required | |
| input | `lines` | `string[]` | `[]` | its facts, one a line |
| input | `icon` | `string \| null` | `null` | a Material icon in a round well |
| input | `ratio` | `string` | `'16 / 9'` | the preview's shape (CSS `aspect-ratio`) |
| output | `opened` | `void` | | tapped, or Enter on it |
| output | `activeChange` | `boolean` | | the pointer or the keyboard came on it, or left |
| signal | `active()` | `boolean` | | the same, to read (`#card`) |
| content | (anything) | | | the preview |
| content | `<lenzi-card-menu>` | | | its ⋮ |

## Example

```html
<lenzi-preview-card #card title="Dusk" [lines]="['6 blobs, 3 fleets', 'Saved on 15 November 2026']" (opened)="open(scene)">
  <iframe title="Dusk" loading="lazy" tabindex="-1" [src]="preview(scene, card.active())"></iframe>
  <lenzi-card-menu label="Actions for Dusk" [actions]="actions" (action)="act(scene, $event)" />
</lenzi-preview-card>
```

## Origin

The catalog's gallery of scenes (2026-11-15), from the YouTube card in lenzi's picture.
