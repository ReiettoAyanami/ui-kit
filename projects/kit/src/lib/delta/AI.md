# AI notes: Delta

- Pass the API's ratio as it comes (a decimal string); never compute it from two figures in the browser.
- Decide `good` from what the figure is (costs: down; savings, hours worked when more is better: up) and
  write that choice in the app's design.
- Render nothing (an `@if`) when there is nothing before to compare with; `null` only when there is a
  "before" but no change can be computed.
