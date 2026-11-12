# AI notes: Borders and shape

- Any border you draw: `var(--kit-border) solid var(--mat-sys-outline-variant)`. Never `1px` on something
  rounded; `1px` only for a straight divider.
- Any radius: one of the `--kit-*-radius` variables. Never a new radius.
- Do not add box-shadows to show a surface: the border is how the kit separates surfaces.
- Do not remove a border from a card or a panel; a panel inside a window is `kit-flat` instead.
