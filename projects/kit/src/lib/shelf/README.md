# Shelf

`<lenzi-shelf>`: things of one kind in one row that scrolls sideways, under a title and how many they are (lenzi,
2026-11-26, the catalog's components: proposal E, "Mi piace la E", then F, a showcase over shelves). The App Store's
and Netflix's shelves.

## When to use

- A page of many things in groups (components by category, scenes by kind, apps by genre): a shelf a group, each
  showing a few and scrolling to the rest.
- Not for a short list (fewer than four things: a grid), not for data to compare (a table).

## Rules

- **A title and how many** (`count`), the title as the page's sections are (title large).
- **One row that scrolls sideways inside the shelf, never the page.** Each thing is as wide as `--lenzi-shelf-item`
  (280 px; on a phone at most 78 % of the width, so the next one peeks in).
- **A fade at an edge past which there is more**; none where there is nothing more. **None when it holds Liquid Glass**
  (2026-11-26): the fade is a mask, and a mask makes the row the root of the backdrop of the glass in it, which then
  bends nothing under it; the row is cut at its edges instead, as the App Store's (the kit's styles).
- **Arrows** scroll a row's width at a time (less a little, so the last one seen stays in sight), the one with nothing
  past it disabled; **no arrows on a phone**: the thumb scrolls. Smooth, still with reduced motion.
- **"Show all"** lays every thing out in a grid of the same widths, **"Show fewer"** puts them back in the row. Only
  when some of them are out of sight.
- Its things are cards of the kit (`LenziPreviewCard`, a link card): the shelf gives them their width, no panel of its
  own.

## API

| | Name | Type | Default | What |
| --- | --- | --- | --- | --- |
| input | `title` | `string` | required | a category, a kind of thing |
| input | `count` | `number \| null` | `null` | how many, beside the title |
| model | `expanded` | `boolean` | `false` | all in a grid; `[(expanded)]` |
| method | `scroll(-1 \| 1)` | | | a row back or on |
| content | (anything) | | | its things, one a child |
| variable | `--lenzi-shelf-item` | length | `280px` | a thing's width |
| variable | `--lenzi-shelf-gap` | length | `12px` | the gap between them |

## Example

```html
<lenzi-shelf title="Light" [count]="docs.length">
  @for (doc of docs; track doc.id) {
    <lenzi-preview-card [title]="doc.name" [lines]="[doc.summary]" (opened)="open(doc)">…</lenzi-preview-card>
  }
</lenzi-shelf>
```

## Origin

New in the kit (2026-11-26), for the catalog's components page.
