# AI notes: The cat

- Import `LenziCat` from `@lenzi/ui-kit/svgs`; `<lenzi-cat mood="sleepy" />`. Give it a `label` only when it
  says something (an empty state, a page being built: `mood="builder"`); otherwise it is decoration.
- Do not put `lenziLit`, `lenziGlow` or `lenziSolid` on `<lenzi-cat>` itself: they would take its box. Use its
  `material` input: the material goes on its body, masked to the cat's outline.
- A solid cat's shadow uses its outline's hull (`CAT_SHAPES[…].outline`, passed to `lenziSolid`'s
  `solidOutline`). Another drawing that is not a box does the same: `[solidOutline]="points"`, fractions of
  its box.
- Never edit `cat-art.ts` by hand: it is generated from lenzi's PNG layers (potrace). To change the drawing,
  ask lenzi for new layers and trace them again.
- Do not add a box-shadow, a border or a background around it: its lines are its border.
