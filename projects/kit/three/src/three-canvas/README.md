# three.js canvas

`<lenzi-three-canvas>` (`@lenzi/ui-kit/three`): a 3D view. three.js is in the kit for later (lenzi, 2026-11-12:
"we don't use it now, but we might"): the canvas owns what every 3D view needs and gets wrong; the scene is
the page's.

## What it does

- A WebGL renderer with a **transparent background** (the page's colour shows through), pixel ratio up to 2.
- A camera that **follows the canvas's size**.
- A frame loop that **stops while the canvas is out of view or the tab is hidden**.
- **One still frame with reduced motion.**
- **Every geometry, material and texture freed** when it goes (and the setup's own `dispose`).
- **Without WebGL it says so** instead of a black box.

## Rules

- **Only through it**: never a `WebGLRenderer` of your own.
- **Colours from the theme**: `context.color('--mat-sys-primary')` (CSS variables and oklch are resolved).
- **A page with 3D is a lazy route**: three.js is heavy.
- **It is an image** for a screen reader: `label` says what it shows.

## API

| | Name | Type | Default |
| --- | --- | --- | --- |
| input | `setup` | `LenziThreeSetup` | required |
| input | `label` | `string` | required |
| input | `animate` | `boolean` | `true` |
| input | `fov` / `distance` | `number` | `50` / `5` |
| input | `height` | `string` | `'320px'` |

`LenziThreeSetup = ({ scene, camera, renderer, color, size }) => ({ frame?(delta, elapsed), dispose?() }) | void`.

## Example

```ts
scene: LenziThreeSetup = ({ scene, color }) => {
  const shape = new Mesh(new IcosahedronGeometry(1.4, 1), new MeshStandardMaterial({ color: color('--mat-sys-primary') }));
  scene.add(shape, new AmbientLight(0xffffff, 0.6), new DirectionalLight(0xffffff, 2.4));
  return { frame: (delta) => (shape.rotation.y += delta * 0.6) };
};
```

## Origin

New in the kit (2026-11-12).
