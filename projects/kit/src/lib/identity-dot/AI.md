# AI notes: Identity colours

- Every entity shown in a list, a bar or a chart gets its identity colour from its id: never pick colours by
  hand, never store them, never make them depend on a value.
- A second kind of entity with its own id sequence uses `offset 0.5`; decide the offsets of an app once and
  write them in its design.
- Never change `identity-color.ts`. If lenzi asks for other colours, it is a decision for every app: say so.
