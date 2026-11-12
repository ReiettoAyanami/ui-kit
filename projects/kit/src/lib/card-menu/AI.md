# AI notes: Card menu

- Position it absolutely at the card's top right (`top: 4px; right: 4px`) and leave room for it in the
  card's first line (about 48 px of right padding).
- Delete: `destructive: true`, and on `action === 'delete'` open `LenziConfirmDialog` saying what goes with
  it ("Its consumptions are deleted too").
- Its `label` names the card: "Actions for Birra".
- Never put a ⋮ menu on something that is not a card or a sub-card, and never two on one card.
