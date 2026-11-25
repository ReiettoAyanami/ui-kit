# AI notes: Glass tab bar

- `import { LenziGlassTabBar } from '@lenzi/ui-kit/backgrounds'`.
- Inside `LenziAppShell`, in `lenziShellTabs`, with `navigation="bar"` (bottom on a phone, upright on the left on a computer) or `"auto"`
  (the drawer on a computer); give it the same entries as the `LenziNavList` (keep the nav list too for `auto`).
- Names of one word on the bar: give it its own `pages` if the drawer's are longer.
- Sign out stays a button entry in `bottom` that asks first (`LenziConfirmDialog` on `(pressed)`).
- Never position it yourself: the shell floats it and keeps the page and the "+" clear of it.
