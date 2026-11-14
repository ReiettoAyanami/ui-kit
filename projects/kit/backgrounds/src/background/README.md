# Background

`<lenzi-background>` (`@lenzi/ui-kit/backgrounds`): a plain background behind the whole page or behind a box
(lenzi, 2026-11-13: "normal (color, photo, ecc)"). A solid colour; over it a photo, and over the photo a
gradient. Only CSS: nothing moves, nothing runs on the GPU.

## What it does

- **Behind the page** (`fill="page"`, fixed to the window, as tall as the tallest window so a phone's address
  bar does not resize the photo) or **behind its box** (`fill="box"`, inside a `.lenzi-backdrop`).
- **`dim`** lays the colour back over the picture, so the page on it stays readable.
- **`blur`**, like every background's: over the picture, drawn larger than the box so its faded edges stay out
  of sight.
- **Decoration**: hidden from screen readers, never takes a click.

## Rules

- **Colours from the theme**: `color` is a variable (`--mat-sys-surface`, the default) or a CSS colour; a
  gradient is written in the theme's variables.
- **One background per page** (or per box).
- **Readable first**: over a busy photo, raise `dim` or `blur` until the page's words are easy to read.
- **Surfaces over it** that should show it are `lenziLit` (glass); without it cards stay solid.

## API

| | Name | Type | Default |
| --- | --- | --- | --- |
| input | `fill` | `'page' \| 'box'` | `'page'` |
| input | `color` | `string` | `'--mat-sys-surface'` |
| input | `gradient` | `string` (a CSS image) | `''` |
| input | `image` | `string` (an address) | `''` |
| input | `fit` | `'cover' \| 'contain' \| 'tile'` | `'cover'` |
| input | `position` | `string` | `'center'` |
| input | `dim` | `number` 0..1 | `0` |
| input | `blur` | `number` px | `0` |

## Example

```html
<lenzi-background image="assets/hills.jpg" [dim]="0.3" />
```

## Origin

New in the kit (2026-11-13).
