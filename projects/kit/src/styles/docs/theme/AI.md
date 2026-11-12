# AI notes: Theme and typography

- Every app lists `kit.scss` and `fonts.css` before its own styles. Do not add Google Fonts links.
- Colours: only `var(--mat-sys-*)` and `var(--lenzi-*)`. Never a hex colour in a component. If no role fits,
  ask lenzi: the theme changes in the kit, not in the app.
- Type: `font: var(--mat-sys-<style>)`. Titles, labels and names are bold already through the theme; do
  not set `font-weight` on values.
- Never add a light theme, a theme switch, or `prefers-color-scheme` rules.
- A figure's label is `on-surface-variant` bold, its value `on-surface`; a note is `body-small` in `outline`.
