# AI notes: Delta

- Pass the API's ratio as it comes (a decimal string); never compute it from two figures in the browser.
- The default is the normal reading (up green, down red). Pass `good="down"` only where a fall is good
  (costs, consumption: substance-tracker) and write that choice in the app's design.
- Render nothing (an `@if`) when there is nothing before to compare with; `null` only when there is a
  "before" but no change can be computed.
