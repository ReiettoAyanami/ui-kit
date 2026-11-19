# Liquid Glass

`lenziLiquidGlass` (`@lenzi/ui-kit/backgrounds`; lenzi, 2026-11-19: "deve essere quasi come il liquid glass di IOS,
prova a fare un materiale che si chiama appunto LenziLiquidGlass diverso dal classico vetro"; "il bordo voglio che
rimanga nascosto fino all'ultimo"). The way: kube.io, "Liquid Glass in the Browser: Refraction with CSS and SVG"
(Chris Feijoo), chosen by lenzi.

## What

- **Clear glass that bends light**, not the kit's frosted glass (`lenziLit`): a slab with a curved bezel round its
  edge. What is behind it is bent near the edge, the middle flat and clear, as Apple's Liquid Glass does ("lensing").
- **How it bends** (`liquidGlassMaps`): the bezel's height is a profile of the distance from the edge (`surface`:
  `squircle`, Apple's convex default; `circle`; `lip`, convex then concave), `thickness` px tall, `bezel` px wide. A
  ray from behind meets the bezel's slope and bends by Snell's law (air 1, glass `ior` 1.5); crossing the glass it
  moves sideways. That shift, at each distance from the edge, along the edge's normal (round corners too), is drawn
  into a displacement map (red and green, 128 none) and given to `feDisplacementMap`, its scale the largest shift.
- **A little blur and saturation** of what is behind (`blur` 1.5 px, `saturation` 1.5).
- **No border**: only a rim of light on the very edge (a few px), and only when the boids of a flock behind come near
  (lenzi, 2026-11-19: "quelli devono esserci solo quando i boidi ci si avvicinano"): dark while none is near,
  brighter the more there are (whole at `rimBoids`, 60; `rim` 0.5 at most), lit on the side they come from (eight
  sides), all round once they are under the glass (`LenziSights.around`, at every frame; the nine rims drawn once).
- **One filter per glass, made for its size**, again when it changes size (the maps are as large as it is).

## Rules

- **Chromium only bends** (an SVG filter as `backdrop-filter` is not drawn by Safari or Firefox): there the glass is
  blur and saturation only, still clear and borderless.
- **Few of them**: each has its own maps (as many pixels as it has); resizing it all the time costs.
- **Over a background**: clear glass needs something behind it to bend (a scene, a picture). On a plain page it is
  only its rim.
- It is a material like `lenziLit` and `lenziSolid`: never two of them on one element.

## API

| | Name | Type | Default |
| --- | --- | --- | --- |
| input | `bezel` | px | `28` |
| input | `thickness` | px | `56` |
| input | `ior` | refractive index | `1.5` |
| input | `refraction` | how much of the bending, 0 to 1 and beyond | `1` |
| input | `surface` | `'squircle' \| 'circle' \| 'lip'` | `'squircle'` |
| input | `blur` | px | `1.5` |
| input | `saturation` | 1: as it is | `1.5` |
| input | `rim` | 0 to 1 | `0.5` |
| input | `lightAngle` | degrees | `-60` |
| function | `liquidGlassMaps(shape)` | the displacement and rim maps, and the scale | |

## Example

```html
<lenzi-scene [scene]="scene" />
<section class="window" lenziLiquidGlass>…</section>
```

```css
.window { border-radius: 28px; padding: 24px 32px; }
```

## Origin

New in the kit (2026-11-19), for lenzi-dev.
