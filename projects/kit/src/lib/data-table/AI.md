# AI notes: Data table

- Keep the order in the URL (`?sort=&direction=`) and pass it back; on `sortChange` with an empty direction,
  go back to the API's order.
- `format` does the formatting (Intl with the app's locale and currency); the table never sees a formatted
  number when it sorts.
- Details under the name: one fact per entry of `details`, never joined with "·".
- A wide table on a phone is fine: it scrolls in its box. Do not hide columns to make it fit.
